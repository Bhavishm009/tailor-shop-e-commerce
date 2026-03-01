import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { emitToUser } from "@/lib/realtime-server"
import { createOrderNotification } from "@/lib/notifications"

async function getAccessibleOrder(orderId: string, userId: string, role: string) {
  const order = await db.stitchingOrder.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { id: true, name: true } },
      assignment: {
        include: {
          tailor: { select: { id: true, name: true } },
        },
      },
    },
  })
  if (!order) return null

  const assignedTailorId = order.assignment?.tailorId || null
  const canAccess =
    role === "ADMIN" ||
    (role === "CUSTOMER" && order.customerId === userId) ||
    (role === "TAILOR" && assignedTailorId === userId)

  if (!canAccess) return null

  return order
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, response } = await requireAuth()
    if (response || !session) return response

    const { id: orderId } = await params
    const order = await getAccessibleOrder(orderId, session.user.id, session.user.role)
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const conversation = await db.orderConversation.upsert({
      where: { stitchingOrderId: order.id },
      create: {
        stitchingOrderId: order.id,
        customerId: order.customerId,
        tailorId: order.assignment?.tailorId || null,
      },
      update: {
        tailorId: order.assignment?.tailorId || null,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 200,
          include: {
            sender: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    })

    const complaints = await db.returnComplaint.findMany({
      where: { stitchingOrderId: order.id },
      orderBy: { createdAt: "desc" },
      include: {
        raisedBy: { select: { id: true, name: true, role: true } },
        handledBy: { select: { id: true, name: true } },
      },
      take: 50,
    })

    return NextResponse.json({
      conversationId: conversation.id,
      order: {
        id: order.id,
        status: order.status,
        customerId: order.customerId,
        customerName: order.customer.name,
        tailorId: order.assignment?.tailorId || null,
        tailorName: order.assignment?.tailor?.name || null,
      },
      messages: conversation.messages,
      complaints,
    })
  } catch (error) {
    console.error("[orders/chat/get]", error)
    return NextResponse.json({ error: "Failed to load order chat" }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, response } = await requireAuth()
    if (response || !session) return response

    const { id: orderId } = await params
    const order = await getAccessibleOrder(orderId, session.user.id, session.user.role)
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const body = (await request.json()) as {
      message?: string
      type?: "TEXT" | "COMPLAINT"
      complaintTitle?: string
    }

    const text = (body.message || "").trim()
    if (!text) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const messageType = body.type === "COMPLAINT" ? "COMPLAINT" : "TEXT"
    if (messageType === "COMPLAINT" && session.user.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Only customer can raise complaint" }, { status: 403 })
    }
    if (session.user.role === "CUSTOMER" && order.status !== "DELIVERED") {
      return NextResponse.json(
        { error: "Customer chat is available only after order is delivered." },
        { status: 400 },
      )
    }

    const conversation = await db.orderConversation.upsert({
      where: { stitchingOrderId: order.id },
      create: {
        stitchingOrderId: order.id,
        customerId: order.customerId,
        tailorId: order.assignment?.tailorId || null,
      },
      update: {
        tailorId: order.assignment?.tailorId || null,
      },
    })

    const created = await db.$transaction(async (tx) => {
      const msg = await tx.orderMessage.create({
        data: {
          conversationId: conversation.id,
          stitchingOrderId: order.id,
          senderId: session.user.id,
          type: messageType,
          message: text,
        },
        include: {
          sender: {
            select: { id: true, name: true, role: true },
          },
        },
      })

      let complaint: null | {
        id: string
        title: string
        details: string
        status: string
        createdAt: Date
        raisedBy: { id: string; name: string; role: string }
      } = null

      if (messageType === "COMPLAINT") {
        const createdComplaint = await tx.returnComplaint.create({
          data: {
            stitchingOrderId: order.id,
            raisedById: session.user.id,
            messageId: msg.id,
            title: body.complaintTitle?.trim() || "Return/Order Complaint",
            details: text,
            status: "OPEN",
          },
          include: {
            raisedBy: { select: { id: true, name: true, role: true } },
          },
        })
        complaint = createdComplaint
      }

      await tx.orderConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      })

      return { msg, complaint }
    })

    const recipients = new Set<string>()
    if (order.customerId !== session.user.id) recipients.add(order.customerId)
    if (order.assignment?.tailorId && order.assignment.tailorId !== session.user.id) recipients.add(order.assignment.tailorId)
    const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } })
    for (const admin of admins) {
      if (admin.id !== session.user.id) recipients.add(admin.id)
    }

    for (const recipientId of recipients) {
      emitToUser(recipientId, "chat:new-message", {
        orderId: order.id,
        conversationId: conversation.id,
        message: created.msg,
      })
      await createOrderNotification({
        userId: recipientId,
        title: "New order chat message",
        message: `${created.msg.sender.name}: ${created.msg.message.slice(0, 120)}`,
        type: "ORDER_CHAT_MESSAGE",
        link:
          recipientId === order.customerId
            ? `/customer/orders/custom/${order.id}`
            : recipientId === order.assignment?.tailorId
              ? `/tailor/orders/${order.id}`
              : `/admin/chats?orderId=${order.id}`,
      })
    }

    if (messageType === "COMPLAINT") {
      for (const admin of admins) {
        await createOrderNotification({
          userId: admin.id,
          title: "New complaint raised",
          message: `${order.customer.name} raised complaint for order ST-${order.id.slice(-6).toUpperCase()}.`,
          type: "ORDER_COMPLAINT",
          link: `/admin/custom-orders/${order.id}`,
        })
      }
    }

    return NextResponse.json({
      ok: true,
      message: created.msg,
      complaint: created.complaint,
    })
  } catch (error) {
    console.error("[orders/chat/post]", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}

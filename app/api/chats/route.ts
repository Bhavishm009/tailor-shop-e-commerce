import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"

export async function GET() {
  try {
    const { session, response } = await requireAuth()
    if (response || !session) return response

    const where =
      session.user.role === "ADMIN"
        ? {}
        : session.user.role === "TAILOR"
          ? { assignment: { tailorId: session.user.id } }
          : { customerId: session.user.id }

    const orders = await db.stitchingOrder.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        assignment: { include: { tailor: { select: { id: true, name: true } } } },
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: { sender: { select: { id: true, name: true, role: true } } },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    })

    return NextResponse.json(
      orders.map((order) => {
        const last = order.conversation?.messages?.[0] || null
        return {
          orderId: order.id,
          orderCode: `ST-${order.id.slice(-6).toUpperCase()}`,
          orderStatus: order.status,
          stitchingService: order.stitchingService,
          customerName: order.customer.name,
          tailorName: order.assignment?.tailor?.name || null,
          lastMessage: last
            ? {
                id: last.id,
                text: last.message,
                type: last.type,
                createdAt: last.createdAt,
                sender: last.sender,
              }
            : null,
        }
      }),
    )
  } catch (error) {
    console.error("[chats/get]", error)
    return NextResponse.json({ error: "Failed to load chats" }, { status: 500 })
  }
}


import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"
import { isValidTransition, type OrderStatus } from "@/lib/order-flow"
import { createOrderNotification } from "@/lib/notifications"

const allowedStatuses = ["PENDING", "ASSIGNED", "STITCHING", "COMPLETED", "DELIVERED", "CANCELLED"] as const

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const { id } = await params
    const body = (await request.json()) as {
      source?: "READY_MADE" | "CUSTOM"
      status?: (typeof allowedStatuses)[number]
    }

    if (!body.source || !body.status || !allowedStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Invalid source or status" }, { status: 400 })
    }

    if (body.source === "READY_MADE") {
      const existing = await db.order.findUnique({
        where: { id },
        select: {
          status: true,
          customerId: true,
          orderNumber: true,
        },
      })
      if (!existing) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 })
      }
      if (!isValidTransition("READY_MADE", existing.status as OrderStatus, body.status as OrderStatus)) {
        return NextResponse.json({ error: `Invalid status transition from ${existing.status} to ${body.status}` }, { status: 400 })
      }

      const updated = await db.order.update({
        where: { id },
        data: { status: body.status },
      })

      await createOrderNotification({
        userId: existing.customerId,
        title: "Order status updated",
        message: `Your ready-made order ${existing.orderNumber} is now ${body.status}.`,
        type: "ORDER_STATUS_UPDATED",
        link: "/customer/orders",
      })

      return NextResponse.json(updated)
    }

    const existing = await db.stitchingOrder.findUnique({
      where: { id },
      include: {
        assignment: {
          select: {
            tailorId: true,
          },
        },
      },
    })
    if (!existing) {
      return NextResponse.json({ error: "Custom order not found" }, { status: 404 })
    }
    if (!isValidTransition("CUSTOM", existing.status as OrderStatus, body.status as OrderStatus)) {
      return NextResponse.json({ error: `Invalid status transition from ${existing.status} to ${body.status}` }, { status: 400 })
    }
    if (body.status === "ASSIGNED") {
      return NextResponse.json({ error: "Use assign action to set custom order to ASSIGNED." }, { status: 400 })
    }

    const updated = await db.stitchingOrder.update({
      where: { id },
      data: { status: body.status },
    })

    await Promise.all([
      createOrderNotification({
        userId: existing.customerId,
        title: "Custom order status updated",
        message: `Your ${existing.stitchingService} order is now ${body.status}.`,
        type: "CUSTOM_ORDER_STATUS_UPDATED",
        link: "/customer/orders",
      }),
      existing.assignment?.tailorId
        ? createOrderNotification({
            userId: existing.assignment.tailorId,
            title: "Assigned order status changed",
            message: `${existing.stitchingService} is now ${body.status}.`,
            type: "CUSTOM_ORDER_STATUS_UPDATED",
            link: "/tailor/orders",
          })
        : Promise.resolve(null),
    ])

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[admin/orders/id/patch]", error)
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 })
  }
}

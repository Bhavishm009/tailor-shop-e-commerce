import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"
import { createOrderNotification } from "@/lib/notifications"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const { id } = await params
    const body = await request.json()
    const { status } = body

    const existing = await db.order.findUnique({
      where: { id },
      select: { id: true, customerId: true, orderNumber: true },
    })
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const order = await db.order.update({
      where: { id },
      data: { status },
    })

    await createOrderNotification({
      userId: existing.customerId,
      title: "Order status updated",
      message: `Your ready-made order ${existing.orderNumber} is now ${status}.`,
      type: "ORDER_STATUS_UPDATED",
      link: "/customer/orders",
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error("[orders/status]", error)
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 })
  }
}

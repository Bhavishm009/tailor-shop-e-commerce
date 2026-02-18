import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

export async function GET() {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const [orders, stitchingOrders] = await Promise.all([
      db.order.findMany({
        include: {
          customer: {
            select: { name: true, email: true },
          },
        },
      }),
      db.stitchingOrder.findMany({
        include: {
          customer: {
            select: { name: true, email: true },
          },
          assignment: {
            include: {
              tailor: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      }),
    ])

    const normalizedOrders = [
      ...orders.map((order) => ({
        id: order.id,
        source: "READY_MADE",
        orderNumber: order.orderNumber,
        customerName: order.customer.name,
        customerEmail: order.customer.email,
        totalAmount: order.totalAmount,
        status: order.status,
        type: "ready-made",
        stitchingService: null,
        assignedTailorId: null,
        assignedTailorName: null,
        payoutAmount: null,
        payoutStatus: null,
        createdAt: order.createdAt,
      })),
      ...stitchingOrders.map((order) => ({
        id: order.id,
        source: "CUSTOM",
        orderNumber: `ST-${order.id.slice(-6).toUpperCase()}`,
        customerName: order.customer.name,
        customerEmail: order.customer.email,
        totalAmount: order.price,
        status: order.status,
        type: "custom",
        serviceKey: order.serviceKey,
        stitchingService: order.stitchingService,
        assignedTailorId: order.assignment?.tailorId ?? null,
        assignedTailorName: order.assignment?.tailor.name ?? null,
        payoutAmount: order.assignment?.payoutAmount ?? null,
        payoutStatus: order.assignment?.payoutStatus ?? null,
        createdAt: order.createdAt,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return NextResponse.json(normalizedOrders)
  } catch (error) {
    console.error("[admin/orders/get]", error)
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}

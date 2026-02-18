import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

export async function GET() {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const orders = await db.order.findMany({
      include: {
        customer: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(
      orders.map((order) => ({
        id: order.id,
        source: "READY_MADE" as const,
        orderNumber: order.orderNumber,
        customerName: order.customer.name,
        customerEmail: order.customer.email,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
      })),
    )
  } catch (error) {
    console.error("[admin/ready-made-orders/get]", error)
    return NextResponse.json({ error: "Failed to load ready-made orders" }, { status: 500 })
  }
}


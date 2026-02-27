import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, response } = await requireRole("CUSTOMER")
    if (response || !session) return response

    const { id } = await params
    const order = await db.stitchingOrder.findFirst({
      where: {
        id,
        customerId: session.user.id,
      },
      include: {
        measurement: true,
        payment: {
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
          },
        },
        assignment: {
          include: {
            tailor: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Custom order not found" }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("[customer/custom-orders/id/get]", error)
    return NextResponse.json({ error: "Failed to load custom order details" }, { status: 500 })
  }
}

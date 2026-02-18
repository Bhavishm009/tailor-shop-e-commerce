import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  try {
    const { session, response } = await requireRole("CUSTOMER")
    if (response || !session) return response

    const orders = await db.order.findMany({
      where: {
        customerId: session.user.id,
      },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(orders)
  } catch (error) {
    console.error("[orders]", error)
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, response } = await requireRole("CUSTOMER")
    if (response || !session) return response

    const body = await request.json()
    const address = await db.address.findFirst({
      where: {
        id: body.addressId,
        userId: session.user.id,
      },
    })

    if (!address) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 })
    }

    const orderNumber = `ORD-${Date.now()}`

    const order = await db.order.create({
      data: {
        customerId: session.user.id,
        addressId: body.addressId,
        orderNumber,
        totalAmount: body.totalAmount,
        items: {
          create: body.items,
        },
      },
      include: { items: true },
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error("[orders/create]", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}

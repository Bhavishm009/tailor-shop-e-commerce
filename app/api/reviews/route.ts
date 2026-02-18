import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

export async function POST(request: NextRequest) {
  try {
    const { session, response } = await requireRole("CUSTOMER")
    if (response || !session) return response

    const body = await request.json()
    const { tailorId, tailorProfileId, stitchingOrderId, rating, comment } = body
    const ownedOrder = await db.stitchingOrder.findFirst({
      where: {
        id: stitchingOrderId,
        customerId: session.user.id,
      },
    })

    if (!ownedOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const review = await db.review.create({
      data: {
        customerId: session.user.id,
        tailorId,
        tailorProfileId,
        stitchingOrderId,
        rating,
        comment,
      },
    })

    return NextResponse.json(review, { status: 201 })
  } catch (error) {
    console.error("[reviews/create]", error)
    return NextResponse.json({ error: "Failed to create review" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const body = await request.json()
    const { reviewId, isApproved } = body

    const review = await db.review.update({
      where: { id: reviewId },
      data: { isApproved },
    })

    return NextResponse.json(review)
  } catch (error) {
    console.error("[reviews/approve]", error)
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 })
  }
}

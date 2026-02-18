import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

export async function GET() {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const reviews = await db.review.findMany({
      include: {
        customer: {
          select: { name: true, email: true },
        },
        tailor: {
          select: { name: true, email: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(
      reviews.map((review) => ({
        id: review.id,
        customerName: review.customer.name,
        customerEmail: review.customer.email,
        tailorName: review.tailor.name,
        tailorEmail: review.tailor.email,
        rating: review.rating,
        comment: review.comment || "",
        isApproved: review.isApproved,
        createdAt: review.createdAt,
      }))
    )
  } catch (error) {
    console.error("[admin/reviews/get]", error)
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
  }
}

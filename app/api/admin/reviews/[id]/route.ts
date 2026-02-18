import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const { id } = await params
    const body = (await request.json()) as {
      isApproved?: boolean
    }

    if (typeof body.isApproved !== "boolean") {
      return NextResponse.json({ error: "isApproved is required" }, { status: 400 })
    }

    const updated = await db.review.update({
      where: { id },
      data: { isApproved: body.isApproved },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[admin/reviews/id/patch]", error)
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const { id } = await params
    await db.review.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[admin/reviews/id/delete]", error)
    return NextResponse.json({ error: "Failed to delete review" }, { status: 500 })
  }
}

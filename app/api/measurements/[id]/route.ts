import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, response } = await requireRole("CUSTOMER")
    if (response || !session) return response

    const { id } = await params
    const existing = await db.measurement.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: {
        id: true,
        isVerified: true,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Measurement not found" }, { status: 404 })
    }
    if (existing.isVerified) {
      return NextResponse.json({ error: "Verified measurement cannot be deleted." }, { status: 400 })
    }

    const deleted = await db.measurement.deleteMany({
      where: {
        id,
        userId: session.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[measurements/delete]", error)
    return NextResponse.json({ error: "Failed to delete measurement" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, response } = await requireRole("CUSTOMER")
    if (response || !session) return response

    const { id } = await params
    const deleted = await db.measurement.deleteMany({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Measurement not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[measurements/delete]", error)
    return NextResponse.json({ error: "Failed to delete measurement" }, { status: 500 })
  }
}


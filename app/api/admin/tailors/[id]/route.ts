import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const { id } = await params
    const body = (await request.json()) as {
      isActive?: boolean
    }

    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    })
    if (!user || user.role !== "TAILOR") {
      return NextResponse.json({ error: "Tailor not found" }, { status: 404 })
    }

    const profile = await db.tailorProfile.upsert({
      where: { userId: id },
      create: {
        userId: id,
        isActive: typeof body.isActive === "boolean" ? body.isActive : true,
      },
      update: {
        isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
      },
    })

    return NextResponse.json(profile)
  } catch (error) {
    console.error("[admin/tailors/id/patch]", error)
    return NextResponse.json({ error: "Failed to update tailor" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const { id } = await params

    const existing = await db.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    })

    if (!existing || existing.role !== "TAILOR") {
      return NextResponse.json({ error: "Tailor not found" }, { status: 404 })
    }

    await db.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[admin/tailors/id/delete]", error)
    return NextResponse.json({ error: "Failed to delete tailor" }, { status: 500 })
  }
}

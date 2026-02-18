import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

function normalizeSpecializations(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    ),
  )
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const { id } = await params
    const body = (await request.json()) as { specializations?: string[] }
    const values = normalizeSpecializations(Array.isArray(body.specializations) ? body.specializations : [])

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
        specializations: values.join(", "),
      },
      update: {
        specializations: values.join(", "),
      },
    })

    return NextResponse.json(profile)
  } catch (error) {
    console.error("[admin/tailors/specializations/patch]", error)
    return NextResponse.json({ error: "Failed to update tailor specializations" }, { status: 500 })
  }
}


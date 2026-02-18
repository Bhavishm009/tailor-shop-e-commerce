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

export async function GET() {
  try {
    const { session, response } = await requireRole("TAILOR")
    if (response || !session) return response

    const profile = await db.tailorProfile.findUnique({
      where: { userId: session.user.id },
      select: { specializations: true },
    })

    const specializations = (profile?.specializations || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)

    return NextResponse.json({ specializations })
  } catch (error) {
    console.error("[account/specializations/get]", error)
    return NextResponse.json({ error: "Failed to load specializations" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { session, response } = await requireRole("TAILOR")
    if (response || !session) return response

    const body = (await request.json()) as { specializations?: string[] }
    const values = normalizeSpecializations(Array.isArray(body.specializations) ? body.specializations : [])

    const profile = await db.tailorProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        specializations: values.join(", "),
      },
      update: {
        specializations: values.join(", "),
      },
    })

    return NextResponse.json(profile)
  } catch (error) {
    console.error("[account/specializations/patch]", error)
    return NextResponse.json({ error: "Failed to update specializations" }, { status: 500 })
  }
}


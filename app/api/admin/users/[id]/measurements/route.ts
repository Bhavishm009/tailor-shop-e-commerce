import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, response } = await requireRole("ADMIN")
    if (response || !session) return response

    const { id } = await params
    const body = (await request.json()) as {
      name?: string
      notes?: string
      chest?: number | string
      waist?: number | string
      hip?: number | string
      shoulder?: number | string
      sleeveLength?: number | string
      garmentLength?: number | string
    }

    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    if (user.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Measurements can be added only for customer users." }, { status: 400 })
    }

    const measurementName = body.name?.trim()
    if (!measurementName) {
      return NextResponse.json({ error: "Measurement name is required." }, { status: 400 })
    }

    const asNumber = (value: unknown) => {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : undefined
    }

    const measurement = await db.measurement.create({
      data: {
        userId: user.id,
        name: measurementName,
        notes: body.notes?.trim() || "Added and verified by admin",
        isVerified: true,
        source: "ADMIN",
        verifiedByAdminId: session.user.id,
        verifiedAt: new Date(),
        chest: asNumber(body.chest),
        waist: asNumber(body.waist),
        hip: asNumber(body.hip),
        shoulder: asNumber(body.shoulder),
        sleeveLength: asNumber(body.sleeveLength),
        garmentLength: asNumber(body.garmentLength),
      },
    })

    return NextResponse.json(measurement, { status: 201 })
  } catch (error) {
    console.error("[admin/users/id/measurements/post]", error)
    return NextResponse.json({ error: "Failed to add measurement." }, { status: 500 })
  }
}


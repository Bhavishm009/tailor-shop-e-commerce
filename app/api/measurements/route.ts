import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  try {
    const { session, response } = await requireRole("CUSTOMER")
    if (response || !session) return response

    const type = request.nextUrl.searchParams.get("type")
    const measurements = await db.measurement.findMany({
      where: {
        userId: session.user.id,
        ...(type ? { measurementType: type } : {}),
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(measurements)
  } catch (error) {
    console.error("[measurements]", error)
    return NextResponse.json({ error: "Failed to fetch measurements" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, response } = await requireRole("CUSTOMER")
    if (response || !session) return response

    const body = (await request.json()) as {
      name?: string
      notes?: string
      measurementType?: string
      measurementData?: Record<string, number | string | null>
      chest?: number
      waist?: number
      hip?: number
      shoulder?: number
      sleeveLength?: number
      garmentLength?: number
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Measurement name is required" }, { status: 400 })
    }

    const measurementData = body.measurementData ?? {}
    const asNumber = (value: unknown) => {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : undefined
    }

    const measurement = await db.measurement.create({
      data: {
        userId: session.user.id,
        name: body.name.trim(),
        notes: body.notes || null,
        measurementType: body.measurementType || null,
        measurementData,
        chest: body.chest ?? asNumber(measurementData.chest),
        waist: body.waist ?? asNumber(measurementData.waist),
        hip: body.hip ?? asNumber(measurementData.hip),
        shoulder: body.shoulder ?? asNumber(measurementData.shoulder),
        sleeveLength: body.sleeveLength ?? asNumber(measurementData.sleeveLength),
        garmentLength: body.garmentLength ?? asNumber(measurementData.garmentLength),
      },
    })
    return NextResponse.json(measurement, { status: 201 })
  } catch (error) {
    console.error("[measurements/create]", error)
    return NextResponse.json({ error: "Failed to create measurement" }, { status: 500 })
  }
}

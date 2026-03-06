import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"
import { DEFAULT_STITCHING_SERVICES } from "@/lib/stitching-service-defaults"

const MEASUREMENT_TYPES = ["SHIRT", "PANT", "KURTA", "BLOUSE", "SALWAR", "CUSTOM"] as const

type MeasurementFieldInput = {
  key?: string
  label?: string
  unit?: string
  image?: string | null
}

async function ensureDefaultsIfEmpty() {
  const count = await db.stitchingService.count()
  if (count > 0) return
  await db.stitchingService.createMany({ data: DEFAULT_STITCHING_SERVICES })
}

function normalizeKey(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

function normalizeFieldKey(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
}

function normalizeMeasurementFields(fields: MeasurementFieldInput[] | undefined) {
  const normalized = (fields || [])
    .map((field) => {
      const label = field.label?.trim() || ""
      if (!label) return null
      const key = normalizeFieldKey(field.key?.trim() || label)
      if (!key) return null
      return {
        key,
        label,
        unit: field.unit?.trim() || "in",
        image: typeof field.image === "string" ? field.image.trim() || null : null,
      }
    })
    .filter((item): item is { key: string; label: string; unit: string; image: string | null } => Boolean(item))

  return normalized
}

export async function GET() {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    await ensureDefaultsIfEmpty()
    const services = await db.stitchingService.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    })

    return NextResponse.json(services)
  } catch (error) {
    console.error("[admin/stitching-services/get]", error)
    return NextResponse.json({ error: "Failed to load stitching services" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const body = (await request.json()) as {
      name?: string
      category?: string
      key?: string
      measurementType?: string
      measurementGuideImage?: string | null
      measurementFields?: MeasurementFieldInput[]
      customerPrice?: number
      tailorRate?: number
      isActive?: boolean
    }

    const name = body.name?.trim()
    const category = body.category?.trim()
    const key = normalizeKey(body.key?.trim() || name || "")
    const customerPrice = Number(body.customerPrice)
    const tailorRate = Number(body.tailorRate)
    const measurementType = body.measurementType && MEASUREMENT_TYPES.includes(body.measurementType as (typeof MEASUREMENT_TYPES)[number])
      ? body.measurementType
      : "CUSTOM"
    const measurementFields = normalizeMeasurementFields(body.measurementFields)

    if (!name || !category || !key || Number.isNaN(customerPrice) || Number.isNaN(tailorRate) || measurementFields.length === 0) {
      return NextResponse.json({ error: "Invalid input data" }, { status: 400 })
    }

    const created = await db.stitchingService.create({
      data: {
        name,
        category,
        key,
        measurementType,
        measurementGuideImage: body.measurementGuideImage || null,
        measurementFields,
        customerPrice,
        tailorRate,
        isActive: typeof body.isActive === "boolean" ? body.isActive : true,
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("[admin/stitching-services/post]", error)
    return NextResponse.json({ error: "Failed to create stitching service" }, { status: 500 })
  }
}

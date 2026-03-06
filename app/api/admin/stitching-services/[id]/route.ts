import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

const MEASUREMENT_TYPES = ["SHIRT", "PANT", "KURTA", "BLOUSE", "SALWAR", "CUSTOM"] as const

type MeasurementFieldInput = {
  key?: string
  label?: string
  unit?: string
  image?: string | null
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
        unit: field.unit?.trim() || "cm",
        image: typeof field.image === "string" ? field.image.trim() || null : null,
      }
    })
    .filter((item): item is { key: string; label: string; unit: string; image: string | null } => Boolean(item))
  return normalized
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const { id } = await params
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

    const existing = await db.stitchingService.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 })
    }

    const measurementFields = body.measurementFields ? normalizeMeasurementFields(body.measurementFields) : null

    const updated = await db.stitchingService.update({
      where: { id },
      data: {
        name: body.name?.trim() || existing.name,
        category: body.category?.trim() || existing.category,
        key: body.key ? normalizeKey(body.key) : existing.key,
        measurementType:
          body.measurementType && MEASUREMENT_TYPES.includes(body.measurementType as (typeof MEASUREMENT_TYPES)[number])
            ? body.measurementType
            : existing.measurementType || "CUSTOM",
        measurementGuideImage:
          typeof body.measurementGuideImage === "string"
            ? body.measurementGuideImage.trim() || null
            : existing.measurementGuideImage,
        measurementFields:
          measurementFields && measurementFields.length > 0
            ? measurementFields
            : existing.measurementFields ?? undefined,
        customerPrice: typeof body.customerPrice === "number" ? body.customerPrice : existing.customerPrice,
        tailorRate: typeof body.tailorRate === "number" ? body.tailorRate : existing.tailorRate,
        isActive: typeof body.isActive === "boolean" ? body.isActive : existing.isActive,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[admin/stitching-services/id/patch]", error)
    return NextResponse.json({ error: "Failed to update stitching service" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const { id } = await params
    await db.stitchingService.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[admin/stitching-services/id/delete]", error)
    return NextResponse.json({ error: "Failed to delete stitching service" }, { status: 500 })
  }
}

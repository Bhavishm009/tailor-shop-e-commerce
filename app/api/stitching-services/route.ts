import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { DEFAULT_STITCHING_SERVICES } from "@/lib/stitching-service-defaults"
import { getMeasurementPreset, resolveMeasurementType } from "@/lib/measurement-presets"

async function ensureDefaultsIfEmpty() {
  const count = await db.stitchingService.count()
  if (count > 0) return

  await db.stitchingService.createMany({
    data: DEFAULT_STITCHING_SERVICES,
  })
}

export async function GET() {
  try {
    const { response } = await requireAuth()
    if (response) return response

    await ensureDefaultsIfEmpty()
    const services = await db.stitchingService.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    })

    return NextResponse.json(
      services.map((service) => {
        const measurementType = service.measurementType || resolveMeasurementType(service.key, service.name)
        const customFields = Array.isArray(service.measurementFields) ? service.measurementFields : []
        return {
          ...service,
          measurementType,
          measurementFields: customFields.length > 0 ? customFields : getMeasurementPreset(measurementType).fields,
          measurementGuideImage: service.measurementGuideImage || null,
        }
      }),
    )
  } catch (error) {
    console.error("[stitching-services/get]", error)
    return NextResponse.json({ error: "Failed to load stitching services" }, { status: 500 })
  }
}

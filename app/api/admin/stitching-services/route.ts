import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"
import { DEFAULT_STITCHING_SERVICES } from "@/lib/stitching-service-defaults"

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
      customerPrice?: number
      tailorRate?: number
      isActive?: boolean
    }

    const name = body.name?.trim()
    const category = body.category?.trim()
    const key = normalizeKey(body.key?.trim() || name || "")
    const customerPrice = Number(body.customerPrice)
    const tailorRate = Number(body.tailorRate)

    if (!name || !category || !key || Number.isNaN(customerPrice) || Number.isNaN(tailorRate)) {
      return NextResponse.json({ error: "Invalid input data" }, { status: 400 })
    }

    const created = await db.stitchingService.create({
      data: {
        name,
        category,
        key,
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


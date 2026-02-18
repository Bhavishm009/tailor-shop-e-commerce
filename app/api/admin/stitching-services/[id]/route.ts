import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

function normalizeKey(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
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
      customerPrice?: number
      tailorRate?: number
      isActive?: boolean
    }

    const existing = await db.stitchingService.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 })
    }

    const updated = await db.stitchingService.update({
      where: { id },
      data: {
        name: body.name?.trim() || existing.name,
        category: body.category?.trim() || existing.category,
        key: body.key ? normalizeKey(body.key) : existing.key,
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


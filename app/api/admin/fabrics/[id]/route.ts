import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"
import type { ClothType } from "@prisma/client"

const CLOTH_TYPES: ClothType[] = ["COTTON", "SILK", "WOOL", "LINEN", "POLYESTER", "BLEND", "CUSTOM"]

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const { id } = await params
    const body = (await request.json()) as {
      name?: string
      clothType?: ClothType
      buyRatePerMeter?: number
      sellRatePerMeter?: number
      stockMeters?: number
      image?: string
      description?: string
      isActive?: boolean
    }

    const existing = await db.fabricOption.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Fabric not found." }, { status: 404 })
    }

    const updated = await db.fabricOption.update({
      where: { id },
      data: {
        name: body.name?.trim() || existing.name,
        clothType: body.clothType && CLOTH_TYPES.includes(body.clothType) ? body.clothType : existing.clothType,
        buyRatePerMeter: Number.isFinite(Number(body.buyRatePerMeter)) ? Number(body.buyRatePerMeter) : existing.buyRatePerMeter,
        sellRatePerMeter: Number.isFinite(Number(body.sellRatePerMeter)) ? Number(body.sellRatePerMeter) : existing.sellRatePerMeter,
        stockMeters: Number.isFinite(Number(body.stockMeters)) && Number(body.stockMeters) >= 0 ? Number(body.stockMeters) : existing.stockMeters,
        image: typeof body.image === "string" ? body.image.trim() || null : existing.image,
        description: typeof body.description === "string" ? body.description.trim() || null : existing.description,
        isActive: typeof body.isActive === "boolean" ? body.isActive : existing.isActive,
      },
    })
    return NextResponse.json(updated)
  } catch (error) {
    if ((error as { code?: string })?.code === "P2021") {
      return NextResponse.json(
        { error: "Fabric module is not initialized in this database. Run migrations and retry." },
        { status: 503 },
      )
    }
    console.error("[admin/fabrics/id/patch]", error)
    return NextResponse.json({ error: "Failed to update fabric." }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response
    const { id } = await params
    await db.fabricOption.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if ((error as { code?: string })?.code === "P2021") {
      return NextResponse.json(
        { error: "Fabric module is not initialized in this database. Run migrations and retry." },
        { status: 503 },
      )
    }
    console.error("[admin/fabrics/id/delete]", error)
    return NextResponse.json({ error: "Failed to delete fabric." }, { status: 500 })
  }
}

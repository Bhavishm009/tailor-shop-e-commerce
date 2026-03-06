import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"
import type { ClothType } from "@prisma/client"

const CLOTH_TYPES: ClothType[] = ["COTTON", "SILK", "WOOL", "LINEN", "POLYESTER", "BLEND", "CUSTOM"]

export async function GET() {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const options = await db.fabricOption.findMany({
      orderBy: [{ createdAt: "desc" }],
    })
    return NextResponse.json(options)
  } catch (error) {
    if ((error as { code?: string })?.code === "P2021") {
      return NextResponse.json(
        { error: "Fabric module is not initialized in this database. Run migrations and retry." },
        { status: 503 },
      )
    }
    console.error("[admin/fabrics/get]", error)
    return NextResponse.json({ error: "Failed to load fabrics." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

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

    const name = body.name?.trim()
    if (!name || !body.clothType || !CLOTH_TYPES.includes(body.clothType)) {
      return NextResponse.json({ error: "Name and valid cloth type are required." }, { status: 400 })
    }
    const buyRatePerMeter = Number(body.buyRatePerMeter)
    const sellRatePerMeter = Number(body.sellRatePerMeter)
    const stockMeters = Number(body.stockMeters)
    if (!Number.isFinite(buyRatePerMeter) || buyRatePerMeter < 0 || !Number.isFinite(sellRatePerMeter) || sellRatePerMeter < 0) {
      return NextResponse.json({ error: "Buy/Sell rates must be valid positive numbers." }, { status: 400 })
    }
    if (!Number.isFinite(stockMeters) || stockMeters < 0) {
      return NextResponse.json({ error: "Stock meters must be a valid positive number." }, { status: 400 })
    }

    const created = await db.fabricOption.create({
      data: {
        name,
        clothType: body.clothType,
        buyRatePerMeter,
        sellRatePerMeter,
        stockMeters,
        image: body.image?.trim() || null,
        description: body.description?.trim() || null,
        isActive: typeof body.isActive === "boolean" ? body.isActive : true,
      },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    if ((error as { code?: string })?.code === "P2021") {
      return NextResponse.json(
        { error: "Fabric module is not initialized in this database. Run migrations and retry." },
        { status: 503 },
      )
    }
    console.error("[admin/fabrics/post]", error)
    return NextResponse.json({ error: "Failed to create fabric." }, { status: 500 })
  }
}

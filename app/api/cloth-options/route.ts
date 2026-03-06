import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { CLOTH_OPTIONS } from "@/lib/cloth-options"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const { response } = await requireAuth()
    if (response) return response

    const count = await db.fabricOption.count()
    if (count === 0) {
      await db.fabricOption.createMany({
        data: CLOTH_OPTIONS.map((item) => ({
          id: item.id,
          name: item.name,
          clothType: item.clothType,
          buyRatePerMeter: item.buyRatePerMeter,
          sellRatePerMeter: item.sellRatePerMeter,
          stockMeters: item.stockMeters,
          image: item.image || null,
          description: item.description || null,
          isActive: true,
        })),
        skipDuplicates: true,
      })
    }

    const options = await db.fabricOption.findMany({
      where: { isActive: true },
      orderBy: [{ clothType: "asc" }, { name: "asc" }],
    })

    return NextResponse.json(options)
  } catch (error) {
    if ((error as { code?: string })?.code === "P2021") {
      return NextResponse.json(
        { error: "Fabric module is not initialized in this database. Run migrations and retry." },
        { status: 503 },
      )
    }
    console.error("[cloth-options/get]", error)
    return NextResponse.json({ error: "Failed to load cloth options" }, { status: 500 })
  }
}

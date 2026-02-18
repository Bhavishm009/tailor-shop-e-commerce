import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  try {
    const includeAll = request.nextUrl.searchParams.get("all") === "1"
    if (includeAll) {
      const { response } = await requireRole("ADMIN")
      if (response) return response
    }

    const products = await db.product.findMany({
      where: includeAll ? undefined : { isActive: true },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(products)
  } catch (error) {
    console.error("[products]", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const body = await request.json()
    const product = await db.product.create({
      data: body,
    })
    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error("[products/create]", error)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}

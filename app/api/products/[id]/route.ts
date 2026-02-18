import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const { id } = await params
    const product = await db.product.findUnique({ where: { id } })
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error("[products/get]", error)
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const { id } = await params
    const body = (await request.json()) as {
      name?: string
      description?: string
      price?: number
      category?: string
      material?: string
      stock?: number
      image?: string | null
      isActive?: boolean
    }

    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const updated = await db.product.update({
      where: { id },
      data: {
        name: body.name?.trim() || existing.name,
        description: body.description === undefined ? existing.description : body.description || null,
        price: typeof body.price === "number" && !Number.isNaN(body.price) ? body.price : existing.price,
        category: body.category?.trim() || existing.category,
        material: body.material === undefined ? existing.material : body.material || null,
        stock: typeof body.stock === "number" && !Number.isNaN(body.stock) ? body.stock : existing.stock,
        image: body.image === undefined ? existing.image : body.image || null,
        isActive: typeof body.isActive === "boolean" ? body.isActive : existing.isActive,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[products/patch]", error)
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const { id } = await params
    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    await db.product.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[products/delete]", error)
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 })
  }
}

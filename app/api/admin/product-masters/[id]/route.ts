import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"
import { ProductMasterType } from "@prisma/client"

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")

const TYPES = new Set(Object.values(ProductMasterType))

async function createUniqueSlug(type: ProductMasterType, name: string, excludeId: string) {
  const base = slugify(name) || `item-${Date.now()}`
  let candidate = base
  let suffix = 1

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await db.productMaster.findUnique({
      where: {
        type_slug: {
          type,
          slug: candidate,
        },
      },
      select: { id: true },
    })

    if (!existing || existing.id === excludeId) return candidate
    suffix += 1
    candidate = `${base}-${suffix}`
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const { id } = await params
    const body = (await request.json()) as {
      name?: string
      type?: ProductMasterType
      parentId?: string | null
      isActive?: boolean
    }

    const existing = await db.productMaster.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Master not found" }, { status: 404 })

    const nextName = body.name?.trim() || existing.name
    const nextType = body.type && TYPES.has(body.type) ? body.type : existing.type
    const nextParentId = body.parentId === undefined ? existing.parentId : body.parentId?.trim() || null

    if (nextType === "SUBCATEGORY" && !nextParentId) {
      return NextResponse.json({ error: "Subcategory requires parent category" }, { status: 400 })
    }

    if (nextType === "SUBCATEGORY" && nextParentId) {
      const parent = await db.productMaster.findUnique({
        where: { id: nextParentId },
        select: { type: true },
      })
      if (!parent || parent.type !== "CATEGORY") {
        return NextResponse.json({ error: "Parent must be a category" }, { status: 400 })
      }
    }

    const nextSlug = await createUniqueSlug(nextType, nextName, id)

    const updated = await db.productMaster.update({
      where: { id },
      data: {
        name: nextName,
        type: nextType,
        slug: nextSlug,
        parentId: nextParentId,
        isActive: typeof body.isActive === "boolean" ? body.isActive : existing.isActive,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[admin/product-masters/id/patch]", error)
    return NextResponse.json({ error: "Failed to update product master" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const { id } = await params
    const existing = await db.productMaster.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Master not found" }, { status: 404 })

    await db.productMaster.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[admin/product-masters/id/delete]", error)
    return NextResponse.json({ error: "Failed to delete product master" }, { status: 500 })
  }
}

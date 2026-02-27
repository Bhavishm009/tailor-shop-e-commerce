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

async function createUniqueSlug(type: ProductMasterType, name: string) {
  const base = slugify(name) || `item-${Date.now()}`
  let candidate = base
  let suffix = 1

  // Ensure unique slug per type to prevent DB 500 on duplicate names.
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

    if (!existing) return candidate
    suffix += 1
    candidate = `${base}-${suffix}`
  }
}

export async function GET(request: Request) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const url = new URL(request.url)
    const type = url.searchParams.get("type")
    const q = url.searchParams.get("q")?.trim() || ""
    const includeInactive = url.searchParams.get("includeInactive") === "1"
    const parentId = url.searchParams.get("parentId")?.trim() || ""

    const where = {
      ...(type && TYPES.has(type as ProductMasterType) ? { type: type as ProductMasterType } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { slug: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(includeInactive ? {} : { isActive: true }),
      ...(parentId ? { parentId } : {}),
    }

    const items = await db.productMaster.findMany({
      where,
      orderBy: [{ type: "asc" }, { name: "asc" }],
      include: {
        parent: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error("[admin/product-masters/get]", error)
    return NextResponse.json({ error: "Failed to fetch product masters" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const body = (await request.json()) as {
      name?: string
      type?: ProductMasterType
      parentId?: string | null
      isActive?: boolean
    }

    const name = body.name?.trim() || ""
    const type = body.type
    const parentId = body.parentId?.trim() || null

    if (!name || !type || !TYPES.has(type)) {
      return NextResponse.json({ error: "Name and valid type are required" }, { status: 400 })
    }

    if (type === "SUBCATEGORY" && !parentId) {
      return NextResponse.json({ error: "Subcategory requires parent category" }, { status: 400 })
    }

    if (type === "SUBCATEGORY" && parentId) {
      const parent = await db.productMaster.findUnique({
        where: { id: parentId },
        select: { type: true },
      })
      if (!parent || parent.type !== "CATEGORY") {
        return NextResponse.json({ error: "Parent must be a category" }, { status: 400 })
      }
    }

    const slug = await createUniqueSlug(type, name)

    const master = await db.productMaster.create({
      data: {
        name,
        type,
        slug,
        parentId,
        isActive: typeof body.isActive === "boolean" ? body.isActive : true,
      },
    })

    return NextResponse.json(master, { status: 201 })
  } catch (error) {
    console.error("[admin/product-masters/post]", error)
    return NextResponse.json({ error: "Failed to create product master" }, { status: 500 })
  }
}

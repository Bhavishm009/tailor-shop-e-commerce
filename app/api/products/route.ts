import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0)
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")

export async function GET(request: NextRequest) {
  try {
    const includeAll = request.nextUrl.searchParams.get("all") === "1"
    const q = request.nextUrl.searchParams.get("q")?.trim() || ""
    const category = request.nextUrl.searchParams.get("category")?.trim() || ""
    const material = request.nextUrl.searchParams.get("material")?.trim() || ""
    const clothType = request.nextUrl.searchParams.get("clothType")?.trim() || ""
    const color = request.nextUrl.searchParams.get("color")?.trim() || ""
    const size = request.nextUrl.searchParams.get("size")?.trim() || ""
    const paginated = request.nextUrl.searchParams.get("paginated") === "1"
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") || "1") || 1)
    const pageSize = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get("pageSize") || "20") || 20))
    const skip = (page - 1) * pageSize

    if (includeAll) {
      const { response } = await requireRole("ADMIN")
      if (response) return response
    }

    const where = {
      ...(includeAll ? {} : { isActive: true }),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
              { category: { contains: q, mode: "insensitive" as const } },
              { material: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(category ? { category } : {}),
      ...(material ? { material } : {}),
      ...(clothType ? { clothType } : {}),
      ...(color ? { colors: { array_contains: [color] } } : {}),
      ...(size ? { size: { contains: size, mode: "insensitive" as const } } : {}),
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      db.product.count({ where }),
    ])

    if (!paginated) {
      return NextResponse.json(products)
    }

    return NextResponse.json({ items: products, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) })
  } catch (error) {
    console.error("[products]", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const body = (await request.json()) as {
      name?: string
      description?: string
      price?: number
      image?: string | null
      images?: string[]
      videos?: string[]
      category?: string
      subcategory?: string | null
      clothType?: string | null
      size?: string | null
      color?: string | null
      colors?: string[]
      material?: string | null
      tags?: string[]
      highlights?: string[]
      seoTitle?: string | null
      seoDescription?: string | null
      seoKeywords?: string | null
      canonicalUrl?: string | null
      categoryId?: string | null
      subcategoryId?: string | null
      clothTypeId?: string | null
      materialId?: string | null
      sizeIds?: string[]
      colorIds?: string[]
      stock?: number
      isActive?: boolean
      faqIds?: string[]
    }

    const name = body.name?.trim() || ""
    const categoryName = body.category?.trim() || ""

    if (!name || (!categoryName && !body.categoryId) || typeof body.price !== "number" || Number.isNaN(body.price)) {
      return NextResponse.json({ error: "Name, category and valid price are required" }, { status: 400 })
    }

    const products = await db.product.findMany({
      where: {
        name,
      },
      select: {
        id: true,
      },
    })

    if (products.length > 0) {
      return NextResponse.json({ error: "Product with same name already exists" }, { status: 409 })
    }

    const [categoryMaster, subcategoryMaster, clothTypeMaster, materialMaster, sizeMasters, colorMasters] = await Promise.all([
      body.categoryId ? db.productMaster.findFirst({ where: { id: body.categoryId, type: "CATEGORY", isActive: true } }) : Promise.resolve(null),
      body.subcategoryId ? db.productMaster.findFirst({ where: { id: body.subcategoryId, type: "SUBCATEGORY", isActive: true } }) : Promise.resolve(null),
      body.clothTypeId ? db.productMaster.findFirst({ where: { id: body.clothTypeId, type: "CLOTH_TYPE", isActive: true } }) : Promise.resolve(null),
      body.materialId ? db.productMaster.findFirst({ where: { id: body.materialId, type: "MATERIAL", isActive: true } }) : Promise.resolve(null),
      Array.isArray(body.sizeIds) && body.sizeIds.length > 0
        ? db.productMaster.findMany({ where: { id: { in: body.sizeIds }, type: "SIZE", isActive: true } })
        : Promise.resolve([]),
      Array.isArray(body.colorIds) && body.colorIds.length > 0
        ? db.productMaster.findMany({ where: { id: { in: body.colorIds }, type: "COLOR", isActive: true } })
        : Promise.resolve([]),
    ])

    const product = await db.product.create({
      data: {
        name,
        slug: slugify(name),
        description: body.description?.trim() || null,
        price: body.price,
        image: body.image || null,
        images: toStringArray(body.images),
        videos: toStringArray(body.videos),
        category: categoryMaster?.name || categoryName,
        subcategory: body.subcategory?.trim() || null,
        clothType: clothTypeMaster?.name || body.clothType?.trim() || null,
        size: body.size?.trim() || null,
        color: body.color?.trim() || null,
        colors: colorMasters.length > 0 ? colorMasters.map((item) => item.name) : toStringArray(body.colors),
        material: materialMaster?.name || body.material?.trim() || null,
        categoryId: categoryMaster?.id || null,
        subcategoryId: subcategoryMaster?.id || null,
        clothTypeId: clothTypeMaster?.id || null,
        materialId: materialMaster?.id || null,
        tags: toStringArray(body.tags),
        highlights: toStringArray(body.highlights),
        seoTitle: body.seoTitle?.trim() || null,
        seoDescription: body.seoDescription?.trim() || null,
        seoKeywords: body.seoKeywords?.trim() || null,
        canonicalUrl: body.canonicalUrl?.trim() || null,
        stock: typeof body.stock === "number" && !Number.isNaN(body.stock) ? Math.max(0, Math.floor(body.stock)) : 0,
        isActive: typeof body.isActive === "boolean" ? body.isActive : true,
        faqs: Array.isArray(body.faqIds) && body.faqIds.length > 0
          ? {
              create: body.faqIds.map((faqId, index) => ({
                faqId,
                order: index,
              })),
            }
          : undefined,
        masterSelections: [...sizeMasters, ...colorMasters].length
          ? {
              create: [...sizeMasters, ...colorMasters].map((item) => ({
                masterId: item.id,
              })),
            }
          : undefined,
      },
      include: {
        faqs: {
          include: { faq: true },
          orderBy: { order: "asc" },
        },
        masterSelections: {
          include: { master: true },
        },
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error("[products/create]", error)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}

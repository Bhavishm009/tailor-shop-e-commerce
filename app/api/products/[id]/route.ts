import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/api-auth"
import { deleteManyImageKitFilesByUrls } from "@/lib/imagekit"

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

const collectProductMediaUrls = (product: {
  image?: string | null
  images?: unknown
  videos?: unknown
}) =>
  Array.from(
    new Set([
      product.image?.trim() || "",
      ...toStringArray(product.images),
      ...toStringArray(product.videos),
    ].filter(Boolean)),
  )

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const authResult = await requireAuth()
    const isAdmin = Boolean(authResult.session?.user?.role === "ADMIN")

    const product = await db.product.findFirst({
      where: isAdmin ? { id } : { id, isActive: true },
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
      subcategory?: string
      clothType?: string
      material?: string
      color?: string
      colors?: string[]
      size?: string
      categoryId?: string | null
      subcategoryId?: string | null
      clothTypeId?: string | null
      materialId?: string | null
      sizeIds?: string[]
      colorIds?: string[]
      stock?: number
      image?: string | null
      images?: string[]
      videos?: string[]
      tags?: string[]
      highlights?: string[]
      seoTitle?: string
      seoDescription?: string
      seoKeywords?: string
      canonicalUrl?: string
      isActive?: boolean
      faqIds?: string[]
    }

    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }
    const existingMediaUrls = collectProductMediaUrls(existing)

    const nextName = body.name?.trim() || existing.name

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

    const updated = await db.$transaction(async (tx) => {
      const result = await tx.product.update({
        where: { id },
        data: {
          name: nextName,
          slug: slugify(nextName),
          description: body.description === undefined ? existing.description : body.description || null,
          price: typeof body.price === "number" && !Number.isNaN(body.price) ? body.price : existing.price,
          category: categoryMaster?.name || body.category?.trim() || existing.category,
          subcategory: body.subcategory === undefined ? existing.subcategory : body.subcategory?.trim() || null,
          clothType: body.clothType === undefined ? existing.clothType : clothTypeMaster?.name || body.clothType?.trim() || null,
          material: body.material === undefined ? existing.material : materialMaster?.name || body.material || null,
          color: body.color === undefined ? existing.color : body.color || null,
          colors:
            body.colors === undefined && (!body.colorIds || body.colorIds.length === 0)
              ? undefined
              : colorMasters.length > 0
                ? colorMasters.map((item) => item.name)
                : toStringArray(body.colors),
          size: body.size === undefined ? existing.size : body.size || null,
          categoryId: body.categoryId === undefined ? existing.categoryId : categoryMaster?.id || null,
          subcategoryId: body.subcategoryId === undefined ? existing.subcategoryId : subcategoryMaster?.id || null,
          clothTypeId: body.clothTypeId === undefined ? existing.clothTypeId : clothTypeMaster?.id || null,
          materialId: body.materialId === undefined ? existing.materialId : materialMaster?.id || null,
          stock: typeof body.stock === "number" && !Number.isNaN(body.stock) ? body.stock : existing.stock,
          image: body.image === undefined ? existing.image : body.image || null,
          images: body.images === undefined ? undefined : toStringArray(body.images),
          videos: body.videos === undefined ? undefined : toStringArray(body.videos),
          tags: body.tags === undefined ? undefined : toStringArray(body.tags),
          highlights: body.highlights === undefined ? undefined : toStringArray(body.highlights),
          seoTitle: body.seoTitle === undefined ? existing.seoTitle : body.seoTitle || null,
          seoDescription: body.seoDescription === undefined ? existing.seoDescription : body.seoDescription || null,
          seoKeywords: body.seoKeywords === undefined ? existing.seoKeywords : body.seoKeywords || null,
          canonicalUrl: body.canonicalUrl === undefined ? existing.canonicalUrl : body.canonicalUrl || null,
          isActive: typeof body.isActive === "boolean" ? body.isActive : existing.isActive,
        },
      })

      if (Array.isArray(body.faqIds)) {
        await tx.productFaq.deleteMany({ where: { productId: id } })
        if (body.faqIds.length > 0) {
          await tx.productFaq.createMany({
            data: body.faqIds.map((faqId, index) => ({
              productId: id,
              faqId,
              order: index,
            })),
          })
        }
      }

      if (Array.isArray(body.sizeIds) || Array.isArray(body.colorIds)) {
        const nextMasterIds = [...sizeMasters, ...colorMasters].map((item) => item.id)
        await tx.productMasterSelection.deleteMany({
          where: {
            productId: id,
            master: { type: { in: ["SIZE", "COLOR"] } },
          },
        })
        if (nextMasterIds.length > 0) {
          await tx.productMasterSelection.createMany({
            data: nextMasterIds.map((masterId) => ({
              productId: id,
              masterId,
            })),
            skipDuplicates: true,
          })
        }
      }

      return result
    })

    const updatedMediaUrls = collectProductMediaUrls(updated)
    const updatedMediaSet = new Set(updatedMediaUrls)
    const urlsToDelete = existingMediaUrls.filter((url) => !updatedMediaSet.has(url))
    if (urlsToDelete.length > 0) {
      await deleteManyImageKitFilesByUrls(urlsToDelete)
    }

    const full = await db.product.findUnique({
      where: { id: updated.id },
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

    return NextResponse.json(full)
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
    const mediaUrlsToDelete = collectProductMediaUrls(existing)

    await db.product.delete({ where: { id } })
    if (mediaUrlsToDelete.length > 0) {
      await deleteManyImageKitFilesByUrls(mediaUrlsToDelete)
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[products/delete]", error)
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 })
  }
}

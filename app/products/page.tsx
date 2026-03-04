import type { Metadata } from "next"
import Link from "next/link"
import { db } from "@/lib/db"
import { GlobalNavbar } from "@/components/global-navbar"
import { SiteFooter } from "@/components/site-footer"
import { Card } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { ProductsMobileFilter } from "@/components/products-mobile-filter"
import { ProductListingCard } from "@/components/product-listing-card"
import { getServerDictionary, getServerLanguage } from "@/lib/i18n-server"
import { localizeCatalogLabel } from "@/lib/localize"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

type ProductsPageProps = {
  searchParams: Promise<{
    q?: string
    category?: string
    material?: string
    clothType?: string
    color?: string
    size?: string
    min?: string
    max?: string
    sort?: string
    page?: string
  }>
}

const PAGE_SIZE = 12

type ParsedProductsParams = {
  q: string
  category: string
  material: string
  clothType: string
  color: string
  size: string
  min: number | undefined
  max: number | undefined
  sort: string
  page: number
}

function toPositiveNumber(value: string | undefined) {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

const parseParams = (
  params: Awaited<ProductsPageProps["searchParams"]>,
): ParsedProductsParams => ({
  q: (params.q || "").trim(),
  category: (params.category || "").trim(),
  material: (params.material || "").trim(),
  clothType: (params.clothType || "").trim(),
  color: (params.color || "").trim(),
  size: (params.size || "").trim(),
  min: toPositiveNumber(params.min),
  max: toPositiveNumber(params.max),
  sort: params.sort || "newest",
  page: Math.max(1, Number(params.page || "1") || 1),
})

function createProductsQuery(
  params: ParsedProductsParams,
  overrides?: Partial<Record<keyof ParsedProductsParams, string | number | undefined>>,
) {
  const query = new URLSearchParams()
  const merged = {
    q: params.q,
    category: params.category,
    material: params.material,
    clothType: params.clothType,
    color: params.color,
    size: params.size,
    min: params.min?.toString() || "",
    max: params.max?.toString() || "",
    sort: params.sort,
    page: params.page.toString(),
    ...(overrides || {}),
  }

  for (const [key, value] of Object.entries(merged)) {
    if (!value) continue
    if (key === "page" && value === "1") continue
    if (key === "sort" && value === "newest") continue
    query.set(key, String(value))
  }

  return query
}

function getPaginationSlots(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const slots: Array<number | "ellipsis"> = [1]
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  if (start > 2) slots.push("ellipsis")
  for (let page = start; page <= end; page += 1) {
    slots.push(page)
  }
  if (end < totalPages - 1) slots.push("ellipsis")
  slots.push(totalPages)

  return slots
}

export async function generateMetadata({ searchParams }: ProductsPageProps): Promise<Metadata> {
  const parsed = parseParams(await searchParams)
  const tags = [parsed.category, parsed.material, parsed.clothType, parsed.color, parsed.size].filter(Boolean)
  const titlePrefix = parsed.q ? `Search "${parsed.q}"` : tags.length > 0 ? tags.join(" | ") : "Products"
  const query = createProductsQuery(parsed)
  const canonicalPath = `/products${query.size > 0 ? `?${query.toString()}` : ""}`
  const description = parsed.q
    ? `Browse TailorHub products for "${parsed.q}" with ready-made clothing filters and pricing options.`
    : `Shop TailorHub products${tags.length > 0 ? ` in ${tags.join(", ")}` : ""} with filterable categories, colors, sizes, and materials.`

  return {
    title: `${titlePrefix} | TailorHub`,
    description,
    keywords: ["tailorhub", "ready-made clothing", "fashion", "online shopping", ...tags, parsed.q].filter(Boolean),
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: `${titlePrefix} | TailorHub`,
      description,
      url: canonicalPath,
      type: "website",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: "TailorHub products and custom tailoring",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${titlePrefix} | TailorHub`,
      description,
      images: ["/twitter-image"],
    },
  }
}

export default async function PublicProductsPage({ searchParams }: ProductsPageProps) {
  const [dict, lang] = await Promise.all([getServerDictionary(), getServerLanguage()])
  const parsed = parseParams(await searchParams)
  const { q, category, material, clothType, color, size, min, max, page, sort } = parsed

  const where = {
    isActive: true,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
            { category: { contains: q, mode: "insensitive" as const } },
            { material: { contains: q, mode: "insensitive" as const } },
            { clothType: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(category ? { category } : {}),
    ...(material ? { material } : {}),
    ...(clothType ? { clothType } : {}),
    ...(color ? { colors: { array_contains: [color] } } : {}),
    ...(size ? { size: { contains: size, mode: "insensitive" as const } } : {}),
    ...(min !== undefined || max !== undefined
      ? {
          price: {
            ...(min !== undefined ? { gte: min } : {}),
            ...(max !== undefined ? { lte: max } : {}),
          },
        }
      : {}),
  }

  const orderBy =
    sort === "price_asc"
      ? ({ price: "asc" } as const)
      : sort === "price_desc"
        ? ({ price: "desc" } as const)
        : sort === "name_asc"
          ? ({ name: "asc" } as const)
          : ({ createdAt: "desc" } as const)

  const [total, masters] = await Promise.all([
    db.product.count({ where }),
    db.productMaster.findMany({
      where: { isActive: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const products = await db.product.findMany({
    where,
    orderBy,
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  })

  const categories = masters.filter((item) => item.type === "CATEGORY").map((item) => item.name)
  const materials = masters.filter((item) => item.type === "MATERIAL").map((item) => item.name)
  const clothTypes = masters.filter((item) => item.type === "CLOTH_TYPE").map((item) => item.name)
  const sizes = masters.filter((item) => item.type === "SIZE").map((item) => item.name)
  const colors = masters.filter((item) => item.type === "COLOR").map((item) => item.name)
  const paginationSlots = getPaginationSlots(safePage, totalPages)

  const buildHref = (next: Partial<Record<string, string>>) => {
    const query = createProductsQuery(parsed, { page: safePage, ...next })
    return `/products${query.toString() ? `?${query}` : ""}`
  }

  const collectionPageSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: dict.productsPage.title,
    description: dict.productsPage.subtitle,
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}${buildHref({})}`,
  }
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: dict.common.home, item: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}` },
      { "@type": "ListItem", position: 2, name: dict.common.products, item: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/products` },
    ],
  }
  const productsListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${dict.common.products} - Page ${safePage}`,
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/products/${product.id}`,
      item: {
        "@type": "Product",
        name: product.name,
        image: product.image || undefined,
        offers: {
          "@type": "Offer",
          priceCurrency: "INR",
          price: product.price,
          availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/products/${product.id}`,
        },
      },
    })),
  }

  return (
    <main className="min-h-screen bg-background">
      <GlobalNavbar />
      <section className="max-w-7xl mx-auto px-4 py-10 space-y-6">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productsListSchema) }} />
        <div className="space-y-2">
          <h1 className="text-2xl md:text-4xl font-bold">{dict.productsPage.title}</h1>
          <p className="text-muted-foreground">{dict.productsPage.subtitle}</p>
        </div>

        <ProductsMobileFilter
          q={q}
          category={category}
          material={material}
          clothType={clothType}
          color={color}
          size={size}
          min={min?.toString() || ""}
          max={max?.toString() || ""}
          sort={sort}
          categories={categories}
          materials={materials}
          clothTypes={clothTypes}
          sizes={sizes}
          colors={colors}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <aside className="hidden lg:block">
            <Card className="p-4 sticky top-24 space-y-3">
              <h2 className="font-semibold">{dict.common.filters}</h2>
              <form action="/products" className="space-y-3">
                <input name="q" defaultValue={q} placeholder={dict.productsPage.searchPlaceholder} className="h-10 w-full rounded-md border bg-background px-3" />
                <select name="category" defaultValue={category} className="h-10 w-full rounded-md border bg-background px-3">
                  <option value="">{dict.common.allCategories}</option>
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {localizeCatalogLabel(item, lang) || item}
                    </option>
                  ))}
                </select>
                <select name="material" defaultValue={material} className="h-10 w-full rounded-md border bg-background px-3">
                  <option value="">{dict.common.allMaterials}</option>
                  {materials.map((item) => (
                    <option key={item} value={item}>
                      {localizeCatalogLabel(item, lang) || item}
                    </option>
                  ))}
                </select>
                <select name="clothType" defaultValue={clothType} className="h-10 w-full rounded-md border bg-background px-3">
                  <option value="">{dict.common.allClothTypes}</option>
                  {clothTypes.map((item) => (
                    <option key={item} value={item}>
                      {localizeCatalogLabel(item, lang) || item}
                    </option>
                  ))}
                </select>
                <select name="color" defaultValue={color} className="h-10 w-full rounded-md border bg-background px-3">
                  <option value="">{dict.common.allColors}</option>
                  {colors.map((item) => (
                    <option key={item} value={item}>
                      {localizeCatalogLabel(item, lang) || item}
                    </option>
                  ))}
                </select>
                <select name="size" defaultValue={size} className="h-10 w-full rounded-md border bg-background px-3">
                  <option value="">{dict.common.allSizes}</option>
                  {sizes.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input name="min" type="number" min="0" defaultValue={min?.toString() || ""} placeholder={dict.productsPage.minPrice} className="h-10 rounded-md border bg-background px-3" />
                  <input name="max" type="number" min="0" defaultValue={max?.toString() || ""} placeholder={dict.productsPage.maxPrice} className="h-10 rounded-md border bg-background px-3" />
                </div>
                <select name="sort" defaultValue={sort} className="h-10 w-full rounded-md border bg-background px-3">
                  <option value="newest">{dict.common.newest}</option>
                  <option value="price_asc">{dict.common.priceLowToHigh}</option>
                  <option value="price_desc">{dict.common.priceHighToLow}</option>
                  <option value="name_asc">{dict.common.nameAZ}</option>
                </select>
                <button type="submit" className="h-10 w-full rounded-md bg-primary text-primary-foreground">
                  {dict.common.applyFilters}
                </button>
              </form>
            </Card>
          </aside>

          <div className="space-y-6">
            {products.length === 0 ? (
              <Card className="p-0">
                <Empty className="border-0 p-10">
                  <EmptyHeader>
                    <EmptyTitle>{dict.productsPage.noProductsTitle}</EmptyTitle>
                    <EmptyDescription>{dict.productsPage.noProductsDesc}</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
                {products.map((product) => {
                  return (
                    <ProductListingCard
                      key={product.id}
                      id={product.id}
                      name={product.name}
                      description={product.description}
                      price={product.price}
                      category={product.category}
                      clothType={product.clothType}
                      material={product.material}
                      stock={product.stock}
                      image={product.image}
                      images={product.images}
                      videos={product.videos}
                    />
                  )
                })}
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {dict.productsPage.showingPage} {safePage} of {totalPages} ({total} items)
              </p>
            </div>

            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={buildHref({ page: String(Math.max(1, safePage - 1)) })}
                    className={safePage <= 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                {paginationSlots.map((slot, index) => (
                  <PaginationItem key={`${slot}-${index}`}>
                    {slot === "ellipsis" ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink href={buildHref({ page: String(slot) })} isActive={slot === safePage}>
                        {slot}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href={buildHref({ page: String(Math.min(totalPages, safePage + 1)) })}
                    className={safePage >= totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { GlobalNavbar } from "@/components/global-navbar"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AddToCartButton } from "@/components/add-to-cart-button"
import { ProductMediaCarousel } from "@/components/product-media-carousel"
import { WishlistToggleButton } from "@/components/wishlist-toggle-button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ProductRailCarousel } from "@/components/product-rail-carousel"
import { ProductReviewsSection } from "@/components/product-reviews-section"
import { getServerDictionary, getServerLanguage } from "@/lib/i18n-server"
import { getLocalizedText, localizeCatalogLabel } from "@/lib/localize"

type ProductDetailsProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ color?: string; size?: string }>
}

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
}

function isMissingProductReviewTable(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code ?? "") : ""
  const metaTable =
    typeof error === "object" && error !== null && "meta" in error
      ? String(((error as { meta?: { table?: unknown } }).meta?.table as string | undefined) ?? "")
      : ""
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : ""

  return (
    (error instanceof Prisma.PrismaClientKnownRequestError || code === "P2021") &&
    (metaTable.includes("ProductReview") || message.includes("ProductReview") || message.includes("does not exist"))
  )
}

async function getProduct(id: string) {
  return db.product.findFirst({
    where: {
      id,
      isActive: true,
    },
    include: {
      faqs: {
        include: { faq: true },
        orderBy: { order: "asc" },
      },
      masterSelections: {
        include: {
          master: true,
        },
      },
    },
  })
}

export async function generateMetadata({ params, searchParams }: ProductDetailsProps): Promise<Metadata> {
  const { id } = await params
  const query = await searchParams
  const product = await getProduct(id)

  if (!product) {
    return {
      title: "Product Not Found | TailorHub",
    }
  }

  const selectedColor = (query.color || "").trim()
  const selectedSize = (query.size || "").trim()
  const queryString = new URLSearchParams()
  if (selectedColor) queryString.set("color", selectedColor)
  if (selectedSize) queryString.set("size", selectedSize)
  const canonicalPath = `/products/${product.id}${queryString.toString() ? `?${queryString}` : ""}`
  const variantTitle = [selectedColor ? `Color: ${selectedColor}` : "", selectedSize ? `Size: ${selectedSize}` : ""]
    .filter(Boolean)
    .join(" | ")

  return {
    title: product.seoTitle || `${product.name}${variantTitle ? ` (${variantTitle})` : ""} | TailorHub`,
    description: product.seoDescription || product.description || `Buy ${product.name} online at TailorHub.`,
    keywords: product.seoKeywords || undefined,
    alternates: {
      canonical: product.canonicalUrl || canonicalPath,
    },
    openGraph: {
      title: product.seoTitle || `${product.name}${variantTitle ? ` (${variantTitle})` : ""}`,
      description: product.seoDescription || product.description || "",
      url: product.canonicalUrl || canonicalPath,
      type: "website",
      images: product.image ? [{ url: product.image }] : undefined,
    },
  }
}

export default async function ProductDetailsPage({ params, searchParams }: ProductDetailsProps) {
  const { id } = await params
  const query = await searchParams
  const [dict, lang] = await Promise.all([getServerDictionary(), getServerLanguage()])
  const product = await getProduct(id)

  if (!product) {
    notFound()
  }

  const session = await auth()
  const userId = session?.user?.id

  const recommendationRules = [
    ...(product.material ? [{ material: product.material }] : []),
    ...(product.clothType ? [{ clothType: product.clothType }] : []),
  ]

  const [related, recommendedBase, reviews, aggregate] = await Promise.all([
    db.product.findMany({
      where: {
        isActive: true,
        category: product.category,
        id: { not: product.id },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    db.product.findMany({
      where:
        recommendationRules.length > 0
          ? {
            isActive: true,
            id: { not: product.id },
            OR: recommendationRules,
          }
          : {
            isActive: true,
            id: { not: product.id },
          },
      orderBy: { createdAt: "desc" },
      take: 18,
    }),
    db.productReview
      .findMany({
        where: {
          productId: product.id,
          isApproved: true,
        },
        include: {
          customer: {
            select: {
              name: true,
              profileImage: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
      .catch((error) => {
        if (isMissingProductReviewTable(error)) return []
        throw error
      }),
    db.productReview
      .aggregate({
        where: {
          productId: product.id,
          isApproved: true,
        },
        _avg: { rating: true },
        _count: { _all: true },
      })
      .catch((error) => {
        if (isMissingProductReviewTable(error)) {
          return { _avg: { rating: null }, _count: { _all: 0 } }
        }
        throw error
      }),
  ])

  const relatedIds = new Set(related.map((item) => item.id))
  const recommended = recommendedBase.filter((item) => !relatedIds.has(item.id)).slice(0, 12)

  let canReview = false
  let reviewReason: "not-signed-in" | "not-customer" | "not-delivered" | "already-reviewed" | "eligible" = "not-signed-in"

  if (session?.user?.role === "CUSTOMER" && userId) {
    const [deliveredItem, existingReview] = await Promise.all([
      db.orderItem.findFirst({
        where: {
          productId: product.id,
          order: {
            customerId: userId,
            status: "DELIVERED",
          },
        },
        select: { id: true },
      }),
      db.productReview
        .findFirst({
          where: {
            productId: product.id,
            customerId: userId,
          },
          select: { id: true },
        })
        .catch((error) => {
          if (isMissingProductReviewTable(error)) return null
          throw error
        }),
    ])

    if (!deliveredItem) {
      reviewReason = "not-delivered"
    } else if (existingReview) {
      reviewReason = "already-reviewed"
    } else {
      reviewReason = "eligible"
      canReview = true
    }
  } else if (session?.user?.id) {
    reviewReason = "not-customer"
  }

  const images = Array.from(new Set([product.image, ...toStringArray(product.images)].filter(Boolean) as string[]))
  const videos = toStringArray(product.videos)
  const colors = Array.from(
    new Set([
      ...toStringArray(product.colors),
      ...product.masterSelections.filter((entry) => entry.master.type === "COLOR").map((entry) => entry.master.name),
    ]),
  )
  const sizes = Array.from(
    new Set([
      ...(product.size ? [product.size] : []),
      ...product.masterSelections.filter((entry) => entry.master.type === "SIZE").map((entry) => entry.master.name),
    ]),
  )
  const highlights = toStringArray(product.highlights)
  const queryColor = (query.color || "").trim()
  const querySize = (query.size || "").trim()
  const selectedColor = colors.includes(queryColor) ? queryColor : ""
  const selectedSize = sizes.includes(querySize) ? querySize : ""
  const localizedName = getLocalizedText(product.name, lang, product.name)
  const localizedDescription = getLocalizedText(product.description, lang, product.description || dict.common.noDescription)

  const buildVariantHref = (next: { color?: string; size?: string }) => {
    const queryString = new URLSearchParams()
    const nextColor = next.color === undefined ? selectedColor : next.color
    const nextSize = next.size === undefined ? selectedSize : next.size
    if (nextColor) queryString.set("color", nextColor)
    if (nextSize) queryString.set("size", nextSize)
    return `/products/${product.id}${queryString.toString() ? `?${queryString}` : ""}`
  }

  const canonicalPath = `${baseUrl}/products/${product.id}`
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: dict.common.home, item: baseUrl },
      { "@type": "ListItem", position: 2, name: dict.common.products, item: `${baseUrl}/products` },
      { "@type": "ListItem", position: 3, name: localizedName, item: canonicalPath },
    ],
  }

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || "",
    image: images,
    sku: product.id,
    category: product.category,
    aggregateRating:
      aggregate._count._all > 0
        ? {
          "@type": "AggregateRating",
          ratingValue: Number((aggregate._avg.rating || 0).toFixed(1)),
          reviewCount: aggregate._count._all,
        }
        : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.price,
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: canonicalPath,
    },
  }

  const faqSchema =
    product.faqs.length > 0
      ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: product.faqs.map((entry) => ({
          "@type": "Question",
          name: entry.faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: entry.faq.answer,
          },
        })),
      }
      : null

  const relatedCarouselSchema =
    related.length > 0
      ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Related Products Carousel",
        itemListElement: related.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${baseUrl}/products/${item.id}`,
        })),
      }
      : null

  const recommendedCarouselSchema =
    recommended.length > 0
      ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Recommended Products Carousel",
        itemListElement: recommended.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${baseUrl}/products/${item.id}`,
        })),
      }
      : null

  return (
    <main className="min-h-screen bg-background">
      <GlobalNavbar />
      <section className="max-w-7xl mx-auto px-4 py-10 space-y-10">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
        {faqSchema ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} /> : null}
        {relatedCarouselSchema ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(relatedCarouselSchema) }} />
        ) : null}
        {recommendedCarouselSchema ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(recommendedCarouselSchema) }} />
        ) : null}

        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-primary hover:underline">
                {dict.common.home}
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/products" className="hover:text-primary hover:underline">
                {dict.common.products}
              </Link>
            </li>
            <li>/</li>
            <li className="text-foreground truncate">{localizedName}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-6 xl:gap-8">
          <Card className="p-4 md:p-5 shadow-sm">
            <ProductMediaCarousel images={images} videos={videos} productName={localizedName} />
          </Card>

          <Card className="p-6 md:p-7 space-y-6 shadow-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{localizeCatalogLabel(product.category, lang) || product.category}</Badge>
              {product.clothType ? <Badge variant="outline">{localizeCatalogLabel(product.clothType, lang) || product.clothType}</Badge> : null}
              {product.material ? <Badge variant="outline">{localizeCatalogLabel(product.material, lang) || product.material}</Badge> : null}
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{localizedName}</h1>
              <p className="text-muted-foreground leading-relaxed">{localizedDescription}</p>
            </div>

            <div className="rounded-lg border bg-muted/20 p-4 grid grid-cols-2 gap-3 text-sm">
              <p>{dict.common.material}: {localizeCatalogLabel(product.material, lang) || product.material || dict.common.na}</p>
              <p>{dict.common.color}: {localizeCatalogLabel(selectedColor || product.color, lang) || selectedColor || product.color || dict.common.na}</p>
              <p>{dict.common.size}: {selectedSize || product.size || dict.common.na}</p>
              <p>{dict.common.stock}: {product.stock}</p>
            </div>

            {colors.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Choose Color</p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={buildVariantHref({ color: "" })}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${selectedColor ? "hover:bg-muted" : "bg-primary text-primary-foreground border-primary"}`}
                  >
                    Any
                  </Link>
                  {colors.map((entry) => (
                    <Link
                      key={entry}
                      href={buildVariantHref({ color: entry })}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${selectedColor === entry ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
                        }`}
                    >
                      {localizeCatalogLabel(entry, lang) || entry}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {sizes.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Choose Size</p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={buildVariantHref({ size: "" })}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${selectedSize ? "hover:bg-muted" : "bg-primary text-primary-foreground border-primary"}`}
                  >
                    Any
                  </Link>
                  {sizes.map((entry) => (
                    <Link
                      key={entry}
                      href={buildVariantHref({ size: entry })}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${selectedSize === entry ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
                        }`}
                    >
                      {entry}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {highlights.length > 0 ? (
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                {highlights.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            ) : null}

            <div className="space-y-3">
              <p className="text-3xl font-bold tracking-tight">Rs. {product.price.toFixed(2)}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <AddToCartButton
                  className="w-full"
                  id={product.id}
                  name={localizedName}
                  price={product.price}
                  image={images[0] || null}
                  stock={product.stock}
                />
                <WishlistToggleButton id={product.id} name={localizedName} price={product.price} image={images[0] || null} />
              </div>
            </div>
          </Card>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">Product FAQs</h2>
          {product.faqs.length === 0 ? (
            <Card className="p-6 text-muted-foreground">No FAQs available for this product yet.</Card>
          ) : (
            <Card className="p-2 md:p-4">
              <Accordion type="single" collapsible className="w-full">
                {product.faqs.map((entry) => (
                  <AccordionItem key={entry.id} value={entry.id} className="px-3">
                    <AccordionTrigger className="text-base font-semibold hover:no-underline">{entry.faq.question}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{entry.faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
          )}
        </section>

        {reviews.length > 0 ? (
          <ProductReviewsSection
            productId={product.id}
            canReview={canReview}
            reason={reviewReason}
            initialReviews={reviews.map((review) => ({
              id: review.id,
              rating: review.rating,
              title: review.title,
              comment: review.comment,
              photos: toStringArray(review.photos),
              createdAt: review.createdAt.toISOString(),
              customer: {
                name: review.customer.name,
                profileImage: review.customer.profileImage || null,
              },
            }))}
          />) : null}

        {related.length > 0 ? (
          <ProductRailCarousel
            title="Related Products"
            subtitle="Products from the same category"
            items={related}
          />
        ) : null}

        {recommended.length > 0 ? (
          <ProductRailCarousel
            title="Recommended For You"
            subtitle="Picked from similar styles and materials"
            items={recommended}
          />
        ) : null}
      </section>
    </main>
  )
}

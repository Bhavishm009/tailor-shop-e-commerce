import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { db } from "@/lib/db"
import { GlobalNavbar } from "@/components/global-navbar"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { scoreBlogSearch, scoreProductSearch } from "@/lib/search-ranking"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

type SearchParams = {
  q?: string
  type?: "all" | "products" | "blogs"
  page?: string
}

type SearchPageProps = {
  searchParams: Promise<SearchParams>
}

const PAGE_SIZE = 9
const SEARCH_CANDIDATE_LIMIT = 350
const SEARCH_FALLBACK_LIMIT = 500

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
}

function buildSearchQuery(q: string, type: string, page: number) {
  const query = new URLSearchParams()
  if (q) query.set("q", q)
  if (type && type !== "all") query.set("type", type)
  if (page > 1) query.set("page", String(page))
  return query
}

function getPaginationSlots(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)

  const slots: Array<number | "ellipsis"> = [1]
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  if (start > 2) slots.push("ellipsis")
  for (let page = start; page <= end; page += 1) slots.push(page)
  if (end < totalPages - 1) slots.push("ellipsis")
  slots.push(totalPages)

  return slots
}

function tokenizeQuery(input: string) {
  return input.toLowerCase().trim().split(/\s+/).filter(Boolean)
}

function buildProductCandidateWhere(query: string) {
  const tokens = Array.from(new Set(tokenizeQuery(query))).slice(0, 5)
  const tokenClauses = tokens.flatMap((token) => [
    { name: { contains: token, mode: "insensitive" as const } },
    { description: { contains: token, mode: "insensitive" as const } },
    { category: { contains: token, mode: "insensitive" as const } },
    { material: { contains: token, mode: "insensitive" as const } },
    { clothType: { contains: token, mode: "insensitive" as const } },
  ])

  return {
    isActive: true,
    OR: [
      { name: { contains: query, mode: "insensitive" as const } },
      { description: { contains: query, mode: "insensitive" as const } },
      { category: { contains: query, mode: "insensitive" as const } },
      { material: { contains: query, mode: "insensitive" as const } },
      { clothType: { contains: query, mode: "insensitive" as const } },
      ...tokenClauses,
    ],
  }
}

function buildBlogCandidateWhere(query: string) {
  const tokens = Array.from(new Set(tokenizeQuery(query))).slice(0, 5)
  const tokenClauses = tokens.flatMap((token) => [
    { title: { contains: token, mode: "insensitive" as const } },
    { excerpt: { contains: token, mode: "insensitive" as const } },
    { category: { contains: token, mode: "insensitive" as const } },
    { contentHtml: { contains: token, mode: "insensitive" as const } },
  ])

  return {
    isPublished: true,
    OR: [
      { title: { contains: query, mode: "insensitive" as const } },
      { excerpt: { contains: query, mode: "insensitive" as const } },
      { category: { contains: query, mode: "insensitive" as const } },
      { contentHtml: { contains: query, mode: "insensitive" as const } },
      ...tokenClauses,
    ],
  }
}

async function getRankedProducts(query: string) {
  let candidates = await db.product.findMany({
    where: buildProductCandidateWhere(query),
    orderBy: { createdAt: "desc" },
    take: SEARCH_CANDIDATE_LIMIT,
  })

  if (candidates.length < 20) {
    const fallback = await db.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: SEARCH_FALLBACK_LIMIT,
    })
    const seen = new Set(candidates.map((product) => product.id))
    for (const product of fallback) {
      if (!seen.has(product.id)) candidates.push(product)
    }
  }

  return candidates
    .map((product) => ({ product, score: scoreProductSearch(product, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return new Date(b.product.createdAt).getTime() - new Date(a.product.createdAt).getTime()
    })
    .map((item) => item.product)
}

async function getRankedBlogs(query: string) {
  let candidates = await db.blogPost.findMany({
    where: buildBlogCandidateWhere(query),
    orderBy: { createdAt: "desc" },
    take: SEARCH_CANDIDATE_LIMIT,
  })

  if (candidates.length < 20) {
    const fallback = await db.blogPost.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
      take: SEARCH_FALLBACK_LIMIT,
    })
    const seen = new Set(candidates.map((post) => post.id))
    for (const post of fallback) {
      if (!seen.has(post.id)) candidates.push(post)
    }
  }

  return candidates
    .map((post) => ({ post, score: scoreBlogSearch(post, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return new Date(b.post.createdAt).getTime() - new Date(a.post.createdAt).getTime()
    })
    .map((item) => item.post)
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = await searchParams
  const q = (params.q || "").trim()
  const type = params.type === "products" || params.type === "blogs" ? params.type : "all"
  const page = Math.max(1, Number(params.page || "1") || 1)
  const query = buildSearchQuery(q, type, page)
  const canonicalPath = `/search${query.toString() ? `?${query}` : ""}`

  if (!q) {
    return {
      title: "Search Products & Blogs | TailorHub",
      description: "Search TailorHub products and blog guides with shareable URLs and category filters.",
      alternates: { canonical: "/search" },
      openGraph: {
        title: "Search Products & Blogs | TailorHub",
        description: "Search TailorHub products and blog guides.",
        url: "/search",
        type: "website",
      },
    }
  }

  return {
    title: `${q} in ${type === "all" ? "Products & Blogs" : type === "products" ? "Products" : "Blogs"} | TailorHub`,
    description: `Search results for "${q}" on TailorHub ${type === "all" ? "across products and blogs" : `in ${type}`}.`,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: `${q} | TailorHub Search`,
      description: `Explore TailorHub search results for "${q}".`,
      url: canonicalPath,
      type: "website",
    },
  }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const q = (params.q || "").trim()
  const type = params.type === "products" || params.type === "blogs" ? params.type : "all"
  const page = Math.max(1, Number(params.page || "1") || 1)

  const buildHref = (next: Partial<{ q: string; type: "all" | "products" | "blogs"; page: number }>) => {
    const query = buildSearchQuery(next.q ?? q, next.type ?? type, next.page ?? page)
    return `/search${query.toString() ? `?${query}` : ""}`
  }

  if (!q) {
    const [latestProducts, latestBlogs] = await Promise.all([
      db.product.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      db.blogPost.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ])

    return (
      <main className="min-h-screen bg-background">
        <GlobalNavbar />
        <section className="max-w-7xl mx-auto px-4 py-10 space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold">Search TailorHub</h1>
            <p className="text-muted-foreground">Discover products and tailoring guides from one SEO-friendly search page.</p>
            <form action="/search" className="flex flex-col sm:flex-row gap-2 max-w-2xl">
              <input
                name="q"
                placeholder="Search products, fabrics, fit guides, blogs..."
                className="h-11 rounded-md border bg-background px-3 flex-1"
              />
              <button type="submit" className="h-11 px-5 rounded-md bg-primary text-primary-foreground">
                Search
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 space-y-3">
              <h2 className="font-semibold">Trending Searches</h2>
              <div className="flex flex-wrap gap-2">
                {[
                  "linen shirt",
                  "wedding sherwani",
                  "cotton kurta",
                  "summer outfit",
                  "tailoring tips",
                  "fabric care",
                ].map((term) => (
                  <Link key={term} href={`/search?q=${encodeURIComponent(term)}`} className="text-xs rounded-full border px-3 py-1 hover:bg-muted">
                    {term}
                  </Link>
                ))}
              </div>
            </Card>
            <Card className="p-5 space-y-3">
              <h2 className="font-semibold">Quick Navigation</h2>
              <div className="grid grid-cols-1 gap-2">
                <Link href="/products" className="text-sm hover:underline text-primary">
                  Browse all products
                </Link>
                <Link href="/blog" className="text-sm hover:underline text-primary">
                  Read tailoring blogs
                </Link>
                <Link href="/custom-stitching" className="text-sm hover:underline text-primary">
                  Explore custom stitching
                </Link>
              </div>
            </Card>
            <Card className="p-5 space-y-2">
              <h2 className="font-semibold">Search Scope</h2>
              <p className="text-sm text-muted-foreground">Products: name, category, material, and description.</p>
              <p className="text-sm text-muted-foreground">Blogs: title, category, excerpt, and article content.</p>
            </Card>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Latest Products</h2>
              <Link href="/search?type=products" className="text-sm text-primary hover:underline">
                Search products
              </Link>
            </div>
            {latestProducts.length === 0 ? (
              <Card className="p-6 text-muted-foreground">No products found.</Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {latestProducts.map((product) => {
                  const images = Array.from(new Set([product.image, ...toStringArray(product.images)].filter(Boolean) as string[]))
                  return (
                    <Card key={product.id} className="p-4 space-y-3">
                      {images[0] ? (
                        <Image src={images[0]} alt={product.name} width={960} height={640} className="h-36 w-full rounded-md object-cover" />
                      ) : (
                        <div className="h-36 rounded-md bg-muted" />
                      )}
                      <div className="space-y-1">
                        <h3 className="font-semibold line-clamp-1">{product.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{product.description || "No description available."}</p>
                        <p className="text-sm font-semibold">Rs. {product.price.toFixed(2)}</p>
                      </div>
                      <Link href={`/products/${product.id}`} className="text-sm text-primary hover:underline">
                        View product
                      </Link>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Latest Blogs</h2>
              <Link href="/search?type=blogs" className="text-sm text-primary hover:underline">
                Search blogs
              </Link>
            </div>
            {latestBlogs.length === 0 ? (
              <Card className="p-6 text-muted-foreground">No blog posts found.</Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {latestBlogs.map((post) => (
                  <Card key={post.id} className="p-4 space-y-2">
                    <Badge variant="outline" className="w-fit">
                      {post.category}
                    </Badge>
                    <h3 className="font-semibold line-clamp-2">{post.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
                    <Link href={`/blog/${post.slug}`} className="text-sm text-primary hover:underline">
                      Read article
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    )
  }

  if (type === "products") {
    const rankedProducts = await getRankedProducts(q)

    const total = rankedProducts.length
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const safePage = Math.min(page, totalPages)
    const products = rankedProducts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
    const slots = getPaginationSlots(safePage, totalPages)

    return (
      <main className="min-h-screen bg-background">
        <GlobalNavbar />
        <section className="max-w-7xl mx-auto px-4 py-10 space-y-6">
          <div className="space-y-3">
            <h1 className="text-2xl md:text-3xl font-bold">Search Results</h1>
            <form action="/search" className="flex flex-col sm:flex-row gap-2 max-w-2xl">
              <input name="q" defaultValue={q} className="h-11 rounded-md border bg-background px-3 flex-1" />
              <button type="submit" className="h-11 px-5 rounded-md bg-primary text-primary-foreground">
                Search
              </button>
            </form>
            <div className="flex flex-wrap gap-2">
              <Link href={buildHref({ type: "all", page: 1 })} className="text-xs rounded-full border px-3 py-1 hover:bg-muted">
                All
              </Link>
              <Link href={buildHref({ type: "products", page: 1 })} className="text-xs rounded-full border px-3 py-1 bg-primary text-primary-foreground border-primary">
                Products
              </Link>
              <Link href={buildHref({ type: "blogs", page: 1 })} className="text-xs rounded-full border px-3 py-1 hover:bg-muted">
                Blogs
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">{total} product matches for "{q}".</p>
          </div>

          {products.length === 0 ? (
            <Card className="p-8 text-muted-foreground">No matching products found.</Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => {
                const images = Array.from(new Set([product.image, ...toStringArray(product.images)].filter(Boolean) as string[]))
                return (
                  <Card key={product.id} className="p-4 space-y-3">
                    {images[0] ? (
                      <Image src={images[0]} alt={product.name} width={960} height={640} className="h-40 w-full rounded-md object-cover" />
                    ) : (
                      <div className="h-40 rounded-md bg-muted" />
                    )}
                    <h2 className="font-semibold line-clamp-1">{product.name}</h2>
                    <p className="text-sm text-muted-foreground line-clamp-2">{product.description || "No description available."}</p>
                    <p className="text-sm font-semibold">Rs. {product.price.toFixed(2)}</p>
                    <Link href={`/products/${product.id}`} className="text-sm text-primary hover:underline">
                      View product
                    </Link>
                  </Card>
                )
              })}
            </div>
          )}

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={buildHref({ type: "products", page: Math.max(1, safePage - 1) })}
                  className={safePage <= 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {slots.map((slot, index) => (
                <PaginationItem key={`${slot}-${index}`}>
                  {slot === "ellipsis" ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink href={buildHref({ type: "products", page: slot })} isActive={slot === safePage}>
                      {slot}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href={buildHref({ type: "products", page: Math.min(totalPages, safePage + 1) })}
                  className={safePage >= totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </section>
      </main>
    )
  }

  if (type === "blogs") {
    const rankedBlogs = await getRankedBlogs(q)

    const total = rankedBlogs.length
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const safePage = Math.min(page, totalPages)
    const blogs = rankedBlogs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
    const slots = getPaginationSlots(safePage, totalPages)

    return (
      <main className="min-h-screen bg-background">
        <GlobalNavbar />
        <section className="max-w-7xl mx-auto px-4 py-10 space-y-6">
          <div className="space-y-3">
            <h1 className="text-2xl md:text-3xl font-bold">Search Results</h1>
            <form action="/search" className="flex flex-col sm:flex-row gap-2 max-w-2xl">
              <input name="q" defaultValue={q} className="h-11 rounded-md border bg-background px-3 flex-1" />
              <button type="submit" className="h-11 px-5 rounded-md bg-primary text-primary-foreground">
                Search
              </button>
            </form>
            <div className="flex flex-wrap gap-2">
              <Link href={buildHref({ type: "all", page: 1 })} className="text-xs rounded-full border px-3 py-1 hover:bg-muted">
                All
              </Link>
              <Link href={buildHref({ type: "products", page: 1 })} className="text-xs rounded-full border px-3 py-1 hover:bg-muted">
                Products
              </Link>
              <Link href={buildHref({ type: "blogs", page: 1 })} className="text-xs rounded-full border px-3 py-1 bg-primary text-primary-foreground border-primary">
                Blogs
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">{total} blog matches for "{q}".</p>
          </div>

          {blogs.length === 0 ? (
            <Card className="p-8 text-muted-foreground">No matching blog posts found.</Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {blogs.map((post) => (
                <Card key={post.id} className="p-5 space-y-3">
                  <Badge variant="outline" className="w-fit">
                    {post.category}
                  </Badge>
                  <h2 className="font-semibold line-clamp-2">{post.title}</h2>
                  <p className="text-sm text-muted-foreground line-clamp-4">{post.excerpt}</p>
                  <Link href={`/blog/${post.slug}`} className="text-sm text-primary hover:underline">
                    Read article
                  </Link>
                </Card>
              ))}
            </div>
          )}

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={buildHref({ type: "blogs", page: Math.max(1, safePage - 1) })}
                  className={safePage <= 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {slots.map((slot, index) => (
                <PaginationItem key={`${slot}-${index}`}>
                  {slot === "ellipsis" ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink href={buildHref({ type: "blogs", page: slot })} isActive={slot === safePage}>
                      {slot}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href={buildHref({ type: "blogs", page: Math.min(totalPages, safePage + 1) })}
                  className={safePage >= totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </section>
      </main>
    )
  }

  const [rankedProducts, rankedBlogs] = await Promise.all([getRankedProducts(q), getRankedBlogs(q)])

  const totalProducts = rankedProducts.length
  const totalBlogs = rankedBlogs.length
  const products = rankedProducts.slice(0, 6)
  const blogs = rankedBlogs.slice(0, 6)

  return (
    <main className="min-h-screen bg-background">
      <GlobalNavbar />
      <section className="max-w-7xl mx-auto px-4 py-10 space-y-8">
        <div className="space-y-3">
          <h1 className="text-2xl md:text-3xl font-bold">Search Results for "{q}"</h1>
          <form action="/search" className="flex flex-col sm:flex-row gap-2 max-w-2xl">
            <input name="q" defaultValue={q} className="h-11 rounded-md border bg-background px-3 flex-1" />
            <button type="submit" className="h-11 px-5 rounded-md bg-primary text-primary-foreground">
              Search
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            <Link href={buildHref({ type: "all", page: 1 })} className="text-xs rounded-full border px-3 py-1 bg-primary text-primary-foreground border-primary">
              All
            </Link>
            <Link href={buildHref({ type: "products", page: 1 })} className="text-xs rounded-full border px-3 py-1 hover:bg-muted">
              Products ({totalProducts})
            </Link>
            <Link href={buildHref({ type: "blogs", page: 1 })} className="text-xs rounded-full border px-3 py-1 hover:bg-muted">
              Blogs ({totalBlogs})
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Products</h2>
            <Link href={buildHref({ type: "products", page: 1 })} className="text-sm text-primary hover:underline">
              View all products
            </Link>
          </div>
          {products.length === 0 ? (
            <Card className="p-6 text-muted-foreground">No product matches found.</Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => {
                const images = Array.from(new Set([product.image, ...toStringArray(product.images)].filter(Boolean) as string[]))
                return (
                  <Card key={product.id} className="p-4 space-y-3">
                    {images[0] ? (
                      <Image src={images[0]} alt={product.name} width={960} height={640} className="h-40 w-full rounded-md object-cover" />
                    ) : (
                      <div className="h-40 rounded-md bg-muted" />
                    )}
                    <h3 className="font-semibold line-clamp-1">{product.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{product.description || "No description available."}</p>
                    <Link href={`/products/${product.id}`} className="text-sm text-primary hover:underline">
                      View product
                    </Link>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Blogs</h2>
            <Link href={buildHref({ type: "blogs", page: 1 })} className="text-sm text-primary hover:underline">
              View all blogs
            </Link>
          </div>
          {blogs.length === 0 ? (
            <Card className="p-6 text-muted-foreground">No blog matches found.</Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {blogs.map((post) => (
                <Card key={post.id} className="p-5 space-y-3">
                  <Badge variant="outline" className="w-fit">
                    {post.category}
                  </Badge>
                  <h3 className="font-semibold line-clamp-2">{post.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
                  <Link href={`/blog/${post.slug}`} className="text-sm text-primary hover:underline">
                    Read article
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { GlobalNavbar } from "@/components/global-navbar"
import { SiteFooter } from "@/components/site-footer"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { db } from "@/lib/db"
import { getServerDictionary, getServerLanguage } from "@/lib/i18n-server"
import { getLocalizedText, localizeCatalogLabel } from "@/lib/localize"

type PageProps = {
  params: Promise<{ slug: string }>
}

export const revalidate = 0
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

function getCanonicalUrl(postSlug: string, canonicalUrl?: string | null) {
  if (!canonicalUrl) return `${baseUrl}/blog/${postSlug}`
  if (canonicalUrl.startsWith("http://") || canonicalUrl.startsWith("https://")) return canonicalUrl
  return `${baseUrl}${canonicalUrl.startsWith("/") ? canonicalUrl : `/${canonicalUrl}`}`
}

function parseKeywords(keywords?: string | null) {
  if (!keywords) return []
  return keywords
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean)
}

function estimateReadingTime(contentHtml: string) {
  const plainText = contentHtml.replace(/<[^>]+>/g, " ")
  const words = plainText.split(/\s+/).filter(Boolean).length
  const minutes = Math.max(1, Math.round(words / 220))
  return { words, minutes }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await db.blogPost.findUnique({ where: { slug } })
  if (!post) {
    return {
      title: "Blog Post Not Found | TailorHub",
      description: "This blog post could not be found.",
      alternates: { canonical: "/blog" },
    }
  }

  const canonical = getCanonicalUrl(post.slug, post.canonicalUrl)
  const title = post.seoTitle || post.title
  const description = post.seoDescription || post.excerpt
  const keywords = parseKeywords(post.seoKeywords)
  const ogTitle = post.ogTitle || title
  const ogDescription = post.ogDescription || description
  const ogImage = post.ogImage || post.coverImage

  return {
    title: `${title} | TailorHub`,
    description,
    keywords,
    alternates: { canonical },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: canonical,
      type: "article",
      images: ogImage ? [{ url: ogImage }] : undefined,
      publishedTime: post.createdAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: ogTitle,
      description: ogDescription,
      images: ogImage ? [ogImage] : undefined,
    },
  }
}

export default async function BlogDetailPage({ params }: PageProps) {
  const { slug } = await params
  const [dict, lang] = await Promise.all([getServerDictionary(), getServerLanguage()])
  const post = await db.blogPost.findUnique({ where: { slug } })
  if (!post || !post.isPublished) return notFound()
  const relatedPosts = await db.blogPost.findMany({
    where: {
      isPublished: true,
      id: { not: post.id },
      OR: [{ category: post.category }],
    },
    orderBy: { createdAt: "desc" },
    take: 4,
  })
  const reading = estimateReadingTime(post.contentHtml)

  const canonical = getCanonicalUrl(post.slug, post.canonicalUrl)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: getLocalizedText(post.seoTitle || post.title, lang, post.seoTitle || post.title),
    description: getLocalizedText(post.seoDescription || post.excerpt, lang, post.seoDescription || post.excerpt),
    image: [post.ogImage || post.coverImage].filter(Boolean),
    datePublished: post.createdAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    wordCount: reading.words,
    timeRequired: `PT${reading.minutes}M`,
    author: {
      "@type": "Organization",
      name: "TailorHub",
    },
    publisher: {
      "@type": "Organization",
      name: "TailorHub",
    },
    mainEntityOfPage: canonical,
    articleSection: post.category,
    keywords: parseKeywords(post.seoKeywords).join(", "),
  }
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: dict.common.home, item: baseUrl },
      { "@type": "ListItem", position: 2, name: dict.common.blog, item: `${baseUrl}/blog` },
      { "@type": "ListItem", position: 3, name: getLocalizedText(post.title, lang, post.title), item: canonical },
    ],
  }

  return (
    <main className="min-h-screen bg-background">
      <GlobalNavbar />
      <section className="max-w-6xl mx-auto px-4 py-10 md:py-12">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-primary hover:underline">
                {dict.common.home}
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/blog" className="hover:text-primary hover:underline">
                {dict.common.blog}
              </Link>
            </li>
            <li>/</li>
            <li className="text-foreground truncate">{getLocalizedText(post.title, lang, post.title)}</li>
          </ol>
        </nav>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <article className="space-y-6">
            <Card className="overflow-hidden border-border/70">
              {post.coverImage ? (
                <Image
                  src={post.coverImage}
                  alt={getLocalizedText(post.title, lang, post.title)}
                  width={1600}
                  height={900}
                  placeholder={post.coverImageBlurDataUrl ? "blur" : "empty"}
                  blurDataURL={post.coverImageBlurDataUrl || undefined}
                  className="h-[260px] w-full object-cover md:h-[360px]"
                />
              ) : null}
              <div className="space-y-4 p-5 md:p-7">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary">{localizeCatalogLabel(post.category, lang) || post.category}</Badge>
                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{reading.minutes} min read</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                  {getLocalizedText(post.title, lang, post.title)}
                </h1>
                <p className="max-w-3xl text-base text-muted-foreground md:text-lg">
                  {getLocalizedText(post.excerpt, lang, post.excerpt)}
                </p>
              </div>
            </Card>

            <Card className="p-5 md:p-8">
              <div className="blog-content prose prose-neutral max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
            </Card>

            <div className="flex items-center gap-3">
              <Button asChild variant="outline">
                <Link href="/blog">{dict.blogPage.backToBlog}</Link>
              </Button>
            </div>
          </article>

          <aside className="space-y-4">
            <Card className="p-5">
              <h3 className="mb-3 text-base font-semibold">Article Summary</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Category: {localizeCatalogLabel(post.category, lang) || post.category}</p>
                <p>Published: {new Date(post.createdAt).toLocaleDateString()}</p>
                <p>Reading Time: {reading.minutes} min</p>
              </div>
            </Card>
            {relatedPosts.length > 0 ? (
              <Card className="p-5">
                <h3 className="mb-3 text-base font-semibold">Related Posts</h3>
                <div className="space-y-3">
                  {relatedPosts.map((item) => (
                    <Link key={item.id} href={`/blog/${item.slug}`} className="block rounded-md border p-3 text-sm hover:bg-muted/40">
                      <p className="font-medium line-clamp-2">{getLocalizedText(item.title, lang, item.title)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</p>
                    </Link>
                  ))}
                </div>
              </Card>
            ) : null}
          </aside>
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}

import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { GlobalNavbar } from "@/components/global-navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/db"

type PageProps = {
  params: { slug: string }
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const post = await db.blogPost.findUnique({ where: { slug: params.slug } })
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
  const post = await db.blogPost.findUnique({ where: { slug: params.slug } })
  if (!post || !post.isPublished) return notFound()

  const canonical = getCanonicalUrl(post.slug, post.canonicalUrl)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
    image: [post.ogImage || post.coverImage].filter(Boolean),
    datePublished: post.createdAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
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
      { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${baseUrl}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: canonical },
    ],
  }

  return (
    <main className="min-h-screen bg-background">
      <GlobalNavbar />
      <section className="max-w-3xl mx-auto px-4 py-10">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-primary hover:underline">
                Home
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/blog" className="hover:text-primary hover:underline">
                Blog
              </Link>
            </li>
            <li>/</li>
            <li className="text-foreground truncate">{post.title}</li>
          </ol>
        </nav>
        <article className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {post.category} - {new Date(post.createdAt).toLocaleDateString()}
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">{post.title}</h1>
          <p className="text-muted-foreground">{post.excerpt}</p>
          {post.coverImage ? (
            <Image
              src={post.coverImage}
              alt={post.title}
              width={1200}
              height={630}
              placeholder={post.coverImageBlurDataUrl ? "blur" : "empty"}
              blurDataURL={post.coverImageBlurDataUrl || undefined}
              className="w-full rounded-md object-cover"
            />
          ) : null}
          <Card className="p-4 sm:p-6">
            <div className="blog-content" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
          </Card>
          <Button asChild variant="outline">
            <Link href="/blog">Back to Blog</Link>
          </Button>
        </article>
      </section>
    </main>
  )
}

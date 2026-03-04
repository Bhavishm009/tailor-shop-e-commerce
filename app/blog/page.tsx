import Link from "next/link"
import Image from "next/image"
import { GlobalNavbar } from "@/components/global-navbar"
import { SiteFooter } from "@/components/site-footer"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { db } from "@/lib/db"
import { getServerDictionary, getServerLanguage } from "@/lib/i18n-server"
import { getLocalizedText, localizeCatalogLabel } from "@/lib/localize"

export const revalidate = 0

export default async function BlogPage() {
  const [dict, lang] = await Promise.all([getServerDictionary(), getServerLanguage()])

  const posts = await db.blogPost.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
  })

  const featuredPost = posts[0]
  const restPosts = posts.slice(1)
  const categories = Array.from(new Set(posts.map((post) => post.category))).sort((a, b) => a.localeCompare(b))
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  const blogCollectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: dict.blogPage.title,
    description: dict.blogPage.subtitle,
    url: `${baseUrl}/blog`,
  }
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: dict.common.home, item: baseUrl },
      { "@type": "ListItem", position: 2, name: dict.common.blog, item: `${baseUrl}/blog` },
    ],
  }
  const blogListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: dict.blogPage.title,
    itemListElement: posts.map((post, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${baseUrl}/blog/${post.slug}`,
      item: {
        "@type": "BlogPosting",
        headline: post.title,
        datePublished: post.createdAt.toISOString(),
      },
    })),
  }

  return (
    <main className="min-h-screen bg-background">
      <GlobalNavbar />
      <section className="max-w-7xl mx-auto px-4 py-10 space-y-8">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogCollectionSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogListSchema) }} />
        <div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{dict.blogPage.title}</h1>
          <p className="text-muted-foreground mt-2">{dict.blogPage.subtitle}</p>
        </div>

        {posts.length === 0 ? (
          <Card className="p-6 text-muted-foreground">{dict.blogPage.noPosts}</Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
            <div className="space-y-6">
              {featuredPost ? (
                <Link href={`/blog/${featuredPost.slug}`} className="block">
                  <Card className="p-5 space-y-3 transition-colors hover:bg-muted/30">
                    {featuredPost.coverImage ? (
                      <Image
                        src={featuredPost.coverImage}
                        alt={getLocalizedText(featuredPost.title, lang, featuredPost.title)}
                        width={1400}
                        height={760}
                        placeholder={featuredPost.coverImageBlurDataUrl ? "blur" : "empty"}
                        blurDataURL={featuredPost.coverImageBlurDataUrl || undefined}
                        className="h-64 md:h-80 w-full rounded-md object-cover"
                      />
                    ) : null}
                    <Badge variant="outline" className="w-fit">
                      {dict.blogPage.featured} • {localizeCatalogLabel(featuredPost.category, lang) || featuredPost.category}
                    </Badge>
                    <h2 className="text-2xl md:text-3xl font-semibold">{getLocalizedText(featuredPost.title, lang, featuredPost.title)}</h2>
                    <p className="text-sm md:text-base text-muted-foreground">{getLocalizedText(featuredPost.excerpt, lang, featuredPost.excerpt)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(featuredPost.createdAt).toLocaleDateString()}</p>
                  </Card>
                </Link>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                {restPosts.map((post) => (
                  <Link key={post.id} href={`/blog/${post.slug}`} className="block">
                    <Card className="p-5 space-y-3 transition-colors hover:bg-muted/30">
                      {post.coverImage ? (
                        <Image
                          src={post.coverImage}
                          alt={getLocalizedText(post.title, lang, post.title)}
                          width={1200}
                          height={630}
                          placeholder={post.coverImageBlurDataUrl ? "blur" : "empty"}
                          blurDataURL={post.coverImageBlurDataUrl || undefined}
                          className="h-40 w-full rounded-md object-cover"
                        />
                      ) : null}
                      <Badge variant="outline" className="w-fit">
                        {localizeCatalogLabel(post.category, lang) || post.category}
                      </Badge>
                      <h2 className="text-xl font-semibold">{getLocalizedText(post.title, lang, post.title)}</h2>
                      <p className="text-sm text-muted-foreground">{getLocalizedText(post.excerpt, lang, post.excerpt)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(post.createdAt).toLocaleDateString()}</p>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>

            <aside className="space-y-4">
              <Card className="p-5 space-y-3">
                <h3 className="text-lg font-semibold">{dict.blogPage.categories}</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Badge key={category} variant="outline">
                      {localizeCatalogLabel(category, lang) || category}
                    </Badge>
                  ))}
                </div>
              </Card>
              <Card className="p-5">
                <p className="text-sm text-muted-foreground">{dict.blogPage.seoNote}</p>
              </Card>
            </aside>
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  )
}

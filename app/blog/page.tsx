import Link from "next/link"
import Image from "next/image"
import { GlobalNavbar } from "@/components/global-navbar"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { db } from "@/lib/db"

export const revalidate = 0

export default async function BlogPage() {
  const posts = await db.blogPost.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
  })

  const featuredPost = posts[0]
  const restPosts = posts.slice(1)
  const categories = Array.from(new Set(posts.map((post) => post.category))).sort((a, b) => a.localeCompare(b))

  return (
    <main className="min-h-screen bg-background">
      <GlobalNavbar />
      <section className="max-w-7xl mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">TailorHub Journal</h1>
          <p className="text-muted-foreground mt-2">Style tips, tailoring guides, and fabric insights.</p>
        </div>

        {posts.length === 0 ? (
          <Card className="p-6 text-muted-foreground">No blog posts available.</Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
            <div className="space-y-6">
              {featuredPost ? (
                <Card className="p-5 space-y-3">
                  {featuredPost.coverImage ? (
                    <Image
                      src={featuredPost.coverImage}
                      alt={featuredPost.title}
                      width={1400}
                      height={760}
                      placeholder={featuredPost.coverImageBlurDataUrl ? "blur" : "empty"}
                      blurDataURL={featuredPost.coverImageBlurDataUrl || undefined}
                      className="h-64 md:h-80 w-full rounded-md object-cover"
                    />
                  ) : null}
                  <Badge variant="outline" className="w-fit">
                    Featured • {featuredPost.category}
                  </Badge>
                  <h2 className="text-2xl md:text-3xl font-semibold">{featuredPost.title}</h2>
                  <p className="text-sm md:text-base text-muted-foreground">{featuredPost.excerpt}</p>
                  <p className="text-xs text-muted-foreground">{new Date(featuredPost.createdAt).toLocaleDateString()}</p>
                  <Link href={`/blog/${featuredPost.slug}`} className="text-primary text-sm hover:underline">
                    Read featured article
                  </Link>
                </Card>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                {restPosts.map((post) => (
                  <Card key={post.id} className="p-5 space-y-3">
                    {post.coverImage ? (
                      <Image
                        src={post.coverImage}
                        alt={post.title}
                        width={1200}
                        height={630}
                        placeholder={post.coverImageBlurDataUrl ? "blur" : "empty"}
                        blurDataURL={post.coverImageBlurDataUrl || undefined}
                        className="h-40 w-full rounded-md object-cover"
                      />
                    ) : null}
                    <Badge variant="outline" className="w-fit">
                      {post.category}
                    </Badge>
                    <h2 className="text-xl font-semibold">{post.title}</h2>
                    <p className="text-sm text-muted-foreground">{post.excerpt}</p>
                    <p className="text-xs text-muted-foreground">{new Date(post.createdAt).toLocaleDateString()}</p>
                    <Link href={`/blog/${post.slug}`} className="text-primary text-sm hover:underline">
                      Read more
                    </Link>
                  </Card>
                ))}
              </div>
            </div>

            <aside className="space-y-4">
              <Card className="p-5 space-y-3">
                <h3 className="text-lg font-semibold">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Badge key={category} variant="outline">
                      {category}
                    </Badge>
                  ))}
                </div>
              </Card>
              <Card className="p-5">
                <p className="text-sm text-muted-foreground">
                  All blog content is server-rendered from the database for fresh and SEO-friendly pages.
                </p>
              </Card>
            </aside>
          </div>
        )}
      </section>
    </main>
  )
}

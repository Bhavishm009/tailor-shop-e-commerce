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

  return (
    <main className="min-h-screen bg-background">
      <GlobalNavbar />
      <section className="max-w-6xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-4xl font-bold">TailorHub Blog</h1>
          <p className="text-muted-foreground mt-2">Style tips, tailoring guides, and fabric insights.</p>
        </div>

        {posts.length === 0 ? (
          <Card className="p-6 text-muted-foreground">No blog posts available.</Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {posts.map((post) => (
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
        )}
      </section>
    </main>
  )
}

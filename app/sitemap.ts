import type { MetadataRoute } from "next"
import { db } from "@/lib/db"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/features`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/custom-stitching`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/search`, changeFrequency: "weekly", priority: 0.4 },
  ]

  const blogRoutes: MetadataRoute.Sitemap = (
    await db.blogPost.findMany({
      where: { isPublished: true },
      select: {
        slug: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    })
  ).map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }))

  return [...staticRoutes, ...blogRoutes]
}

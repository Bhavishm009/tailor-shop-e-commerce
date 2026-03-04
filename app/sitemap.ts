import type { MetadataRoute } from "next"
import { db } from "@/lib/db"
import { supportedLanguages } from "@/lib/i18n"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
const localeRegionMap: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
  bn: "bn-IN",
  ta: "ta-IN",
  te: "te-IN",
  gu: "gu-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  pa: "pa-IN",
}

function getLanguageAlternates(path: string) {
  const alternates = Object.fromEntries(
    supportedLanguages.map((language) => {
      const localeKey = localeRegionMap[language] || `${language}-IN`
      const separator = path.includes("?") ? "&" : "?"
      return [localeKey, `${baseUrl}${path}${separator}lang=${language}`]
    }),
  )
  return {
    ...alternates,
    "x-default": `${baseUrl}${path}`,
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1, alternates: { languages: getLanguageAlternates("/") } },
    {
      url: `${baseUrl}/features`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: { languages: getLanguageAlternates("/features") },
    },
    {
      url: `${baseUrl}/products`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
      alternates: { languages: getLanguageAlternates("/products") },
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: { languages: getLanguageAlternates("/blog") },
    },
    {
      url: `${baseUrl}/custom-stitching`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: { languages: getLanguageAlternates("/custom-stitching") },
    },
    {
      url: `${baseUrl}/search`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
      alternates: { languages: getLanguageAlternates("/search") },
    },
    {
      url: `${baseUrl}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
      alternates: { languages: getLanguageAlternates("/login") },
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
      alternates: { languages: getLanguageAlternates("/signup") },
    },
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
    alternates: { languages: getLanguageAlternates(`/blog/${post.slug}`) },
  }))

  const productRoutes: MetadataRoute.Sitemap = (
    await db.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    })
  ).map((product) => ({
    url: `${baseUrl}/products/${product.id}`,
    lastModified: product.updatedAt,
    changeFrequency: "daily",
    priority: 0.85,
    alternates: { languages: getLanguageAlternates(`/products/${product.id}`) },
  }))

  return [...staticRoutes, ...blogRoutes, ...productRoutes]
}

import type { MetadataRoute } from "next"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/tailor", "/customer"],
      crawlDelay: 1,
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}

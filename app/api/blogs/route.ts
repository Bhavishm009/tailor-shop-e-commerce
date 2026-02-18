import { NextResponse } from "next/server"
import { requireRole } from "@/lib/api-auth"
import { db } from "@/lib/db"

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeAll = searchParams.get("all") === "1"

    if (includeAll) {
      const { response } = await requireRole("ADMIN")
      if (response) return response
    }

    const posts = await db.blogPost.findMany({
      where: includeAll ? undefined : { isPublished: true },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(posts)
  } catch (error) {
    console.error("[blogs/get]", error)
    return NextResponse.json({ error: "Failed to fetch blogs" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const body = (await request.json()) as {
      title?: string
      excerpt?: string
      contentHtml?: string
      category?: string
      coverImage?: string
      coverImageBlurDataUrl?: string
      seoTitle?: string
      seoDescription?: string
      seoKeywords?: string
      ogTitle?: string
      ogDescription?: string
      ogImage?: string
      ogImageBlurDataUrl?: string
      canonicalUrl?: string
    }

    const title = (body.title || "").trim()
    const contentHtml = (body.contentHtml || "").trim()
    const category = (body.category || "General").trim()
    const excerpt = (body.excerpt || "").trim() || contentHtml.replace(/<[^>]*>/g, "").slice(0, 160)

    if (!title || !contentHtml) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 })
    }

    let slugBase = slugify(title)
    if (!slugBase) slugBase = `post-${Date.now()}`

    let slug = slugBase
    let suffix = 1
    while (await db.blogPost.findUnique({ where: { slug } })) {
      slug = `${slugBase}-${suffix}`
      suffix += 1
    }

    const post = await db.blogPost.create({
      data: {
        title,
        slug,
        excerpt,
        contentHtml,
        category,
        coverImage: body.coverImage || null,
        coverImageBlurDataUrl: body.coverImageBlurDataUrl || null,
        seoTitle: body.seoTitle?.trim() || null,
        seoDescription: body.seoDescription?.trim() || null,
        seoKeywords: body.seoKeywords?.trim() || null,
        ogTitle: body.ogTitle?.trim() || null,
        ogDescription: body.ogDescription?.trim() || null,
        ogImage: body.ogImage?.trim() || null,
        ogImageBlurDataUrl: body.ogImageBlurDataUrl || null,
        canonicalUrl: body.canonicalUrl?.trim() || null,
        isPublished: true,
      },
    })

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error("[blogs/post]", error)
    return NextResponse.json({ error: "Failed to create blog" }, { status: 400 })
  }
}

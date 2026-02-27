import { NextResponse } from "next/server"
import { requireRole } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { deleteManyImageKitFilesByUrls } from "@/lib/imagekit"

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

function collectBlogMediaUrls(post: { coverImage?: string | null; ogImage?: string | null }) {
  return Array.from(new Set([post.coverImage?.trim() || "", post.ogImage?.trim() || ""].filter(Boolean)))
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const { id } = await params
    const post = await db.blogPost.findUnique({ where: { id } })

    if (!post) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 })
    }

    return NextResponse.json(post)
  } catch (error) {
    console.error("[blogs/id/get]", error)
    return NextResponse.json({ error: "Failed to fetch blog" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const { id } = await params
    const body = (await request.json()) as {
      title?: string
      excerpt?: string
      contentHtml?: string
      category?: string
      coverImage?: string | null
      coverImageBlurDataUrl?: string | null
      seoTitle?: string | null
      seoDescription?: string | null
      seoKeywords?: string | null
      ogTitle?: string | null
      ogDescription?: string | null
      ogImage?: string | null
      ogImageBlurDataUrl?: string | null
      canonicalUrl?: string | null
      isPublished?: boolean
    }

    const existing = await db.blogPost.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 })
    }
    const existingMediaUrls = collectBlogMediaUrls(existing)

    const nextTitle = typeof body.title === "string" ? body.title.trim() : existing.title
    const nextContent = typeof body.contentHtml === "string" ? body.contentHtml.trim() : existing.contentHtml
    const nextCategory = typeof body.category === "string" ? body.category.trim() || "General" : existing.category
    const nextExcerpt =
      typeof body.excerpt === "string"
        ? body.excerpt.trim() || nextContent.replace(/<[^>]*>/g, "").slice(0, 160)
        : existing.excerpt

    if (!nextTitle || !nextContent) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 })
    }

    let slug = existing.slug
    if (nextTitle !== existing.title) {
      let base = slugify(nextTitle)
      if (!base) base = `post-${Date.now()}`

      slug = base
      let suffix = 1
      while (true) {
        const conflict = await db.blogPost.findUnique({ where: { slug } })
        if (!conflict || conflict.id === id) break
        slug = `${base}-${suffix}`
        suffix += 1
      }
    }

    const post = await db.blogPost.update({
      where: { id },
      data: {
        title: nextTitle,
        slug,
        excerpt: nextExcerpt,
        contentHtml: nextContent,
        category: nextCategory,
        coverImage: body.coverImage === undefined ? existing.coverImage : body.coverImage || null,
        coverImageBlurDataUrl:
          body.coverImageBlurDataUrl === undefined ? existing.coverImageBlurDataUrl : body.coverImageBlurDataUrl || null,
        seoTitle: body.seoTitle === undefined ? existing.seoTitle : body.seoTitle?.trim() || null,
        seoDescription: body.seoDescription === undefined ? existing.seoDescription : body.seoDescription?.trim() || null,
        seoKeywords: body.seoKeywords === undefined ? existing.seoKeywords : body.seoKeywords?.trim() || null,
        ogTitle: body.ogTitle === undefined ? existing.ogTitle : body.ogTitle?.trim() || null,
        ogDescription: body.ogDescription === undefined ? existing.ogDescription : body.ogDescription?.trim() || null,
        ogImage: body.ogImage === undefined ? existing.ogImage : body.ogImage?.trim() || null,
        ogImageBlurDataUrl:
          body.ogImageBlurDataUrl === undefined ? existing.ogImageBlurDataUrl : body.ogImageBlurDataUrl || null,
        canonicalUrl: body.canonicalUrl === undefined ? existing.canonicalUrl : body.canonicalUrl?.trim() || null,
        isPublished: typeof body.isPublished === "boolean" ? body.isPublished : existing.isPublished,
      },
    })

    const updatedMediaUrls = collectBlogMediaUrls(post)
    const updatedMediaSet = new Set(updatedMediaUrls)
    const urlsToDelete = existingMediaUrls.filter((url) => !updatedMediaSet.has(url))
    if (urlsToDelete.length > 0) {
      await deleteManyImageKitFilesByUrls(urlsToDelete)
    }

    return NextResponse.json(post)
  } catch (error) {
    console.error("[blogs/id/patch]", error)
    return NextResponse.json({ error: "Failed to update blog" }, { status: 400 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const { id } = await params
    const existing = await db.blogPost.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 })
    }
    const mediaUrlsToDelete = collectBlogMediaUrls(existing)

    await db.blogPost.delete({ where: { id } })
    if (mediaUrlsToDelete.length > 0) {
      await deleteManyImageKitFilesByUrls(mediaUrlsToDelete)
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[blogs/id/delete]", error)
    return NextResponse.json({ error: "Failed to delete blog" }, { status: 400 })
  }
}

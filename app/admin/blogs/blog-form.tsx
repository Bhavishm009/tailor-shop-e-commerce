"use client"

import Link from "next/link"
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { BlogEditor } from "@/components/blog-editor"
import { FeedbackToasts } from "@/components/admin/feedback-toasts"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"
import { isValidImageFile, uploadFile } from "@/lib/file-upload"

type BlogPost = {
  id: string
  title: string
  excerpt: string
  contentHtml: string
  category: string
  coverImage?: string | null
  coverImageBlurDataUrl?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
  seoKeywords?: string | null
  ogTitle?: string | null
  ogDescription?: string | null
  ogImage?: string | null
  ogImageBlurDataUrl?: string | null
}

type BlogFormProps = {
  blogId?: string
}

export function BlogForm({ blogId }: BlogFormProps) {
  const router = useRouter()
  const isEdit = Boolean(blogId)

  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingOg, setUploadingOg] = useState(false)
  const [coverUploadProgress, setCoverUploadProgress] = useState(0)
  const [ogUploadProgress, setOgUploadProgress] = useState(0)
  const [pendingCoverPreview, setPendingCoverPreview] = useState("")
  const [pendingOgPreview, setPendingOgPreview] = useState("")

  const [error, setError] = useState("")

  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [contentHtml, setContentHtml] = useState("")

  const [coverImage, setCoverImage] = useState("")
  const [coverImageBlurDataUrl, setCoverImageBlurDataUrl] = useState("")

  const [seoTitle, setSeoTitle] = useState("")
  const [seoDescription, setSeoDescription] = useState("")
  const [seoKeywords, setSeoKeywords] = useState("")

  const [ogTitle, setOgTitle] = useState("")
  const [ogDescription, setOgDescription] = useState("")
  const [ogImage, setOgImage] = useState("")
  const [ogImageBlurDataUrl, setOgImageBlurDataUrl] = useState("")

  const coverInputRef = useRef<HTMLInputElement | null>(null)
  const ogInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!isEdit || !blogId) return

    const loadBlog = async () => {
      setError("")
      try {
        const response = await fetch(`/api/blogs/${blogId}`, { cache: "no-store" })
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Failed to load blog." }))
          setError(data.error || "Failed to load blog.")
          return
        }

        const post = (await response.json()) as BlogPost
        setTitle(post.title)
        setCategory(post.category)
        setExcerpt(post.excerpt)
        setContentHtml(post.contentHtml)
        setCoverImage(post.coverImage || "")
        setCoverImageBlurDataUrl(post.coverImageBlurDataUrl || "")
        setSeoTitle(post.seoTitle || "")
        setSeoDescription(post.seoDescription || "")
        setSeoKeywords(post.seoKeywords || "")
        setOgTitle(post.ogTitle || "")
        setOgDescription(post.ogDescription || "")
        setOgImage(post.ogImage || "")
        setOgImageBlurDataUrl(post.ogImageBlurDataUrl || "")
      } catch {
        setError("Failed to load blog.")
      } finally {
        setLoading(false)
      }
    }

    loadBlog()
  }, [isEdit, blogId])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")

    if (!contentHtml.trim()) {
      setError("Blog content is required.")
      return
    }

    setSubmitting(true)
    try {
      const endpoint = isEdit ? `/api/blogs/${blogId}` : "/api/blogs"
      const method = isEdit ? "PATCH" : "POST"

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          excerpt,
          contentHtml,
          coverImage,
          coverImageBlurDataUrl,
          seoTitle,
          seoDescription,
          seoKeywords,
          ogTitle,
          ogDescription,
          ogImage,
          ogImageBlurDataUrl,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to save blog." }))
        setError(data.error || "Failed to save blog.")
        return
      }

      router.push("/admin/blogs")
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  const onUploadCover = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setError("")
    if (!isValidImageFile(file)) {
      setError("Cover image must be JPG/PNG/WebP/GIF and less than 10MB.")
      return
    }

    setUploadingCover(true)
    setCoverUploadProgress(0)
    const localPreview = URL.createObjectURL(file)
    setPendingCoverPreview(localPreview)
    try {
      const uploaded = await uploadFile(file, "/tailorhub/blog/cover", setCoverUploadProgress)
      setCoverImage(uploaded.url)
      setCoverImageBlurDataUrl(uploaded.blurDataUrl || "")
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload cover image.")
    } finally {
      setUploadingCover(false)
      if (localPreview) URL.revokeObjectURL(localPreview)
      setPendingCoverPreview("")
    }
  }

  const onUploadOg = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setError("")
    if (!isValidImageFile(file)) {
      setError("OG image must be JPG/PNG/WebP/GIF and less than 10MB.")
      return
    }

    setUploadingOg(true)
    setOgUploadProgress(0)
    const localPreview = URL.createObjectURL(file)
    setPendingOgPreview(localPreview)
    try {
      const uploaded = await uploadFile(file, "/tailorhub/blog/og", setOgUploadProgress)
      setOgImage(uploaded.url)
      setOgImageBlurDataUrl(uploaded.blurDataUrl || "")
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload OG image.")
    } finally {
      setUploadingOg(false)
      if (localPreview) URL.revokeObjectURL(localPreview)
      setPendingOgPreview("")
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <Card className="space-y-3 p-6">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-56 w-full" />
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{isEdit ? "Edit Blog Post" : "Create Blog Post"}</h1>
        {isEdit ? (
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/blogs">Back to Listing</Link>
          </Button>
        ) : null}
      </div>

      <FeedbackToasts error={error} />

      <form onSubmit={onSubmit} className="space-y-6">
        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" />
          </div>
          <Input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Excerpt (recommended 140-160 chars)" />
          <BlogEditor value={contentHtml} onChange={setContentHtml} />
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="font-semibold">Images (Upload Only)</h2>
          <input ref={coverInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onUploadCover} />
          <input ref={ogInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onUploadOg} />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => coverInputRef.current?.click()} disabled={uploadingCover}>
              {uploadingCover ? "Uploading Cover..." : "Upload Cover Image"}
            </Button>
            <Button type="button" variant="outline" onClick={() => ogInputRef.current?.click()} disabled={uploadingOg}>
              {uploadingOg ? "Uploading OG..." : "Upload OG Image"}
            </Button>
          </div>
          {uploadingCover ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Cover upload: {coverUploadProgress}%</p>
              <Progress value={coverUploadProgress} />
            </div>
          ) : null}
          {uploadingOg ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">OG upload: {ogUploadProgress}%</p>
              <Progress value={ogUploadProgress} />
            </div>
          ) : null}
          {pendingCoverPreview || coverImage ? (
            <div className="overflow-hidden rounded-md border bg-muted/30">
              <img
                src={pendingCoverPreview || coverImage}
                alt="Cover preview"
                className="aspect-video w-full object-contain"
              />
            </div>
          ) : null}
          {pendingOgPreview || ogImage ? (
            <div className="overflow-hidden rounded-md border bg-muted/30">
              <img
                src={pendingOgPreview || ogImage}
                alt="OG preview"
                className="aspect-[1200/630] w-full object-contain"
              />
            </div>
          ) : null}
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="font-semibold">SEO</h2>
          <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="SEO title" />
          <Input value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="SEO description" />
          <Input value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} placeholder="SEO keywords (comma separated)" />
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="font-semibold">Open Graph / Social</h2>
          <Input value={ogTitle} onChange={(e) => setOgTitle(e.target.value)} placeholder="OG title" />
          <Input value={ogDescription} onChange={(e) => setOgDescription(e.target.value)} placeholder="OG description" />
        </Card>

        <div className="flex items-center justify-center gap-3 mx-auto pt-2">
          <Button type="submit" size="lg" className="min-w-40" disabled={submitting}>
            {submitting ? <><Spinner className="mr-2" />Saving...</> : isEdit ? "Save Changes" : "Create Blog"}
          </Button>
          <Button type="button" variant="outline" size="lg" className="min-w-32" asChild>
            <Link href="/admin/blogs">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}

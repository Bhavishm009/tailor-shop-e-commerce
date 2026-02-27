"use client"

import Link from "next/link"
import { FormEvent, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { MediaUploader } from "@/components/media-uploader"
import { FeedbackToasts } from "@/components/admin/feedback-toasts"
import { Spinner } from "@/components/ui/spinner"

type ProductMasterType = "CATEGORY" | "SUBCATEGORY" | "CLOTH_TYPE" | "MATERIAL" | "SIZE" | "COLOR"
type MasterItem = {
  id: string
  name: string
  type: ProductMasterType
  parentId?: string | null
}
type FaqItem = {
  id: string
  question: string
  answer: string
}
type ProductApi = {
  id: string
  name: string
  description?: string | null
  price: number
  stock: number
  isActive: boolean
  categoryId?: string | null
  subcategoryId?: string | null
  clothTypeId?: string | null
  materialId?: string | null
  image?: string | null
  videos?: unknown
  images?: unknown
  tags?: unknown
  highlights?: unknown
  seoTitle?: string | null
  seoDescription?: string | null
  seoKeywords?: string | null
  canonicalUrl?: string | null
  masterSelections?: Array<{ master: MasterItem }>
  faqs?: Array<{ faq: FaqItem }>
}

type ProductFormProps = { productId?: string }

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean) : []

type MediaItem = { kind: "image" | "video"; url: string }

export function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter()
  const isEdit = Boolean(productId)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [stock, setStock] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [subcategoryId, setSubcategoryId] = useState("")
  const [clothTypeId, setClothTypeId] = useState("")
  const [materialId, setMaterialId] = useState("")
  const [sizeIds, setSizeIds] = useState<string[]>([])
  const [colorIds, setColorIds] = useState<string[]>([])
  const [tagsInput, setTagsInput] = useState("")
  const [highlightsInput, setHighlightsInput] = useState("")
  const [seoTitle, setSeoTitle] = useState("")
  const [seoDescription, setSeoDescription] = useState("")
  const [seoKeywords, setSeoKeywords] = useState("")
  const [canonicalUrl, setCanonicalUrl] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [media, setMedia] = useState<MediaItem[]>([])
  const [faqSearch, setFaqSearch] = useState("")
  const [faqResults, setFaqResults] = useState<FaqItem[]>([])
  const [selectedFaqs, setSelectedFaqs] = useState<FaqItem[]>([])
  const [newFaqQuestion, setNewFaqQuestion] = useState("")
  const [newFaqAnswer, setNewFaqAnswer] = useState("")
  const [creatingFaq, setCreatingFaq] = useState(false)

  const [masters, setMasters] = useState<MasterItem[]>([])

  useEffect(() => {
    const loadMasters = async () => {
      const response = await fetch("/api/admin/product-masters", { cache: "no-store" })
      if (!response.ok) return
      const data = (await response.json()) as MasterItem[]
      setMasters(data)
    }
    loadMasters()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const loadFaqs = async () => {
      try {
        const response = await fetch(`/api/admin/faqs?q=${encodeURIComponent(faqSearch)}`, {
          cache: "no-store",
          signal: controller.signal,
        })
        if (!response.ok) return
        const data = (await response.json()) as FaqItem[]
        setFaqResults(data)
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
      }
    }
    loadFaqs()
    return () => controller.abort()
  }, [faqSearch])

  useEffect(() => {
    if (!isEdit || !productId) return
    const load = async () => {
      const response = await fetch(`/api/products/${productId}`, { cache: "no-store" })
      if (!response.ok) {
        setError("Failed to load product.")
        setLoading(false)
        return
      }
      const data = (await response.json()) as ProductApi
      setName(data.name)
      setDescription(data.description || "")
      setPrice(String(data.price))
      setStock(String(data.stock))
      setCategoryId(data.categoryId || "")
      setSubcategoryId(data.subcategoryId || "")
      setClothTypeId(data.clothTypeId || "")
      setMaterialId(data.materialId || "")
      setIsActive(data.isActive)
      setTagsInput(toStringArray(data.tags).join(", "))
      setHighlightsInput(toStringArray(data.highlights).join(", "))
      setSeoTitle(data.seoTitle || "")
      setSeoDescription(data.seoDescription || "")
      setSeoKeywords(data.seoKeywords || "")
      setCanonicalUrl(data.canonicalUrl || "")
      setSelectedFaqs((data.faqs || []).map((item) => item.faq))
      const selectedMasters = data.masterSelections?.map((item) => item.master) || []
      setSizeIds(selectedMasters.filter((item) => item.type === "SIZE").map((item) => item.id))
      setColorIds(selectedMasters.filter((item) => item.type === "COLOR").map((item) => item.id))
      const images = toStringArray(data.images)
      const videos = toStringArray(data.videos)
      const merged: MediaItem[] = [
        ...(data.image ? [{ kind: "image" as const, url: data.image }] : []),
        ...images.map((url) => ({ kind: "image" as const, url })),
        ...videos.map((url) => ({ kind: "video" as const, url })),
      ]
      setMedia(Array.from(new Map(merged.map((item) => [`${item.kind}-${item.url}`, item])).values()))
      setLoading(false)
    }
    load()
  }, [isEdit, productId])

  const categories = masters.filter((item) => item.type === "CATEGORY")
  const subcategories = masters.filter((item) => item.type === "SUBCATEGORY" && item.parentId === categoryId)
  const clothTypes = masters.filter((item) => item.type === "CLOTH_TYPE")
  const materials = masters.filter((item) => item.type === "MATERIAL")
  const sizes = masters.filter((item) => item.type === "SIZE")
  const colors = masters.filter((item) => item.type === "COLOR")

  const selectedFaqIds = useMemo(() => selectedFaqs.map((faq) => faq.id), [selectedFaqs])

  const toggleListItem = (id: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(id) ? list.filter((item) => item !== id) : [...list, id])
  }

  const createFaqAndAdd = async () => {
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) return
    setCreatingFaq(true)
    try {
      const response = await fetch("/api/admin/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: newFaqQuestion, answer: newFaqAnswer }),
      })
      const data = (await response.json()) as FaqItem & { error?: string }
      if (!response.ok) {
        setError(data.error || "Failed to create FAQ.")
        return
      }
      setSelectedFaqs((prev) => [...prev, data])
      setNewFaqQuestion("")
      setNewFaqAnswer("")
      setFaqResults((prev) => [data, ...prev])
    } finally {
      setCreatingFaq(false)
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      const endpoint = isEdit ? `/api/products/${productId}` : "/api/products"
      const method = isEdit ? "PATCH" : "POST"
      const images = media.filter((item) => item.kind === "image").map((item) => item.url)
      const videos = media.filter((item) => item.kind === "video").map((item) => item.url)

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          price: Number(price),
          stock: Number(stock),
          categoryId: categoryId || null,
          subcategoryId: subcategoryId || null,
          clothTypeId: clothTypeId || null,
          materialId: materialId || null,
          sizeIds,
          colorIds,
          image: images[0] || null,
          images,
          videos,
          tags: tagsInput.split(",").map((item) => item.trim()).filter(Boolean),
          highlights: highlightsInput.split(",").map((item) => item.trim()).filter(Boolean),
          seoTitle,
          seoDescription,
          seoKeywords,
          canonicalUrl,
          faqIds: selectedFaqIds,
          isActive,
        }),
      })

      const data = await response.json().catch(() => ({ error: "Failed to save product." }))
      if (!response.ok) {
        setError(data.error || "Failed to save product.")
        return
      }
      router.push("/admin/products")
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-muted-foreground">Loading product...</div>

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">{isEdit ? "Edit Product" : "Create Product"}</h1>
        <Button type="button" variant="outline" asChild>
          <Link href="/admin/products">Back</Link>
        </Button>
      </div>
      <FeedbackToasts error={error} />

      <form onSubmit={onSubmit} className="space-y-6">
        <Card className="p-4 space-y-3">
          <h2 className="text-lg font-semibold">Basic Details</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product Name" required />
            <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" type="number" min="0" required />
            <Input value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Stock" type="number" min="0" required />
            <select className="h-10 rounded-md border bg-background px-3" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setSubcategoryId("") }}>
              <option value="">Select Category</option>
              {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select className="h-10 rounded-md border bg-background px-3" value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} disabled={!categoryId}>
              <option value="">Select Subcategory</option>
              {subcategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select className="h-10 rounded-md border bg-background px-3" value={clothTypeId} onChange={(e) => setClothTypeId(e.target.value)}>
              <option value="">Select Cloth Type</option>
              {clothTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select className="h-10 rounded-md border bg-background px-3" value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
              <option value="">Select Material</option>
              {materials.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="text-lg font-semibold">Variants</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium mb-2">Sizes (Multiple)</p>
              <div className="max-h-44 overflow-y-auto rounded-md border p-2 space-y-2">
                {sizes.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={sizeIds.includes(item.id)} onChange={() => toggleListItem(item.id, sizeIds, setSizeIds)} />
                    {item.name}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Colors (Multiple)</p>
              <div className="max-h-44 overflow-y-auto rounded-md border p-2 space-y-2">
                {colors.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={colorIds.includes(item.id)} onChange={() => toggleListItem(item.id, colorIds, setColorIds)} />
                    {item.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="text-lg font-semibold">Media Upload (ImageKit)</h2>
          <MediaUploader value={media} onChange={setMedia} folder="/tailorhub/products" />
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="text-lg font-semibold">SEO</h2>
          <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="SEO Title" />
          <Textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="SEO Description" />
          <Input value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} placeholder="SEO Keywords (comma separated)" />
          <Input value={canonicalUrl} onChange={(e) => setCanonicalUrl(e.target.value)} placeholder="Canonical URL" />
          <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="Tags (comma separated)" />
          <Input value={highlightsInput} onChange={(e) => setHighlightsInput(e.target.value)} placeholder="Highlights (comma separated)" />
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active Product
          </label>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="text-lg font-semibold">FAQs</h2>
          <Input value={faqSearch} onChange={(e) => setFaqSearch(e.target.value)} placeholder="Search existing FAQs..." />
          <div className="grid md:grid-cols-2 gap-3">
            <div className="max-h-56 overflow-y-auto rounded-md border p-2 space-y-2">
              <p className="text-xs text-muted-foreground">Existing FAQs</p>
              {faqResults.map((item) => (
                <div key={item.id} className="rounded-md border p-2 space-y-1">
                  <p className="text-sm font-medium">{item.question}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.answer}</p>
                  <Button type="button" size="sm" onClick={() => setSelectedFaqs((prev) => (prev.some((faq) => faq.id === item.id) ? prev : [...prev, item]))}>
                    {selectedFaqIds.includes(item.id) ? "Selected" : "Add"}
                  </Button>
                </div>
              ))}
            </div>
            <div className="max-h-56 overflow-y-auto rounded-md border p-2 space-y-2">
              <p className="text-xs text-muted-foreground">Selected FAQs</p>
              {selectedFaqs.map((item) => (
                <div key={item.id} className="rounded-md border p-2 space-y-1">
                  <p className="text-sm font-medium">{item.question}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.answer}</p>
                  <Button type="button" size="sm" variant="destructive" onClick={() => setSelectedFaqs((prev) => prev.filter((faq) => faq.id !== item.id))}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-md border p-3 space-y-2">
            <p className="text-sm font-medium">Create New FAQ</p>
            <Input value={newFaqQuestion} onChange={(e) => setNewFaqQuestion(e.target.value)} placeholder="Question" />
            <Textarea value={newFaqAnswer} onChange={(e) => setNewFaqAnswer(e.target.value)} placeholder="Answer" />
            <Button type="button" onClick={createFaqAndAdd} disabled={creatingFaq || !newFaqQuestion.trim() || !newFaqAnswer.trim()}>
              {creatingFaq ? <><Spinner className="mr-2" />Creating...</> : "Create & Add"}
            </Button>
          </div>
        </Card>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button type="submit" size="lg" className="min-w-40" disabled={saving}>
            {saving ? <><Spinner className="mr-2" />Saving...</> : isEdit ? "Save Product" : "Create Product"}
          </Button>
          <Button type="button" variant="outline" size="lg" className="min-w-32" asChild><Link href="/admin/products">Cancel</Link></Button>
        </div>
      </form>
    </div>
  )
}

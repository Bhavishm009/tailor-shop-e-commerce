"use client"

import Image from "next/image"
import Link from "next/link"
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { isValidImageFile, uploadFile } from "@/lib/file-upload"

type Product = {
  id: string
  name: string
  description?: string | null
  price: number
  category: string
  material?: string | null
  stock: number
  isActive: boolean
  image?: string | null
}

type ProductFormProps = {
  productId?: string
}

export function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter()
  const isEdit = Boolean(productId)

  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageUploadProgress, setImageUploadProgress] = useState(0)
  const [error, setError] = useState("")

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [category, setCategory] = useState("")
  const [material, setMaterial] = useState("")
  const [stock, setStock] = useState("")
  const [image, setImage] = useState("")
  const [isActive, setIsActive] = useState(true)

  const imageInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!isEdit || !productId) return

    const loadProduct = async () => {
      setError("")
      try {
        const response = await fetch(`/api/products/${productId}`, { cache: "no-store" })
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Failed to load product." }))
          setError(data.error || "Failed to load product.")
          return
        }
        const product = (await response.json()) as Product
        setName(product.name)
        setDescription(product.description || "")
        setPrice(String(product.price))
        setCategory(product.category)
        setMaterial(product.material || "")
        setStock(String(product.stock))
        setImage(product.image || "")
        setIsActive(product.isActive)
      } catch {
        setError("Failed to load product.")
      } finally {
        setLoading(false)
      }
    }

    loadProduct()
  }, [isEdit, productId])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      const endpoint = isEdit ? `/api/products/${productId}` : "/api/products"
      const method = isEdit ? "PATCH" : "POST"

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          price: Number(price),
          category,
          material,
          stock: Number(stock),
          image,
          isActive,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to save product." }))
        setError(data.error || "Failed to save product.")
        return
      }

      router.push("/admin/products")
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  const onUploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setError("")
    if (!isValidImageFile(file)) {
      setError("Product image must be JPG/PNG/WebP/GIF and less than 10MB.")
      return
    }

    setUploadingImage(true)
    setImageUploadProgress(0)
    try {
      const uploaded = await uploadFile(file, "/tailorhub/products", setImageUploadProgress)
      setImage(uploaded.url)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload product image.")
    } finally {
      setUploadingImage(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading product...</div>
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{isEdit ? "Edit Product" : "Create Product"}</h1>
        {isEdit ? (
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/products">Back to Listing</Link>
          </Button>
        ) : null}
      </div>
      {error ? <Card className="p-4 text-sm text-red-600 border-red-300">{error}</Card> : null}

      <Card className="p-6 space-y-4">
        <form onSubmit={onSubmit} className="grid md:grid-cols-2 gap-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" required />
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" required />
          <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" type="number" min="0" required />
          <Input value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Stock" type="number" min="0" required />
          <Input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="Material (optional)" />
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />

          <input
            ref={imageInputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={onUploadImage}
          />

          <div className="md:col-span-2 flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()} disabled={uploadingImage}>
              {uploadingImage ? "Uploading Image..." : "Upload Product Image"}
            </Button>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Active product
            </label>
          </div>

          {uploadingImage ? (
            <div className="md:col-span-2 space-y-1">
              <p className="text-xs text-muted-foreground">Upload progress: {imageUploadProgress}%</p>
              <Progress value={imageUploadProgress} />
            </div>
          ) : null}

          {image ? (
            <div className="md:col-span-2 space-y-2">
              <p className="text-sm font-medium">Image Preview</p>
              <Image src={image} alt="Product preview" width={800} height={500} className="h-44 w-full rounded-md object-cover" />
            </div>
          ) : null}

          <div className="md:col-span-2 flex items-center gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Product"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/products">Cancel</Link>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { GlobalNavbar } from "@/components/global-navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search } from "lucide-react"

type Product = {
  id: string
  name: string
  description?: string | null
  price: number
  category: string
  material?: string | null
  isActive: boolean
}

type BlogPost = {
  id: string
  title: string
  excerpt: string
  contentHtml: string
  slug: string
  category: string
  coverImage?: string
  createdAt: string
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") ?? ""

  const [query, setQuery] = useState(initialQuery)
  const [products, setProducts] = useState<Product[]>([])
  const [blogs, setBlogs] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/products", { cache: "no-store" })
        if (!response.ok) {
          setProducts([])
          return
        }
        const data = (await response.json()) as Product[]
        setProducts(data.filter((product) => product.isActive))
      } catch {
        setProducts([])
      }
    }

    const fetchBlogs = async () => {
      try {
        const response = await fetch("/api/blogs", { cache: "no-store" })
        if (!response.ok) {
          setBlogs([])
          return
        }
        const data = (await response.json()) as BlogPost[]
        setBlogs(data)
      } catch {
        setBlogs([])
      }
    }

    Promise.all([fetchProducts(), fetchBlogs()]).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  const normalizedQuery = query.trim().toLowerCase()

  const filteredProducts = useMemo(() => {
    if (!normalizedQuery) return products
    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(normalizedQuery) ||
        (product.description?.toLowerCase().includes(normalizedQuery) ?? false) ||
        product.category.toLowerCase().includes(normalizedQuery) ||
        (product.material?.toLowerCase().includes(normalizedQuery) ?? false)
      )
    })
  }, [normalizedQuery, products])

  const filteredBlogs = useMemo(() => {
    if (!normalizedQuery) return blogs
    return blogs.filter((post) => {
      return (
        post.title.toLowerCase().includes(normalizedQuery) ||
        post.excerpt.toLowerCase().includes(normalizedQuery) ||
        post.category.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [blogs, normalizedQuery])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) {
      router.push("/search")
      return
    }
    router.push(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <main className="min-h-screen bg-background">
      <GlobalNavbar />
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-10">
        <section className="space-y-4">
          <h1 className="text-3xl font-bold">Global Search</h1>
          <form onSubmit={onSubmit} className="flex gap-2 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products and blogs..."
                className="pl-10"
              />
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
          <p className="text-sm text-muted-foreground">
            Results for <span className="font-medium">{normalizedQuery || "all content"}</span>
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Products</h2>
            <Badge variant="secondary">{filteredProducts.length}</Badge>
          </div>
          {loading ? (
            <Card className="p-6 text-muted-foreground">Loading products...</Card>
          ) : filteredProducts.length === 0 ? (
            <Card className="p-6 text-muted-foreground">No matching products found.</Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="p-5 space-y-3">
                  <div className="space-y-1">
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">{product.description || "No description available."}</p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Category: {product.category}</p>
                    {product.material ? <p>Material: {product.material}</p> : null}
                  </div>
                  <p className="text-lg font-bold">Rs. {product.price}</p>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Blogs</h2>
            <Badge variant="secondary">{filteredBlogs.length}</Badge>
          </div>
          {filteredBlogs.length === 0 ? (
            <Card className="p-6 text-muted-foreground">No matching blog posts found.</Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBlogs.map((post) => (
                <Card key={post.id} className="p-5 space-y-3">
                  <Badge variant="outline" className="w-fit">
                    {post.category}
                  </Badge>
                  <h3 className="font-semibold">{post.title}</h3>
                  <p className="text-sm text-muted-foreground">{post.excerpt}</p>
                  <Link href={`/blog/${post.slug}`} className="text-sm text-primary hover:underline">
                    Read blog
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { GlobalNavbar } from "@/components/global-navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search } from "lucide-react"
import { useCart } from "@/components/cart-provider"

type Product = {
  id: string
  name: string
  description?: string | null
  price: number
  image?: string | null
  category: string
  material?: string | null
  stock: number
  isActive: boolean
}

export default function PublicProductsPage() {
  const searchParams = useSearchParams()
  const query = (searchParams.get("q") ?? "").toLowerCase()
  const { addItem } = useCart()

  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const [products, setProducts] = useState<Product[]>([])
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
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  useEffect(() => {
    setSearch(searchParams.get("q") ?? "")
  }, [searchParams])

  const filteredProducts = useMemo(() => {
    if (!query) return products
    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(query) ||
        (product.description?.toLowerCase().includes(query) ?? false) ||
        product.category.toLowerCase().includes(query) ||
        (product.material?.toLowerCase().includes(query) ?? false)
      )
    })
  }, [query, products])

  return (
    <main className="min-h-screen bg-background">
      <GlobalNavbar />
      <section className="max-w-7xl mx-auto px-4 py-10 space-y-8">
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <h1 className="text-3xl font-bold">Shop Products</h1>
          <form action="/products" className="w-full md:w-[420px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input name="q" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" placeholder="Search products..." />
            </div>
          </form>
        </div>

        {loading ? (
          <Card className="p-8 text-muted-foreground">Loading products...</Card>
        ) : filteredProducts.length === 0 ? (
          <Card className="p-8 text-muted-foreground">No products found.</Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="p-5 space-y-4">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="h-40 w-full rounded-md object-cover" />
                ) : (
                  <div className="bg-muted h-40 rounded-md" />
                )}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-semibold text-lg">{product.name}</h2>
                    <Badge variant="outline">{product.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{product.description || "No description available."}</p>
                  <p className="text-xl font-bold">Rs. {product.price}</p>
                  <Button
                    className="w-full"
                    onClick={() =>
                      addItem({
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        image: product.image,
                      })
                    }
                    disabled={product.stock <= 0}
                  >
                    {product.stock > 0 ? "Add To Cart" : "Out Of Stock"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShoppingCart, Search } from "lucide-react"

interface Product {
  id: string
  name: string
  price: number
  image?: string
  category: string
  size?: string
  color?: string
  material?: string
  stock: number
}

export default function ProductsPage() {
  const searchParams = useSearchParams()
  const initialSearch = searchParams?.get("search") ?? ""
  const [cart, setCart] = useState<Product[]>([])
  const [search, setSearch] = useState(initialSearch)
  const [filter, setFilter] = useState("all")
  const [showCart, setShowCart] = useState(false)

  // Dummy products
  const products: Product[] = [
    {
      id: "1",
      name: "Classic Cotton Shirt",
      price: 1200,
      category: "shirts",
      color: "White",
      material: "100% Cotton",
      stock: 5,
    },
    {
      id: "2",
      name: "Formal Dress Pants",
      price: 1800,
      category: "pants",
      color: "Black",
      material: "Polyester Blend",
      stock: 3,
    },
    {
      id: "3",
      name: "Casual T-Shirt",
      price: 600,
      category: "shirts",
      color: "Blue",
      material: "Cotton",
      stock: 10,
    },
  ]

  const addToCart = (product: Product) => {
    setCart((prev) => [...prev, product])
  }

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id))
  }

  const filteredProducts = products.filter((product) => {
    const searchTerm = search.toLowerCase()
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm) ||
      product.category.toLowerCase().includes(searchTerm) ||
      (product.material?.toLowerCase().includes(searchTerm) ?? false)

    const matchesFilter = filter === "all" || product.category === filter

    return matchesSearch && matchesFilter
  })

  const total = cart.reduce((sum, item) => sum + item.price, 0)

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">Ready-Made Collection</h1>
          <div className="relative">
            <Button variant="outline" onClick={() => setShowCart(!showCart)} className="relative">
              <ShoppingCart className="w-5 h-5" />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                  {cart.length}
                </span>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 md:mb-8">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="shirts">Shirts</SelectItem>
                  <SelectItem value="pants">Pants</SelectItem>
                  <SelectItem value="dresses">Dresses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden hover:shadow-lg transition">
                  <div className="bg-muted h-48"></div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-2">{product.name}</h3>
                    <div className="space-y-1 text-sm text-muted-foreground mb-3">
                      {product.color && <p>Color: {product.color}</p>}
                      {product.material && <p>Material: {product.material}</p>}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold">₹{product.price}</p>
                      <Button size="sm" onClick={() => addToCart(product)} disabled={product.stock === 0}>
                        {product.stock > 0 ? "Add" : "Out of Stock"}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {filteredProducts.length === 0 && (
                <Card className="p-6 md:col-span-2">
                  <p className="text-muted-foreground text-center">No products found for your search.</p>
                </Card>
              )}
            </div>
          </div>

          {/* Shopping Cart Sidebar */}
          {showCart && (
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-8">
                <h2 className="text-xl font-bold mb-4">Shopping Cart</h2>
                {cart.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Cart is empty</p>
                ) : (
                  <>
                    <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                      {cart.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">₹{item.price}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removeFromCart(item.id)}>
                            ✕
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4 space-y-3">
                      <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span>₹{total}</span>
                      </div>
                      <Button className="w-full">Proceed to Checkout</Button>
                    </div>
                  </>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

"use client"

import Link from "next/link"
import { GlobalNavbar } from "@/components/global-navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useCart } from "@/components/cart-provider"

export default function CartPage() {
  const { items, total, updateQuantity, removeItem, clearCart } = useCart()

  return (
    <main className="min-h-screen bg-background">
      <GlobalNavbar />
      <section className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">Your Cart</h1>
        {items.length === 0 ? (
          <Card className="p-8 text-center space-y-3">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Button asChild>
              <Link href="/products">Browse Products</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-muted-foreground">Rs. {item.price}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                      -
                    </Button>
                    <span className="min-w-8 text-center">{item.quantity}</span>
                    <Button variant="outline" size="sm" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                      +
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between font-semibold">
                <span>Total</span>
                <span>Rs. {total}</span>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" asChild>
                  <Link href="/login?callbackUrl=%2Fcustomer%2Fproducts">Checkout</Link>
                </Button>
                <Button variant="outline" onClick={clearCart}>
                  Clear Cart
                </Button>
              </div>
            </Card>
          </div>
        )}
      </section>
    </main>
  )
}

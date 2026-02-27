"use client"

import Link from "next/link"
import Image from "next/image"
import { GlobalNavbar } from "@/components/global-navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useCart } from "@/components/cart-provider"
import { useSession } from "next-auth/react"
import { getDashboardByRole } from "@/lib/role-routes"

export default function CartPage() {
  const { data: session } = useSession()
  const { items, total, updateQuantity, removeItem, clearCart, addToWishlist, isInWishlist } = useCart()

  const subtotal = total
  const shipping = subtotal >= 1999 || subtotal === 0 ? 0 : 99
  const tax = subtotal * 0.05
  const grandTotal = subtotal + shipping + tax

  const checkoutHref = !session?.user
    ? "/login?callbackUrl=%2Fcustomer%2Fproducts"
    : session.user.role === "CUSTOMER"
      ? "/customer/products"
      : getDashboardByRole(session.user.role)

  return (
    <main className="min-h-screen bg-background">
      <GlobalNavbar />
      <section className="max-w-6xl mx-auto px-4 py-10 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold">Your Cart</h1>
          <p className="text-sm text-muted-foreground">Review your items and proceed to checkout.</p>
        </div>

        {items.length === 0 ? (
          <Card className="p-6 md:p-8 text-center space-y-3">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Button asChild>
              <Link href="/products">Browse Products</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            <div className="space-y-4">
              {items.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {item.image ? (
                        <Image src={item.image} alt={item.name} width={120} height={120} className="h-16 w-16 rounded-md object-cover border" />
                      ) : (
                        <div className="h-16 w-16 rounded-md bg-muted border" />
                      )}
                      <div>
                        <Link href={`/products/${item.id}`} className="font-semibold hover:text-primary hover:underline">
                          {item.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">Unit price: Rs. {item.price.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">Subtotal: Rs. {(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                        -
                      </Button>
                      <span className="min-w-8 text-center font-medium">{item.quantity}</span>
                      <Button variant="outline" size="sm" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                        +
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isInWishlist(item.id)}
                        onClick={() => {
                          addToWishlist({ id: item.id, name: item.name, price: item.price, image: item.image })
                          removeItem(item.id)
                        }}
                      >
                        {isInWishlist(item.id) ? "In Wishlist" : "Move to Wishlist"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              <Button variant="outline" onClick={clearCart}>
                Clear Cart
              </Button>
            </div>

            <Card className="p-5 h-fit sticky top-24 space-y-4">
              <h2 className="text-lg font-semibold">Order Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>Rs. {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{shipping === 0 ? "Free" : `Rs. ${shipping.toFixed(2)}`}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tax (5%)</span>
                  <span>Rs. {tax.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex items-center justify-between font-semibold">
                  <span>Total</span>
                  <span>Rs. {grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <Button className="w-full" asChild>
                <Link href={checkoutHref}>
                  {session?.user?.role === "CUSTOMER" ? "Proceed to Checkout" : session?.user ? "Go to Dashboard" : "Proceed to Checkout"}
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/products">Continue Shopping</Link>
              </Button>
            </Card>
          </div>
        )}
      </section>
    </main>
  )
}

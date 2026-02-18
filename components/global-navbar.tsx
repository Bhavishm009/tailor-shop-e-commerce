"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/components/cart-provider"
import { ThemeToggle } from "@/components/theme-toggle"
import { Menu, Scissors, Search, ShoppingCart, X } from "lucide-react"
import { getDashboardByRole } from "@/lib/role-routes"

export function GlobalNavbar() {
  const router = useRouter()
  const { data: session } = useSession()
  const { count } = useCart()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [query, setQuery] = useState("")

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return

    router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`)
  }

  return (
    <header className="border-b sticky top-0 z-50 bg-background">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Scissors className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">TailorHub</h1>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/features" className="hover:text-primary transition">
              Features
            </Link>
            <Link href="/blog" className="hover:text-primary transition">
              Blog
            </Link>
            <Link href="/products" className="hover:text-primary transition">
              Products
            </Link>
            <Link href="/custom-stitching" className="hover:text-primary transition">
              Custom Stitching
            </Link>
          </nav>

          <form onSubmit={onSearch} className="hidden md:flex items-center gap-2 w-full max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products or blogs..."
                className="pl-10"
              />
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="outline" asChild className="relative">
              <Link href="/cart" aria-label="Cart">
                <ShoppingCart className="w-4 h-4" />
                {count > 0 ? (
                  <Badge className="absolute -top-2 -right-2 min-w-5 h-5 px-1 flex items-center justify-center text-[10px]">
                    {count}
                  </Badge>
                ) : null}
              </Link>
            </Button>
            <ThemeToggle />
            {session?.user ? (
              <Button
                onClick={() => {
                  router.push(getDashboardByRole(session.user.role))
                }}
              >
                Dashboard
              </Button>
            ) : (
              <>
                <Button variant="outline" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </>
            )}
          </div>

          <button className="md:hidden" onClick={() => setMobileOpen((prev) => !prev)} aria-label="Toggle menu">
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t mt-4 pt-4 space-y-4">
            <form onSubmit={onSearch} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products or blogs..."
                  className="pl-10"
                />
              </div>
              <Button type="submit" variant="outline">
                Go
              </Button>
            </form>

            <nav className="flex flex-col gap-2">
              <Link href="/features" onClick={() => setMobileOpen(false)} className="hover:text-primary transition">
                Features
              </Link>
              <Link href="/blog" onClick={() => setMobileOpen(false)} className="hover:text-primary transition">
                Blog
              </Link>
              <Link href="/products" onClick={() => setMobileOpen(false)} className="hover:text-primary transition">
                Products
              </Link>
              <Link
                href="/custom-stitching"
                onClick={() => setMobileOpen(false)}
                className="hover:text-primary transition"
              >
                Custom Stitching
              </Link>
              <Link href="/cart" onClick={() => setMobileOpen(false)} className="hover:text-primary transition">
                Cart ({count})
              </Link>
              <div>
                <ThemeToggle />
              </div>
            </nav>

            {session?.user ? (
              <Button
                className="w-full"
                onClick={() => {
                  setMobileOpen(false)
                  router.push(getDashboardByRole(session.user.role))
                }}
              >
                Dashboard
              </Button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" asChild onClick={() => setMobileOpen(false)}>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild onClick={() => setMobileOpen(false)}>
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

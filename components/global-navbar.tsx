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
import { Heart, Menu, Scissors, Search, ShoppingCart, X } from "lucide-react"
import { getDashboardByRole } from "@/lib/role-routes"
import { languageNames, supportedLanguages, type LanguageCode } from "@/lib/i18n"
import { useI18n } from "@/components/i18n-provider"

export function GlobalNavbar() {
  const router = useRouter()
  const { data: session } = useSession()
  const { count, wishlistCount } = useCart()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [query, setQuery] = useState("")
  const { language, setLanguage, dictionary } = useI18n()

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      router.push("/search")
      return
    }

    router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`)
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[70] border-b border-border/60 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto max-w-7xl px-4 py-3 md:py-4">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Scissors className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">TailorHub</h1>
          </Link>

          <nav className="hidden lg:flex items-center gap-4 xl:gap-6">
            <Link href="/features" className="hover:text-primary transition">
              {dictionary.navbar.features}
            </Link>
            <Link href="/blog" className="hover:text-primary transition">
              {dictionary.navbar.blog}
            </Link>
            <Link href="/products" className="hover:text-primary transition">
              {dictionary.navbar.products}
            </Link>
            <Link href="/custom-stitching" className="whitespace-nowrap hover:text-primary transition">
              {dictionary.navbar.customStitching}
            </Link>
          </nav>

          <form onSubmit={onSearch} className="hidden lg:flex items-center gap-2 w-full max-w-sm xl:max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={dictionary.navbar.searchPlaceholder}
                className="pl-10"
              />
            </div>
            <Button type="submit" variant="outline">
              {dictionary.navbar.searchButton}
            </Button>
          </form>

          <div className="hidden lg:flex items-center gap-2 xl:gap-3">
            {/* <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              aria-label="Select language"
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              {supportedLanguages.map((item) => (
                <option key={item} value={item}>
                  {languageNames[item]}
                </option>
              ))}
            </select> */}
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
            <Button variant="outline" asChild className="relative">
              <Link href="/wishlist" aria-label="Wishlist">
                <Heart className="w-4 h-4" />
                {wishlistCount > 0 ? (
                  <Badge className="absolute -top-2 -right-2 min-w-5 h-5 px-1 flex items-center justify-center text-[10px]">
                    {wishlistCount}
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
                {dictionary.navbar.dashboard}
              </Button>
            ) : (
              <>
                <Button variant="outline" asChild>
                  <Link href="/login">{dictionary.navbar.signIn}</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">{dictionary.navbar.signUp}</Link>
                </Button>
              </>
            )}
          </div>

          <button className="lg:hidden" onClick={() => setMobileOpen((prev) => !prev)} aria-label="Toggle menu">
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="mt-3 space-y-4 rounded-xl border border-border/70 bg-card/85 p-4 shadow-sm backdrop-blur lg:hidden">
            <form onSubmit={onSearch} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={dictionary.navbar.searchPlaceholder}
                  className="pl-10"
                />
              </div>
              <Button type="submit" variant="outline">
                {dictionary.navbar.goButton}
              </Button>
            </form>

            {/* <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              aria-label="Select language"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              {supportedLanguages.map((item) => (
                <option key={item} value={item}>
                  {languageNames[item]}
                </option>
              ))}
            </select> */}

            <nav className="flex flex-col gap-2">
              <Link href="/features" onClick={() => setMobileOpen(false)} className="hover:text-primary transition">
                {dictionary.navbar.features}
              </Link>
              <Link href="/blog" onClick={() => setMobileOpen(false)} className="hover:text-primary transition">
                {dictionary.navbar.blog}
              </Link>
              <Link href="/products" onClick={() => setMobileOpen(false)} className="hover:text-primary transition">
                {dictionary.navbar.products}
              </Link>
              <Link
                href="/custom-stitching"
                onClick={() => setMobileOpen(false)}
                className="hover:text-primary transition"
              >
                {dictionary.navbar.customStitching}
              </Link>
              <Link href="/cart" onClick={() => setMobileOpen(false)} className="hover:text-primary transition">
                {dictionary.navbar.cart} ({count})
              </Link>
              <Link href="/wishlist" onClick={() => setMobileOpen(false)} className="hover:text-primary transition">
                {dictionary.navbar.wishlist} ({wishlistCount})
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
                {dictionary.navbar.dashboard}
              </Button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" asChild onClick={() => setMobileOpen(false)}>
                  <Link href="/login">{dictionary.navbar.signIn}</Link>
                </Button>
                <Button asChild onClick={() => setMobileOpen(false)}>
                  <Link href="/signup">{dictionary.navbar.signUp}</Link>
                </Button>
              </div>
            )}
          </div>
        )}
        </div>
      </header>
      <div aria-hidden className="h-[73px] md:h-[81px]" />
    </>
  )
}

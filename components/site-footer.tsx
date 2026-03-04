"use client"

import Link from "next/link"
import { Scissors, Mail, Phone, MapPin } from "lucide-react"
import { useI18n } from "@/components/i18n-provider"

export function SiteFooter() {
  const { dictionary } = useI18n()

  return (
    <footer className="mt-14 border-t border-border/60 bg-gradient-to-b from-secondary/35 to-background">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-4 md:py-12">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-primary" />
            <p className="text-lg font-semibold">TailorHub</p>
          </div>
          <p className="text-sm text-muted-foreground">{dictionary.footer.description}</p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">{dictionary.footer.explore}</p>
          <div className="space-y-2 text-sm">
            <Link href="/products" className="block hover:text-primary">{dictionary.navbar.products}</Link>
            <Link href="/custom-stitching" className="block hover:text-primary">{dictionary.navbar.customStitching}</Link>
            <Link href="/features" className="block hover:text-primary">{dictionary.navbar.features}</Link>
            <Link href="/blog" className="block hover:text-primary">{dictionary.navbar.blog}</Link>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">{dictionary.footer.company}</p>
          <div className="space-y-2 text-sm">
            <Link href="/login" className="block hover:text-primary">{dictionary.navbar.signIn}</Link>
            <Link href="/signup" className="block hover:text-primary">{dictionary.footer.createAccount}</Link>
            <Link href="/notifications" className="block hover:text-primary">{dictionary.footer.notifications}</Link>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">{dictionary.footer.contact}</p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2"><Mail className="h-4 w-4" /> support@tailorhub.com</p>
            <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> +1 (800) 555-0148</p>
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> New York, United States</p>
          </div>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} TailorHub. {dictionary.footer.rights}</p>
          <p>{dictionary.footer.tagline}</p>
        </div>
      </div>
    </footer>
  )
}

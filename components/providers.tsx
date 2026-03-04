"use client"

import type React from "react"
import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "next-themes"
import { CartProvider } from "@/components/cart-provider"
import { I18nProvider } from "@/components/i18n-provider"
import { Toaster } from "@/components/ui/sonner"
import type { LanguageCode } from "@/lib/i18n"

export function Providers({ children, initialLanguage }: { children: React.ReactNode; initialLanguage: LanguageCode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SessionProvider>
        <I18nProvider initialLanguage={initialLanguage}>
          <CartProvider>
            {children}
            <Toaster position="top-center" />
          </CartProvider>
        </I18nProvider>
      </SessionProvider>
    </ThemeProvider>
  )
}

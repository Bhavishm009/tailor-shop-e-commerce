"use client"

import type React from "react"
import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "next-themes"
import { CartProvider } from "@/components/cart-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SessionProvider>
        <CartProvider>{children}</CartProvider>
      </SessionProvider>
    </ThemeProvider>
  )
}

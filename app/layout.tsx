import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Providers } from "@/components/providers"
import { NotificationPermissionPrompt } from "@/components/notification-permission-prompt"
import { PWARegister } from "@/components/pwa-register"
import { PushAutoSync } from "@/components/push-auto-sync"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TailorHub - Custom Stitching & Ready-Made Clothing",
  description: "Expert tailoring services and premium ready-made garments",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  generator: "v0.app",
  themeColor: "#6d28d9",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TailorHub",
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className={`font-sans antialiased`}>
        <Providers>
          {children}
          <NotificationPermissionPrompt />
          <PushAutoSync />
        </Providers>
        <Analytics />
        <PWARegister />
      </body>
    </html>
  )
}

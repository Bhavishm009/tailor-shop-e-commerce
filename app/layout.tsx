import type React from "react"
import type { Metadata, Viewport } from "next"
import { Manrope, Sora } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Providers } from "@/components/providers"
import { NotificationPermissionPrompt } from "@/components/notification-permission-prompt"
import { PWARegister } from "@/components/pwa-register"
import { PwaInstallPrompt } from "@/components/pwa-install-prompt"
import { PushAutoSync } from "@/components/push-auto-sync"
import "./globals.css"

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
})

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "TailorHub | Custom Stitching & Premium Ready-Made Fashion",
    template: "%s | TailorHub",
  },
  description:
    "TailorHub offers custom stitching, expert tailoring, and premium ready-made clothing with fast delivery, secure checkout, and real-time order tracking.",
  applicationName: "TailorHub",
  referrer: "origin-when-cross-origin",
  keywords: [
    "tailor",
    "custom stitching",
    "ready-made clothing",
    "tailoring service",
    "fashion ecommerce",
    "tailorhub",
    "online boutique",
    "clothing alterations",
  ],
  authors: [{ name: "TailorHub" }],
  creator: "TailorHub",
  publisher: "TailorHub",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  category: "fashion",
  generator: "v0.app",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "TailorHub | Custom Stitching & Premium Ready-Made Fashion",
    description:
      "Book custom stitching and shop premium ready-made clothing with TailorHub. Experience expert craftsmanship and modern ecommerce convenience.",
    type: "website",
    siteName: "TailorHub",
    url: "/",
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "TailorHub custom stitching and ready-made fashion",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TailorHub | Custom Stitching & Premium Ready-Made Fashion",
    description:
      "Custom tailoring and ready-made fashion in one place. TailorHub helps you get the perfect fit with a seamless online experience.",
    images: ["/twitter-image"],
  },
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

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#145f8e" },
    { media: "(prefers-color-scheme: dark)", color: "#0b2234" },
  ],
  colorScheme: "light dark",
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
      <body className={`${manrope.variable} ${sora.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <PwaInstallPrompt />
          <NotificationPermissionPrompt />
          <PushAutoSync />
        </Providers>
        <Analytics />
        <PWARegister />
      </body>
    </html>
  )
}

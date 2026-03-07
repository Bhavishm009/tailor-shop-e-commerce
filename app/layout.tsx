import type React from "react"
import type { Metadata, Viewport } from "next"
import { Manrope, Sora } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Providers } from "@/components/providers"
import { NotificationPermissionPrompt } from "@/components/notification-permission-prompt"
import { PWARegister } from "@/components/pwa-register"
import { PwaInstallPrompt } from "@/components/pwa-install-prompt"
import { PushAutoSync } from "@/components/push-auto-sync"
import { getServerLanguage } from "@/lib/i18n-server"
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
    languages: {
      "en-IN": "/?lang=en",
      "hi-IN": "/?lang=hi",
      "mr-IN": "/?lang=mr",
      "bn-IN": "/?lang=bn",
      "ta-IN": "/?lang=ta",
      "te-IN": "/?lang=te",
      "gu-IN": "/?lang=gu",
      "kn-IN": "/?lang=kn",
      "ml-IN": "/?lang=ml",
      "pa-IN": "/?lang=pa",
      "x-default": "/",
    },
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
    alternateLocale: ["hi_IN", "mr_IN", "bn_IN", "ta_IN", "te_IN", "gu_IN", "kn_IN", "ml_IN", "pa_IN"],
    images: [
      {
        url: "/opengraph.png",
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
    images: ["/twitter-card.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TailorHub",
  },
  icons: {
    icon: [
      {
        url: "/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/favicon-48x48.png",
        sizes: "48x48",
        type: "image/png",
      },
    ],
    shortcut: ["/favicon-32x32.png"],
    apple: [
      { url: "/apple-touch-icon-120x120.png", sizes: "120x120" },
      { url: "/apple-touch-icon-152x152.png", sizes: "152x152" },
      { url: "/apple-touch-icon-167x167.png", sizes: "167x167" },
      { url: "/apple-touch-icon-180x180.png", sizes: "180x180" },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#145f8e" },
    { media: "(prefers-color-scheme: dark)", color: "#0b2234" },
  ],
  colorScheme: "light dark",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const lang = await getServerLanguage()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "TailorHub",
    url: siteUrl,
    logo: `${siteUrl}/android-512x512.png`,
  }
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "TailorHub",
    url: siteUrl,
    inLanguage: ["en-IN", "hi-IN", "mr-IN", "bn-IN", "ta-IN", "te-IN", "gu-IN", "kn-IN", "ml-IN", "pa-IN"],
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  }
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      </head>
      <body className={`${manrope.variable} ${sora.variable} font-sans antialiased`}>
        <Providers initialLanguage={lang}>
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

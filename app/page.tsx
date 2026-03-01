import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle2, Scissors, ShoppingBag, TrendingUp } from "lucide-react"
import { GlobalNavbar } from "@/components/global-navbar"
import { SiteFooter } from "@/components/site-footer"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Custom Stitching & Premium Ready-Made Clothing",
  description:
    "Order custom stitching, shop premium ready-made fashion, and track every step with TailorHub's modern tailoring platform.",
  keywords: [
    "custom stitching",
    "ready-made clothing",
    "tailor near me",
    "online tailoring",
    "fashion ecommerce",
    "tailorhub",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "TailorHub | Custom Stitching & Premium Ready-Made Clothing",
    description: "Book expert stitching and shop premium outfits with TailorHub.",
    url: "/",
    type: "website",
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
    title: "TailorHub | Custom Stitching & Premium Ready-Made Clothing",
    description: "Book expert stitching and shop premium outfits with TailorHub.",
    images: ["/twitter-image"],
  },
}

export default function Home() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "TailorHub",
    url: siteUrl,
    logo: `${siteUrl}/icon-512x512.png`,
    sameAs: [],
  }

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "TailorHub",
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  }

  return (
    <main className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <GlobalNavbar />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 py-12 md:py-20">
        <div className="text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-pretty">Perfect Fit, Every Time</h2>
          <p className="text-xl text-muted-foreground mb-8 text-balance max-w-2xl mx-auto">
            Get custom-tailored clothing with expert craftsmanship or choose from our premium ready-made collection.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/custom-stitching">Start Custom Order</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/products">Browse Products</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-4 py-10 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 md:mb-12 text-center">Why Choose TailorHub?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: <Scissors className="w-8 h-8" />,
              title: "Expert Tailoring",
              description: "Professional tailors with years of experience",
            },
            {
              icon: <ShoppingBag className="w-8 h-8" />,
              title: "Premium Collection",
              description: "Curated ready-made garments of the highest quality",
            },
            {
              icon: <TrendingUp className="w-8 h-8" />,
              title: "Easy Tracking",
              description: "Real-time order tracking and status updates",
            },
          ].map((feature, i) => (
            <Card key={i} className="p-6">
              <div className="text-primary mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Services */}
      <section id="services" className="bg-secondary py-10 md:py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 md:mb-12 text-center">Our Services</h2>
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            <Card className="p-4 sm:p-6 md:p-8">
              <h3 className="text-xl md:text-2xl font-bold mb-4">Custom Stitching</h3>
              <ul className="space-y-3">
                {[
                  "Choose your fabric and design",
                  "Save custom measurements",
                  "Expert tailors assigned",
                  "Track progress in real-time",
                  "Rate your tailor",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-4 sm:p-6 md:p-8">
              <h3 className="text-xl md:text-2xl font-bold mb-4">Ready-Made Clothing</h3>
              <ul className="space-y-3">
                {[
                  "Premium quality garments",
                  "Variety of styles and sizes",
                  "Easy checkout process",
                  "Fast delivery",
                  "Customer reviews & ratings",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}

import Link from "next/link"
import { GlobalNavbar } from "@/components/global-navbar"
import { SiteFooter } from "@/components/site-footer"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Scissors, ShoppingBag, TrendingUp } from "lucide-react"
import { getServerDictionary } from "@/lib/i18n-server"

export default async function FeaturesPage() {
  const dict = await getServerDictionary()
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  const featureCards = [
    {
      icon: <Scissors className="w-8 h-8" />,
      title: dict.featuresPage.expertTitle,
      description: dict.featuresPage.expertDesc,
    },
    {
      icon: <ShoppingBag className="w-8 h-8" />,
      title: dict.featuresPage.ecommerceTitle,
      description: dict.featuresPage.ecommerceDesc,
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: dict.featuresPage.trackingTitle,
      description: dict.featuresPage.trackingDesc,
    },
  ]

  const points = dict.featuresPage.points
  const pageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: dict.featuresPage.title,
    description: dict.featuresPage.subtitle,
    url: `${baseUrl}/features`,
  }
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: dict.common.home, item: baseUrl },
      { "@type": "ListItem", position: 2, name: dict.navbar.features, item: `${baseUrl}/features` },
    ],
  }
  const featureListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: dict.featuresPage.title,
    itemListElement: featureCards.map((feature, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: feature.title,
      description: feature.description,
    })),
  }

  return (
    <main className="min-h-screen bg-background">
      <GlobalNavbar />
      <section className="max-w-7xl mx-auto px-4 py-10 space-y-10">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(featureListSchema) }} />
        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold">{dict.featuresPage.title}</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {dict.featuresPage.subtitle}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {featureCards.map((feature) => (
            <Card key={feature.title} className="p-6 space-y-3">
              <div className="text-primary">{feature.icon}</div>
              <h2 className="text-xl font-semibold">{feature.title}</h2>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>

        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">{dict.featuresPage.whatUsersCanDo}</h2>
          <ul className="space-y-3">
            {points.map((point) => (
              <li key={point} className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/products">{dict.featuresPage.shopProducts}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/custom-stitching">{dict.featuresPage.bookCustomStitching}</Link>
          </Button>
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}

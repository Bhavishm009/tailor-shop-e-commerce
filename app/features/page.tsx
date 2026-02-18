import Link from "next/link"
import { GlobalNavbar } from "@/components/global-navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Scissors, ShoppingBag, TrendingUp } from "lucide-react"

export default function FeaturesPage() {
  const featureCards = [
    {
      icon: <Scissors className="w-8 h-8" />,
      title: "Expert Tailoring",
      description: "Professional tailoring by experienced specialists for daily and occasion wear.",
    },
    {
      icon: <ShoppingBag className="w-8 h-8" />,
      title: "E-commerce Ready",
      description: "Browse products, add to cart, and shop directly from our ready-made collection.",
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Transparent Tracking",
      description: "Follow your order progress with clear milestones from assignment to delivery.",
    },
  ]

  const points = [
    "Product catalog and cart for instant purchase",
    "Custom stitching flow with measurement support",
    "Role-based system for admin, tailor, and customer",
    "Public blog and search for style and tailoring guidance",
  ]

  return (
    <main className="min-h-screen bg-background">
      <GlobalNavbar />
      <section className="max-w-7xl mx-auto px-4 py-10 space-y-10">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold">Platform Features</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            TailorHub combines online shopping with custom stitching so users can choose ready-made products or book personalized tailoring.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {featureCards.map((feature) => (
            <Card key={feature.title} className="p-6 space-y-3">
              <div className="text-primary">{feature.icon}</div>
              <h2 className="text-xl font-semibold">{feature.title}</h2>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>

        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">What Users Can Do</h2>
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
            <Link href="/products">Shop Products</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/custom-stitching">Book Custom Stitching</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}

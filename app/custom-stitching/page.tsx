"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useSession } from "next-auth/react"
import { GlobalNavbar } from "@/components/global-navbar"
import { SiteFooter } from "@/components/site-footer"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/components/i18n-provider"

export default function CustomStitchingPage() {
  const { data: session } = useSession()
  const { dictionary } = useI18n()
  const role = session?.user?.role

  const bookingHref = useMemo(() => {
    if (!session?.user) return "/login?callbackUrl=%2Fcustomer%2Forders%2Fcustom"
    if (role === "CUSTOMER") return "/customer/orders/custom"
    if (role === "TAILOR") return "/tailor/dashboard"
    if (role === "ADMIN") return "/admin/dashboard"
    return "/customer/orders/custom"
  }, [role, session?.user])

  const bookingLabel = useMemo(() => {
    if (!session?.user) return dictionary.customStitching.bookNow
    if (role === "CUSTOMER") return dictionary.customStitching.continueBooking
    return dictionary.customStitching.openDashboard
  }, [dictionary.customStitching.bookNow, dictionary.customStitching.continueBooking, dictionary.customStitching.openDashboard, role, session?.user])
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: dictionary.customStitching.title,
    description: dictionary.customStitching.subtitle,
    provider: {
      "@type": "Organization",
      name: "TailorHub",
      url: baseUrl,
    },
    areaServed: "IN",
    url: `${baseUrl}/custom-stitching`,
  }
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: dictionary.common.home, item: baseUrl },
      { "@type": "ListItem", position: 2, name: dictionary.navbar.customStitching, item: `${baseUrl}/custom-stitching` },
    ],
  }

  return (
    <main className="min-h-screen bg-background">
      <GlobalNavbar />
      <section className="mx-auto max-w-5xl space-y-7 px-4 py-10">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
        <div className="glass-panel rounded-2xl p-6 md:p-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{dictionary.customStitching.badge}</p>
          <h1 className="text-3xl font-bold md:text-5xl">{dictionary.customStitching.title}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {dictionary.customStitching.subtitle}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="glass-panel p-5">
            <h2 className="font-semibold mb-2">{dictionary.customStitching.step1Title}</h2>
            <p className="text-sm text-muted-foreground">{dictionary.customStitching.step1Desc}</p>
          </Card>
          <Card className="glass-panel p-5">
            <h2 className="font-semibold mb-2">{dictionary.customStitching.step2Title}</h2>
            <p className="text-sm text-muted-foreground">{dictionary.customStitching.step2Desc}</p>
          </Card>
          <Card className="glass-panel p-5">
            <h2 className="font-semibold mb-2">{dictionary.customStitching.step3Title}</h2>
            <p className="text-sm text-muted-foreground">{dictionary.customStitching.step3Desc}</p>
          </Card>
        </div>

        <Card className="glass-panel space-y-4 p-4 sm:p-6">
          <h3 className="text-xl font-semibold">{dictionary.customStitching.readyTitle}</h3>
          <p className="text-muted-foreground">
            {session?.user
              ? role === "CUSTOMER"
                ? dictionary.customStitching.signedInCustomer
                : dictionary.customStitching.signedInOtherRole
              : dictionary.customStitching.notSignedIn}
          </p>
          <div className="flex gap-3">
            <Button asChild>
              <Link href={bookingHref}>{bookingLabel}</Link>
            </Button>
            {!session?.user ? (
              <Button variant="outline" asChild>
                <Link href="/signup">{dictionary.customStitching.createAccount}</Link>
              </Button>
            ) : null}
          </div>
        </Card>
      </section>
      <SiteFooter />
    </main>
  )
}

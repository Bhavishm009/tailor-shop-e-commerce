"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useSession } from "next-auth/react"
import { GlobalNavbar } from "@/components/global-navbar"
import { SiteFooter } from "@/components/site-footer"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function CustomStitchingPage() {
  const { data: session } = useSession()
  const role = session?.user?.role

  const bookingHref = useMemo(() => {
    if (!session?.user) return "/login?callbackUrl=%2Fcustomer%2Forders%2Fcustom"
    if (role === "CUSTOMER") return "/customer/orders/custom"
    if (role === "TAILOR") return "/tailor/dashboard"
    if (role === "ADMIN") return "/admin/dashboard"
    return "/customer/orders/custom"
  }, [role, session?.user])

  const bookingLabel = useMemo(() => {
    if (!session?.user) return "Book Now"
    if (role === "CUSTOMER") return "Continue Booking"
    return "Open Dashboard"
  }, [role, session?.user])

  return (
    <main className="min-h-screen bg-background">
      <GlobalNavbar />
      <section className="mx-auto max-w-5xl space-y-7 px-4 py-10">
        <div className="glass-panel rounded-2xl p-6 md:p-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">TailorHub Studio</p>
          <h1 className="text-3xl font-bold md:text-5xl">Custom Stitching</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Share your style, measurements, and fabric preference. Our tailors deliver precise fit and finish from
            first cut to final delivery.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="glass-panel p-5">
            <h2 className="font-semibold mb-2">1. Submit Requirements</h2>
            <p className="text-sm text-muted-foreground">Select cloth type, upload reference, and provide notes.</p>
          </Card>
          <Card className="glass-panel p-5">
            <h2 className="font-semibold mb-2">2. Tailor Assignment</h2>
            <p className="text-sm text-muted-foreground">An expert tailor is assigned to your request.</p>
          </Card>
          <Card className="glass-panel p-5">
            <h2 className="font-semibold mb-2">3. Track Progress</h2>
            <p className="text-sm text-muted-foreground">Follow status from pending to delivered.</p>
          </Card>
        </div>

        <Card className="glass-panel space-y-4 p-4 sm:p-6">
          <h3 className="text-xl font-semibold">Ready to place a custom stitching order?</h3>
          <p className="text-muted-foreground">
            {session?.user
              ? role === "CUSTOMER"
                ? "You are signed in. Continue to measurement and custom booking."
                : "You are signed in with a non-customer role. Use your dashboard to continue."
              : "You can start the booking flow now. If you are not signed in, you will be asked to log in first."}
          </p>
          <div className="flex gap-3">
            <Button asChild>
              <Link href={bookingHref}>{bookingLabel}</Link>
            </Button>
            {!session?.user ? (
              <Button variant="outline" asChild>
                <Link href="/signup">Create Account</Link>
              </Button>
            ) : null}
          </div>
        </Card>
      </section>
      <SiteFooter />
    </main>
  )
}

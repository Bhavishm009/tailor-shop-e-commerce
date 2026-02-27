"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useSession } from "next-auth/react"
import { GlobalNavbar } from "@/components/global-navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function CustomStitchingPage() {
  const { data: session } = useSession()

  const bookingHref = useMemo(() => {
    if (!session?.user) return "/login?callbackUrl=%2Fcustomer%2Forders%2Fcustom"
    return "/customer/orders/custom"
  }, [session?.user])

  const bookingLabel = useMemo(() => {
    if (!session?.user) return "Book Now"
    return "Continue Booking"
  }, [session?.user])

  return (
    <main className="min-h-screen bg-background">
      <GlobalNavbar />
      <section className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold">Custom Stitching</h1>
          <p className="text-muted-foreground">
            Share your style, measurements, and fabric preference. Our tailors will deliver a precise fit.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="p-5">
            <h2 className="font-semibold mb-2">1. Submit Requirements</h2>
            <p className="text-sm text-muted-foreground">Select cloth type, upload reference, and provide notes.</p>
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold mb-2">2. Tailor Assignment</h2>
            <p className="text-sm text-muted-foreground">An expert tailor is assigned to your request.</p>
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold mb-2">3. Track Progress</h2>
            <p className="text-sm text-muted-foreground">Follow status from pending to delivered.</p>
          </Card>
        </div>

        <Card className="p-4 sm:p-6 space-y-4">
          <h3 className="text-xl font-semibold">Ready to place a custom stitching order?</h3>
          <p className="text-muted-foreground">
            {session?.user
              ? "You are signed in. Continue to measurement and custom booking."
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
    </main>
  )
}

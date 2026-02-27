"use client"

import Link from "next/link"
import { FormEvent, useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { FeedbackToasts } from "@/components/admin/feedback-toasts"
import { Spinner } from "@/components/ui/spinner"

type NotificationPreferences = {
  notifyEmail: boolean
  notifyPush: boolean
  notifyOrders: boolean
  notifyOffers: boolean
}

const managementLinks = [
  { href: "/admin/users", label: "Manage Users", description: "View, search, and manage all customer and admin accounts." },
  { href: "/admin/tailors", label: "Manage Tailors", description: "Review tailor profiles, ratings, and assignment readiness." },
  { href: "/admin/ready-made-orders", label: "Ready-Made Orders", description: "Track ready-made order statuses and keep fulfilment on schedule." },
  { href: "/admin/custom-orders", label: "Custom Orders", description: "Assign tailors and manage custom stitching order progress." },
  { href: "/admin/stitching-services", label: "Stitching Services", description: "Manage stitching categories, methods, rates, and availability." },
  { href: "/admin/products", label: "Manage Products", description: "Update ready-made product catalog and stock listings." },
  { href: "/admin/reviews", label: "Manage Reviews", description: "Monitor customer feedback and tailor performance." },
  { href: "/admin/notifications", label: "Notifications", description: "Send broadcast push notifications to all users and guests." },
  { href: "/admin/blogs", label: "Manage Blogs", description: "Publish and maintain blog content for users." },
]

export default function AdminSettingsPage() {
  const [loadingPrefs, setLoadingPrefs] = useState(true)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [prefs, setPrefs] = useState<NotificationPreferences>({
    notifyEmail: true,
    notifyPush: false,
    notifyOrders: true,
    notifyOffers: false,
  })

  useEffect(() => {
    const loadPreferences = async () => {
      setError("")
      try {
        const response = await fetch("/api/account/profile", { cache: "no-store" })
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Failed to load settings." }))
          setError(data.error || "Failed to load settings.")
          return
        }

        const data = (await response.json()) as NotificationPreferences
        setPrefs({
          notifyEmail: data.notifyEmail,
          notifyPush: data.notifyPush,
          notifyOrders: data.notifyOrders,
          notifyOffers: data.notifyOffers,
        })
      } catch {
        setError("Failed to load settings.")
      } finally {
        setLoadingPrefs(false)
      }
    }

    loadPreferences()
  }, [])

  const onSavePreferences = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSavingPrefs(true)

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to save preferences." }))
        setError(data.error || "Failed to save preferences.")
        return
      }

      setSuccess("Notification preferences updated.")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save preferences.")
    } finally {
      setSavingPrefs(false)
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Admin Settings</h1>
          <p className="text-muted-foreground mt-2">Central controls and your personal notification preferences.</p>
        </div>

        <FeedbackToasts error={error} success={success} />

        <Card className="p-5 space-y-4">
          <h2 className="font-semibold">Notification Preferences</h2>

          {loadingPrefs ? (
            <p className="text-sm text-muted-foreground">Loading preferences...</p>
          ) : (
            <form onSubmit={onSavePreferences} className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Get important alerts by email.</p>
                </div>
                <Switch checked={prefs.notifyEmail} onCheckedChange={(checked) => setPrefs((prev) => ({ ...prev, notifyEmail: checked }))} />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive instant in-app notifications.</p>
                </div>
                <Switch checked={prefs.notifyPush} onCheckedChange={(checked) => setPrefs((prev) => ({ ...prev, notifyPush: checked }))} />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Order Updates</p>
                  <p className="text-sm text-muted-foreground">Get updates for order status changes.</p>
                </div>
                <Switch checked={prefs.notifyOrders} onCheckedChange={(checked) => setPrefs((prev) => ({ ...prev, notifyOrders: checked }))} />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Offers and Promotions</p>
                  <p className="text-sm text-muted-foreground">Receive promotional announcements.</p>
                </div>
                <Switch checked={prefs.notifyOffers} onCheckedChange={(checked) => setPrefs((prev) => ({ ...prev, notifyOffers: checked }))} />
              </div>

              <Button type="submit" size="lg" className="min-w-44 mx-auto flex" disabled={savingPrefs}>
                {savingPrefs ? <><Spinner className="mr-2" />Saving...</> : "Save Preferences"}
              </Button>
            </form>
          )}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {managementLinks.map((item) => (
            <Card key={item.href} className="p-5 space-y-4">
              <div>
                <h2 className="font-semibold">{item.label}</h2>
                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
              </div>
              <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                <Link href={item.href}>Open</Link>
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

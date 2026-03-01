"use client"

import { FormEvent, useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { FeedbackToasts } from "@/components/admin/feedback-toasts"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"

type NotificationItem = {
  id: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

export default function AdminNotificationsPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [broadcast, setBroadcast] = useState({
    title: "",
    message: "",
    link: "",
  })
  const [recentLoading, setRecentLoading] = useState(true)
  const [recent, setRecent] = useState<NotificationItem[]>([])

  const loadRecent = async () => {
    setRecentLoading(true)
    try {
      const response = await fetch("/api/notifications?limit=8", { cache: "no-store" })
      if (!response.ok) {
        setRecent([])
        return
      }
      const data = (await response.json()) as { notifications: NotificationItem[] }
      setRecent(data.notifications || [])
    } catch {
      setRecent([])
    } finally {
      setRecentLoading(false)
    }
  }

  useEffect(() => {
    void loadRecent()
  }, [])

  const onSendBroadcast = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)
    try {
      const response = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: broadcast.title,
          message: broadcast.message,
          link: broadcast.link || undefined,
          type: "ADMIN_BROADCAST",
        }),
      })
      const data = (await response.json()) as {
        error?: string
        sent?: number
        total?: number
        guestSent?: number
        guestTotal?: number
      }

      if (!response.ok) {
        setError(data.error || "Failed to send notifications.")
        return
      }

      setSuccess(
        `Sent to users: ${data.sent ?? 0}/${data.total ?? 0}. Sent to guests: ${data.guestSent ?? 0}/${data.guestTotal ?? 0}.`,
      )
      setBroadcast({ title: "", message: "", link: "" })
      void loadRecent()
    } catch {
      setError("Failed to send notifications.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Notifications</h1>
          <p className="mt-2 text-muted-foreground">Send broadcast notifications and monitor latest notification entries.</p>
        </div>

        <FeedbackToasts error={error} success={success} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="space-y-4 p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Broadcast Notification</h2>
              <Badge variant="outline">Admin</Badge>
            </div>
            <form onSubmit={onSendBroadcast} className="space-y-3">
              <Input
                placeholder="Notification title"
                value={broadcast.title}
                onChange={(e) => setBroadcast((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
              <Textarea
                placeholder="Notification message"
                value={broadcast.message}
                onChange={(e) => setBroadcast((prev) => ({ ...prev, message: e.target.value }))}
                rows={4}
                required
              />
              <Input
                placeholder="Optional link (e.g. /products)"
                value={broadcast.link}
                onChange={(e) => setBroadcast((prev) => ({ ...prev, link: e.target.value }))}
              />
              <Button type="submit" size="lg" className="min-w-40" disabled={loading || !broadcast.title.trim() || !broadcast.message.trim()}>
                {loading ? <><Spinner className="mr-2" />Sending...</> : "Send To All"}
              </Button>
            </form>
          </Card>

          <Card className="space-y-3 p-5">
            <h2 className="font-semibold">Latest Listing</h2>
            {recentLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="rounded-md border p-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="mt-2 h-4 w-full" />
                    <Skeleton className="mt-2 h-3 w-24" />
                  </div>
                ))}
              </div>
            ) : recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notifications available.</p>
            ) : (
              <div className="space-y-2">
                {recent.map((item) => (
                  <div key={item.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      {!item.isRead ? <span className="h-2 w-2 shrink-0 rounded-full bg-primary" /> : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.message}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">{format(new Date(item.createdAt), "dd MMM, hh:mm a")}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

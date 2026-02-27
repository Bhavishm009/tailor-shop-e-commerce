"use client"

import { FormEvent, useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { FeedbackToasts } from "@/components/admin/feedback-toasts"
import { Spinner } from "@/components/ui/spinner"

export default function AdminNotificationsPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [broadcast, setBroadcast] = useState({
    title: "",
    message: "",
    link: "",
  })

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
    } catch {
      setError("Failed to send notifications.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-2">Send push notifications to all registered and guest users.</p>
        </div>

        <FeedbackToasts error={error} success={success} />

        <Card className="p-5 space-y-4">
          <h2 className="font-semibold">Broadcast Notification</h2>
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
      </div>
    </div>
  )
}

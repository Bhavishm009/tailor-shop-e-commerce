"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GlobalNavbar } from "@/components/global-navbar"
import { FeedbackToasts } from "@/components/feedback-toasts"

type NotificationItem = {
  id: string
  title: string
  message: string
  type: string
  link?: string | null
  isRead: boolean
  createdAt: string
}

type GroupedNotifications = {
  monthKey: string
  monthLabel: string
  days: Array<{
    dayKey: string
    dayLabel: string
    items: NotificationItem[]
  }>
}

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const load = async () => {
    setError("")
    try {
      const response = await fetch("/api/notifications?limit=200", { cache: "no-store" })
      if (!response.ok) {
        setError("Please login to view notifications.")
        setItems([])
        setUnreadCount(0)
        return
      }
      const data = (await response.json()) as { notifications: NotificationItem[]; unreadCount: number }
      setItems(data.notifications)
      setUnreadCount(data.unreadCount)
    } catch {
      setError("Failed to load notifications.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const grouped = useMemo<GroupedNotifications[]>(() => {
    const monthMap = new Map<string, Map<string, NotificationItem[]>>()
    for (const item of items) {
      const date = new Date(item.createdAt)
      const monthKey = format(date, "yyyy-MM")
      const dayKey = format(date, "yyyy-MM-dd")

      if (!monthMap.has(monthKey)) monthMap.set(monthKey, new Map())
      const dayMap = monthMap.get(monthKey)!
      if (!dayMap.has(dayKey)) dayMap.set(dayKey, [])
      dayMap.get(dayKey)!.push(item)
    }

    return Array.from(monthMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([monthKey, dayMap]) => ({
        monthKey,
        monthLabel: format(new Date(`${monthKey}-01T00:00:00`), "MMMM yyyy"),
        days: Array.from(dayMap.entries())
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([dayKey, list]) => ({
            dayKey,
            dayLabel: format(new Date(`${dayKey}T00:00:00`), "EEEE, dd MMM yyyy"),
            items: list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
          })),
      }))
  }, [items])

  const markAllRead = async () => {
    setItems((prev) => prev.map((item) => ({ ...item, isRead: true })))
    setUnreadCount(0)
    const response = await fetch("/api/notifications", { method: "PATCH" })
    if (!response.ok) {
      await load()
    }
  }

  const markOneRead = async (id: string) => {
    const target = items.find((item) => item.id === id)
    if (!target || target.isRead) return
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
    const response = await fetch(`/api/notifications/${id}`, { method: "PATCH" })
    if (!response.ok) {
      await load()
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <GlobalNavbar />
      <div className="p-4 md:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">All Notifications</h1>
              <p className="text-sm text-muted-foreground mt-1">Unread: {unreadCount}</p>
            </div>
            {unreadCount > 0 ? (
              <Button onClick={markAllRead} variant="outline">
                Mark all read
              </Button>
            ) : null}
          </div>
          <FeedbackToasts error={error} />

          {loading ? <Card className="p-4 text-muted-foreground">Loading notifications...</Card> : null}
          {error ? (
            <Card className="p-4 text-sm text-red-600 border-red-300">
              {error}{" "}
              <Link href="/login" className="underline">
                Go to login
              </Link>
            </Card>
          ) : null}

          {!loading && !error && items.length === 0 ? (
            <Card className="p-4 text-muted-foreground">No notifications yet.</Card>
          ) : null}

          {!loading && !error
            ? grouped.map((month) => (
                <div key={month.monthKey} className="space-y-4">
                  <h2 className="text-lg font-semibold">{month.monthLabel}</h2>
                  {month.days.map((day) => (
                    <div key={day.dayKey} className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">{day.dayLabel}</h3>
                      {day.items.map((item) => (
                        <Card
                          key={item.id}
                          className={`p-4 ${item.isRead ? "border-muted" : "border-primary/40 bg-primary/5"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className={`text-sm ${item.isRead ? "font-medium" : "font-semibold"}`}>{item.title}</p>
                              <p className="text-sm text-muted-foreground">{item.message}</p>
                              <p className="text-xs text-muted-foreground">{format(new Date(item.createdAt), "dd MMM yyyy, hh:mm a")}</p>
                            </div>
                            {!item.isRead ? <span className="mt-1 h-2 w-2 rounded-full bg-primary" /> : null}
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            {item.link ? (
                              <Button asChild size="sm" variant="outline" onClick={() => void markOneRead(item.id)}>
                                <Link href={item.link}>Open</Link>
                              </Button>
                            ) : null}
                            {!item.isRead ? (
                              <Button size="sm" variant="ghost" onClick={() => void markOneRead(item.id)}>
                                Mark as read
                              </Button>
                            ) : null}
                          </div>
                        </Card>
                      ))}
                    </div>
                  ))}
                </div>
              ))
            : null}
        </div>
      </div>
    </div>
  )
}

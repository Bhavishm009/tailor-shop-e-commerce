"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Bell } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { useRealtimeSocket } from "@/hooks/use-realtime-socket"
import { buildPushUserAgent } from "@/lib/push-client-id"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type NotificationItem = {
  id: string
  title: string
  message: string
  type: string
  link?: string | null
  isRead: boolean
  createdAt: string
}

type Props = {
  className?: string
}

export function NotificationsDropdown({ className }: Props) {
  const { data: session } = useSession()
  const userId = session?.user?.id ?? null
  const socket = useRealtimeSocket(userId)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const initializedRef = useRef(false)
  const seenIdsRef = useRef(new Set<string>())

  const loadNotifications = async () => {
    const response = await fetch("/api/notifications?limit=10", { cache: "no-store" })
    if (!response.ok) return
    const data = (await response.json()) as { notifications: NotificationItem[]; unreadCount: number }

    if (initializedRef.current && !pushSubscribed && "Notification" in window && Notification.permission === "granted") {
      const freshUnread = data.notifications.filter((item) => !item.isRead && !seenIdsRef.current.has(item.id))
      if (freshUnread.length > 0) {
        await notifyBrowser(freshUnread)
      }
    }

    setItems(data.notifications)
    setUnreadCount(data.unreadCount)
    data.notifications.forEach((item) => seenIdsRef.current.add(item.id))
    initializedRef.current = true
  }

  useEffect(() => {
    void refreshPushStatus()
    void loadNotifications()
    const timer = setInterval(() => {
      void loadNotifications()
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!socket || !userId) return

    const onNotification = ({ notification }: { notification?: NotificationItem }) => {
      if (!notification) return

      setItems((prev) => {
        if (prev.some((item) => item.id === notification.id)) return prev
        return [notification, ...prev].slice(0, 10)
      })

      if (!notification.isRead) {
        setUnreadCount((prev) => prev + 1)
        if (!pushSubscribed && "Notification" in window && Notification.permission === "granted") {
          void notifyBrowser([notification])
        }
      }

      seenIdsRef.current.add(notification.id)
    }

    socket.on("notification:new", onNotification)

    return () => {
      socket.off("notification:new", onNotification)
    }
  }, [pushSubscribed, socket, userId])

  const markAllRead = async () => {
    setItems((prev) => prev.map((item) => ({ ...item, isRead: true })))
    setUnreadCount(0)
    const response = await fetch("/api/notifications", { method: "PATCH" })
    if (!response.ok) {
      await loadNotifications()
      return
    }
    await loadNotifications()
  }

  const markOneRead = async (id: string) => {
    const target = items.find((item) => item.id === id)
    if (!target || target.isRead) return
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
    const response = await fetch(`/api/notifications/${id}`, { method: "PATCH" })
    if (!response.ok) {
      await loadNotifications()
    }
  }

  const enablePush = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return
    setPushBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setPushSubscribed(false)
        return
      }

      const registration = await navigator.serviceWorker.getRegistration()
      if (!registration) return

      const vapidKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY
      if (!isValidVapidPublicKey(vapidKey)) {
        console.error("Missing NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY")
        return
      }
      const safeVapidKey = vapidKey as string

      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(safeVapidKey),
        })
      }

      const saveResponse = await fetch("/api/notifications/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: subscription.toJSON().keys,
          userAgent: buildPushUserAgent(),
        }),
      })
      if (!saveResponse.ok) {
        throw new Error("Failed to save push subscription")
      }

      setPushSubscribed(true)
    } finally {
      setPushBusy(false)
    }
  }

  const disablePush = async () => {
    if (!("serviceWorker" in navigator)) return
    setPushBusy(true)
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (!registration) return
      const subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        setPushSubscribed(false)
        return
      }
      await fetch("/api/notifications/push-subscription", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      })
      await subscription.unsubscribe()
      setPushSubscribed(false)
    } finally {
      setPushBusy(false)
    }
  }

  const syncSubscription = async () => {
    if (!("serviceWorker" in navigator)) return
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return

    const vapidKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY
    if (!isValidVapidPublicKey(vapidKey)) return
    const safeVapidKey = vapidKey as string

    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(safeVapidKey),
      })
    }

    const response = await fetch("/api/notifications/push-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: subscription.toJSON().keys,
        userAgent: buildPushUserAgent(),
      }),
    })
    if (response.ok) {
      setPushSubscribed(true)
    }
  }

  const refreshPushStatus = async () => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !isValidVapidPublicKey(process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY)
    ) {
      setPushSubscribed(false)
      return
    }

    if (Notification.permission !== "granted") {
      setPushSubscribed(false)
      return
    }

    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) {
      setPushSubscribed(false)
      return
    }

    const subscription = await registration.pushManager.getSubscription()
    setPushSubscribed(Boolean(subscription))
    if (!subscription) {
      await syncSubscription()
    }
  }

  const notifyBrowser = async (newItems: NotificationItem[]) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return

    const registration = await navigator.serviceWorker.getRegistration()
    for (const item of newItems) {
      if (registration) {
        await registration.showNotification(item.title, {
          body: item.message,
          icon: "/icon-192x192.png",
          badge: "/icon-192x192.png",
          data: {
            url: item.link || "/",
          },
        })
      } else {
        new Notification(item.title, {
          body: item.message,
        })
      }
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Notifications" className={`relative ${className || ""}`}>
          <Bell className="w-4 h-4" />
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between px-2">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <div className="flex items-center gap-2">
            {!pushSubscribed ? (
              <Button type="button" variant="ghost" size="sm" onClick={enablePush} disabled={pushBusy}>
                {pushBusy ? "Enabling..." : "Enable Push"}
              </Button>
            ) : (
              <Button type="button" variant="ghost" size="sm" onClick={disablePush} disabled={pushBusy}>
                {pushBusy ? "Updating..." : "Disable Push"}
              </Button>
            )}
            {unreadCount > 0 ? (
              <Button type="button" variant="ghost" size="sm" onClick={markAllRead}>
                Mark all read
              </Button>
            ) : null}
          </div>
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <DropdownMenuItem disabled>No notifications yet.</DropdownMenuItem>
        ) : (
          items.map((item) => (
            <DropdownMenuItem key={item.id} asChild>
              <Link
                href={item.link || "#"}
                className={`flex w-full flex-col items-start gap-1 py-2 ${item.isRead ? "opacity-70" : "bg-primary/5"} rounded-sm`}
                onClick={() => void markOneRead(item.id)}
              >
                <div className="flex w-full items-center justify-between gap-3">
                  <span className={`text-sm ${item.isRead ? "font-medium" : "font-semibold"}`}>{item.title}</span>
                  {!item.isRead ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
                </div>
                <span className="text-xs text-muted-foreground">{item.message}</span>
                <span className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/notifications" className="font-medium">
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function isValidVapidPublicKey(value: string | undefined) {
  if (!value) return false
  const trimmed = value.trim()
  // VAPID public key is URL-safe base64 and usually ~87 chars.
  return /^[A-Za-z0-9\-_]+$/.test(trimmed) && trimmed.length >= 70
}

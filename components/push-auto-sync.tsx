"use client"

import { useEffect } from "react"
import { getOrCreateVisitorId } from "@/lib/visitor-id"
import { buildPushUserAgent } from "@/lib/push-client-id"

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
  return /^[A-Za-z0-9\-_]+$/.test(trimmed) && trimmed.length >= 70
}

async function persistPushSubscription(payload: {
  endpoint: string
  keys?: { p256dh?: string; auth?: string }
  userAgent: string
}) {
  const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" }).catch(() => null)
  const sessionData = sessionResponse
    ? ((await sessionResponse.json().catch(() => ({}))) as { user?: { id?: string } })
    : {}

  if (sessionData?.user?.id) {
    const userResponse = await fetch("/api/notifications/push-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (userResponse.ok) return
  }

  await fetch("/api/notifications/guest-subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      visitorId: getOrCreateVisitorId(),
      ...payload,
    }),
  })
}

export function PushAutoSync() {
  useEffect(() => {
    const sync = async () => {
      if (
        typeof window === "undefined" ||
        !("Notification" in window) ||
        !("serviceWorker" in navigator) ||
        Notification.permission !== "granted"
      ) {
        return
      }

      const vapidKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY
      if (!isValidVapidPublicKey(vapidKey)) return
      const safeVapidKey = vapidKey as string

      let registration = await navigator.serviceWorker.getRegistration()
      if (!registration) {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" })
        registration = await navigator.serviceWorker.ready
      }
      if (!registration) return

      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(safeVapidKey),
        })
      }

      const payload = {
        endpoint: subscription.endpoint,
        keys: subscription.toJSON().keys,
        userAgent: buildPushUserAgent(),
      }
      if (!payload.keys?.p256dh || !payload.keys?.auth) return
      await persistPushSubscription(payload)
    }

    void sync()
    const onFocus = () => {
      void sync()
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void sync()
      }
    }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisibilityChange)
    const timer = window.setInterval(() => {
      void sync()
    }, 45000)

    return () => {
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      window.clearInterval(timer)
    }
  }, [])

  return null
}

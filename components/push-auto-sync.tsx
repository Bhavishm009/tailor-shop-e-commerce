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

      const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" })
      const sessionData = (await sessionResponse.json()) as { user?: { id?: string } }

      const payload = {
        endpoint: subscription.endpoint,
        keys: subscription.toJSON().keys,
        userAgent: buildPushUserAgent(),
      }

      if (sessionData?.user?.id) {
        await fetch("/api/notifications/push-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch("/api/notifications/guest-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitorId: getOrCreateVisitorId(),
            ...payload,
          }),
        })
      }
    }

    void sync()
  }, [])

  return null
}

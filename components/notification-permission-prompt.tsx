"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { getOrCreateVisitorId } from "@/lib/visitor-id"
import { buildPushUserAgent } from "@/lib/push-client-id"

const PROMPT_DISMISSED_KEY = "tailorhub_notification_prompt_dismissed"

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

export function NotificationPermissionPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [busy, setBusy] = useState(false)

  const askPermission = useCallback(async (auto = false) => {
    if (!("Notification" in window)) return

    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission === "granted" && "serviceWorker" in navigator) {
        const vapidKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY
        if (vapidKey && /^[A-Za-z0-9\-_]+$/.test(vapidKey) && vapidKey.length >= 70) {
          let registration = await navigator.serviceWorker.getRegistration()
          if (!registration) {
            await navigator.serviceWorker.register("/sw.js", { scope: "/" })
            registration = await navigator.serviceWorker.ready
          }
          if (registration) {
            let subscription = await registration.pushManager.getSubscription()
            if (!subscription) {
              subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey),
              })
            }

            const payload = {
              endpoint: subscription.endpoint,
              keys: subscription.toJSON().keys,
              userAgent: buildPushUserAgent(),
            }
            if (payload.keys?.p256dh && payload.keys?.auth) {
              await persistPushSubscription(payload)
            }
          }
        }
      }

      if (permission !== "default") {
        window.localStorage.setItem(PROMPT_DISMISSED_KEY, "1")
      }
      if (permission === "granted" || (!auto && permission !== "default")) {
        setShowPrompt(false)
      }
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return

    getOrCreateVisitorId()

    const dismissed = window.localStorage.getItem(PROMPT_DISMISSED_KEY) === "1"
    if (Notification.permission === "default" && !dismissed) {
      setShowPrompt(true)
      const timer = window.setTimeout(() => {
        void askPermission(true)
      }, 1200)
      return () => window.clearTimeout(timer)
    }
  }, [askPermission])

  const dismiss = () => {
    setShowPrompt(false)
    window.localStorage.setItem(PROMPT_DISMISSED_KEY, "1")
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[120] rounded-xl border bg-background p-4 shadow-xl md:left-auto md:right-4 md:max-w-md">
      <p className="text-sm font-medium">Enable notifications for order and offer updates.</p>
      <div className="mt-3 flex items-center gap-2">
        <Button type="button" size="sm" onClick={() => void askPermission(false)} disabled={busy}>
          {busy ? "Requesting..." : "Allow Notifications"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={dismiss} disabled={busy}>
          Maybe Later
        </Button>
      </div>
    </div>
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

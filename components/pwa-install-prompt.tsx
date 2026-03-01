"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"

const INSTALL_DISMISSED_KEY = "tailorhub_pwa_install_dismissed"
const INSTALL_COMPLETED_KEY = "tailorhub_pwa_install_completed"

type DeferredInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

function isIosSafari() {
  if (typeof window === "undefined") return false
  const ua = window.navigator.userAgent
  const isIos = /iPad|iPhone|iPod/.test(ua)
  const isWebKit = /WebKit/.test(ua)
  const isCriOS = /CriOS/.test(ua)
  const isFxiOS = /FxiOS/.test(ua)
  return isIos && isWebKit && !isCriOS && !isFxiOS
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false
  const mediaStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return Boolean(mediaStandalone || iosStandalone)
}

export function PwaInstallPrompt() {
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredInstallPromptEvent | null>(null)

  const iosManualMode = useMemo(() => !deferredPrompt && isIosSafari(), [deferredPrompt])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (isStandaloneMode()) return
    if (window.localStorage.getItem(INSTALL_DISMISSED_KEY) === "1") return
    if (window.localStorage.getItem(INSTALL_COMPLETED_KEY) === "1") return

    const handler = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as DeferredInstallPromptEvent)
      setShow(true)
    }
    const installedHandler = () => {
      window.localStorage.setItem(INSTALL_COMPLETED_KEY, "1")
      setShow(false)
      setDeferredPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handler)
    window.addEventListener("appinstalled", installedHandler)

    const timer = window.setTimeout(() => {
      if (!isStandaloneMode()) {
        setShow(true)
      }
    }, 2200)

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
      window.removeEventListener("appinstalled", installedHandler)
      window.clearTimeout(timer)
    }
  }, [])

  const dismiss = () => {
    setShow(false)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(INSTALL_DISMISSED_KEY, "1")
    }
  }

  const install = async () => {
    if (!deferredPrompt) {
      dismiss()
      return
    }

    setBusy(true)
    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === "accepted" && typeof window !== "undefined") {
        window.localStorage.setItem(INSTALL_COMPLETED_KEY, "1")
      }
      setDeferredPrompt(null)
      dismiss()
    } finally {
      setBusy(false)
    }
  }

  if (!show || isStandaloneMode()) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[121] rounded-xl border bg-background/95 p-4 shadow-xl backdrop-blur md:left-auto md:max-w-md">
      <p className="text-sm font-medium">Install TailorHub for faster access and app-like experience.</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {iosManualMode
          ? "On iPhone/iPad Safari: tap Share and choose Add to Home Screen."
          : "Install the app to get a better mobile experience and quicker launch."}
      </p>
      <div className="mt-3 flex items-center gap-2">
        {!iosManualMode ? (
          <Button type="button" size="sm" onClick={install} disabled={busy}>
            {busy ? "Opening..." : "Install App"}
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="outline" onClick={dismiss} disabled={busy}>
          {iosManualMode ? "OK" : "Maybe Later"}
        </Button>
      </div>
    </div>
  )
}

"use client"

const PUSH_DEVICE_ID_KEY = "tailorhub_push_device_id"

export function getOrCreatePushDeviceId() {
  if (typeof window === "undefined") return ""
  const existing = window.localStorage.getItem(PUSH_DEVICE_ID_KEY)
  if (existing) return existing
  const created =
    globalThis.crypto?.randomUUID?.() || `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
  window.localStorage.setItem(PUSH_DEVICE_ID_KEY, created)
  return created
}

export function buildPushUserAgent() {
  if (typeof window === "undefined") return ""
  const deviceId = getOrCreatePushDeviceId()
  return `${window.navigator.userAgent}::device=${deviceId}`
}


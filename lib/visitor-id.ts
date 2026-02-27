"use client"

const VISITOR_ID_KEY = "tailorhub_visitor_id"

export function getOrCreateVisitorId() {
  if (typeof window === "undefined") return ""

  const existing = window.localStorage.getItem(VISITOR_ID_KEY)
  if (existing) return existing

  const created =
    globalThis.crypto?.randomUUID?.() || `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
  window.localStorage.setItem(VISITOR_ID_KEY, created)
  return created
}


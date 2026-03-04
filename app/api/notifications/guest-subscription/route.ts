import { NextResponse } from "next/server"
import { deleteGuestSubscriptionsByVisitorDevice, upsertGuestPushSubscription } from "@/lib/guest-push-db"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      visitorId?: string
      endpoint?: string
      keys?: { p256dh?: string; auth?: string }
      userAgent?: string
    }

    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return NextResponse.json({ error: "Invalid guest push subscription payload" }, { status: 400 })
    }

    const visitorId =
      body.visitorId?.trim() ||
      globalThis.crypto?.randomUUID?.() ||
      `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`

    await upsertGuestPushSubscription({
      visitorId,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent: body.userAgent || null,
    })
    await deleteGuestSubscriptionsByVisitorDevice({
      visitorId,
      userAgent: body.userAgent || null,
      keepEndpoint: body.endpoint,
    })

    return NextResponse.json({ success: true, visitorId })
  } catch (error) {
    console.error("[notifications/guest-subscription/post]", error)
    return NextResponse.json({ error: "Failed to save guest push subscription" }, { status: 500 })
  }
}

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

    if (!body.visitorId || !body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return NextResponse.json({ error: "Invalid guest push subscription payload" }, { status: 400 })
    }

    await upsertGuestPushSubscription({
      visitorId: body.visitorId,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent: body.userAgent || null,
    })
    await deleteGuestSubscriptionsByVisitorDevice({
      visitorId: body.visitorId,
      userAgent: body.userAgent || null,
      keepEndpoint: body.endpoint,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[notifications/guest-subscription/post]", error)
    return NextResponse.json({ error: "Failed to save guest push subscription" }, { status: 500 })
  }
}

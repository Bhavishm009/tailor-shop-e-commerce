import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"
import { createNotification } from "@/lib/notifications"
import { listGuestPushSubscriptions, deleteGuestSubscriptionsByEndpoints } from "@/lib/guest-push-db"
import { sendWebPushNotification } from "@/lib/push"

export async function POST(request: Request) {
  try {
    const { session, response } = await requireRole("ADMIN")
    if (response || !session) return response

    const body = (await request.json()) as {
      title?: string
      message?: string
      link?: string
      type?: string
    }

    const title = body.title?.trim() || ""
    const message = body.message?.trim() || ""
    const link = body.link?.trim() || ""
    const type = body.type?.trim() || "ADMIN_BROADCAST"

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required." }, { status: 400 })
    }

    const users = await db.user.findMany({
      select: { id: true },
    })

    if (users.length === 0) {
      return NextResponse.json({ error: "No users available." }, { status: 400 })
    }

    const chunks: string[][] = []
    const ids = users.map((user) => user.id)
    for (let i = 0; i < ids.length; i += 25) {
      chunks.push(ids.slice(i, i + 25))
    }

    let sent = 0
    for (const chunk of chunks) {
      const results = await Promise.allSettled(
        chunk.map((userId) =>
          createNotification({
            userId,
            title,
            message,
            type,
            link: link || undefined,
          }),
        ),
      )
      sent += results.filter((result) => result.status === "fulfilled").length
    }

    let guestSent = 0
    let guestTotal = 0
    try {
      const guestSubscriptions = await listGuestPushSubscriptions()
      guestTotal = guestSubscriptions.length
      const guestResults = await Promise.all(
        guestSubscriptions.map(async (subscription) => ({
          endpoint: subscription.endpoint,
          result: await sendWebPushNotification(
            {
              endpoint: subscription.endpoint,
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
            {
              title,
              body: message,
              url: link || "/",
            },
          ),
        })),
      )

      const staleGuestEndpoints = guestResults
        .filter((result) => result.result.removeSubscription)
        .map((result) => result.endpoint)
      await deleteGuestSubscriptionsByEndpoints(staleGuestEndpoints)

      guestSent = guestResults.filter((result) => result.result.success).length
    } catch (guestError) {
      console.error("[admin/notifications/broadcast/guest]", guestError)
    }

    return NextResponse.json({
      success: true,
      sent,
      total: users.length,
      guestSent,
      guestTotal,
    })
  } catch (error) {
    console.error("[admin/notifications/broadcast/post]", error)
    return NextResponse.json({ error: "Failed to send broadcast notification." }, { status: 500 })
  }
}

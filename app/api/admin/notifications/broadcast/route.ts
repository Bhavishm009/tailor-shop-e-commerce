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

    const userPushSubscriptions = await db.pushSubscription.findMany({
      select: {
        endpoint: true,
        p256dh: true,
        auth: true,
      },
    })

    let userPushSent = 0
    let userPushTotal = userPushSubscriptions.length
    if (userPushSubscriptions.length > 0) {
      const userPushResults = await Promise.all(
        userPushSubscriptions.map(async (subscription) => ({
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

      const staleUserEndpoints = userPushResults
        .filter((result) => result.result.removeSubscription)
        .map((result) => result.endpoint)

      if (staleUserEndpoints.length > 0) {
        await db.pushSubscription.deleteMany({
          where: {
            endpoint: { in: staleUserEndpoints },
          },
        })
      }

      userPushSent = userPushResults.filter((result) => result.result.success).length
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
      userPushSent,
      userPushTotal,
      guestSent,
      guestTotal,
    })
  } catch (error) {
    console.error("[admin/notifications/broadcast/post]", error)
    return NextResponse.json({ error: "Failed to send broadcast notification." }, { status: 500 })
  }
}

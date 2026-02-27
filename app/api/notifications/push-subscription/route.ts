import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"

export async function POST(request: Request) {
  try {
    const { session, response } = await requireAuth()
    if (response || !session) return response

    const body = (await request.json()) as {
      endpoint?: string
      keys?: { p256dh?: string; auth?: string }
      userAgent?: string
    }

    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return NextResponse.json({ error: "Invalid push subscription payload" }, { status: 400 })
    }

    await db.pushSubscription.upsert({
      where: { endpoint: body.endpoint },
      update: {
        userId: session.user.id,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        userAgent: body.userAgent || null,
      },
      create: {
        userId: session.user.id,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        userAgent: body.userAgent || null,
      },
    })

    if (body.userAgent) {
      await db.pushSubscription.deleteMany({
        where: {
          userId: session.user.id,
          userAgent: body.userAgent,
          endpoint: {
            not: body.endpoint,
          },
        },
      })
    }

    await db.user.update({
      where: { id: session.user.id },
      data: { notifyPush: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[notifications/push-subscription/post]", error)
    return NextResponse.json({ error: "Failed to save push subscription" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { session, response } = await requireAuth()
    if (response || !session) return response

    const body = (await request.json()) as { endpoint?: string }
    if (!body.endpoint) return NextResponse.json({ error: "Endpoint is required" }, { status: 400 })

    await db.pushSubscription.deleteMany({
      where: {
        endpoint: body.endpoint,
        userId: session.user.id,
      },
    })

    const remainingCount = await db.pushSubscription.count({
      where: { userId: session.user.id },
    })
    if (remainingCount === 0) {
      await db.user.update({
        where: { id: session.user.id },
        data: { notifyPush: false },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[notifications/push-subscription/delete]", error)
    return NextResponse.json({ error: "Failed to remove push subscription" }, { status: 500 })
  }
}

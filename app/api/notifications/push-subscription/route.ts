import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { deleteGuestSubscriptionsByEndpoints } from "@/lib/guest-push-db"

export async function POST(request: Request) {
  try {
    const { session, response } = await requireAuth()
    if (response || !session) return response

    // Verify user exists in database
    const userExists = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true }
    })
    
    if (!userExists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

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

    // If this endpoint was previously saved as a guest subscription,
    // remove it to avoid duplicate broadcast pushes.
    await deleteGuestSubscriptionsByEndpoints([body.endpoint])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[notifications/push-subscription/post]", error)
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: "User not found. Please log in again." }, { status: 404 })
    }
    return NextResponse.json({ error: "Failed to save push subscription" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { session, response } = await requireAuth()
    if (response || !session) return response

    // Verify user exists in database
    const userExists = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true }
    })
    
    if (!userExists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

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
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: "User not found. Please log in again." }, { status: 404 })
    }
    return NextResponse.json({ error: "Failed to remove push subscription" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"

export async function GET() {
  try {
    const { session, response } = await requireAuth()
    if (response || !session) return response

    const notifications = await db.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    const unreadCount = await db.notification.count({
      where: { userId: session.user.id, isRead: false },
    })

    return NextResponse.json({
      notifications,
      unreadCount,
    })
  } catch (error) {
    console.error("[notifications/get]", error)
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 })
  }
}

export async function PATCH() {
  try {
    const { session, response } = await requireAuth()
    if (response || !session) return response

    await db.notification.updateMany({
      where: { userId: session.user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[notifications/read-all]", error)
    return NextResponse.json({ error: "Failed to mark notifications as read" }, { status: 500 })
  }
}


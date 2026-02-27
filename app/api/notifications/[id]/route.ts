import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { db } from "@/lib/db"

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, response } = await requireAuth()
    if (response || !session) return response

    const { id } = await params
    const notification = await db.notification.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: { id: true, isRead: true },
    })

    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    if (!notification.isRead) {
      await db.notification.update({
        where: { id },
        data: { isRead: true, readAt: new Date() },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[notifications/id/patch]", error)
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 })
  }
}


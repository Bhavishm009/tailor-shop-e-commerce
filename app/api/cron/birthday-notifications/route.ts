import { NextResponse } from "next/server"
import { runBirthdayNotificationsIfDue } from "@/lib/birthday-notifications"

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
    const expected = process.env.CRON_SECRET || ""

    if (!expected || token !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await runBirthdayNotificationsIfDue()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("[cron/birthday-notifications/post]", error)
    return NextResponse.json({ error: "Failed to run birthday notifications" }, { status: 500 })
  }
}


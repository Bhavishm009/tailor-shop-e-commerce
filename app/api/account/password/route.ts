import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { hashPassword, verifyPassword } from "@/lib/auth-utils"

export async function PATCH(request: Request) {
  try {
    const { session, response } = await requireAuth()
    if (response || !session) return response

    const body = (await request.json()) as {
      currentPassword?: string
      newPassword?: string
      confirmPassword?: string
    }

    const currentPassword = body.currentPassword || ""
    const newPassword = body.newPassword || ""
    const confirmPassword = body.confirmPassword || ""

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: "All password fields are required" }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 })
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "New password and confirm password must match" }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const isCurrentValid = await verifyPassword(currentPassword, user.password)
    if (!isCurrentValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
    }

    const hashed = await hashPassword(newPassword)
    await db.user.update({
      where: { id: session.user.id },
      data: { password: hashed },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[account/password/patch]", error)
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 })
  }
}

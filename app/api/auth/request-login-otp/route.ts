import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { issueLoginOtp } from "@/lib/otp-store"
import { sendLoginOtpEmail } from "@/lib/email"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string }

    const email = body.email?.trim().toLowerCase() || ""

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { email },
      select: { email: true },
    })

    if (!user) {
      return NextResponse.json({ error: "Email is not registered." }, { status: 404 })
    }

    const { code } = await issueLoginOtp(user.email)
    const sent = await sendLoginOtpEmail(user.email, code)

    if (!sent) {
      return NextResponse.json({ error: "Failed to send OTP email." }, { status: 500 })
    }

    return NextResponse.json({
      message: "OTP sent to your email.",
    })
  } catch (error) {
    console.error("[auth/request-login-otp]", error)
    return NextResponse.json({ error: "Failed to process OTP request." }, { status: 500 })
  }
}

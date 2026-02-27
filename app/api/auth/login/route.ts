import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    await request.json()
    return NextResponse.json(
      { error: "Use OTP flow: POST /api/auth/request-login-otp then signIn via /api/auth/[...nextauth]" },
      { status: 405 },
    )
  } catch (error) {
    console.error("[auth/login]", error)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}

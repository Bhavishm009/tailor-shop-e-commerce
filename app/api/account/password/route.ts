import { NextResponse } from "next/server"

export async function PATCH() {
  return NextResponse.json({ error: "Password login is disabled. Use email OTP login." }, { status: 405 })
}

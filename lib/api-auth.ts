import { NextResponse } from "next/server"
import { auth } from "@/auth"

type Role = "ADMIN" | "TAILOR" | "CUSTOMER"

export async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id || !session.user.role) {
    return {
      session: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  return { session, response: null }
}

export async function requireRole(role: Role) {
  const { session, response } = await requireAuth()
  if (response || !session) {
    return { session: null, response }
  }

  if (session.user.role !== role) {
    return {
      session: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    }
  }

  return { session, response: null }
}

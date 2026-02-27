import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { deletePasskeyCredential, listUserPasskeys } from "@/lib/passkey-db"

export async function GET() {
  try {
    const { session, response } = await requireAuth()
    if (response || !session) return response

    const passkeys = await listUserPasskeys(session.user.id)
    return NextResponse.json(
      passkeys.map((item) => ({
        id: item.id,
        createdAt: item.created_at,
        lastUsedAt: item.last_used_at,
        transports: item.transports || [],
      })),
    )
  } catch (error) {
    console.error("[account/passkeys/get]", error)
    return NextResponse.json({ error: "Failed to load passkeys" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { session, response } = await requireAuth()
    if (response || !session) return response

    const body = (await request.json()) as { id?: string }
    if (!body.id) {
      return NextResponse.json({ error: "Passkey id is required" }, { status: 400 })
    }

    const deleted = await deletePasskeyCredential(body.id, session.user.id)
    if (!deleted) {
      return NextResponse.json({ error: "Passkey not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[account/passkeys/delete]", error)
    return NextResponse.json({ error: "Failed to remove passkey" }, { status: 500 })
  }
}


import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { CLOTH_OPTIONS } from "@/lib/cloth-options"

export async function GET() {
  try {
    const { response } = await requireAuth()
    if (response) return response
    return NextResponse.json(CLOTH_OPTIONS)
  } catch (error) {
    console.error("[cloth-options/get]", error)
    return NextResponse.json({ error: "Failed to load cloth options" }, { status: 500 })
  }
}


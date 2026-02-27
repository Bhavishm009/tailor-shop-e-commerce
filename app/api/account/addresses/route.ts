import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"

export async function GET() {
  try {
    const { session, response } = await requireAuth()
    if (response || !session) return response

    const addresses = await db.address.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    })

    return NextResponse.json(addresses)
  } catch (error) {
    console.error("[account/addresses/get]", error)
    return NextResponse.json({ error: "Failed to load addresses" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { session, response } = await requireAuth()
    if (response || !session) return response

    const body = (await request.json()) as {
      street?: string
      city?: string
      state?: string
      postalCode?: string
      country?: string
      isDefault?: boolean
    }

    if (!body.street || !body.city || !body.state || !body.postalCode || !body.country) {
      return NextResponse.json({ error: "All address fields are required" }, { status: 400 })
    }
    const street = body.street.trim()
    const city = body.city.trim()
    const state = body.state.trim()
    const postalCode = body.postalCode.trim()
    const country = body.country.trim()

    const created = await db.$transaction(async (tx) => {
      if (body.isDefault) {
        await tx.address.updateMany({
          where: { userId: session.user.id, isDefault: true },
          data: { isDefault: false },
        })
      }

      return tx.address.create({
        data: {
          userId: session.user.id,
          street,
          city,
          state,
          postalCode,
          country,
          isDefault: Boolean(body.isDefault),
        },
      })
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("[account/addresses/post]", error)
    return NextResponse.json({ error: "Failed to create address" }, { status: 500 })
  }
}

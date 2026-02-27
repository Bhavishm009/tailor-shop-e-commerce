import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, response } = await requireAuth()
    if (response || !session) return response

    const { id } = await params
    const body = (await request.json()) as {
      street?: string
      city?: string
      state?: string
      postalCode?: string
      country?: string
      isDefault?: boolean
    }

    const existing = await db.address.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 })
    }

    const updated = await db.$transaction(async (tx) => {
      if (body.isDefault) {
        await tx.address.updateMany({
          where: { userId: session.user.id, isDefault: true },
          data: { isDefault: false },
        })
      }

      return tx.address.update({
        where: { id: existing.id },
        data: {
          street: body.street?.trim() ?? existing.street,
          city: body.city?.trim() ?? existing.city,
          state: body.state?.trim() ?? existing.state,
          postalCode: body.postalCode?.trim() ?? existing.postalCode,
          country: body.country?.trim() ?? existing.country,
          isDefault: typeof body.isDefault === "boolean" ? body.isDefault : existing.isDefault,
        },
      })
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[account/addresses/id/patch]", error)
    return NextResponse.json({ error: "Failed to update address" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, response } = await requireAuth()
    if (response || !session) return response

    const { id } = await params
    const existing = await db.address.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 })
    }

    await db.address.delete({ where: { id: existing.id } })

    if (existing.isDefault) {
      const next = await db.address.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
      })
      if (next) {
        await db.address.update({
          where: { id: next.id },
          data: { isDefault: true },
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[account/addresses/id/delete]", error)
    return NextResponse.json({ error: "Failed to delete address" }, { status: 500 })
  }
}

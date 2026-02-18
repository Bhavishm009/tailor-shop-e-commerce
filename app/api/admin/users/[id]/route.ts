import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

type UserRole = "ADMIN" | "TAILOR" | "CUSTOMER"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const { id } = await params
    const body = (await request.json()) as {
      role?: UserRole
      isActive?: boolean
    }

    const existing = await db.user.findUnique({
      where: { id },
      include: { tailorProfile: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const updatedUser = await db.$transaction(async (tx) => {
      const nextRole = body.role && ["ADMIN", "TAILOR", "CUSTOMER"].includes(body.role) ? body.role : existing.role

      const user = await tx.user.update({
        where: { id },
        data: {
          role: nextRole,
        },
      })

      if (nextRole === "TAILOR" || typeof body.isActive === "boolean") {
        await tx.tailorProfile.upsert({
          where: { userId: id },
          create: {
            userId: id,
            isActive: typeof body.isActive === "boolean" ? body.isActive : true,
          },
          update: {
            isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
          },
        })
      }

      return user
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("[admin/users/id/patch]", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const { id } = await params

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    await db.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[admin/users/id/delete]", error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}

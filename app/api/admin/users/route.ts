import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

export async function GET() {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const users = await db.user.findMany({
      include: {
        tailorProfile: {
          select: {
            isActive: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(
      users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
        status: user.role === "TAILOR" ? (user.tailorProfile?.isActive ? "active" : "inactive") : "active",
      }))
    )
  } catch (error) {
    console.error("[admin/users/get]", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

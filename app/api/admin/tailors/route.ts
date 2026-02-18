import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

export async function GET() {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const tailors = await db.user.findMany({
      where: {
        role: "TAILOR",
      },
      include: {
        tailorProfile: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(
      tailors.map((tailor) => ({
        id: tailor.id,
        name: tailor.name,
        email: tailor.email,
        createdAt: tailor.createdAt,
        specializations: tailor.tailorProfile?.specializations || "",
        yearsExperience: tailor.tailorProfile?.yearsExperience || 0,
        averageRating: tailor.tailorProfile?.averageRating || 0,
        totalOrders: tailor.tailorProfile?.totalOrders || 0,
        isActive: tailor.tailorProfile?.isActive ?? true,
      }))
    )
  } catch (error) {
    console.error("[admin/tailors/get]", error)
    return NextResponse.json({ error: "Failed to fetch tailors" }, { status: 500 })
  }
}

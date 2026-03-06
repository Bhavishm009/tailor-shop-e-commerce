import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, response } = await requireRole("ADMIN")
    if (response || !session) return response

    const { id: customerId } = await params

    // Verify customer exists
    const customer = await db.user.findUnique({
      where: { id: customerId, role: "CUSTOMER" },
      select: { id: true }
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 })
    }

    const measurements = await db.measurement.findMany({
      where: { userId: customerId },
      select: {
        id: true,
        name: true,
        isVerified: true,
      },
      orderBy: [{ isVerified: "desc" }, { createdAt: "desc" }],
    })

    return NextResponse.json(measurements)
  } catch (error) {
    console.error("[admin/users/id/measurements]", error)
    return NextResponse.json({ error: "Failed to fetch measurements" }, { status: 500 })
  }
}
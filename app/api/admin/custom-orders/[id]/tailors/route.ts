import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

function parseSpecializations(specializations: string | null | undefined) {
  if (!specializations) return []
  return specializations
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const { id } = await params
    const order = await db.stitchingOrder.findUnique({
      where: { id },
      select: { id: true, serviceKey: true, stitchingService: true },
    })
    if (!order) {
      return NextResponse.json({ error: "Custom order not found" }, { status: 404 })
    }

    const tailors = await db.user.findMany({
      where: {
        role: "TAILOR",
        tailorProfile: {
          is: {
            isActive: true,
          },
        },
      },
      include: {
        tailorProfile: true,
        assignments: {
          include: {
            stitchingOrder: {
              select: {
                status: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    const serviceKey = (order.serviceKey || "").toLowerCase()
    const serviceName = order.stitchingService.toLowerCase()
    const result = tailors.map((tailor) => {
      const specs = parseSpecializations(tailor.tailorProfile?.specializations)
      const activeOrders = tailor.assignments.filter(
        (assignment) =>
          assignment.stitchingOrder.status === "ASSIGNED" ||
          assignment.stitchingOrder.status === "STITCHING",
      ).length
      const specializationMatch =
        specs.includes(serviceKey) ||
        specs.some((spec) => serviceName.includes(spec) || spec.includes(serviceName))
      return {
        id: tailor.id,
        name: tailor.name,
        email: tailor.email,
        specializations: tailor.tailorProfile?.specializations || "",
        activeOrders,
        specializationMatch,
      }
    })

    result.sort((a, b) => {
      if (a.specializationMatch !== b.specializationMatch) {
        return a.specializationMatch ? -1 : 1
      }
      return a.activeOrders - b.activeOrders
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[admin/custom-orders/id/tailors/get]", error)
    return NextResponse.json({ error: "Failed to load eligible tailors" }, { status: 500 })
  }
}


import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

export async function GET() {
  try {
    const { session, response } = await requireRole("TAILOR")
    if (response || !session) return response

    const assignments = await db.assignment.findMany({
      where: { tailorId: session.user.id },
      include: {
        stitchingOrder: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            measurement: true,
          },
        },
      },
      orderBy: {
        assignedAt: "desc",
      },
    })

    return NextResponse.json(
      assignments.map((assignment) => ({
        id: assignment.stitchingOrder.id,
        assignmentId: assignment.id,
        customerId: assignment.stitchingOrder.customer.id,
        customerName: assignment.stitchingOrder.customer.name,
        customerEmail: assignment.stitchingOrder.customer.email,
        serviceKey: assignment.stitchingOrder.serviceKey,
        stitchingService: assignment.stitchingOrder.stitchingService,
        clothType: assignment.stitchingOrder.clothType,
        fabricImage: assignment.stitchingOrder.fabricImage,
        completedImage: assignment.stitchingOrder.completedImage,
        status: assignment.stitchingOrder.status,
        payoutRate: assignment.payoutRate,
        payoutAmount: assignment.payoutAmount,
        payoutStatus: assignment.payoutStatus,
        assignedAt: assignment.assignedAt,
        createdAt: assignment.stitchingOrder.createdAt,
        notes: assignment.stitchingOrder.notes,
        measurement: assignment.stitchingOrder.measurement,
      }))
    )
  } catch (error) {
    console.error("[tailor/orders/get]", error)
    return NextResponse.json({ error: "Failed to load assigned orders" }, { status: 500 })
  }
}


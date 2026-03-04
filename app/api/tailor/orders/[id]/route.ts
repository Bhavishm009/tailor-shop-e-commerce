import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, response } = await requireRole("TAILOR")
    if (response || !session) return response

    const { id } = await params
    const assignment = await db.assignment.findFirst({
      where: {
        stitchingOrderId: id,
        tailorId: session.user.id,
      },
      include: {
        stitchingOrder: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
            measurement: true,
          },
        },
      },
    })

    if (!assignment) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: assignment.stitchingOrder.id,
      orderCode: `ST-${assignment.stitchingOrder.id.slice(-6).toUpperCase()}`,
      customer: assignment.stitchingOrder.customer,
      stitchingService: assignment.stitchingOrder.stitchingService,
      clothType: assignment.stitchingOrder.clothType,
      clothSource: assignment.stitchingOrder.clothSource,
      clothName: assignment.stitchingOrder.clothName,
      clothPrice: assignment.stitchingOrder.clothPrice,
      stitchingPrice: assignment.stitchingOrder.stitchingPrice,
      totalPrice: assignment.stitchingOrder.price,
      status: assignment.stitchingOrder.status,
      notes: assignment.stitchingOrder.notes,
      fabricImage: assignment.stitchingOrder.fabricImage,
      completedImage: assignment.stitchingOrder.completedImage,
      createdAt: assignment.stitchingOrder.createdAt,
      assignedAt: assignment.assignedAt,
      measurement: assignment.stitchingOrder.measurement,
    })
  } catch (error) {
    console.error("[tailor/orders/id/get]", error)
    return NextResponse.json({ error: "Failed to load order details" }, { status: 500 })
  }
}

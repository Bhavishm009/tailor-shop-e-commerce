import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"
import { createOrderNotification } from "@/lib/notifications"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, response } = await requireRole("TAILOR")
    if (response || !session) return response

    const { id } = await params
    const body = await request.json()
    const { completedImage } = body
    const assignment = await db.assignment.findFirst({
      where: {
        stitchingOrderId: id,
        tailorId: session.user.id,
      },
    })

    if (!assignment) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const stitchingOrder = await db.stitchingOrder.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedImage,
        updatedAt: new Date(),
      },
    })

    await db.assignment.update({
      where: { id: assignment.id },
      data: {
        completedAt: new Date(),
        payoutStatus: "APPROVED",
      },
    })

    await createOrderNotification({
      userId: stitchingOrder.customerId,
      title: "Custom order completed",
      message: `Your ${stitchingOrder.stitchingService} order has been completed by your tailor.`,
      type: "CUSTOM_ORDER_COMPLETED",
      link: "/customer/orders",
    })

    return NextResponse.json(stitchingOrder)
  } catch (error) {
    console.error("[stitching-orders/complete]", error)
    return NextResponse.json({ error: "Failed to complete order" }, { status: 500 })
  }
}

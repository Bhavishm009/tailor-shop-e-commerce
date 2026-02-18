import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"
import { createOrderNotification } from "@/lib/notifications"

type TailorStatus = "STITCHING" | "COMPLETED"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, response } = await requireRole("TAILOR")
    if (response || !session) return response

    const { id } = await params
    const body = (await request.json()) as {
      status?: TailorStatus
      completedImage?: string
    }

    if (!body.status || !["STITCHING", "COMPLETED"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const assignment = await db.assignment.findFirst({
      where: {
        stitchingOrderId: id,
        tailorId: session.user.id,
      },
      include: {
        stitchingOrder: true,
      },
    })

    if (!assignment) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const currentStatus = assignment.stitchingOrder.status
    if (body.status === "STITCHING" && currentStatus !== "ASSIGNED") {
      return NextResponse.json({ error: "Order must be ASSIGNED before STITCHING" }, { status: 400 })
    }
    if (body.status === "COMPLETED" && currentStatus !== "STITCHING") {
      return NextResponse.json({ error: "Order must be STITCHING before COMPLETED" }, { status: 400 })
    }

    const updated = await db.$transaction(async (tx) => {
      const order = await tx.stitchingOrder.update({
        where: { id },
        data: {
          status: body.status,
          completedImage: body.status === "COMPLETED" ? body.completedImage || assignment.stitchingOrder.completedImage : assignment.stitchingOrder.completedImage,
        },
      })

      await tx.assignment.update({
        where: { id: assignment.id },
        data: {
          completedAt: body.status === "COMPLETED" ? new Date() : assignment.completedAt,
          payoutStatus: body.status === "COMPLETED" ? "APPROVED" : assignment.payoutStatus,
        },
      })

      return order
    })

    await createOrderNotification({
      userId: assignment.stitchingOrder.customerId,
      title: "Custom order progress updated",
      message: `Your ${assignment.stitchingOrder.stitchingService} order is now ${body.status}.`,
      type: "CUSTOM_ORDER_STATUS_UPDATED",
      link: "/customer/orders",
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[tailor/orders/status]", error)
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 })
  }
}


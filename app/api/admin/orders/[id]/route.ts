import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"
import {
  isValidCustomTransition,
  isValidEcommerceTransition,
  type EcommerceOrderStatus,
  type StitchingOrderStatus,
} from "@/lib/order-flow"
import { createOrderNotification } from "@/lib/notifications"

const readyMadeStatuses: EcommerceOrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
]

const customStatuses: StitchingOrderStatus[] = [
  "PENDING",
  "ASSIGNED",
  "STITCHING",
  "QC",
  "COMPLETED",
  "DELIVERED",
  "CANCELLED",
]

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const { id } = await params
    const body = (await request.json()) as {
      source?: "READY_MADE" | "CUSTOM"
      status?: string
    }

    if (!body.source || !body.status) {
      return NextResponse.json({ error: "Invalid source or status" }, { status: 400 })
    }

    if (body.source === "READY_MADE") {
      if (!readyMadeStatuses.includes(body.status as EcommerceOrderStatus)) {
        return NextResponse.json({ error: "Invalid ready-made order status" }, { status: 400 })
      }

      const existing = await db.order.findUnique({
        where: { id },
        select: {
          status: true,
          customerId: true,
          orderNumber: true,
        },
      })
      if (!existing) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 })
      }
      const nextStatus = body.status as EcommerceOrderStatus
      if (!isValidEcommerceTransition(existing.status as EcommerceOrderStatus, nextStatus)) {
        return NextResponse.json({ error: `Invalid status transition from ${existing.status} to ${body.status}` }, { status: 400 })
      }

      const updated = await db.order.update({
        where: { id },
        data: { status: nextStatus },
      })

      await createOrderNotification({
        userId: existing.customerId,
        title: "Order status updated",
        message: `Your ready-made order ${existing.orderNumber} is now ${body.status}.`,
        type: "ORDER_STATUS_UPDATED",
        link: "/customer/orders",
      })

      return NextResponse.json(updated)
    }

    if (!customStatuses.includes(body.status as StitchingOrderStatus)) {
      return NextResponse.json({ error: "Invalid custom order status" }, { status: 400 })
    }

    const existing = await db.stitchingOrder.findUnique({
      where: { id },
      include: {
        assignment: {
          select: {
            tailorId: true,
          },
        },
      },
    })
    if (!existing) {
      return NextResponse.json({ error: "Custom order not found" }, { status: 404 })
    }
    const nextStatus = body.status as StitchingOrderStatus
    if (!isValidCustomTransition(existing.status as StitchingOrderStatus, nextStatus)) {
      return NextResponse.json({ error: `Invalid status transition from ${existing.status} to ${body.status}` }, { status: 400 })
    }
    if (nextStatus === "ASSIGNED") {
      return NextResponse.json({ error: "Use assign action to set custom order to ASSIGNED." }, { status: 400 })
    }

    const updated = await db.stitchingOrder.update({
      where: { id },
      data: { status: nextStatus },
    })

    await Promise.all([
      createOrderNotification({
        userId: existing.customerId,
        title: "Custom order status updated",
        message: `Your ${existing.stitchingService} order is now ${body.status}.`,
        type: "CUSTOM_ORDER_STATUS_UPDATED",
        link: "/customer/orders",
      }),
      existing.assignment?.tailorId
        ? createOrderNotification({
            userId: existing.assignment.tailorId,
            title: "Assigned order status changed",
            message: `${existing.stitchingService} is now ${body.status}.`,
            type: "CUSTOM_ORDER_STATUS_UPDATED",
            link: "/tailor/orders",
          })
        : Promise.resolve(null),
    ])

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[admin/orders/id/patch]", error)
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 })
  }
}

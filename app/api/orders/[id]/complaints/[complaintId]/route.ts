import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"
import { emitToUser } from "@/lib/realtime-server"
import { createOrderNotification } from "@/lib/notifications"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; complaintId: string }> },
) {
  try {
    const { session, response } = await requireRole("ADMIN")
    if (response || !session) return response

    const { id: orderId, complaintId } = await params
    const body = (await request.json()) as {
      status?: "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED"
      adminNote?: string
    }
    const allowed = new Set(["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"])
    if (!body.status || !allowed.has(body.status)) {
      return NextResponse.json({ error: "Valid complaint status is required" }, { status: 400 })
    }

    const complaint = await db.returnComplaint.findFirst({
      where: {
        id: complaintId,
        stitchingOrderId: orderId,
      },
      include: {
        raisedBy: { select: { id: true, name: true } },
        stitchingOrder: {
          include: {
            assignment: { select: { tailorId: true } },
          },
        },
      },
    })
    if (!complaint) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 })
    }

    const updated = await db.returnComplaint.update({
      where: { id: complaint.id },
      data: {
        status: body.status,
        adminNote: body.adminNote?.trim() || null,
        handledById: session.user.id,
      },
      include: {
        raisedBy: { select: { id: true, name: true, role: true } },
        handledBy: { select: { id: true, name: true } },
      },
    })

    const notifyUsers = new Set<string>([complaint.raisedBy.id])
    if (complaint.stitchingOrder.assignment?.tailorId) {
      notifyUsers.add(complaint.stitchingOrder.assignment.tailorId)
    }
    for (const userId of notifyUsers) {
      emitToUser(userId, "complaint:updated", {
        orderId,
        complaint: updated,
      })
    }

    await createOrderNotification({
      userId: complaint.raisedBy.id,
      title: "Complaint status updated",
      message: `Your complaint for order ST-${orderId.slice(-6).toUpperCase()} is now ${updated.status}.`,
      type: "ORDER_COMPLAINT",
      link: `/customer/orders/custom/${orderId}`,
    })

    if (complaint.stitchingOrder.assignment?.tailorId) {
      await createOrderNotification({
        userId: complaint.stitchingOrder.assignment.tailorId,
        title: "Complaint status updated",
        message: `Complaint for order ST-${orderId.slice(-6).toUpperCase()} is now ${updated.status}.`,
        type: "ORDER_COMPLAINT",
        link: `/tailor/orders/${orderId}`,
      })
    }

    return NextResponse.json({ ok: true, complaint: updated })
  } catch (error) {
    console.error("[orders/complaints/patch]", error)
    return NextResponse.json({ error: "Failed to update complaint" }, { status: 500 })
  }
}


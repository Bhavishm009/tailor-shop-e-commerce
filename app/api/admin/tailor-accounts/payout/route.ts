import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"
import { createOrderNotification } from "@/lib/notifications"

function getPaymentAssignmentId(notes: string | null | undefined) {
  if (!notes || !notes.startsWith("TAILOR_PAYOUT:")) return null
  return notes.slice("TAILOR_PAYOUT:".length) || null
}

export async function POST(request: Request) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const body = (await request.json()) as {
      assignmentId?: string
      tailorId?: string
      amount?: number
    }

    if ((!body.assignmentId && !body.tailorId) || !Number.isFinite(body.amount) || Number(body.amount) <= 0) {
      return NextResponse.json({ error: "assignmentId or tailorId and valid amount are required" }, { status: 400 })
    }
    if (!Number.isInteger(Number(body.amount))) {
      return NextResponse.json({ error: "Amount must be a whole number (no decimals)." }, { status: 400 })
    }

    const amount = Number(body.amount)

    if (body.tailorId && !body.assignmentId) {
      const tailor = await db.user.findFirst({
        where: { id: body.tailorId, role: "TAILOR" },
        select: { id: true, name: true },
      })
      if (!tailor) {
        return NextResponse.json({ error: "Tailor not found" }, { status: 404 })
      }

      await db.payment.create({
        data: {
          customerId: tailor.id,
          amount,
          status: "COMPLETED",
          notes: `TAILOR_ADVANCE:${tailor.id}`,
        },
      })

      await createOrderNotification({
        userId: tailor.id,
        title: "Advance payout credited",
        message: `Rs. ${amount} advance payout has been credited by admin.`,
        type: "TAILOR_PAYOUT_PAID",
        link: "/tailor/account",
      })

      return NextResponse.json({
        ok: true,
        paidAmount: amount,
        pendingAfter: null,
        mode: "ADVANCE",
      })
    }

    const assignment = await db.assignment.findUnique({
      where: { id: body.assignmentId },
      include: {
        stitchingOrder: {
          select: {
            id: true,
            stitchingService: true,
          },
        },
        tailor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    const existingPayments = await db.payment.findMany({
      where: {
        customerId: assignment.tailorId,
        status: "COMPLETED",
        notes: {
          startsWith: `TAILOR_PAYOUT:${assignment.id}`,
        },
      },
      select: {
        amount: true,
      },
    })

    const alreadyPaid = existingPayments.reduce((sum, item) => sum + item.amount, 0)
    const totalDue = assignment.payoutAmount
    const pendingBefore = Math.max(0, totalDue - alreadyPaid)
    if (pendingBefore <= 0) {
      return NextResponse.json({ error: "This assignment is already fully paid." }, { status: 400 })
    }

    const payableAmount = Math.min(amount, pendingBefore)

    await db.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          customerId: assignment.tailorId,
          amount: payableAmount,
          status: "COMPLETED",
          notes: `TAILOR_PAYOUT:${assignment.id}`,
        },
      })

      const paidAfter = alreadyPaid + payableAmount
      await tx.assignment.update({
        where: { id: assignment.id },
        data: {
          payoutStatus: paidAfter >= totalDue ? "PAID" : "APPROVED",
          paidAt: paidAfter >= totalDue ? new Date() : null,
        },
      })
    })

    const pendingAfter = Math.max(0, pendingBefore - payableAmount)

    await createOrderNotification({
      userId: assignment.tailor.id,
      title: "Payout credited",
      message: `Rs. ${payableAmount.toFixed(2)} paid for ${assignment.stitchingOrder.stitchingService}. Pending: Rs. ${pendingAfter.toFixed(2)}.`,
      type: "TAILOR_PAYOUT_PAID",
      link: "/tailor/account",
    })

    return NextResponse.json({
      ok: true,
      paidAmount: payableAmount,
      pendingAfter,
    })
  } catch (error) {
    console.error("[admin/tailor-accounts/payout/post]", error)
    return NextResponse.json({ error: "Failed to record payout payment" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const url = new URL(request.url)
    const assignmentId = url.searchParams.get("assignmentId")
    if (!assignmentId) {
      return NextResponse.json({ error: "assignmentId is required" }, { status: 400 })
    }

    const assignment = await db.assignment.findUnique({
      where: { id: assignmentId },
      select: { id: true, tailorId: true },
    })
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    const payments = await db.payment.findMany({
      where: {
        customerId: assignment.tailorId,
        status: "COMPLETED",
        notes: {
          startsWith: `TAILOR_PAYOUT:${assignment.id}`,
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        createdAt: true,
      },
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error("[admin/tailor-accounts/payout/get]", error)
    return NextResponse.json({ error: "Failed to load payout payment history" }, { status: 500 })
  }
}

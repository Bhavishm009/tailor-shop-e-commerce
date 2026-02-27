import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

function assignmentIdFromPaymentNote(note: string | null | undefined) {
  if (!note || !note.startsWith("TAILOR_PAYOUT:")) return null
  return note.slice("TAILOR_PAYOUT:".length) || null
}

export async function GET() {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const [assignments, payoutPayments, advancePayments] = await Promise.all([
      db.assignment.findMany({
        include: {
          tailor: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          stitchingOrder: {
            select: {
              id: true,
              stitchingService: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { assignedAt: "desc" },
      }),
      db.payment.findMany({
        where: {
          status: "COMPLETED",
          notes: {
            startsWith: "TAILOR_PAYOUT:",
          },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          customerId: true,
          amount: true,
          notes: true,
          createdAt: true,
        },
      }),
      db.payment.findMany({
        where: {
          status: "COMPLETED",
          notes: {
            startsWith: "TAILOR_ADVANCE:",
          },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          customerId: true,
          amount: true,
          notes: true,
          createdAt: true,
        },
      }),
    ])

    const paymentsByAssignment = new Map<string, Array<{ id: string; amount: number; createdAt: Date }>>()
    for (const payment of payoutPayments) {
      const assignmentId = assignmentIdFromPaymentNote(payment.notes)
      if (!assignmentId) continue
      if (!paymentsByAssignment.has(assignmentId)) paymentsByAssignment.set(assignmentId, [])
      paymentsByAssignment.get(assignmentId)!.push({
        id: payment.id,
        amount: payment.amount,
        createdAt: payment.createdAt,
      })
    }

    const advanceByTailor = new Map<string, number>()
    for (const payment of advancePayments) {
      advanceByTailor.set(payment.customerId, (advanceByTailor.get(payment.customerId) || 0) + payment.amount)
    }

    const tailorMap = new Map<
      string,
      {
        id: string
        name: string
        email: string
        phone?: string | null
        totalAssigned: number
        completed: number
        totalPayout: number
        paid: number
        advancePaid: number
        pending: number
      }
    >()

    const rows = assignments.map((assignment) => {
      const totalDue = assignment.payoutAmount
      const payments = paymentsByAssignment.get(assignment.id) || []
      const paidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0)
      const pendingAmount = Math.max(0, totalDue - paidAmount)
      const computedPayoutStatus = pendingAmount <= 0 ? "PAID" : paidAmount > 0 ? "APPROVED" : "PENDING"

      if (!tailorMap.has(assignment.tailor.id)) {
        tailorMap.set(assignment.tailor.id, {
          id: assignment.tailor.id,
          name: assignment.tailor.name,
          email: assignment.tailor.email,
          phone: assignment.tailor.phone,
          totalAssigned: 0,
          completed: 0,
          totalPayout: 0,
          paid: 0,
          advancePaid: 0,
          pending: 0,
        })
      }
      const summary = tailorMap.get(assignment.tailor.id)!
      summary.totalAssigned += 1
      if (assignment.stitchingOrder.status === "COMPLETED" || assignment.stitchingOrder.status === "DELIVERED") {
        summary.completed += 1
      }
      summary.totalPayout += totalDue
      summary.paid += paidAmount
      summary.pending += pendingAmount

      return {
        id: assignment.id,
        tailorId: assignment.tailor.id,
        tailorName: assignment.tailor.name,
        tailorEmail: assignment.tailor.email,
        orderId: assignment.stitchingOrder.id,
        orderCode: `ST-${assignment.stitchingOrder.id.slice(-6).toUpperCase()}`,
        service: assignment.stitchingOrder.stitchingService,
        orderStatus: assignment.stitchingOrder.status,
        totalDue,
        paidAmount,
        pendingAmount,
        payoutStatus: computedPayoutStatus as "PENDING" | "APPROVED" | "PAID",
        assignedAt: assignment.assignedAt,
        paidAt: assignment.paidAt,
        payments: payments.map((payment) => ({
          id: payment.id,
          amount: payment.amount,
          createdAt: payment.createdAt,
        })),
      }
    })

    for (const [tailorId, advance] of advanceByTailor.entries()) {
      const summary = tailorMap.get(tailorId)
      if (!summary) continue
      summary.advancePaid += advance
      summary.pending = Math.max(0, summary.pending - advance)
    }

    const totals = {
      pendingPayout: Array.from(tailorMap.values()).reduce((sum, tailor) => sum + tailor.pending, 0),
      paidPayout: rows.reduce((sum, row) => sum + row.paidAmount, 0) + Array.from(advanceByTailor.values()).reduce((a, b) => a + b, 0),
      totalAdvancePaid: Array.from(advanceByTailor.values()).reduce((a, b) => a + b, 0),
      assignmentCount: rows.length,
    }

    return NextResponse.json({
      tailors: Array.from(tailorMap.values()).sort((a, b) => b.pending - a.pending),
      assignments: rows,
      totals,
    })
  } catch (error) {
    console.error("[admin/tailor-accounts/get]", error)
    return NextResponse.json({ error: "Failed to load tailor accounts" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

function assignmentIdFromPaymentNote(note: string | null | undefined) {
  if (!note || !note.startsWith("TAILOR_PAYOUT:")) return null
  return note.slice("TAILOR_PAYOUT:".length) || null
}

export async function GET() {
  try {
    const { session, response } = await requireRole("TAILOR")
    if (response || !session) return response

    const [tailor, assignments, payoutPayments, advancePayments] = await Promise.all([
      db.user.findUnique({
        where: { id: session.user.id },
        include: { tailorProfile: true },
      }),
      db.assignment.findMany({
        where: { tailorId: session.user.id },
        include: {
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
          customerId: session.user.id,
          status: "COMPLETED",
          notes: {
            startsWith: "TAILOR_PAYOUT:",
          },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amount: true,
          notes: true,
          createdAt: true,
        },
      }),
      db.payment.findMany({
        where: {
          customerId: session.user.id,
          status: "COMPLETED",
          notes: { startsWith: "TAILOR_ADVANCE:" },
        },
        select: {
          id: true,
          amount: true,
          createdAt: true,
        },
      }),
    ])

    if (!tailor) {
      return NextResponse.json({ error: "Tailor not found" }, { status: 404 })
    }

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

    const totalAssigned = assignments.length
    const completed = assignments.filter(
      (assignment) => assignment.stitchingOrder.status === "COMPLETED" || assignment.stitchingOrder.status === "DELIVERED",
    ).length

    const rows = assignments.map((assignment) => {
      const totalDue = assignment.payoutAmount
      const payments = paymentsByAssignment.get(assignment.id) || []
      const paidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0)
      const pendingAmount = Math.max(0, totalDue - paidAmount)
      const payoutStatus = pendingAmount <= 0 ? "PAID" : paidAmount > 0 ? "APPROVED" : "PENDING"

      return {
        id: assignment.id,
        totalDue,
        paidAmount,
        pendingAmount,
        payoutStatus: payoutStatus as "PENDING" | "APPROVED" | "PAID",
        assignedAt: assignment.assignedAt,
        stitchingOrder: assignment.stitchingOrder,
        payments,
      }
    })

    const totalPayout = rows.reduce((sum, row) => sum + row.totalDue, 0)
    const paid = rows.reduce((sum, row) => sum + row.paidAmount, 0)
    const advancePaid = advancePayments.reduce((sum, payment) => sum + payment.amount, 0)
    const pending = Math.max(0, rows.reduce((sum, row) => sum + row.pendingAmount, 0) - advancePaid)

    return NextResponse.json({
      id: tailor.id,
      name: tailor.name,
      email: tailor.email,
      phone: tailor.phone,
      specializations: tailor.tailorProfile?.specializations || "",
      totalAssigned,
      completed,
      totalPayout,
      paid,
      advancePaid,
      pending,
      assignments: rows,
    })
  } catch (error) {
    console.error("[tailor/account/get]", error)
    return NextResponse.json({ error: "Failed to load account data" }, { status: 500 })
  }
}

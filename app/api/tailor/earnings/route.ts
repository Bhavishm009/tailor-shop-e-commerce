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
          select: {
            createdAt: true,
            status: true,
          },
        },
      },
      orderBy: {
        assignedAt: "asc",
      },
    })

    const totalAssignments = assignments.length
    const completedAssignments = assignments.filter((item) => item.stitchingOrder.status === "COMPLETED" || item.stitchingOrder.status === "DELIVERED")
    const totalEarnings = completedAssignments.reduce((sum, item) => sum + item.payoutAmount, 0)
    const paidEarnings = assignments.filter((item) => item.payoutStatus === "PAID").reduce((sum, item) => sum + item.payoutAmount, 0)
    const approvedPending = assignments.filter((item) => item.payoutStatus === "APPROVED").reduce((sum, item) => sum + item.payoutAmount, 0)
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const thisMonthAssignments = completedAssignments.filter((item) => {
      const createdAt = item.stitchingOrder.createdAt
      return createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear
    })
    const thisMonthEarnings = thisMonthAssignments.reduce((sum, item) => sum + item.payoutAmount, 0)

    const monthlyMap = new Map<string, { month: string; earnings: number; orders: number }>()
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(currentYear, currentMonth - offset, 1)
      const key = `${date.getFullYear()}-${date.getMonth()}`
      monthlyMap.set(key, {
        month: date.toLocaleString("en-US", { month: "short" }),
        earnings: 0,
        orders: 0,
      })
    }
    for (const assignment of completedAssignments) {
      const date = assignment.stitchingOrder.createdAt
      const key = `${date.getFullYear()}-${date.getMonth()}`
      const bucket = monthlyMap.get(key)
      if (!bucket) continue
      bucket.earnings += assignment.payoutAmount
      bucket.orders += 1
    }

    return NextResponse.json({
      totalAssignments,
      completedAssignments: completedAssignments.length,
      totalEarnings,
      paidEarnings,
      approvedPending,
      thisMonthEarnings,
      thisMonthOrders: thisMonthAssignments.length,
      monthlyTrend: Array.from(monthlyMap.values()),
    })
  } catch (error) {
    console.error("[tailor/earnings/get]", error)
    return NextResponse.json({ error: "Failed to load earnings" }, { status: 500 })
  }
}

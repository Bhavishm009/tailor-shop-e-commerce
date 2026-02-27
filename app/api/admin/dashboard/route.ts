import { NextResponse } from "next/server"
import { requireRole } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { runBirthdayNotificationsIfDue } from "@/lib/birthday-notifications"

type DashboardPoint = {
  month: string
  revenue: number
  orders: number
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100
  return ((current - previous) / previous) * 100
}

function getLastMonthKeys(monthCount: number) {
  const now = new Date()
  const keys: string[] = []
  for (let i = monthCount - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    keys.push(key)
  }
  return keys
}

function monthLabelFromKey(key: string) {
  const [year, month] = key.split("-").map(Number)
  const date = new Date(year, (month || 1) - 1, 1)
  return date.toLocaleString("en-US", { month: "short" })
}

export async function GET() {
  try {
    await runBirthdayNotificationsIfDue()

    const { response } = await requireRole("ADMIN")
    if (response) return response

    const [
      orders,
      stitchingOrders,
      assignments,
      payoutPayments,
      advancePayments,
      users,
      totalUsers,
      totalProducts,
      totalBlogs,
      totalReviews,
      activeTailors,
    ] = await Promise.all([
      db.order.findMany({
        select: { createdAt: true, totalAmount: true, status: true },
      }),
      db.stitchingOrder.findMany({
        select: { createdAt: true, price: true, status: true },
      }),
      db.assignment.findMany({
        select: { id: true, payoutAmount: true },
      }),
      db.payment.findMany({
        where: {
          status: "COMPLETED",
          notes: {
            startsWith: "TAILOR_PAYOUT:",
          },
        },
        select: {
          amount: true,
          notes: true,
        },
      }),
      db.payment.findMany({
        where: {
          status: "COMPLETED",
          notes: {
            startsWith: "TAILOR_ADVANCE:",
          },
        },
        select: {
          amount: true,
        },
      }),
      db.user.findMany({
        select: { createdAt: true },
      }),
      db.user.count(),
      db.product.count({ where: { isActive: true } }),
      db.blogPost.count({ where: { isPublished: true } }),
      db.review.count({ where: { isApproved: true } }),
      db.tailorProfile.count({ where: { isActive: true } }),
    ])

    const allOrders = [
      ...orders.map((o) => ({ createdAt: o.createdAt, amount: o.totalAmount, status: o.status })),
      ...stitchingOrders.map((o) => ({ createdAt: o.createdAt, amount: o.price, status: o.status })),
    ]

    const totalRevenue = allOrders.reduce((sum, order) => sum + order.amount, 0)
    const totalOrders = allOrders.length

    const completedCount = allOrders.filter((order) => order.status === "COMPLETED" || order.status === "DELIVERED").length
    const completionRate = totalOrders === 0 ? 0 : (completedCount / totalOrders) * 100

    const monthKeys = getLastMonthKeys(6)
    const currentMonthKey = monthKeys[monthKeys.length - 1]
    const previousMonthKey = monthKeys[monthKeys.length - 2]

    const trendMap = new Map<string, DashboardPoint>(
      monthKeys.map((key) => [
        key,
        {
          month: monthLabelFromKey(key),
          revenue: 0,
          orders: 0,
        },
      ]),
    )

    for (const order of allOrders) {
      const key = `${order.createdAt.getFullYear()}-${String(order.createdAt.getMonth() + 1).padStart(2, "0")}`
      const bucket = trendMap.get(key)
      if (!bucket) continue
      bucket.revenue += order.amount
      bucket.orders += 1
    }

    const revenueTrend = monthKeys.map((key) => trendMap.get(key)!)

    const currentRevenue = trendMap.get(currentMonthKey)?.revenue || 0
    const previousRevenue = trendMap.get(previousMonthKey)?.revenue || 0
    const currentOrders = trendMap.get(currentMonthKey)?.orders || 0
    const previousOrders = trendMap.get(previousMonthKey)?.orders || 0

    const usersByMonth = new Map<string, number>()
    for (const user of users) {
      const key = `${user.createdAt.getFullYear()}-${String(user.createdAt.getMonth() + 1).padStart(2, "0")}`
      usersByMonth.set(key, (usersByMonth.get(key) || 0) + 1)
    }
    const currentUsers = usersByMonth.get(currentMonthKey) || 0
    const previousUsers = usersByMonth.get(previousMonthKey) || 0

    const statusCounts: Record<string, number> = {
      Pending: 0,
      Assigned: 0,
      Stitching: 0,
      Completed: 0,
      Delivered: 0,
      Cancelled: 0,
    }

    for (const order of allOrders) {
      if (order.status === "PENDING") statusCounts.Pending += 1
      if (order.status === "ASSIGNED") statusCounts.Assigned += 1
      if (order.status === "STITCHING") statusCounts.Stitching += 1
      if (order.status === "COMPLETED") statusCounts.Completed += 1
      if (order.status === "DELIVERED") statusCounts.Delivered += 1
      if (order.status === "CANCELLED") statusCounts.Cancelled += 1
    }

    const orderStatusData = [
      { name: "Pending", value: statusCounts.Pending, fill: "#f59e0b" },
      { name: "Assigned", value: statusCounts.Assigned, fill: "#3b82f6" },
      { name: "Stitching", value: statusCounts.Stitching, fill: "#8b5cf6" },
      { name: "Completed", value: statusCounts.Completed, fill: "#10b981" },
      { name: "Delivered", value: statusCounts.Delivered, fill: "#22c55e" },
      { name: "Cancelled", value: statusCounts.Cancelled, fill: "#ef4444" },
    ]

    const paidByAssignment = new Map<string, number>()
    for (const payment of payoutPayments) {
      const note = payment.notes || ""
      if (!note.startsWith("TAILOR_PAYOUT:")) continue
      const assignmentId = note.slice("TAILOR_PAYOUT:".length)
      if (!assignmentId) continue
      paidByAssignment.set(assignmentId, (paidByAssignment.get(assignmentId) || 0) + payment.amount)
    }
    const pendingTailorPayoutRaw = assignments.reduce((sum, assignment) => {
      const paid = paidByAssignment.get(assignment.id) || 0
      return sum + Math.max(0, assignment.payoutAmount - paid)
    }, 0)
    const totalAdvancePaid = advancePayments.reduce((sum, payment) => sum + payment.amount, 0)
    const pendingTailorPayout = Math.max(0, pendingTailorPayoutRaw - totalAdvancePaid)

    return NextResponse.json({
      metrics: {
        totalRevenue,
        totalOrders,
        totalUsers,
        completionRate,
        revenueChange: pctChange(currentRevenue, previousRevenue),
        ordersChange: pctChange(currentOrders, previousOrders),
        usersChange: pctChange(currentUsers, previousUsers),
      },
      summary: {
        activeTailors,
        pendingTailorPayout,
        activeProducts: totalProducts,
        publishedBlogs: totalBlogs,
        approvedReviews: totalReviews,
      },
      charts: {
        revenueTrend,
        orderStatusData,
      },
    })
  } catch (error) {
    console.error("[admin/dashboard/get]", error)
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 })
  }
}

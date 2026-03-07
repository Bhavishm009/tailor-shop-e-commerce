import { NextResponse } from "next/server"
import { requireRole } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { runBirthdayNotificationsIfDue } from "@/lib/birthday-notifications"

type DashboardPoint = {
  month: string
  revenue: number
  orders: number
}

type UnifiedOrderStatus = "Pending" | "Assigned" | "Stitching" | "Completed" | "Delivered" | "Cancelled"

type OrderSourceFilter = "ALL" | "READY_MADE" | "CUSTOM"
type FabricStatusFilter = "ALL" | "ACTIVE" | "INACTIVE"
type DateRangeFilter =
  | "ALL"
  | "TODAY"
  | "YESTERDAY"
  | "THIS_WEEK"
  | "LAST_WEEK"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "LAST_3_MONTHS"
  | "LAST_6_MONTHS"
  | "LAST_YEAR"
  | "CUSTOM"

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function parseDateRange(value: string | null): DateRangeFilter {
  const allowed: DateRangeFilter[] = [
    "ALL",
    "TODAY",
    "YESTERDAY",
    "THIS_WEEK",
    "LAST_WEEK",
    "THIS_MONTH",
    "LAST_MONTH",
    "LAST_3_MONTHS",
    "LAST_6_MONTHS",
    "LAST_YEAR",
    "CUSTOM",
  ]
  if (value && allowed.includes(value as DateRangeFilter)) return value as DateRangeFilter
  return "LAST_6_MONTHS"
}

function parseIsoDate(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function startOfWeek(date: Date) {
  const d = startOfDay(date)
  const day = d.getDay()
  const diff = (day + 6) % 7
  d.setDate(d.getDate() - diff)
  return d
}

function endOfWeek(date: Date) {
  const start = startOfWeek(date)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return endOfDay(end)
}

function resolveDateRange(dateRange: DateRangeFilter, customFrom: string | null, customTo: string | null) {
  const now = new Date()

  if (dateRange === "ALL") {
    return { startDate: null as Date | null, endDate: null as Date | null }
  }
  if (dateRange === "TODAY") {
    return { startDate: startOfDay(now), endDate: endOfDay(now) }
  }
  if (dateRange === "YESTERDAY") {
    const d = new Date(now)
    d.setDate(d.getDate() - 1)
    return { startDate: startOfDay(d), endDate: endOfDay(d) }
  }
  if (dateRange === "THIS_WEEK") {
    return { startDate: startOfWeek(now), endDate: endOfDay(now) }
  }
  if (dateRange === "LAST_WEEK") {
    const thisWeekStart = startOfWeek(now)
    const lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)
    const lastWeekEnd = new Date(thisWeekStart)
    lastWeekEnd.setMilliseconds(lastWeekEnd.getMilliseconds() - 1)
    return { startDate: lastWeekStart, endDate: lastWeekEnd }
  }
  if (dateRange === "THIS_MONTH") {
    return { startDate: new Date(now.getFullYear(), now.getMonth(), 1), endDate: endOfDay(now) }
  }
  if (dateRange === "LAST_MONTH") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0)
    return { startDate: startOfDay(start), endDate: endOfDay(end) }
  }
  if (dateRange === "LAST_3_MONTHS") {
    return { startDate: new Date(now.getFullYear(), now.getMonth() - 2, 1), endDate: endOfDay(now) }
  }
  if (dateRange === "LAST_6_MONTHS") {
    return { startDate: new Date(now.getFullYear(), now.getMonth() - 5, 1), endDate: endOfDay(now) }
  }
  if (dateRange === "LAST_YEAR") {
    const lastYear = now.getFullYear() - 1
    return {
      startDate: new Date(lastYear, 0, 1),
      endDate: endOfDay(new Date(lastYear, 11, 31)),
    }
  }

  const parsedFrom = parseIsoDate(customFrom)
  const parsedTo = parseIsoDate(customTo)
  return {
    startDate: parsedFrom ? startOfDay(parsedFrom) : null,
    endDate: parsedTo ? endOfDay(parsedTo) : null,
  }
}

function getMonthCountFromRange(startDate: Date | null, endDate: Date | null) {
  if (!startDate || !endDate) return 6
  const yearsDiff = endDate.getFullYear() - startDate.getFullYear()
  const monthsDiff = endDate.getMonth() - startDate.getMonth()
  const count = yearsDiff * 12 + monthsDiff + 1
  return Math.min(12, Math.max(1, count))
}

function parseOrderSource(value: string | null): OrderSourceFilter {
  if (value === "READY_MADE" || value === "CUSTOM") return value
  return "ALL"
}

function parseFabricStatus(value: string | null): FabricStatusFilter {
  if (value === "ACTIVE" || value === "INACTIVE") return value
  return "ALL"
}

function normalizeReadyMadeStatus(status: string): UnifiedOrderStatus {
  if (status === "PENDING" || status === "CONFIRMED") return "Pending"
  if (status === "PROCESSING") return "Stitching"
  if (status === "SHIPPED" || status === "OUT_FOR_DELIVERY") return "Assigned"
  if (status === "DELIVERED") return "Delivered"
  if (status === "CANCELLED") return "Cancelled"
  return "Pending"
}

function normalizeCustomStatus(status: string): UnifiedOrderStatus {
  if (status === "PENDING") return "Pending"
  if (status === "ASSIGNED") return "Assigned"
  if (status === "STITCHING" || status === "QC") return "Stitching"
  if (status === "COMPLETED") return "Completed"
  if (status === "DELIVERED") return "Delivered"
  if (status === "CANCELLED") return "Cancelled"
  return "Pending"
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

export async function GET(request: Request) {
  try {
    await runBirthdayNotificationsIfDue()

    const { response } = await requireRole("ADMIN")
    if (response) return response

    const searchParams = new URL(request.url).searchParams
    const dateRange = parseDateRange(searchParams.get("dateRange"))
    const customFrom = searchParams.get("customFrom")
    const customTo = searchParams.get("customTo")
    const orderSource = parseOrderSource(searchParams.get("orderSource"))
    const orderStatusFilter = searchParams.get("orderStatus") || "ALL"
    const fabricTypeFilter = searchParams.get("fabricType") || "ALL"
    const fabricStatusFilter = parseFabricStatus(searchParams.get("fabricStatus"))
    const { startDate, endDate } = resolveDateRange(dateRange, customFrom, customTo)
    const monthCount = getMonthCountFromRange(startDate, endDate || new Date())
    const dateWhere =
      startDate && endDate
        ? { gte: startDate, lte: endDate }
        : startDate
          ? { gte: startDate }
          : endDate
            ? { lte: endDate }
            : undefined

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
      fabrics,
    ] = await Promise.all([
      db.order.findMany({
        where: dateWhere ? { createdAt: dateWhere } : undefined,
        select: { createdAt: true, totalAmount: true, status: true },
      }),
      db.stitchingOrder.findMany({
        where: dateWhere ? { createdAt: dateWhere } : undefined,
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
      db.fabricOption.findMany({
        select: {
          id: true,
          name: true,
          clothType: true,
          buyRatePerMeter: true,
          sellRatePerMeter: true,
          stockMeters: true,
          isActive: true,
        },
      }),
    ])

    const allOrders = [
      ...orders.map((o) => ({
        createdAt: o.createdAt,
        amount: o.totalAmount,
        source: "READY_MADE" as const,
        normalizedStatus: normalizeReadyMadeStatus(o.status),
      })),
      ...stitchingOrders.map((o) => ({
        createdAt: o.createdAt,
        amount: o.price,
        source: "CUSTOM" as const,
        normalizedStatus: normalizeCustomStatus(o.status),
      })),
    ]

    const filteredOrders = allOrders.filter((order) => {
      const sourceMatch = orderSource === "ALL" || order.source === orderSource
      const statusMatch = orderStatusFilter === "ALL" || order.normalizedStatus === orderStatusFilter
      return sourceMatch && statusMatch
    })

    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.amount, 0)
    const totalOrders = filteredOrders.length

    const completedCount = filteredOrders.filter(
      (order) => order.normalizedStatus === "Completed" || order.normalizedStatus === "Delivered",
    ).length
    const completionRate = totalOrders === 0 ? 0 : (completedCount / totalOrders) * 100

    const monthKeys = getLastMonthKeys(monthCount)
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

    for (const order of filteredOrders) {
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

    const statusCounts: Record<UnifiedOrderStatus, number> = {
      Pending: 0,
      Assigned: 0,
      Stitching: 0,
      Completed: 0,
      Delivered: 0,
      Cancelled: 0,
    }

    for (const order of filteredOrders) {
      statusCounts[order.normalizedStatus] += 1
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

    const filteredFabrics = fabrics.filter((fabric) => {
      const typeMatch = fabricTypeFilter === "ALL" || fabric.clothType === fabricTypeFilter
      const statusMatch =
        fabricStatusFilter === "ALL" ||
        (fabricStatusFilter === "ACTIVE" && fabric.isActive) ||
        (fabricStatusFilter === "INACTIVE" && !fabric.isActive)
      return typeMatch && statusMatch
    })

    const fabricStockByFabric = filteredFabrics
      .map((item) => ({
        fabricId: item.id,
        fabricName: item.name,
        clothType: item.clothType,
        stockMeters: Number(item.stockMeters.toFixed(2)),
        inventoryValue: Number((item.stockMeters * item.sellRatePerMeter).toFixed(2)),
      }))
      .sort((a, b) => b.stockMeters - a.stockMeters)

    const fabricRateByType = filteredFabrics
      .map((item) => {
        const marginPercent =
          item.buyRatePerMeter <= 0 ? 0 : ((item.sellRatePerMeter - item.buyRatePerMeter) / item.buyRatePerMeter) * 100
        return {
          fabricName: item.name,
          clothType: item.clothType,
          avgBuyRate: Number(item.buyRatePerMeter.toFixed(2)),
          avgSellRate: Number(item.sellRatePerMeter.toFixed(2)),
          marginPercent: Number(marginPercent.toFixed(2)),
        }
      })
      .sort((a, b) => b.avgSellRate - a.avgSellRate)

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
        fabricStockByFabric,
        fabricRateByType,
      },
      filters: {
        dateRange,
        customFrom: customFrom || "",
        customTo: customTo || "",
        orderSource,
        orderStatus: orderStatusFilter,
        fabricType: fabricTypeFilter,
        fabricStatus: fabricStatusFilter,
      },
      filterOptions: {
        orderStatus: ["ALL", "Pending", "Assigned", "Stitching", "Completed", "Delivered", "Cancelled"],
        fabricTypes: ["ALL", ...Array.from(new Set(fabrics.map((fabric) => fabric.clothType))).sort()],
        dateRanges: [
          "ALL",
          "TODAY",
          "YESTERDAY",
          "THIS_WEEK",
          "LAST_WEEK",
          "THIS_MONTH",
          "LAST_MONTH",
          "LAST_3_MONTHS",
          "LAST_6_MONTHS",
          "LAST_YEAR",
          "CUSTOM",
        ],
      },
    })
  } catch (error) {
    console.error("[admin/dashboard/get]", error)
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 })
  }
}

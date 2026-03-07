"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { DatePicker } from "@/components/ui/date-picker"
import { FeedbackToasts } from "@/components/admin/feedback-toasts"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { TrendingUp, Users, Package, DollarSign } from "lucide-react"

type DashboardData = {
  metrics: {
    totalRevenue: number
    totalOrders: number
    totalUsers: number
    completionRate: number
    revenueChange: number
    ordersChange: number
    usersChange: number
  }
  summary: {
    activeTailors: number
    pendingTailorPayout: number
    activeProducts: number
    publishedBlogs: number
    approvedReviews: number
  }
  charts: {
    revenueTrend: Array<{ month: string; revenue: number; orders: number }>
    orderStatusData: Array<{ name: string; value: number; fill: string }>
    fabricStockByFabric: Array<{ fabricId: string; fabricName: string; clothType: string; stockMeters: number; inventoryValue: number }>
    fabricRateByType: Array<{ fabricName: string; clothType: string; avgBuyRate: number; avgSellRate: number; marginPercent: number }>
  }
  filters: {
    dateRange: string
    customFrom: string
    customTo: string
    orderSource: string
    orderStatus: string
    fabricType: string
    fabricStatus: string
  }
  filterOptions: {
    orderStatus: string[]
    fabricTypes: string[]
    dateRanges: string[]
  }
}

function DashboardMetricSkeletonCard() {
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
      <Skeleton className="mb-2 h-8 w-32" />
      <Skeleton className="h-3 w-24" />
    </Card>
  )
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [dateRangeFilter, setDateRangeFilter] = useState("LAST_6_MONTHS")
  const [customFromDate, setCustomFromDate] = useState("")
  const [customToDate, setCustomToDate] = useState("")
  const [orderSourceFilter, setOrderSourceFilter] = useState("ALL")
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL")
  const [fabricTypeFilter, setFabricTypeFilter] = useState("ALL")
  const [fabricStatusFilter, setFabricStatusFilter] = useState("ALL")

  useEffect(() => {
    const loadDashboard = async () => {
        setLoading(true)
        setError("")
      try {
        const query = new URLSearchParams()
        query.set("dateRange", dateRangeFilter)
        if (dateRangeFilter === "CUSTOM") {
          if (customFromDate) query.set("customFrom", customFromDate)
          if (customToDate) query.set("customTo", customToDate)
        }
        query.set("orderSource", orderSourceFilter)
        query.set("orderStatus", orderStatusFilter)
        query.set("fabricType", fabricTypeFilter)
        query.set("fabricStatus", fabricStatusFilter)
        const response = await fetch(`/api/admin/dashboard?${query.toString()}`, { cache: "no-store" })
        if (!response.ok) {
          const payload = await response.json().catch(() => ({ error: "Failed to load dashboard data." }))
          setError(payload.error || "Failed to load dashboard data.")
          return
        }
        setData((await response.json()) as DashboardData)
      } catch {
        setError("Failed to load dashboard data.")
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [dateRangeFilter, customFromDate, customToDate, orderSourceFilter, orderStatusFilter, fabricTypeFilter, fabricStatusFilter])

  const metrics = useMemo(() => {
    if (!data) return []
    return [
      {
        label: "Total Revenue",
        value: `Rs. ${Math.round(data.metrics.totalRevenue).toLocaleString()}`,
        icon: DollarSign,
        change: `${data.metrics.revenueChange >= 0 ? "+" : ""}${data.metrics.revenueChange.toFixed(1)}%`,
      },
      {
        label: "Total Orders",
        value: data.metrics.totalOrders.toLocaleString(),
        icon: Package,
        change: `${data.metrics.ordersChange >= 0 ? "+" : ""}${data.metrics.ordersChange.toFixed(1)}%`,
      },
      {
        label: "Total Users",
        value: data.metrics.totalUsers.toLocaleString(),
        icon: Users,
        change: `${data.metrics.usersChange >= 0 ? "+" : ""}${data.metrics.usersChange.toFixed(1)}%`,
      },
      {
        label: "Completion Rate",
        value: `${data.metrics.completionRate.toFixed(1)}%`,
        icon: TrendingUp,
        change: "Based on order status",
      },
    ]
  }, [data])

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">Admin Dashboard</h1>

        <FeedbackToasts error={error} />

        <Card className="mb-6 p-4 md:mb-8">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div className="space-y-1">
              <label htmlFor="dashboard-date-range" className="text-xs font-medium text-muted-foreground">Date Range</label>
              <select
                id="dashboard-date-range"
                className="h-10 w-full rounded-md border bg-background px-3"
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value)}
              >
                <option value="ALL">All</option>
                <option value="TODAY">Today</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="THIS_WEEK">This Week</option>
                <option value="LAST_WEEK">Last Week</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="LAST_MONTH">Last Month</option>
                <option value="LAST_3_MONTHS">Last 3 Months</option>
                <option value="LAST_6_MONTHS">Last 6 Months</option>
                <option value="LAST_YEAR">Last Year</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>
            {dateRangeFilter === "CUSTOM" ? (
              <div className="col-span-1 space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Custom Date Range</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <DatePicker value={customFromDate} onChange={setCustomFromDate} placeholder="From date" />
                  <DatePicker value={customToDate} onChange={setCustomToDate} placeholder="To date" />
                </div>
              </div>
            ) : null}
            <div className="space-y-1">
              <label htmlFor="dashboard-order-source" className="text-xs font-medium text-muted-foreground">Order Source</label>
              <select
                id="dashboard-order-source"
                className="h-10 w-full rounded-md border bg-background px-3"
                value={orderSourceFilter}
                onChange={(e) => setOrderSourceFilter(e.target.value)}
              >
                <option value="ALL">All</option>
                <option value="READY_MADE">Ready-Made</option>
                <option value="CUSTOM">Custom Stitching</option>
              </select>
            </div>
            <div className={`space-y-1 ${dateRangeFilter === "CUSTOM" ? "md:col-start-4" : ""}`}>
              <label htmlFor="dashboard-order-status" className="text-xs font-medium text-muted-foreground">Order Status</label>
              <select
                id="dashboard-order-status"
                className="h-10 w-full rounded-md border bg-background px-3"
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
              >
                {(data?.filterOptions.orderStatus || ["ALL"]).map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="dashboard-fabric-type" className="text-xs font-medium text-muted-foreground">Fabric Type</label>
              <select
                id="dashboard-fabric-type"
                className="h-10 w-full rounded-md border bg-background px-3"
                value={fabricTypeFilter}
                onChange={(e) => setFabricTypeFilter(e.target.value)}
              >
                {(data?.filterOptions.fabricTypes || ["ALL"]).map((fabricType) => (
                  <option key={fabricType} value={fabricType}>{fabricType}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="dashboard-fabric-status" className="text-xs font-medium text-muted-foreground">Fabric Status</label>
              <select
                id="dashboard-fabric-status"
                className="h-10 w-full rounded-md border bg-background px-3"
                value={fabricStatusFilter}
                onChange={(e) => setFabricStatusFilter(e.target.value)}
              >
                <option value="ALL">All</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <DashboardMetricSkeletonCard key={i} />)
            : metrics.map((metric, i) => {
                const Icon = metric.icon
                return (
                  <Card key={i} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-muted-foreground">{metric.label}</p>
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-2xl font-bold mb-2">{metric.value}</p>
                    <p className="text-xs text-muted-foreground">{metric.change}</p>
                  </Card>
                )
              })}
        </div>

        {loading ? (
          <div className="mb-6 grid grid-cols-2 gap-3 md:mb-8 md:grid-cols-5 md:gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-2 h-7 w-20" />
              </Card>
            ))}
          </div>
        ) : data ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6 md:mb-8">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Active Tailors</p>
              <p className="text-xl font-bold mt-1">{data.summary.activeTailors}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Pending Tailor Payout</p>
              <p className="text-xl font-bold mt-1">Rs. {data.summary.pendingTailorPayout.toFixed(2)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Active Products</p>
              <p className="text-xl font-bold mt-1">{data.summary.activeProducts}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Published Blogs</p>
              <p className="text-xl font-bold mt-1">{data.summary.publishedBlogs}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Approved Reviews</p>
              <p className="text-xl font-bold mt-1">{data.summary.approvedReviews}</p>
            </Card>
          </div>
        ) : null}

        {loading ? (
          <div className="mb-6 grid grid-cols-1 gap-4 md:mb-8 md:gap-6 lg:grid-cols-2">
            <Card className="space-y-6 p-6">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-[300px] w-full rounded-lg" />
            </Card>
            <Card className="space-y-6 p-6">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-[300px] w-full rounded-lg" />
            </Card>
            <Card className="space-y-6 p-6 lg:col-span-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-[300px] w-full rounded-lg" />
            </Card>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
              <Card className="p-6">
                <h2 className="text-lg font-bold mb-6">Revenue Trend</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data?.charts.revenueTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#3b82f6" name="Revenue (Rs.)" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-bold mb-6">Order Status Distribution</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data?.charts.orderStatusData || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label
                      outerRadius={80}
                      dataKey="value"
                    >
                      {(data?.charts.orderStatusData || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-4">
                  {(data?.charts.orderStatusData || [])
                    .filter((item) => item.value > 0)
                    .map((item) => (
                      <Badge key={item.name} variant="outline">
                        {item.name}: {item.value}
                      </Badge>
                    ))}
                </div>
              </Card>
            </div>

            <Card className="p-6">
              <h2 className="text-lg font-bold mb-6">Monthly Orders</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data?.charts.revenueTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="orders" fill="#10b981" name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <div className="mt-4 grid grid-cols-1 gap-4 md:mt-6 md:gap-6 lg:grid-cols-2">
              <Card className="p-6">
                <h2 className="text-lg font-bold mb-6">Fabric Stock (By Fabric)</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data?.charts.fabricStockByFabric || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fabricName" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="stockMeters" fill="#f59e0b" name="Stock (m)" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-bold mb-6">Fabric Buy vs Sell Rates</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data?.charts.fabricRateByType || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fabricName" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="avgBuyRate" stroke="#3b82f6" name="Avg Buy Rate" />
                    <Line type="monotone" dataKey="avgSellRate" stroke="#10b981" name="Avg Sell Rate" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

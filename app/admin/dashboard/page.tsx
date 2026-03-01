"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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

  useEffect(() => {
    const loadDashboard = async () => {
      setError("")
      try {
        const response = await fetch("/api/admin/dashboard", { cache: "no-store" })
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
  }, [])

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
          </>
        )}
      </div>
    </div>
  )
}

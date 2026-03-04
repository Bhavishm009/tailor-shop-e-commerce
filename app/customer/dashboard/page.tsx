"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { Package, Ruler, TrendingUp } from "lucide-react"

type ReadyMadeOrder = {
  id: string
  orderNumber: string
  status: "PENDING" | "ASSIGNED" | "COMPLETED" | "DELIVERED" | "CANCELLED"
  totalAmount: number
  createdAt: string
}

type CustomOrder = {
  id: string
  stitchingService: string
  status: "PENDING" | "ASSIGNED" | "STITCHING" | "QC" | "COMPLETED" | "DELIVERED" | "CANCELLED"
  price: number
  createdAt: string
}

type UnifiedRecentOrder = {
  id: string
  type: "custom" | "ready-made"
  title: string
  amount: number
  status: string
  createdAt: string
}

const activeStatuses = new Set(["PENDING", "ASSIGNED", "STITCHING", "QC", "COMPLETED"])

export default function CustomerDashboard() {
  const { data: session } = useSession()
  const [readyMadeOrders, setReadyMadeOrders] = useState<ReadyMadeOrder[]>([])
  const [customOrders, setCustomOrders] = useState<CustomOrder[]>([])
  const [measurementCount, setMeasurementCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [readyMadeResponse, customResponse, measurementResponse] = await Promise.all([
          fetch("/api/orders", { cache: "no-store" }),
          fetch("/api/stitching-orders", { cache: "no-store" }),
          fetch("/api/measurements", { cache: "no-store" }),
        ])

        if (readyMadeResponse.ok) {
          setReadyMadeOrders((await readyMadeResponse.json()) as ReadyMadeOrder[])
        } else {
          setReadyMadeOrders([])
        }

        if (customResponse.ok) {
          setCustomOrders((await customResponse.json()) as CustomOrder[])
        } else {
          setCustomOrders([])
        }

        if (measurementResponse.ok) {
          const measurements = (await measurementResponse.json()) as Array<{ id: string }>
          setMeasurementCount(measurements.length)
        } else {
          setMeasurementCount(0)
        }
      } finally {
        setLoading(false)
      }
    }

    void loadDashboard()
  }, [])

  const totalOrders = readyMadeOrders.length + customOrders.length
  const activeOrders =
    readyMadeOrders.filter((order) => activeStatuses.has(order.status)).length +
    customOrders.filter((order) => activeStatuses.has(order.status)).length

  const recentOrders = useMemo<UnifiedRecentOrder[]>(() => {
    const readyMade: UnifiedRecentOrder[] = readyMadeOrders.map((order) => ({
      id: order.id,
      type: "ready-made",
      title: `#${order.orderNumber}`,
      amount: order.totalAmount,
      status: order.status,
      createdAt: order.createdAt,
    }))

    const custom: UnifiedRecentOrder[] = customOrders.map((order) => ({
      id: order.id,
      type: "custom",
      title: order.stitchingService,
      amount: order.price,
      status: order.status,
      createdAt: order.createdAt,
    }))

    return [...readyMade, ...custom]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  }, [readyMadeOrders, customOrders])

  const stats = [
    { label: "Active Orders", value: String(activeOrders), icon: Package },
    { label: "Total Orders", value: String(totalOrders), icon: TrendingUp },
    { label: "Saved Measurements", value: String(measurementCount), icon: Ruler },
  ]

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Welcome back, {session?.user?.name}!</h1>
        <p className="text-muted-foreground mb-6 md:mb-8">Manage your orders and customize your wardrobe</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold mt-2">{loading ? "-" : stat.value}</p>
                  </div>
                  <Icon className="w-10 h-10 text-primary opacity-20" />
                </div>
              </Card>
            )
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <Card className="p-6 md:p-8">
            <h3 className="text-xl font-bold mb-4">Custom Stitching</h3>
            <p className="text-muted-foreground mb-6">Create a new custom order with your preferences</p>
            <Button asChild>
              <Link href="/customer/orders/custom">Place Custom Order</Link>
            </Button>
          </Card>

          <Card className="p-6 md:p-8">
            <h3 className="text-xl font-bold mb-4">Ready-Made Clothing</h3>
            <p className="text-muted-foreground mb-6">Browse and purchase from our collection</p>
            <Button asChild variant="outline">
              <Link href="/products">Shop Now</Link>
            </Button>
          </Card>
        </div>

        <Card className="p-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Recent Orders</h3>
            <Button variant="outline" size="sm" asChild>
              <Link href="/customer/orders">View All</Link>
            </Button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                    <div className="space-y-2 text-right">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <p className="text-muted-foreground">No orders yet. Start shopping!</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link
                  key={`${order.type}-${order.id}`}
                  href={order.type === "custom" ? `/customer/orders/custom/${order.id}` : `/customer/orders/${order.id}`}
                  className="block rounded-md border p-3 hover:bg-muted/30"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{order.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.type === "custom" ? "Custom" : "Ready-made"} • {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{order.status}</Badge>
                      <p className="font-semibold">Rs. {order.amount.toFixed(2)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

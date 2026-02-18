"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

type ReadyMadeOrder = {
  id: string
  orderNumber: string
  status: "PENDING" | "ASSIGNED" | "COMPLETED" | "DELIVERED" | "CANCELLED"
  totalAmount: number
  createdAt: string
  updatedAt: string
}

type CustomOrder = {
  id: string
  serviceKey?: string | null
  stitchingService: string
  status: "PENDING" | "ASSIGNED" | "STITCHING" | "COMPLETED" | "DELIVERED" | "CANCELLED"
  price: number
  createdAt: string
  updatedAt: string
  assignment?: {
    tailor?: {
      name: string
    }
  } | null
}

type UnifiedOrder = {
  id: string
  type: "custom" | "ready-made"
  orderNumber: string
  status: "PENDING" | "ASSIGNED" | "STITCHING" | "COMPLETED" | "DELIVERED" | "CANCELLED"
  totalAmount: number
  createdAt: string
  updatedAt: string
  progressLabel: string
  tailorName?: string
}

export default function OrdersPage() {
  const [readyMadeOrders, setReadyMadeOrders] = useState<ReadyMadeOrder[]>([])
  const [customOrders, setCustomOrders] = useState<CustomOrder[]>([])
  const [loading, setLoading] = useState(true)

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    ASSIGNED: "bg-blue-100 text-blue-800",
    STITCHING: "bg-purple-100 text-purple-800",
    COMPLETED: "bg-green-100 text-green-800",
    DELIVERED: "bg-gray-100 text-gray-800",
    CANCELLED: "bg-red-100 text-red-800",
  }

  const statusLabels: Record<string, string> = {
    PENDING: "Pending",
    ASSIGNED: "Assigned to Tailor",
    STITCHING: "Stitching in Progress",
    COMPLETED: "Completed",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
  }

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const [readyMadeResponse, customResponse] = await Promise.all([
          fetch("/api/orders", { cache: "no-store" }),
          fetch("/api/stitching-orders", { cache: "no-store" }),
        ])

        if (readyMadeResponse.ok) {
          const readyMadeData = (await readyMadeResponse.json()) as ReadyMadeOrder[]
          setReadyMadeOrders(readyMadeData)
        }

        if (customResponse.ok) {
          const customData = (await customResponse.json()) as CustomOrder[]
          setCustomOrders(customData)
        }
      } finally {
        setLoading(false)
      }
    }

    loadOrders()
  }, [])

  const allOrders = useMemo<UnifiedOrder[]>(() => {
    const readyMade = readyMadeOrders.map((order) => ({
      id: order.id,
      type: "ready-made" as const,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      progressLabel: statusLabels[order.status],
    }))

    const custom = customOrders.map((order) => ({
      id: order.id,
      type: "custom" as const,
      orderNumber: `ST-${order.id.slice(-6).toUpperCase()}`,
      status: order.status,
      totalAmount: order.price,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      progressLabel: statusLabels[order.status],
      tailorName: order.assignment?.tailor?.name,
    }))

    return [...readyMade, ...custom].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [readyMadeOrders, customOrders])

  const activeOrders = allOrders.filter((order) => !["DELIVERED", "CANCELLED"].includes(order.status))

  return (
    <div className="p-8">
      <div className="max-w-6xl">
        <h1 className="text-3xl font-bold mb-8">Orders</h1>

        <Tabs defaultValue="all" className="mb-8">
          <TabsList>
            <TabsTrigger value="all">All Orders</TabsTrigger>
            <TabsTrigger value="custom">Custom Stitching</TabsTrigger>
            <TabsTrigger value="ready-made">Ready-Made</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {loading ? (
              <Card className="p-8 text-center"><p className="text-muted-foreground">Loading orders...</p></Card>
            ) : allOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground mb-4">No orders yet</p>
                <div className="flex gap-3 justify-center">
                  <Button asChild>
                    <Link href="/customer/orders/custom">Create Custom Order</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/products">Browse Products</Link>
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {allOrders.map((order) => (
                  <Card key={order.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Order #{order.orderNumber}</p>
                        <h3 className="text-lg font-bold">
                          {order.type === "custom" ? "Custom Stitching Order" : "Ready-Made Order"}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Created {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                        {order.type === "custom" ? (
                          <p className="text-sm mt-2">Tailor: <span className="font-medium">{order.tailorName || "Waiting for assignment"}</span></p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <Badge className={statusColors[order.status]}>{order.progressLabel}</Badge>
                        <p className="text-xl font-bold mt-2">Rs. {order.totalAmount.toFixed(2)}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="custom">
            <div className="space-y-4 mt-6">
              {customOrders.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">No custom stitching orders</p>
                  <Button asChild>
                    <Link href="/customer/orders/custom">Create Custom Order</Link>
                  </Button>
                </Card>
              ) : (
                customOrders.map((order) => (
                  <Card key={order.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{order.stitchingService}</p>
                        <p className="text-sm text-muted-foreground">Tailor: {order.assignment?.tailor?.name || "Waiting for assignment"}</p>
                      </div>
                      <Badge className={statusColors[order.status]}>{statusLabels[order.status]}</Badge>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="ready-made">
            <div className="space-y-4 mt-6">
              {readyMadeOrders.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No ready-made orders</p>
                </Card>
              ) : (
                readyMadeOrders.map((order) => (
                  <Card key={order.id} className="p-6 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">#{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Badge className={statusColors[order.status]}>{statusLabels[order.status]}</Badge>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="active">
            <div className="space-y-4 mt-6">
              {activeOrders.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No active orders</p>
                </Card>
              ) : (
                activeOrders.map((order) => (
                  <Card key={order.id} className="p-6 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">#{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">{order.type}</p>
                    </div>
                    <Badge className={statusColors[order.status]}>{statusLabels[order.status]}</Badge>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

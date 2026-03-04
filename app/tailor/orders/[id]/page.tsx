"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FeedbackToasts } from "@/components/feedback-toasts"
import { OrderChatPanel } from "@/components/order-chat-panel"
import { ChevronLeft } from "lucide-react"

type TailorOrderDetail = {
  id: string
  orderCode: string
  customer: {
    id: string
    name: string
  }
  stitchingService: string
  clothType: string
  clothSource?: "OWN" | "FROM_US"
  clothName?: string | null
  clothPrice?: number
  stitchingPrice?: number
  totalPrice?: number
  status: "ASSIGNED" | "STITCHING" | "QC" | "COMPLETED" | "DELIVERED" | "CANCELLED" | "PENDING"
  notes?: string | null
  fabricImage?: string | null
  completedImage?: string | null
  createdAt: string
  assignedAt: string
  measurement?: {
    name?: string | null
    notes?: string | null
    chest?: number | null
    waist?: number | null
    hip?: number | null
    shoulder?: number | null
    sleeveLength?: number | null
    garmentLength?: number | null
    measurementData?: Record<string, string | number | null> | null
  } | null
}

const statusColors: Record<TailorOrderDetail["status"], string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ASSIGNED: "bg-blue-100 text-blue-800",
  STITCHING: "bg-purple-100 text-purple-800",
  QC: "bg-indigo-100 text-indigo-800",
  COMPLETED: "bg-green-100 text-green-800",
  DELIVERED: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-red-100 text-red-800",
}

function getMeasurements(order: TailorOrderDetail | null) {
  if (!order?.measurement) return []
  const mapped = [
    ["Chest", order.measurement.chest],
    ["Waist", order.measurement.waist],
    ["Hip", order.measurement.hip],
    ["Shoulder", order.measurement.shoulder],
    ["Sleeve Length", order.measurement.sleeveLength],
    ["Garment Length", order.measurement.garmentLength],
  ]
    .filter(([, value]) => value != null)
    .map(([label, value]) => ({ label, value: String(value) }))

  if (mapped.length > 0) return mapped

  const raw = order.measurement.measurementData && typeof order.measurement.measurementData === "object"
    ? order.measurement.measurementData
    : {}

  return Object.entries(raw)
    .filter(([, value]) => value != null && String(value).trim() !== "")
    .map(([label, value]) => ({ label, value: String(value) }))
}

export default function TailorOrderDetailPage() {
  const params = useParams<{ id: string }>()
  const orderId = typeof params?.id === "string" ? params.id : ""
  const [order, setOrder] = useState<TailorOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadOrder = async () => {
      try {
        if (!orderId) {
          setError("Invalid order id.")
          return
        }
        const response = await fetch(`/api/tailor/orders/${orderId}`, { cache: "no-store" })
        if (!response.ok) {
          const data = (await response.json().catch(() => ({ error: "Failed to load order details." }))) as { error?: string }
          setError(data.error || "Failed to load order details.")
          return
        }
        setOrder((await response.json()) as TailorOrderDetail)
      } finally {
        setLoading(false)
      }
    }
    void loadOrder()
  }, [orderId])

  const measurements = useMemo(() => getMeasurements(order), [order])

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <Card className="p-6 text-muted-foreground">Loading order...</Card>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="p-4 md:p-8 space-y-4">
        <FeedbackToasts error={error} />
        <Button variant="ghost" asChild>
          <Link href="/tailor/orders">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Link>
        </Button>
        <Card className="p-6 text-red-600 border-red-300">{error || "Order not found."}</Card>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <Button variant="ghost" asChild>
        <Link href="/tailor/orders">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Link>
      </Button>

      <Card className="p-5 md:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{order.orderCode}</h1>
            <p className="text-sm text-muted-foreground mt-1">Assigned {new Date(order.assignedAt).toLocaleString()}</p>
          </div>
          <Badge className={statusColors[order.status]}>{order.status}</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Customer</p>
            <p className="font-semibold mt-1">{order.customer.name}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Service</p>
            <p className="font-semibold mt-1">{order.stitchingService}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Cloth Type</p>
            <p className="font-semibold mt-1">{order.clothType}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Cloth Source</p>
            <p className="font-semibold mt-1">
              {order.clothSource === "FROM_US" ? `From TailorHub${order.clothName ? ` (${order.clothName})` : ""}` : "Own Cloth"}
            </p>
          </Card>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-5 space-y-3">
          <h2 className="text-lg font-semibold">Measurements</h2>
          {measurements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No measurement data available.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-sm">
              {measurements.map((item) => (
                <p key={item.label}>
                  <span className="text-muted-foreground">{item.label}:</span> {item.value}
                </p>
              ))}
            </div>
          )}
          {order.measurement?.notes ? <p className="text-sm">{order.measurement.notes}</p> : null}
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="text-lg font-semibold">Work Notes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <p><span className="text-muted-foreground">Stitching:</span> Rs. {(order.stitchingPrice ?? order.totalPrice ?? 0).toFixed(2)}</p>
            <p><span className="text-muted-foreground">Cloth:</span> Rs. {(order.clothPrice ?? 0).toFixed(2)}</p>
            <p><span className="text-muted-foreground">Total:</span> Rs. {(order.totalPrice ?? ((order.stitchingPrice ?? 0) + (order.clothPrice ?? 0))).toFixed(2)}</p>
          </div>
          {order.notes ? <p className="text-sm"><span className="text-muted-foreground">Notes:</span> {order.notes}</p> : null}
          <div className="flex gap-3 pt-2">
            {order.fabricImage ? (
              <a className="text-sm underline text-primary" href={order.fabricImage} target="_blank" rel="noreferrer">
                View Fabric Image
              </a>
            ) : null}
            {order.completedImage ? (
              <a className="text-sm underline text-primary" href={order.completedImage} target="_blank" rel="noreferrer">
                View Completed Image
              </a>
            ) : null}
          </div>
        </Card>
      </div>

      <OrderChatPanel orderId={order.id} role="TAILOR" />
    </div>
  )
}

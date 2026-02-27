"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FeedbackToasts } from "@/components/feedback-toasts"
import { ChevronLeft } from "lucide-react"

type ReadyMadeOrderDetail = {
  id: string
  orderNumber: string
  status: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED"
  totalAmount: number
  paymentStatus: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED"
  notes?: string | null
  createdAt: string
  address: {
    street: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  items: Array<{
    id: string
    quantity: number
    price: number
    product: {
      id: string
      name: string
      image?: string | null
    }
  }>
  payments: Array<{
    id: string
    amount: number
    status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED"
    createdAt: string
  }>
}

const statusTone: Record<ReadyMadeOrderDetail["status"], string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-indigo-100 text-indigo-800",
  SHIPPED: "bg-purple-100 text-purple-800",
  OUT_FOR_DELIVERY: "bg-orange-100 text-orange-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
}

export default function CustomerReadyMadeOrderDetailPage() {
  const params = useParams<{ id: string }>()
  const orderId = typeof params?.id === "string" ? params.id : ""
  const [order, setOrder] = useState<ReadyMadeOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadOrder = async () => {
      try {
        if (!orderId) {
          setError("Invalid order id.")
          return
        }
        const response = await fetch(`/api/orders/${orderId}`, { cache: "no-store" })
        if (!response.ok) {
          const data = (await response.json().catch(() => ({ error: "Failed to load order details." }))) as { error?: string }
          setError(data.error || "Failed to load order details.")
          return
        }
        setOrder((await response.json()) as ReadyMadeOrderDetail)
      } finally {
        setLoading(false)
      }
    }
    void loadOrder()
  }, [orderId])

  const subTotal = useMemo(() => (order ? order.items.reduce((sum, item) => sum + item.price * item.quantity, 0) : 0), [order])
  const advancePaid = useMemo(
    () => (order ? order.payments.filter((payment) => payment.status === "COMPLETED").reduce((sum, payment) => sum + payment.amount, 0) : 0),
    [order],
  )
  const balance = useMemo(() => (order ? Math.max(0, order.totalAmount - advancePaid) : 0), [order, advancePaid])

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <Card className="p-6 text-muted-foreground">Loading order details...</Card>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="p-4 md:p-8 space-y-4">
        <FeedbackToasts error={error} />
        <Button variant="ghost" asChild>
          <Link href="/customer/orders">
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
        <Link href="/customer/orders">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Link>
      </Button>

      <Card className="p-5 md:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Order #{order.orderNumber}</h1>
            <p className="text-sm text-muted-foreground mt-1">Placed {new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <Badge className={statusTone[order.status]}>{order.status}</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Total Amount</p>
            <p className="font-semibold mt-1">Rs. {order.totalAmount.toFixed(2)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Advance Paid</p>
            <p className="font-semibold mt-1">Rs. {advancePaid.toFixed(2)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="font-semibold mt-1">Rs. {balance.toFixed(2)}</p>
          </Card>
        </div>
      </Card>

      <Card className="p-5 md:p-8 space-y-4">
        <h2 className="text-lg font-semibold">Bill Details</h2>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Rate</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-3 py-2">{item.product.name}</td>
                  <td className="px-3 py-2 text-right">{item.quantity}</td>
                  <td className="px-3 py-2 text-right">Rs. {item.price.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">Rs. {(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="border-t bg-muted/20">
                <td className="px-3 py-2 font-medium" colSpan={3}>Subtotal</td>
                <td className="px-3 py-2 text-right font-medium">Rs. {subTotal.toFixed(2)}</td>
              </tr>
              <tr className="border-t">
                <td className="px-3 py-2 font-medium" colSpan={3}>Advance Received</td>
                <td className="px-3 py-2 text-right font-medium">Rs. {advancePaid.toFixed(2)}</td>
              </tr>
              <tr className="border-t bg-muted/20">
                <td className="px-3 py-2 font-semibold" colSpan={3}>Balance Due</td>
                <td className="px-3 py-2 text-right font-semibold">Rs. {balance.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5 md:p-8">
        <h2 className="text-lg font-semibold mb-3">Delivery Address</h2>
        <p className="text-sm">
          {order.address.street}, {order.address.city}, {order.address.state}, {order.address.postalCode}, {order.address.country}
        </p>
      </Card>
    </div>
  )
}

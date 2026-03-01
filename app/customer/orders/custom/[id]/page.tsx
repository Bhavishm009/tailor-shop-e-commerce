"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { jsPDF } from "jspdf"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FeedbackToasts } from "@/components/feedback-toasts"
import { OrderChatPanel } from "@/components/order-chat-panel"
import { ChevronLeft, Download } from "lucide-react"

type CustomOrderDetail = {
  id: string
  stitchingService: string
  clothType: string
  status: "PENDING" | "ASSIGNED" | "STITCHING" | "QC" | "COMPLETED" | "DELIVERED" | "CANCELLED"
  price: number
  notes?: string | null
  fabricImage?: string | null
  completedImage?: string | null
  contactName?: string | null
  contactPhone?: string | null
  addressLine1?: string | null
  addressCity?: string | null
  addressState?: string | null
  addressPostalCode?: string | null
  addressCountry?: string | null
  createdAt: string
  updatedAt: string
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
  assignment?: {
    tailor?: {
      name: string
      email: string
      phone?: string | null
    } | null
  } | null
  payment?: {
    id: string
    amount: number
    status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED"
    createdAt: string
  } | null
}

const statusLabel: Record<CustomOrderDetail["status"], string> = {
  PENDING: "Pending",
  ASSIGNED: "Assigned",
  STITCHING: "Stitching",
  QC: "Quality Check",
  COMPLETED: "Completed",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
}

const statusTone: Record<CustomOrderDetail["status"], string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ASSIGNED: "bg-blue-100 text-blue-800",
  STITCHING: "bg-purple-100 text-purple-800",
  QC: "bg-indigo-100 text-indigo-800",
  COMPLETED: "bg-green-100 text-green-800",
  DELIVERED: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-red-100 text-red-800",
}

const timeline: Array<CustomOrderDetail["status"]> = ["PENDING", "ASSIGNED", "STITCHING", "QC", "COMPLETED", "DELIVERED"]

function formatAddress(order: CustomOrderDetail) {
  return [order.addressLine1, order.addressCity, order.addressState, order.addressPostalCode, order.addressCountry]
    .filter(Boolean)
    .join(", ")
}

function getMeasurementEntries(measurement: CustomOrderDetail["measurement"]) {
  if (!measurement) return []
  const mapped: Array<{ label: string; value: string }> = [
    { label: "Chest", value: measurement.chest != null ? String(measurement.chest) : "" },
    { label: "Waist", value: measurement.waist != null ? String(measurement.waist) : "" },
    { label: "Hip", value: measurement.hip != null ? String(measurement.hip) : "" },
    { label: "Shoulder", value: measurement.shoulder != null ? String(measurement.shoulder) : "" },
    { label: "Sleeve Length", value: measurement.sleeveLength != null ? String(measurement.sleeveLength) : "" },
    { label: "Garment Length", value: measurement.garmentLength != null ? String(measurement.garmentLength) : "" },
  ].filter((item) => item.value !== "")

  if (mapped.length > 0) return mapped

  const raw = measurement.measurementData && typeof measurement.measurementData === "object" ? measurement.measurementData : {}
  return Object.entries(raw)
    .filter(([, value]) => value != null && String(value).trim() !== "")
    .map(([key, value]) => ({ label: key, value: String(value) }))
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === "string") resolve(reader.result)
      else reject(new Error("Unable to convert logo to data URL"))
    }
    reader.onerror = () => reject(new Error("Unable to read logo"))
    reader.readAsDataURL(blob)
  })
}

export default function CustomerCustomOrderDetailPage() {
  const params = useParams<{ id: string }>()
  const orderId = typeof params?.id === "string" ? params.id : ""
  const [order, setOrder] = useState<CustomOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    const loadOrder = async () => {
      try {
        if (!orderId) {
          setError("Invalid custom order id.")
          return
        }
        const response = await fetch(`/api/customer/custom-orders/${orderId}`, { cache: "no-store" })
        if (!response.ok) {
          const data = (await response.json().catch(() => ({ error: "Failed to load custom order details." }))) as {
            error?: string
          }
          setError(data.error || "Failed to load custom order details.")
          return
        }
        const data = (await response.json()) as CustomOrderDetail
        setOrder(data)
      } finally {
        setLoading(false)
      }
    }
    void loadOrder()
  }, [orderId])

  const progressIndex = useMemo(() => (order ? timeline.indexOf(order.status) : -1), [order])
  const measurements = useMemo(() => getMeasurementEntries(order?.measurement), [order?.measurement])
  const advancePaid = order?.payment?.status === "COMPLETED" ? order.payment.amount : 0
  const balanceDue = order ? Math.max(0, order.price - advancePaid) : 0

  const onDownloadBill = async () => {
    if (!order) return
    setDownloading(true)
    try {
      const doc = new jsPDF()
      let y = 16

      try {
        const logoResponse = await fetch("/icon-192x192.png")
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob()
          const logoData = await blobToDataUrl(logoBlob)
          doc.addImage(logoData, "PNG", 14, 10, 18, 18)
        }
      } catch {
        // Logo load failure should not block invoice generation.
      }

      doc.setFontSize(18)
      doc.text("TailorHub Invoice", 38, 20)
      doc.setFontSize(10)
      doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`, 14, 34)
      doc.text(`Order ID: ST-${order.id.slice(-6).toUpperCase()}`, 14, 40)
      doc.text(`Status: ${statusLabel[order.status]}`, 14, 46)

      y = 56
      doc.setFontSize(12)
      doc.text("Customer Details", 14, y)
      y += 6
      doc.setFontSize(10)
      doc.text(`Name: ${order.contactName || "-"}`, 14, y)
      y += 5
      doc.text(`Phone: ${order.contactPhone || "-"}`, 14, y)
      y += 5
      doc.text(`Address: ${formatAddress(order) || "-"}`, 14, y, { maxWidth: 180 })

      y += 12
      doc.setFontSize(12)
      doc.text("Order Details", 14, y)
      y += 6
      doc.setFontSize(10)
      doc.text(`Service: ${order.stitchingService}`, 14, y)
      y += 5
      doc.text(`Cloth Type: ${order.clothType}`, 14, y)
      y += 5
      doc.text(`Total Amount: Rs. ${order.price.toFixed(2)}`, 14, y)
      y += 5
      doc.text(`Advance Received: Rs. ${advancePaid.toFixed(2)}`, 14, y)
      y += 5
      doc.text(`Balance Due: Rs. ${balanceDue.toFixed(2)}`, 14, y)

      if (measurements.length > 0) {
        y += 10
        doc.setFontSize(12)
        doc.text("Measurements", 14, y)
        y += 6
        doc.setFontSize(10)
        for (const item of measurements) {
          if (y > 275) {
            doc.addPage()
            y = 20
          }
          doc.text(`${item.label}: ${item.value}`, 14, y)
          y += 5
        }
      }

      doc.save(`invoice-ST-${order.id.slice(-6).toUpperCase()}.pdf`)
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <Card className="p-6 text-muted-foreground">Loading custom order...</Card>
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
        <Card className="p-6 text-red-600 border-red-300">{error || "Custom order not found."}</Card>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <FeedbackToasts error={error} />
      <Button variant="ghost" asChild>
        <Link href="/customer/orders">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Link>
      </Button>

      <Card className="p-5 md:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Order ST-{order.id.slice(-6).toUpperCase()}</h1>
            <p className="text-sm text-muted-foreground mt-1">Created {new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusTone[order.status]}>{statusLabel[order.status]}</Badge>
            <Button variant="outline" onClick={onDownloadBill} disabled={downloading}>
              <Download className="mr-2 h-4 w-4" />
              {downloading ? "Generating..." : "Download Bill"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Service</p>
            <p className="font-semibold mt-1">{order.stitchingService}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Cloth Type</p>
            <p className="font-semibold mt-1">{order.clothType}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Price</p>
            <p className="font-semibold mt-1">Rs. {order.price.toFixed(2)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Advance Paid</p>
            <p className="font-semibold mt-1">Rs. {advancePaid.toFixed(2)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Balance Due</p>
            <p className="font-semibold mt-1">Rs. {balanceDue.toFixed(2)}</p>
          </Card>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Progress</h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            {timeline.map((step, index) => {
              const done = progressIndex >= index
              return (
                <div key={step} className={`rounded-md border px-3 py-2 text-xs ${done ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground"}`}>
                  {statusLabel[step]}
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 space-y-3 lg:col-span-2">
          <h2 className="text-lg font-semibold">Bill Summary</h2>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-2 text-left">Particular</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-3 py-2">{order.stitchingService}</td>
                  <td className="px-3 py-2 text-right">Rs. {order.price.toFixed(2)}</td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2">Advance Received</td>
                  <td className="px-3 py-2 text-right">Rs. {advancePaid.toFixed(2)}</td>
                </tr>
                <tr className="border-t bg-muted/20">
                  <td className="px-3 py-2 font-semibold">Balance Due</td>
                  <td className="px-3 py-2 text-right font-semibold">Rs. {balanceDue.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="text-lg font-semibold">Measurements</h2>
          {order.measurement?.name ? <p className="text-sm text-muted-foreground">Preset: {order.measurement.name}</p> : null}
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
          <h2 className="text-lg font-semibold">Assignment & Contact</h2>
          <p className="text-sm">
            <span className="text-muted-foreground">Tailor:</span> {order.assignment?.tailor?.name || "Waiting for assignment"}
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Contact Name:</span> {order.contactName || "-"}
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Contact Phone:</span> {order.contactPhone || "-"}
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Address:</span> {formatAddress(order) || "-"}
          </p>
          {order.notes ? (
            <p className="text-sm">
              <span className="text-muted-foreground">Notes:</span> {order.notes}
            </p>
          ) : null}
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

      <OrderChatPanel orderId={order.id} role="CUSTOMER" />
    </div>
  )
}

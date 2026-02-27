"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import QRCode from "qrcode"
import { jsPDF } from "jspdf"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Download } from "lucide-react"
import { FeedbackToasts } from "@/components/admin/feedback-toasts"

type AdminOrderDetail = {
  id: string
  customer: {
    id: string
    name: string
    email: string
    phone?: string | null
  }
  measurement: {
    name?: string | null
    chest?: number | null
    waist?: number | null
    hip?: number | null
    shoulder?: number | null
    sleeveLength?: number | null
    garmentLength?: number | null
    notes?: string | null
    measurementData?: Record<string, string | number | null> | null
  }
  assignment?: {
    id?: string
    payoutAmount?: number
    payoutStatus?: "PENDING" | "APPROVED" | "PAID"
    tailor?: {
      id: string
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
  stitchingService: string
  serviceKey?: string | null
  clothType: string
  status: "PENDING" | "ASSIGNED" | "STITCHING" | "QC" | "COMPLETED" | "DELIVERED" | "CANCELLED"
  price: number
  contactName?: string | null
  contactPhone?: string | null
  addressLine1?: string | null
  addressCity?: string | null
  addressState?: string | null
  addressPostalCode?: string | null
  addressCountry?: string | null
  notes?: string | null
  fabricImage?: string | null
  completedImage?: string | null
  createdAt: string
}

type EligibleTailor = {
  id: string
  name: string
  email: string
  specializations: string
  activeOrders: number
  specializationMatch: boolean
}

const statusStyles: Record<AdminOrderDetail["status"], string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ASSIGNED: "bg-blue-100 text-blue-800",
  STITCHING: "bg-purple-100 text-purple-800",
  QC: "bg-indigo-100 text-indigo-800",
  COMPLETED: "bg-green-100 text-green-800",
  DELIVERED: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-red-100 text-red-800",
}

function orderCode(id: string) {
  return `ST-${id.slice(-6).toUpperCase()}`
}

function getMeasurementItems(order: AdminOrderDetail | null) {
  if (!order?.measurement) return []
  const mapped: Array<{ label: string; value: string }> = [
    { label: "Chest", value: order.measurement.chest != null ? String(order.measurement.chest) : "" },
    { label: "Waist", value: order.measurement.waist != null ? String(order.measurement.waist) : "" },
    { label: "Hip", value: order.measurement.hip != null ? String(order.measurement.hip) : "" },
    { label: "Shoulder", value: order.measurement.shoulder != null ? String(order.measurement.shoulder) : "" },
    { label: "Sleeve Length", value: order.measurement.sleeveLength != null ? String(order.measurement.sleeveLength) : "" },
    { label: "Garment Length", value: order.measurement.garmentLength != null ? String(order.measurement.garmentLength) : "" },
  ].filter((item) => item.value !== "")
  if (mapped.length > 0) return mapped

  const raw = order.measurement.measurementData && typeof order.measurement.measurementData === "object"
    ? order.measurement.measurementData
    : {}

  return Object.entries(raw)
    .filter(([, value]) => value != null && String(value).trim() !== "")
    .map(([key, value]) => ({ label: key, value: String(value) }))
}

function formatAddress(order: AdminOrderDetail) {
  return [order.addressLine1, order.addressCity, order.addressState, order.addressPostalCode, order.addressCountry]
    .filter(Boolean)
    .join(", ")
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

export default function AdminCustomOrderDetailPage() {
  const params = useParams<{ id: string }>()
  const orderId = typeof params?.id === "string" ? params.id : ""
  const [order, setOrder] = useState<AdminOrderDetail | null>(null)
  const [tailors, setTailors] = useState<EligibleTailor[]>([])
  const [selectedTailor, setSelectedTailor] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [tailorPaidAmount, setTailorPaidAmount] = useState(0)

  const code = useMemo(() => (order ? orderCode(order.id) : ""), [order])
  const measurementItems = useMemo(() => getMeasurementItems(order), [order])
  const tailorPayout = Number(order?.assignment?.payoutAmount || 0)
  const payoutPaid = Math.min(tailorPayout, tailorPaidAmount)
  const payoutDue = Math.max(0, tailorPayout - payoutPaid)
  const customerAdvance = order?.payment?.status === "COMPLETED" ? order.payment.amount : 0
  const customerBalance = order ? Math.max(0, order.price - customerAdvance) : 0

  const loadData = async () => {
    setLoading(true)
    setError("")
    try {
      if (!orderId) {
        setError("Invalid custom order id.")
        return
      }

      const [orderResponse, tailorResponse] = await Promise.all([
        fetch(`/api/admin/custom-orders/${orderId}`, { cache: "no-store" }),
        fetch(`/api/admin/custom-orders/${orderId}/tailors`, { cache: "no-store" }),
      ])

      if (!orderResponse.ok) {
        const data = (await orderResponse.json().catch(() => ({ error: "Failed to load order details." }))) as { error?: string }
        setError(data.error || "Failed to load order details.")
        return
      }

      const orderData = (await orderResponse.json()) as AdminOrderDetail
      setOrder(orderData)
      if (orderData.assignment?.id) {
        const paymentResponse = await fetch(`/api/admin/tailor-accounts/payout?assignmentId=${orderData.assignment.id}`, {
          cache: "no-store",
        })
        if (paymentResponse.ok) {
          const payments = (await paymentResponse.json()) as Array<{ amount: number }>
          setTailorPaidAmount(payments.reduce((sum, item) => sum + item.amount, 0))
        } else {
          setTailorPaidAmount(0)
        }
      } else {
        setTailorPaidAmount(0)
      }

      if (tailorResponse.ok) {
        const tailorsData = (await tailorResponse.json()) as EligibleTailor[]
        setTailors(tailorsData)
        setSelectedTailor(orderData.assignment?.tailor?.id || tailorsData[0]?.id || "")
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  useEffect(() => {
    if (!code) return
    const url = `${window.location.origin}/tailor/orders/scan?code=${encodeURIComponent(code)}`
    void QRCode.toDataURL(url, { margin: 1, width: 192 }).then(setQrCodeUrl).catch(() => setQrCodeUrl(""))
  }, [code])

  const getLogoDataUrl = async () => {
    try {
      const logoResponse = await fetch("/icon-192x192.png")
      if (!logoResponse.ok) return ""
      const logoBlob = await logoResponse.blob()
      return await blobToDataUrl(logoBlob)
    } catch {
      return ""
    }
  }

  const getAdminContactBlock = async () => {
    try {
      const [profileResponse, addressResponse] = await Promise.all([
        fetch("/api/account/profile", { cache: "no-store" }),
        fetch("/api/account/addresses", { cache: "no-store" }),
      ])
      const profile = profileResponse.ok
        ? ((await profileResponse.json()) as { name?: string; email?: string; phone?: string | null })
        : null
      const addresses = addressResponse.ok
        ? ((await addressResponse.json()) as Array<{ street: string; city: string; state: string; postalCode: string; country: string; isDefault: boolean }>)
        : []
      const primary = addresses.find((item) => item.isDefault) || addresses[0]
      const addressText = primary
        ? `${primary.street}, ${primary.city}, ${primary.state}, ${primary.postalCode}, ${primary.country}`
        : ""
      return {
        name: profile?.name || "",
        phone: profile?.phone || "",
        email: profile?.email || "",
        address: addressText,
      }
    } catch {
      return { name: "", phone: "", email: "", address: "" }
    }
  }

  const onDownloadCustomerReceipt = async () => {
    if (!order) return
    const doc = new jsPDF()
    let y = 16
    const logo = await getLogoDataUrl()
    if (logo) doc.addImage(logo, "PNG", 14, 10, 18, 18)

    doc.setFontSize(18)
    doc.text("Customer Receipt", 38, 20)
    doc.setFontSize(10)
    doc.text(`Order: ${code}`, 14, 34)
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 40)
    doc.text(`Status: ${order.status}`, 14, 46)

    y = 56
    doc.setFontSize(12)
    doc.text("Customer Details", 14, y)
    y += 6
    doc.setFontSize(10)
    doc.text(`Name: ${order.customer.name}`, 14, y); y += 5
    doc.text(`Email: ${order.customer.email}`, 14, y); y += 5
    doc.text(`Phone: ${order.contactPhone || order.customer.phone || "-"}`, 14, y); y += 5
    doc.text(`Address: ${formatAddress(order) || "-"}`, 14, y, { maxWidth: 180 }); y += 12

    doc.setFontSize(12)
    doc.text("Bill Table", 14, y); y += 6
    doc.setFontSize(10)
    doc.text("Particular", 16, y)
    doc.text("Amount (Rs.)", 170, y, { align: "right" })
    y += 2
    doc.line(14, y, 196, y)
    y += 6
    doc.text(`${order.stitchingService} (${order.clothType})`, 16, y)
    doc.text(order.price.toFixed(2), 170, y, { align: "right" })
    y += 6
    doc.text("Advance Received", 16, y)
    doc.text(customerAdvance.toFixed(2), 170, y, { align: "right" })
    y += 6
    doc.line(14, y, 196, y)
    y += 6
    doc.setFont("helvetica", "bold")
    doc.text("Balance Due", 16, y)
    doc.text(customerBalance.toFixed(2), 170, y, { align: "right" })
    doc.setFont("helvetica", "normal")
    y += 10

    if (qrCodeUrl) {
      doc.setFontSize(10)
      doc.text("Scan QR to open order", 140, y - 2)
      doc.addImage(qrCodeUrl, "PNG", 140, y, 50, 50)
    }
    y += 56

    if (measurementItems.length > 0) {
      doc.setFontSize(12)
      doc.text("Measurements", 14, y); y += 6
      doc.setFontSize(10)
      for (const item of measurementItems) {
        if (y > 275) { doc.addPage(); y = 20 }
        doc.text(`${item.label}: ${item.value}`, 14, y)
        y += 5
      }
    }

    doc.save(`customer-receipt-${code}.pdf`)
  }

  const onDownloadTailorReceipt = async () => {
    if (!order) return
    const doc = new jsPDF()
    let y = 16
    const logo = await getLogoDataUrl()
    const admin = await getAdminContactBlock()
    if (logo) doc.addImage(logo, "PNG", 14, 10, 18, 18)

    doc.setFontSize(18)
    doc.text("Tailor Job Slip", 38, 20)
    doc.setFontSize(10)
    doc.text(`Order: ${code}`, 14, 34)
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 40)
    doc.text(`Tailor: ${order.assignment?.tailor?.name || "-"}`, 14, 46)

    y = 56
    doc.setFontSize(12)
    doc.text("Work Details", 14, y); y += 6
    doc.setFontSize(10)
    doc.text(`Customer Name: ${order.customer.name}`, 14, y); y += 5
    doc.text(`Service: ${order.stitchingService}`, 14, y); y += 5
    doc.text(`Cloth Type: ${order.clothType}`, 14, y); y += 5
    doc.text(`Status: ${order.status}`, 14, y); y += 8

    doc.setFontSize(12)
    doc.text("Tailor Payout", 14, y); y += 6
    doc.setFontSize(10)
    doc.text(`Total Payout: Rs. ${tailorPayout.toFixed(2)}`, 14, y); y += 5
    doc.text(`Paid: Rs. ${payoutPaid.toFixed(2)}`, 14, y); y += 5
    doc.text(`Due: Rs. ${payoutDue.toFixed(2)}`, 14, y); y += 8
    doc.text(`Customer Advance: Rs. ${customerAdvance.toFixed(2)}`, 14, y); y += 8

    doc.setFontSize(12)
    doc.text("Admin Contact", 14, y); y += 6
    doc.setFontSize(10)
    doc.text(`Name: ${admin.name || "-"}`, 14, y); y += 5
    doc.text(`Phone: ${admin.phone || "-"}`, 14, y); y += 5
    doc.text(`Email: ${admin.email || "-"}`, 14, y); y += 5
    doc.text(`Address: ${admin.address || "-"}`, 14, y, { maxWidth: 120 }); y += 8

    if (measurementItems.length > 0) {
      doc.setFontSize(12)
      doc.text("Measurements", 14, y); y += 6
      doc.setFontSize(10)
      for (const item of measurementItems) {
        if (y > 275) { doc.addPage(); y = 20 }
        doc.text(`${item.label}: ${item.value}`, 14, y)
        y += 5
      }
    }

    if (qrCodeUrl) {
      const qrY = Math.min(y + 6, 230)
      doc.setFontSize(10)
      doc.text("Scan QR to open order", 140, qrY - 4)
      doc.addImage(qrCodeUrl, "PNG", 140, qrY, 50, 50)
    }

    doc.save(`tailor-slip-${code}.pdf`)
  }

  const onAssign = async () => {
    if (!order || !selectedTailor) return
    setSaving(true)
    setError("")
    setSuccess("")
    try {
      const response = await fetch(`/api/admin/custom-orders/${order.id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tailorId: selectedTailor }),
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => ({ error: "Failed to assign tailor." }))) as { error?: string }
        setError(data.error || "Failed to assign tailor.")
        return
      }
      setSuccess("Tailor assigned successfully.")
      await loadData()
    } finally {
      setSaving(false)
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
        <Button variant="ghost" asChild>
          <Link href="/admin/custom-orders">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Custom Orders
          </Link>
        </Button>
        <Card className="p-6 text-red-600 border-red-300">{error || "Custom order not found."}</Card>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" asChild>
          <Link href="/admin/custom-orders">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Custom Orders
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void onDownloadCustomerReceipt()}>
            <Download className="mr-2 h-4 w-4" />
            Customer Receipt
          </Button>
          <Button variant="outline" onClick={() => void onDownloadTailorReceipt()}>
            <Download className="mr-2 h-4 w-4" />
            Tailor Slip
          </Button>
        </div>
      </div>

      <FeedbackToasts error={error} success={success} />

      <Card className="p-5 md:p-8 space-y-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Order {code}</h1>
            <p className="text-sm text-muted-foreground mt-1">Created {new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <Badge className={statusStyles[order.status]}>{order.status}</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Customer</p>
            <p className="font-semibold mt-1">{order.customer.name}</p>
            <p className="text-xs text-muted-foreground">{order.customer.email}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Service</p>
            <p className="font-semibold mt-1">{order.stitchingService}</p>
            <p className="text-xs text-muted-foreground">Cloth: {order.clothType}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="font-semibold mt-1">Rs. {order.price.toFixed(2)}</p>
          </Card>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-5 space-y-3">
          <h2 className="text-lg font-semibold">Assignment</h2>
          <p className="text-sm">
            <span className="text-muted-foreground">Assigned Tailor:</span>{" "}
            {order.assignment?.tailor?.name ? `${order.assignment.tailor.name} (${order.assignment.tailor.email})` : "Not assigned"}
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Tailor</label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={selectedTailor}
              onChange={(event) => setSelectedTailor(event.target.value)}
            >
              {tailors.map((tailor) => (
                <option key={tailor.id} value={tailor.id}>
                  {tailor.name} ({tailor.activeOrders} active)
                </option>
              ))}
            </select>
          </div>
          <Button onClick={onAssign} disabled={!selectedTailor || saving || order.status !== "PENDING"}>
            {saving ? "Assigning..." : order.status === "PENDING" ? "Assign Tailor" : "Already Assigned"}
          </Button>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="text-lg font-semibold">QR + Payment Summary</h2>
          <p className="text-sm text-muted-foreground">
            Advance is customer payment received. Tailor payout is managed from Tailor Accounts.
          </p>
          {qrCodeUrl ? <img src={qrCodeUrl} alt="Order scan QR" className="h-44 w-44 border rounded-md p-2" /> : null}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Customer Advance</p>
              <p className="font-semibold">Rs. {customerAdvance.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tailor Payout</p>
              <p className="font-semibold">Rs. {tailorPayout.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tailor Due</p>
              <p className="font-semibold">Rs. {payoutDue.toFixed(2)}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-5 space-y-3">
          <h2 className="text-lg font-semibold">Contact & Address</h2>
          <p className="text-sm"><span className="text-muted-foreground">Contact Name:</span> {order.contactName || "-"}</p>
          <p className="text-sm"><span className="text-muted-foreground">Contact Phone:</span> {order.contactPhone || "-"}</p>
          <p className="text-sm"><span className="text-muted-foreground">Address:</span> {formatAddress(order) || "-"}</p>
          {order.notes ? <p className="text-sm"><span className="text-muted-foreground">Notes:</span> {order.notes}</p> : null}
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="text-lg font-semibold">Measurements</h2>
          {measurementItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No measurement data available.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-sm">
              {measurementItems.map((item) => (
                <p key={item.label}>
                  <span className="text-muted-foreground">{item.label}:</span> {item.value}
                </p>
              ))}
            </div>
          )}
          {order.measurement?.notes ? <p className="text-sm">{order.measurement.notes}</p> : null}
        </Card>
      </div>
    </div>
  )
}

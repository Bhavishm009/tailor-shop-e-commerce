"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { FeedbackToasts } from "@/components/feedback-toasts"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import Link from "next/link"
import { uploadFile, isValidImageFile } from "@/lib/file-upload"

type TailorOrder = {
  id: string
  assignmentId: string
  customerId: string
  customerName: string
  customerEmail: string
  stitchingService: string
  clothType: string
  fabricImage?: string | null
  completedImage?: string | null
  status: "ASSIGNED" | "STITCHING" | "QC" | "COMPLETED" | "DELIVERED" | "CANCELLED"
  payoutRate: number
  payoutAmount: number
  payoutStatus: "PENDING" | "APPROVED" | "PAID"
  assignedAt: string
  createdAt: string
  notes?: string | null
  measurement?: {
    chest?: number | null
    waist?: number | null
    hip?: number | null
    shoulder?: number | null
    sleeveLength?: number | null
    garmentLength?: number | null
    notes?: string | null
  } | null
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<TailorOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [uploadingCompletedId, setUploadingCompletedId] = useState<string | null>(null)

  const loadOrders = async () => {
    try {
      const response = await fetch("/api/tailor/orders", { cache: "no-store" })
      if (!response.ok) {
        setOrders([])
        setError("Failed to load assigned orders.")
        return
      }
      const data = (await response.json()) as TailorOrder[]
      setOrders(data)
    } catch {
      setOrders([])
      setError("Failed to load assigned orders.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const activeOrders = useMemo(
    () => orders.filter((order) => ["ASSIGNED", "STITCHING", "QC"].includes(order.status)),
    [orders],
  )
  const completedOrders = useMemo(
    () => orders.filter((order) => ["COMPLETED", "DELIVERED"].includes(order.status)),
    [orders],
  )

  const statusColors: Record<string, string> = {
    ASSIGNED: "bg-blue-100 text-blue-800",
    STITCHING: "bg-purple-100 text-purple-800",
    QC: "bg-indigo-100 text-indigo-800",
    COMPLETED: "bg-green-100 text-green-800",
    DELIVERED: "bg-gray-100 text-gray-800",
    CANCELLED: "bg-red-100 text-red-800",
  }

  const updateStatus = async (orderId: string, status: "STITCHING" | "COMPLETED", completedImage?: string) => {
    setUpdatingId(orderId)
    setError("")
    setSuccess("")
    try {
      const response = await fetch(`/api/tailor/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, completedImage }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to update order status." }))
        setError(data.error || "Failed to update order status.")
        return
      }

      setSuccess("Order status updated.")
      await loadOrders()
    } finally {
      setUpdatingId(null)
    }
  }

  const onUploadCompleted = async (event: React.ChangeEvent<HTMLInputElement>, order: TailorOrder) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    if (!isValidImageFile(file)) {
      setError("Completed image must be JPG/PNG/WebP/GIF and less than 10MB.")
      return
    }

    setUploadingCompletedId(order.id)
    try {
      const uploaded = await uploadFile(file, "/tailorhub/custom-orders/completed")
      await updateStatus(order.id, "COMPLETED", uploaded.url)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload completed image.")
    } finally {
      setUploadingCompletedId(null)
    }
  }

  const renderOrderCard = (order: TailorOrder) => (
    <Card key={order.id} className="p-4 md:p-6 cursor-pointer hover:bg-muted/30" onClick={() => router.push(`/tailor/orders/${order.id}`)}>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold">{order.customerName}</h3>
            <Badge className={statusColors[order.status]}>{order.status}</Badge>
          </div>
          <p className="text-sm"><span className="text-muted-foreground">Service:</span> {order.stitchingService}</p>
          <p className="text-sm"><span className="text-muted-foreground">Cloth Type:</span> {order.clothType}</p>
          <p className="text-sm"><span className="text-muted-foreground">Assigned:</span> {new Date(order.assignedAt).toLocaleDateString()}</p>
          {order.notes ? <p className="text-sm"><span className="text-muted-foreground">Notes:</span> {order.notes}</p> : null}
          {order.fabricImage ? (
            <a href={order.fabricImage} target="_blank" rel="noreferrer" className="text-xs underline text-primary">View fabric image</a>
          ) : null}

          {order.measurement ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs pt-2">
              <p>Chest: {order.measurement.chest ?? "-"}</p>
              <p>Waist: {order.measurement.waist ?? "-"}</p>
              <p>Hip: {order.measurement.hip ?? "-"}</p>
              <p>Shoulder: {order.measurement.shoulder ?? "-"}</p>
              <p>Sleeve: {order.measurement.sleeveLength ?? "-"}</p>
              <p>Length: {order.measurement.garmentLength ?? "-"}</p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 w-full md:w-auto">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/tailor/chats?orderId=${order.id}`)
            }}
          >
            Open Chat
          </Button>
          {order.status === "ASSIGNED" ? (
            <Button size="sm" onClick={(e) => { e.stopPropagation(); void updateStatus(order.id, "STITCHING") }} disabled={updatingId === order.id}>
              {updatingId === order.id ? "Updating..." : "Start Stitching"}
            </Button>
          ) : null}

          {order.status === "STITCHING" ? (
            <>
              <Input
                type="file"
                accept="image/*"
                disabled={uploadingCompletedId === order.id}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => {
                  event.stopPropagation()
                  void onUploadCompleted(event, order)
                }}
              />
              <p className="text-xs text-muted-foreground">Upload completed product image to mark as completed.</p>
            </>
          ) : null}

          {order.completedImage ? (
            <a href={order.completedImage} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs underline text-primary">View completed image</a>
          ) : null}
        </div>
      </div>
    </Card>
  )

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl">
        <div className="mb-6 md:mb-8 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-bold">Assigned Custom Orders</h1>
          <Button variant="outline" asChild>
            <Link href="/tailor/orders/scan">Scan QR</Link>
          </Button>
        </div>

        <FeedbackToasts error={error} success={success} />

        <Tabs defaultValue="active" className="mb-8">
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {loading ? (
              <Card className="p-8 text-center"><p className="text-muted-foreground">Loading...</p></Card>
            ) : activeOrders.length === 0 ? (
              <Card className="p-0">
                <Empty className="border-0 p-10">
                  <EmptyHeader>
                    <EmptyTitle>No active assigned custom orders</EmptyTitle>
                    <EmptyDescription>New assignments will appear here once they are assigned to you.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </Card>
            ) : (
              <div className="space-y-4">{activeOrders.map(renderOrderCard)}</div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            {completedOrders.length === 0 ? (
              <Card className="p-0">
                <Empty className="border-0 p-10">
                  <EmptyHeader>
                    <EmptyTitle>No completed custom orders</EmptyTitle>
                    <EmptyDescription>Completed orders will appear here.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </Card>
            ) : (
              <div className="space-y-4">{completedOrders.map(renderOrderCard)}</div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

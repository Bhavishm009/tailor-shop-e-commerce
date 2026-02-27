"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { FeedbackToasts } from "@/components/feedback-toasts"
import { ChevronLeft } from "lucide-react"

type ScannedOrder = {
  id: string
  orderCode: string
  stitchingService: string
  clothType: string
  status: "PENDING" | "ASSIGNED" | "STITCHING" | "QC" | "COMPLETED" | "DELIVERED" | "CANCELLED"
  customer: {
    name: string
  }
  notes?: string | null
  measurement?: Record<string, unknown> | null
}

const statusStyles: Record<ScannedOrder["status"], string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ASSIGNED: "bg-blue-100 text-blue-800",
  STITCHING: "bg-purple-100 text-purple-800",
  QC: "bg-indigo-100 text-indigo-800",
  COMPLETED: "bg-green-100 text-green-800",
  DELIVERED: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-red-100 text-red-800",
}

function cleanCode(value: string) {
  return value.trim().toUpperCase()
}

export default function TailorScanOrderPage() {
  const searchParams = useSearchParams()
  const [codeInput, setCodeInput] = useState("")
  const [order, setOrder] = useState<ScannedOrder | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const codeFromQuery = useMemo(() => cleanCode(searchParams?.get("code") || ""), [searchParams])

  const loadByCode = async (orderCode: string) => {
    const clean = cleanCode(orderCode)
    if (!clean) return
    setLoading(true)
    setError("")
    setOrder(null)
    try {
      const response = await fetch(`/api/tailor/orders/scan/${encodeURIComponent(clean)}`, { cache: "no-store" })
      if (!response.ok) {
        const data = (await response.json().catch(() => ({ error: "Failed to fetch scanned order." }))) as { error?: string }
        setError(data.error || "Failed to fetch scanned order.")
        return
      }
      setOrder((await response.json()) as ScannedOrder)
      setCodeInput(clean)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (codeFromQuery) {
      void loadByCode(codeFromQuery)
      return
    }
    setCodeInput("")
  }, [codeFromQuery])

  const onSearch = async () => {
    await loadByCode(codeInput)
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
        <h1 className="text-2xl md:text-3xl font-bold">Scan/Lookup Order</h1>
        <p className="text-sm text-muted-foreground">
          Enter QR order code text (example: ST-ABC123). Price and personal details are intentionally hidden here.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input value={codeInput} onChange={(event) => setCodeInput(event.target.value)} placeholder="ST-XXXXXX" />
          <Button onClick={onSearch} disabled={loading || !codeInput.trim()}>
            {loading ? "Searching..." : "Find Order"}
          </Button>
        </div>
      </Card>

      <FeedbackToasts error={error} />

      {order ? (
        <Card className="p-5 md:p-8 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">{order.orderCode}</h2>
            <Badge className={statusStyles[order.status]}>{order.status}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <p><span className="text-muted-foreground">Customer:</span> {order.customer.name}</p>
            <p><span className="text-muted-foreground">Service:</span> {order.stitchingService}</p>
            <p><span className="text-muted-foreground">Status:</span> {order.status}</p>
          </div>
          <Button variant="outline" asChild>
            <Link href={`/tailor/orders/${order.id}`}>Open Full Tailor View</Link>
          </Button>
        </Card>
      ) : null}
    </div>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { OrderChatPanel } from "@/components/order-chat-panel"
import { Badge } from "@/components/ui/badge"

type ChatRow = {
  orderId: string
  orderCode: string
  orderStatus: string
  stitchingService: string
  customerName: string
  tailorName: string | null
  lastMessage: null | {
    id: string
    text: string
    type: string
    createdAt: string
    sender: {
      id: string
      name: string
      role: string
    }
  }
}

export default function TailorChatsPage() {
  const params = useSearchParams()
  const [rows, setRows] = useState<ChatRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [selectedOrderId, setSelectedOrderId] = useState("")

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await fetch("/api/chats", { cache: "no-store" })
        if (!response.ok) {
          setRows([])
          return
        }
        const data = (await response.json()) as ChatRow[]
        setRows(data)
        const fromQuery = params?.get("orderId") || ""
        const first = fromQuery && data.some((item) => item.orderId === fromQuery) ? fromQuery : data[0]?.orderId || ""
        setSelectedOrderId(first)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [params])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((item) =>
      [item.orderCode, item.customerName, item.stitchingService].some((value) =>
        value.toLowerCase().includes(q),
      ),
    )
  }, [rows, query])

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold md:text-3xl">Order Chats</h1>
        <p className="mt-1 text-sm text-muted-foreground">Chat with customer/admin for your assigned orders.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="space-y-3 p-4">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order/customer" />
          <div className="max-h-[70vh] space-y-2 overflow-y-auto">
            {loading ? <p className="text-sm text-muted-foreground">Loading chats...</p> : null}
            {!loading && filtered.length === 0 ? <p className="text-sm text-muted-foreground">No chats found.</p> : null}
            {filtered.map((item) => (
              <button
                key={item.orderId}
                onClick={() => setSelectedOrderId(item.orderId)}
                className={`w-full rounded-md border p-3 text-left ${selectedOrderId === item.orderId ? "border-primary bg-primary/5" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{item.orderCode}</p>
                  <Badge variant="outline">{item.orderStatus}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{item.customerName}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {item.lastMessage ? `${item.lastMessage.sender.name}: ${item.lastMessage.text}` : "No messages yet"}
                </p>
              </button>
            ))}
          </div>
        </Card>
        {selectedOrderId ? <OrderChatPanel orderId={selectedOrderId} role="TAILOR" title="Order Conversation" /> : <Card className="p-5 text-sm text-muted-foreground">Select an order to view chat.</Card>}
      </div>
    </div>
  )
}

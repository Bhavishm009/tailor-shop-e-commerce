"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useSession } from "next-auth/react"
import { useRealtimeSocket } from "@/hooks/use-realtime-socket"

type MessageItem = {
  id: string
  conversationId: string
  stitchingOrderId: string
  senderId: string
  type: "TEXT" | "COMPLAINT" | "SYSTEM"
  message: string
  createdAt: string
  sender: {
    id: string
    name: string
    role: "ADMIN" | "TAILOR" | "CUSTOMER"
  }
}

type ComplaintItem = {
  id: string
  title: string
  details: string
  status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED"
  adminNote?: string | null
  createdAt: string
  raisedBy: {
    id: string
    name: string
    role: "ADMIN" | "TAILOR" | "CUSTOMER"
  }
  handledBy?: {
    id: string
    name: string
  } | null
}

type Role = "ADMIN" | "TAILOR" | "CUSTOMER"

type Props = {
  orderId: string
  role: Role
  title?: string
}

const complaintStatuses: ComplaintItem["status"][] = ["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"]

export function OrderChatPanel({ orderId, role, title = "Order Chat & Complaint" }: Props) {
  const { data: session } = useSession()
  const userId = session?.user?.id || null
  const socket = useRealtimeSocket(userId)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [complaints, setComplaints] = useState<ComplaintItem[]>([])
  const [orderStatus, setOrderStatus] = useState<string>("")
  const [text, setText] = useState("")
  const [complaintTitle, setComplaintTitle] = useState("Return Complaint")
  const [complaintMode, setComplaintMode] = useState(false)
  const [updatingComplaintId, setUpdatingComplaintId] = useState<string | null>(null)
  const [adminNoteInputs, setAdminNoteInputs] = useState<Record<string, string>>({})

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages],
  )

  const load = useCallback(async (background = false) => {
    if (!background) {
      setLoading(true)
      setError("")
    }
    try {
      const response = await fetch(`/api/orders/${orderId}/chat`, { cache: "no-store" })
      if (!response.ok) {
        if (!background) {
          const payload = (await response.json().catch(() => ({ error: "Failed to load chat." }))) as { error?: string }
          setError(payload.error || "Failed to load chat.")
        }
        return
      }
      const payload = (await response.json()) as {
        messages: MessageItem[]
        complaints: ComplaintItem[]
        order?: { status?: string }
      }
      setMessages(payload.messages || [])
      setComplaints(payload.complaints || [])
      setOrderStatus(payload.order?.status || "")
      setAdminNoteInputs((prev) => {
        const next = { ...prev }
        for (const complaint of payload.complaints || []) {
          if (!(complaint.id in next)) next[complaint.id] = complaint.adminNote || ""
        }
        return next
      })
    } catch {
      if (!background) {
        setError("Failed to load chat.")
      }
    } finally {
      if (!background) {
        setLoading(false)
      }
    }
  }, [orderId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!orderId) return
    const interval = window.setInterval(() => {
      void load(true)
    }, 15000)
    return () => {
      window.clearInterval(interval)
    }
  }, [orderId, load])

  useEffect(() => {
    if (!socket || !orderId) return
    const onNewMessage = (payload: { orderId?: string; message?: MessageItem }) => {
      if (!payload?.message || payload.orderId !== orderId) return
      setMessages((prev) => (prev.some((item) => item.id === payload.message!.id) ? prev : [...prev, payload.message!]))
    }
    const onComplaintUpdated = (payload: { orderId?: string; complaint?: ComplaintItem }) => {
      if (!payload?.complaint || payload.orderId !== orderId) return
      setComplaints((prev) =>
        prev.map((item) => (item.id === payload.complaint!.id ? payload.complaint! : item)),
      )
    }

    socket.on("chat:new-message", onNewMessage)
    socket.on("complaint:updated", onComplaintUpdated)
    return () => {
      socket.off("chat:new-message", onNewMessage)
      socket.off("complaint:updated", onComplaintUpdated)
    }
  }, [socket, orderId])

  const sendMessage = async () => {
    const message = text.trim()
    if (!message) return
    if (role === "CUSTOMER" && orderStatus !== "DELIVERED") {
      setError("You can chat only after this order is delivered.")
      return
    }
    setSending(true)
    setError("")
    try {
      const response = await fetch(`/api/orders/${orderId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          type: complaintMode ? "COMPLAINT" : "TEXT",
          complaintTitle: complaintMode ? complaintTitle : undefined,
        }),
      })
      const payload = (await response.json().catch(() => ({ error: "Failed to send message." }))) as {
        error?: string
        message?: MessageItem
        complaint?: ComplaintItem
      }
      if (!response.ok) {
        setError(payload.error || "Failed to send message.")
        return
      }
      if (payload.message) {
        setMessages((prev) => (prev.some((item) => item.id === payload.message!.id) ? prev : [...prev, payload.message!]))
      }
      if (payload.complaint) {
        setComplaints((prev) => [payload.complaint!, ...prev])
      }
      setText("")
      setComplaintMode(false)
    } finally {
      setSending(false)
    }
  }

  const updateComplaint = async (complaintId: string, status: ComplaintItem["status"]) => {
    if (role !== "ADMIN") return
    setUpdatingComplaintId(complaintId)
    setError("")
    try {
      const response = await fetch(`/api/orders/${orderId}/complaints/${complaintId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          adminNote: adminNoteInputs[complaintId] || "",
        }),
      })
      const payload = (await response.json().catch(() => ({ error: "Failed to update complaint." }))) as {
        error?: string
        complaint?: ComplaintItem
      }
      if (!response.ok) {
        setError(payload.error || "Failed to update complaint.")
        return
      }
      if (payload.complaint) {
        setComplaints((prev) => prev.map((item) => (item.id === payload.complaint!.id ? payload.complaint! : item)))
      }
    } finally {
      setUpdatingComplaintId(null)
    }
  }

  if (loading) {
    return (
      <Card className="p-5">
        <p className="text-sm text-muted-foreground">Loading chat...</p>
      </Card>
    )
  }

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
      </div>

      <div className="max-h-80 space-y-2 overflow-y-auto rounded-md border bg-muted/20 p-3">
        {sortedMessages.length === 0 ? <p className="text-sm text-muted-foreground">No messages yet.</p> : null}
        {sortedMessages.map((item) => {
          const own = item.senderId === userId
          return (
            <div key={item.id} className={`rounded-md border p-2 text-sm ${own ? "bg-primary/5 border-primary/25" : "bg-background"}`}>
              <div className="mb-1 flex items-center gap-2">
                <span className="font-medium">{item.sender.name}</span>
                <Badge variant="outline" className="text-[10px]">{item.sender.role}</Badge>
                {item.type !== "TEXT" ? <Badge variant="secondary" className="text-[10px]">{item.type}</Badge> : null}
              </div>
              <p className="whitespace-pre-wrap">{item.message}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
            </div>
          )
        })}
      </div>

      <div className="space-y-2 rounded-md border p-3">
        {role === "CUSTOMER" && orderStatus !== "DELIVERED" ? (
          <p className="text-xs text-muted-foreground">
            Customer chat opens after delivery. Current status: <span className="font-medium">{orderStatus || "-"}</span>
          </p>
        ) : null}
        {role === "CUSTOMER" ? (
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant={complaintMode ? "default" : "outline"} onClick={() => setComplaintMode((prev) => !prev)}>
              {complaintMode ? "Complaint Mode On" : "Raise Complaint"}
            </Button>
            {complaintMode ? (
              <Input value={complaintTitle} onChange={(event) => setComplaintTitle(event.target.value)} placeholder="Complaint title" className="max-w-xs" />
            ) : null}
          </div>
        ) : null}
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={complaintMode ? "Describe your issue for admin review..." : "Type your message about this order..."}
          rows={3}
          disabled={role === "CUSTOMER" && orderStatus !== "DELIVERED"}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={sendMessage}
            disabled={sending || !text.trim() || (role === "CUSTOMER" && orderStatus !== "DELIVERED")}
          >
            {sending ? "Sending..." : complaintMode ? "Send Complaint" : "Send Message"}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Complaints</h4>
        {complaints.length === 0 ? <p className="text-sm text-muted-foreground">No complaints raised.</p> : null}
        {complaints.map((complaint) => (
          <div key={complaint.id} className="space-y-2 rounded-md border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{complaint.title}</p>
              <Badge variant={complaint.status === "RESOLVED" ? "default" : complaint.status === "REJECTED" ? "destructive" : "secondary"}>
                {complaint.status}
              </Badge>
            </div>
            <p className="text-sm">{complaint.details}</p>
            <p className="text-xs text-muted-foreground">
              Raised by {complaint.raisedBy.name} ({complaint.raisedBy.role}) on {new Date(complaint.createdAt).toLocaleString()}
            </p>
            {complaint.adminNote ? <p className="text-xs text-muted-foreground">Admin note: {complaint.adminNote}</p> : null}
            {role === "ADMIN" ? (
              <div className="space-y-2">
                <Input
                  value={adminNoteInputs[complaint.id] || ""}
                  onChange={(event) => setAdminNoteInputs((prev) => ({ ...prev, [complaint.id]: event.target.value }))}
                  placeholder="Admin note"
                />
                <div className="flex flex-wrap gap-2">
                  {complaintStatuses.map((status) => (
                    <Button
                      key={status}
                      type="button"
                      size="sm"
                      variant={complaint.status === status ? "default" : "outline"}
                      disabled={updatingComplaintId === complaint.id}
                      onClick={() => void updateComplaint(complaint.id, status)}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  )
}

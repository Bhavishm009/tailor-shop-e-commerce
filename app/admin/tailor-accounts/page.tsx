"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { FeedbackToasts } from "@/components/admin/feedback-toasts"
import { ResponsiveFilterModal } from "@/components/ui/responsive-filter-modal"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type AssignmentRow = {
  id: string
  tailorId: string
  tailorName: string
  tailorEmail: string
  orderId: string
  orderCode: string
  service: string
  orderStatus: string
  totalDue: number
  paidAmount: number
  pendingAmount: number
  payoutStatus: "PENDING" | "APPROVED" | "PAID"
  assignedAt: string
  paidAt?: string | null
  payments: Array<{
    id: string
    amount: number
    createdAt: string
  }>
}

type TailorSummary = {
  id: string
  name: string
  email: string
  phone?: string | null
  totalAssigned: number
  completed: number
  totalPayout: number
  paid: number
  advancePaid: number
  pending: number
}

type TailorAccountsResponse = {
  tailors: TailorSummary[]
  assignments: AssignmentRow[]
  totals: {
    pendingPayout: number
    paidPayout: number
    totalAdvancePaid: number
    assignmentCount: number
  }
}

export default function AdminTailorAccountsPage() {
  const [data, setData] = useState<TailorAccountsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [payoutFilter, setPayoutFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "PAID">("ALL")
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL")
  const [datePreset, setDatePreset] = useState<"ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "CUSTOM">("ALL")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [amountInputs, setAmountInputs] = useState<Record<string, string>>({})
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [advanceInputs, setAdvanceInputs] = useState<Record<string, string>>({})
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/admin/tailor-accounts", { cache: "no-store" })
      if (!response.ok) {
        setData(null)
        return
      }
      const payload = (await response.json()) as TailorAccountsResponse
      setData(payload)
      setAmountInputs((prev) => {
        const next = { ...prev }
        for (const row of payload.assignments) {
          if (!(row.id in next)) {
            next[row.id] = row.pendingAmount > 0 ? row.pendingAmount.toFixed(2) : ""
          }
        }
        return next
      })
      setAdvanceInputs((prev) => {
        const next = { ...prev }
        for (const tailor of payload.tailors) {
          if (!(tailor.id in next)) next[tailor.id] = ""
        }
        return next
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const uniqueOrderStatuses = useMemo(() => {
    if (!data) return []
    return Array.from(new Set(data.assignments.map((item) => item.orderStatus))).sort()
  }, [data])

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (query.trim()) count += 1
    if (payoutFilter !== "ALL") count += 1
    if (orderStatusFilter !== "ALL") count += 1
    if (datePreset !== "ALL") count += 1
    if (datePreset === "CUSTOM" && (dateFrom || dateTo)) count += 1
    return count
  }, [query, payoutFilter, orderStatusFilter, datePreset, dateFrom, dateTo])

  const filteredRows = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    const startOfWeek = new Date(startOfToday)
    const mondayOffset = (startOfWeek.getDay() + 6) % 7
    startOfWeek.setDate(startOfWeek.getDate() - mondayOffset)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
    const customFrom = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null
    const customTo = dateTo ? new Date(`${dateTo}T23:59:59`) : null

    return data.assignments.filter((row) => {
      const qMatch =
        q.length === 0 ||
        row.tailorName.toLowerCase().includes(q) ||
        row.tailorEmail.toLowerCase().includes(q) ||
        row.orderCode.toLowerCase().includes(q) ||
        row.service.toLowerCase().includes(q)
      const payoutMatch = payoutFilter === "ALL" || row.payoutStatus === payoutFilter
      const statusMatch = orderStatusFilter === "ALL" || row.orderStatus === orderStatusFilter
      const assignedAt = new Date(row.assignedAt)
      const paymentDates = row.payments.map((payment) => new Date(payment.createdAt))
      const candidateDates = [assignedAt, ...paymentDates]
      let dateMatch = true
      if (datePreset === "TODAY") {
        dateMatch = candidateDates.some((date) => date >= startOfToday && date <= endOfToday)
      } else if (datePreset === "THIS_WEEK") {
        dateMatch = candidateDates.some((date) => date >= startOfWeek)
      } else if (datePreset === "THIS_MONTH") {
        dateMatch = candidateDates.some((date) => date >= startOfMonth)
      } else if (datePreset === "CUSTOM") {
        if (customFrom && !candidateDates.some((date) => date >= customFrom)) dateMatch = false
        if (customTo && !candidateDates.some((date) => date <= customTo)) dateMatch = false
      }
      return qMatch && payoutMatch && statusMatch && dateMatch
    })
  }, [data, query, payoutFilter, orderStatusFilter, datePreset, dateFrom, dateTo])

  const filteredTailors = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    return data.tailors.filter((tailor) => {
      if (!q) return true
      return (
        tailor.name.toLowerCase().includes(q) ||
        tailor.email.toLowerCase().includes(q) ||
        (tailor.phone || "").toLowerCase().includes(q)
      )
    })
  }, [data, query])

  const payAmount = async (row: AssignmentRow) => {
    setError("")
    setSuccess("")
    const amount = Number(amountInputs[row.id] || 0)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid pay amount.")
      return
    }
    if (amount > row.pendingAmount) {
      setError("Pay amount cannot be more than pending amount.")
      return
    }

    setActionLoadingId(row.id)
    try {
      const response = await fetch("/api/admin/tailor-accounts/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId: row.id, amount }),
      })
      const payload = (await response.json().catch(() => ({ error: "Failed to pay amount." }))) as {
        error?: string
        paidAmount?: number
      }
      if (!response.ok) {
        setError(payload.error || "Failed to pay amount.")
        return
      }
      setSuccess(`Paid Rs. ${(payload.paidAmount || amount).toFixed(2)} successfully.`)
      await load()
    } finally {
      setActionLoadingId(null)
    }
  }

  const payAdvance = async (tailor: TailorSummary) => {
    setError("")
    setSuccess("")
    const amount = Number(advanceInputs[tailor.id] || 0)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid advance amount.")
      return
    }

    setActionLoadingId(`advance-${tailor.id}`)
    try {
      const response = await fetch("/api/admin/tailor-accounts/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tailorId: tailor.id, amount }),
      })
      const payload = (await response.json().catch(() => ({ error: "Failed to pay advance." }))) as {
        error?: string
        paidAmount?: number
      }
      if (!response.ok) {
        setError(payload.error || "Failed to pay advance.")
        return
      }
      setSuccess(`Advance Rs. ${(payload.paidAmount || amount).toFixed(2)} paid to ${tailor.name}.`)
      setAdvanceInputs((prev) => ({ ...prev, [tailor.id]: "" }))
      await load()
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Tailor Accounts</h1>
      <FeedbackToasts error={error} success={success} />
      {loading ? (
        <Card className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-5 w-full" />
          ))}
        </Card>
      ) : null}
      {!loading && !data ? (
        <Card className="p-0">
          <Empty className="border-0 p-10">
            <EmptyHeader>
              <EmptyTitle>No tailor accounts found</EmptyTitle>
              <EmptyDescription>Once assignments are created, payout accounts will appear here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      ) : null}

      {data ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Pending To Pay</p>
              <p className="text-xl font-semibold mt-1">Rs. {data.totals.pendingPayout.toFixed(2)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Already Paid</p>
              <p className="text-xl font-semibold mt-1">Rs. {data.totals.paidPayout.toFixed(2)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Advance Paid</p>
              <p className="text-xl font-semibold mt-1">Rs. {data.totals.totalAdvancePaid.toFixed(2)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Total Assignments</p>
              <p className="text-xl font-semibold mt-1">{data.totals.assignmentCount}</p>
            </Card>
          </div>

          <Card className="p-4 space-y-3">
            <h2 className="text-lg font-semibold">Filters</h2>
            <div className="flex flex-wrap gap-2">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tailor/order/service"
                className="w-full sm:max-w-sm"
              />
              <Button type="button" variant="outline" onClick={() => setIsFilterModalOpen(true)}>
                Filters
                {activeFiltersCount > 0 ? (
                  <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs text-primary-foreground">
                    {activeFiltersCount}
                  </span>
                ) : null}
              </Button>
              {activeFiltersCount > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setPayoutFilter("ALL")
                    setOrderStatusFilter("ALL")
                    setDatePreset("ALL")
                    setDateFrom("")
                    setDateTo("")
                  }}
                >
                  Clear
                </Button>
              ) : null}
            </div>
          </Card>

          <Card className="space-y-4 p-4">
            <h2 className="text-lg font-semibold">Advance Payment To Tailors</h2>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left">Tailor</th>
                    <th className="px-3 py-2 text-right">Total Payout</th>
                    <th className="px-3 py-2 text-right">Paid</th>
                    <th className="px-3 py-2 text-right">Advance</th>
                    <th className="px-3 py-2 text-right">Pending</th>
                    <th className="px-3 py-2 text-left">Pay Advance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTailors.map((tailor) => (
                    <tr key={tailor.id} className="border-t">
                      <td className="px-3 py-2">
                        <p>{tailor.name}</p>
                        <p className="text-xs text-muted-foreground">{tailor.email}</p>
                      </td>
                      <td className="px-3 py-2 text-right">Rs. {tailor.totalPayout.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">Rs. {tailor.paid.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">Rs. {tailor.advancePaid.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-medium">Rs. {tailor.pending.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <div className="flex min-w-[220px] items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={advanceInputs[tailor.id] ?? ""}
                            onChange={(event) =>
                              setAdvanceInputs((prev) => ({ ...prev, [tailor.id]: event.target.value }))
                            }
                            placeholder="Advance amount"
                          />
                          <Button
                            size="sm"
                            onClick={() => void payAdvance(tailor)}
                            disabled={actionLoadingId === `advance-${tailor.id}`}
                          >
                            {actionLoadingId === `advance-${tailor.id}` ? "Paying..." : "Pay"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <h2 className="text-lg font-semibold">Payout Management (Admin Controlled)</h2>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left">Tailor</th>
                    <th className="px-3 py-2 text-left">Order</th>
                    <th className="px-3 py-2 text-left">Order Status</th>
                    <th className="px-3 py-2 text-right">Total Due</th>
                    <th className="px-3 py-2 text-right">Paid</th>
                    <th className="px-3 py-2 text-right">Pending</th>
                    <th className="px-3 py-2 text-left">Pay Amount</th>
                    <th className="px-3 py-2 text-left">Last Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const lastPayment = row.payments[0]
                    return (
                      <tr key={row.id} className="border-t">
                        <td className="px-3 py-2">
                          <p>{row.tailorName}</p>
                          <p className="text-xs text-muted-foreground">{row.tailorEmail}</p>
                        </td>
                        <td className="px-3 py-2">
                          <p>{row.orderCode}</p>
                          <p className="text-xs text-muted-foreground">{row.service}</p>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="secondary">{row.orderStatus}</Badge>
                          <div className="mt-1">
                            <Badge variant={row.payoutStatus === "PAID" ? "default" : "secondary"}>{row.payoutStatus}</Badge>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">Rs. {row.totalDue.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">Rs. {row.paidAmount.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-medium">Rs. {row.pendingAmount.toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2 min-w-[210px]">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={amountInputs[row.id] ?? ""}
                              onChange={(event) =>
                                setAmountInputs((prev) => ({ ...prev, [row.id]: event.target.value }))
                              }
                            />
                            <Button
                              size="sm"
                              disabled={row.pendingAmount <= 0 || actionLoadingId === row.id}
                              onClick={() => void payAmount(row)}
                            >
                              {actionLoadingId === row.id ? "Paying..." : "Pay"}
                            </Button>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {lastPayment ? `${new Date(lastPayment.createdAt).toLocaleDateString()} (Rs. ${lastPayment.amount.toFixed(2)})` : "-"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}

      <ResponsiveFilterModal
        open={isFilterModalOpen}
        onOpenChange={setIsFilterModalOpen}
        title="Tailor Account Filters"
        description="Apply payout, status, and date filters."
        desktopContentClassName="sm:max-w-xl"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPayoutFilter("ALL")
                setOrderStatusFilter("ALL")
                setDatePreset("ALL")
                setDateFrom("")
                setDateTo("")
              }}
            >
              Clear
            </Button>
            <Button type="button" onClick={() => setIsFilterModalOpen(false)}>
              Apply
            </Button>
          </>
        }
      >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Payout Status</p>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={payoutFilter}
                onChange={(event) => setPayoutFilter(event.target.value as "ALL" | "PENDING" | "APPROVED" | "PAID")}
              >
                <option value="ALL">All Payout Status</option>
                <option value="PENDING">PENDING</option>
                <option value="APPROVED">APPROVED</option>
                <option value="PAID">PAID</option>
              </select>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Order Status</p>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={orderStatusFilter}
                onChange={(event) => setOrderStatusFilter(event.target.value)}
              >
                <option value="ALL">All Order Status</option>
                {uniqueOrderStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Date Filter</p>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={datePreset}
                onChange={(event) => setDatePreset(event.target.value as "ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "CUSTOM")}
              >
                <option value="ALL">All Dates</option>
                <option value="TODAY">Today</option>
                <option value="THIS_WEEK">This Week</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="CUSTOM">Custom Range</option>
              </select>
            </div>

            {datePreset === "CUSTOM" ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Custom Date Range</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="From date" />
                  <DatePicker value={dateTo} onChange={setDateTo} placeholder="To date" />
                </div>
              </div>
            ) : null}
          </div>
      </ResponsiveFilterModal>
    </div>
  )
}

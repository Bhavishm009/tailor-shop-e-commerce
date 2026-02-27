"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DatePicker } from "@/components/ui/date-picker"
import { Button } from "@/components/ui/button"
import { ResponsiveFilterModal } from "@/components/ui/responsive-filter-modal"
import { useIsMobile } from "@/hooks/use-mobile"

type TailorAccount = {
  id: string
  name: string
  email: string
  specializations: string
  totalAssigned: number
  completed: number
  totalPayout: number
  paid: number
  pending: number
  assignments: Array<{
    id: string
    totalDue: number
    paidAmount: number
    pendingAmount: number
    payoutStatus: "PENDING" | "APPROVED" | "PAID"
    assignedAt: string
    payments: Array<{
      id: string
      amount: number
      createdAt: string
    }>
    stitchingOrder: {
      id: string
      stitchingService: string
      status: string
      createdAt: string
    }
  }>
}

export default function TailorAccountPage() {
  const [data, setData] = useState<TailorAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [payoutFilter, setPayoutFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "PAID">("ALL")
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/tailor/account", { cache: "no-store" })
        if (!response.ok) return
        setData((await response.json()) as TailorAccount)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  if (loading) return <div className="p-4 md:p-8"><Card className="p-4 text-muted-foreground">Loading...</Card></div>
  if (!data) return <div className="p-4 md:p-8"><Card className="p-4 text-muted-foreground">No account data available.</Card></div>

  const orderStatuses = Array.from(new Set(data.assignments.map((assignment) => assignment.stitchingOrder.status))).sort()
  const filtered = data.assignments.filter((assignment) => {
    const payoutMatch = payoutFilter === "ALL" || assignment.payoutStatus === payoutFilter
    const statusMatch = orderStatusFilter === "ALL" || assignment.stitchingOrder.status === orderStatusFilter
    const assignedDate = new Date(assignment.assignedAt)
    const paymentDates = assignment.payments.map((payment) => new Date(payment.createdAt))
    const candidateDates = [assignedDate, ...paymentDates]
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null
    const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null
    const fromMatch = from ? candidateDates.some((date) => date >= from) : true
    const toMatch = to ? candidateDates.some((date) => date <= to) : true
    return payoutMatch && statusMatch && fromMatch && toMatch
  })

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">My Account Panel</h1>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Assigned</p><p className="font-semibold">{data.totalAssigned}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Completed</p><p className="font-semibold">{data.completed}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Total</p><p className="font-semibold">Rs. {data.totalPayout.toFixed(2)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Paid</p><p className="font-semibold">Rs. {data.paid.toFixed(2)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="font-semibold">Rs. {data.pending.toFixed(2)}</p></Card>
      </div>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Assigned Work & Payout Tracking</h2>
          <Button type="button" variant="outline" onClick={() => setIsFilterOpen(true)}>
            Filters
          </Button>
        </div>
        {!isMobile ? <div className="flex flex-wrap gap-2">
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={payoutFilter}
            onChange={(event) => setPayoutFilter(event.target.value as "ALL" | "PENDING" | "APPROVED" | "PAID")}
          >
            <option value="ALL">All Payout Status</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="PAID">PAID</option>
          </select>
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={orderStatusFilter}
            onChange={(event) => setOrderStatusFilter(event.target.value)}
          >
            <option value="ALL">All Order Status</option>
            {orderStatuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <div className="w-full sm:w-56">
            <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="From date" />
          </div>
          <div className="w-full sm:w-56">
            <DatePicker value={dateTo} onChange={setDateTo} placeholder="To date" />
          </div>
        </div> : null}

        <ResponsiveFilterModal
          open={isFilterOpen}
          onOpenChange={setIsFilterOpen}
          title="Filter Assignments"
          description="Apply payout, order status, and date filters."
          desktopContentClassName="sm:max-w-xl"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPayoutFilter("ALL")
                  setOrderStatusFilter("ALL")
                  setDateFrom("")
                  setDateTo("")
                }}
              >
                Clear
              </Button>
              <Button type="button" onClick={() => setIsFilterOpen(false)}>
                Apply Filters
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
                {orderStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <p className="text-sm font-medium">Custom Date Range</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="From date" />
                <DatePicker value={dateTo} onChange={setDateTo} placeholder="To date" />
              </div>
            </div>
          </div>
        </ResponsiveFilterModal>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left">Order</th>
                <th className="px-3 py-2 text-left">Service</th>
                <th className="px-3 py-2 text-left">Order Status</th>
                <th className="px-3 py-2 text-right">Total Due</th>
                <th className="px-3 py-2 text-right">Paid</th>
                <th className="px-3 py-2 text-right">Pending</th>
                <th className="px-3 py-2 text-left">Payout Status</th>
                <th className="px-3 py-2 text-left">Last Payment</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((assignment) => (
                <tr key={assignment.id} className="border-t">
                  <td className="px-3 py-2">ST-{assignment.stitchingOrder.id.slice(-6).toUpperCase()}</td>
                  <td className="px-3 py-2">{assignment.stitchingOrder.stitchingService}</td>
                  <td className="px-3 py-2"><Badge variant="secondary">{assignment.stitchingOrder.status}</Badge></td>
                  <td className="px-3 py-2 text-right">Rs. {assignment.totalDue.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">Rs. {assignment.paidAmount.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">Rs. {assignment.pendingAmount.toFixed(2)}</td>
                  <td className="px-3 py-2"><Badge variant={assignment.payoutStatus === "PAID" ? "default" : "secondary"}>{assignment.payoutStatus}</Badge></td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {assignment.payments[0]
                      ? `${new Date(assignment.payments[0].createdAt).toLocaleDateString()} (Rs. ${assignment.payments[0].amount.toFixed(2)})`
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

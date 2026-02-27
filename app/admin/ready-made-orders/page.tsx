"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DatePicker } from "@/components/ui/date-picker"
import { FeedbackToasts } from "@/components/admin/feedback-toasts"
import { ResponsiveFilterModal } from "@/components/ui/responsive-filter-modal"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type ReadyMadeOrder = {
  id: string
  source: "READY_MADE"
  orderNumber: string
  customerName: string
  customerEmail: string
  totalAmount: number
  status: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED"
  createdAt: string
}

type DatePreset = "ALL" | "TODAY" | "YESTERDAY" | "THIS_WEEK" | "LAST_WEEK" | "CUSTOM"

const readyMadeTransitions: Record<ReadyMadeOrder["status"], ReadyMadeOrder["status"][]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
}

const getStartOfDay = (date: Date) => {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  return start
}

const getEndOfDay = (date: Date) => {
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  return end
}

const getStartOfWeek = (date: Date) => {
  const day = date.getDay()
  const diff = (day + 6) % 7
  const start = getStartOfDay(date)
  start.setDate(start.getDate() - diff)
  return start
}

export default function ReadyMadeOrdersPage() {
  const [orders, setOrders] = useState<ReadyMadeOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | ReadyMadeOrder["status"]>("ALL")
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount_desc" | "amount_asc">("newest")
  const [datePreset, setDatePreset] = useState<DatePreset>("ALL")
  const [customFromDate, setCustomFromDate] = useState("")
  const [customToDate, setCustomToDate] = useState("")
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [bulkActionLoading, setBulkActionLoading] = useState<string | null>(null)

  const loadOrders = async () => {
    try {
      const response = await fetch("/api/admin/ready-made-orders", { cache: "no-store" })
      if (!response.ok) {
        setOrders([])
        setError("Failed to load ready-made orders.")
        return
      }
      const data = (await response.json()) as ReadyMadeOrder[]
      setOrders(data)
    } catch {
      setOrders([])
      setError("Failed to load ready-made orders.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (search.trim()) count += 1
    if (statusFilter !== "ALL") count += 1
    if (datePreset !== "ALL") count += 1
    if (datePreset === "CUSTOM" && (customFromDate || customToDate)) count += 1
    return count
  }, [search, statusFilter, datePreset, customFromDate, customToDate])

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase()
    const now = new Date()
    const todayStart = getStartOfDay(now)
    const yesterdayStart = getStartOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))
    const yesterdayEnd = getEndOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))
    const thisWeekStart = getStartOfWeek(now)
    const lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)
    const lastWeekEnd = new Date(thisWeekStart)
    lastWeekEnd.setMilliseconds(lastWeekEnd.getMilliseconds() - 1)

    const filtered = orders.filter((order) => {
      const queryMatch =
        q.length === 0 ||
        order.orderNumber.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        order.customerEmail.toLowerCase().includes(q)

      const statusMatch = statusFilter === "ALL" || order.status === statusFilter

      const createdAt = new Date(order.createdAt)
      let dateMatch = true
      if (datePreset === "TODAY") dateMatch = createdAt >= todayStart
      else if (datePreset === "YESTERDAY") dateMatch = createdAt >= yesterdayStart && createdAt <= yesterdayEnd
      else if (datePreset === "THIS_WEEK") dateMatch = createdAt >= thisWeekStart
      else if (datePreset === "LAST_WEEK") dateMatch = createdAt >= lastWeekStart && createdAt <= lastWeekEnd
      else if (datePreset === "CUSTOM") {
        const from = customFromDate ? getStartOfDay(new Date(customFromDate)) : null
        const to = customToDate ? getEndOfDay(new Date(customToDate)) : null
        if (from && createdAt < from) dateMatch = false
        if (to && createdAt > to) dateMatch = false
      }

      return queryMatch && statusMatch && dateMatch
    })

    return filtered.sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      if (sortBy === "amount_desc") return b.totalAmount - a.totalAmount
      return a.totalAmount - b.totalAmount
    })
  }, [orders, search, statusFilter, sortBy, datePreset, customFromDate, customToDate])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, sortBy, datePreset, customFromDate, customToDate])

  useEffect(() => {
    setSelectedRowIds((prev) => prev.filter((id) => filteredOrders.some((order) => order.id === id)))
  }, [filteredOrders])

  const totalRecords = filteredOrders.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * pageSize
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + pageSize)

  const pageRowIds = paginatedOrders.map((order) => order.id)
  const allPageSelected = pageRowIds.length > 0 && pageRowIds.every((id) => selectedRowIds.includes(id))

  const toggleRowSelection = (id: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    )
  }

  const toggleSelectAllPageRows = () => {
    setSelectedRowIds((prev) => {
      if (allPageSelected) return prev.filter((id) => !pageRowIds.includes(id))
      return Array.from(new Set([...prev, ...pageRowIds]))
    })
  }

  const updateOrderStatus = async (order: ReadyMadeOrder, status: ReadyMadeOrder["status"]) => {
    const response = await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "READY_MADE", status }),
    })
    return response.ok
  }

  const runBulkStatusUpdate = async (status: ReadyMadeOrder["status"]) => {
    if (selectedRowIds.length === 0) return
    setBulkActionLoading(status)
    setError("")
    setSuccess("")
    try {
      const selected = orders.filter((order) => selectedRowIds.includes(order.id))
      const results = await Promise.allSettled(selected.map((order) => updateOrderStatus(order, status)))
      const successCount = results.filter((result) => result.status === "fulfilled" && result.value).length
      const failedCount = selected.length - successCount
      if (successCount > 0) setSuccess(`${successCount} order(s) updated.`)
      if (failedCount > 0) setError(`${failedCount} order(s) failed.`)
      setSelectedRowIds([])
      await loadOrders()
    } finally {
      setBulkActionLoading(null)
    }
  }

  const clearFilters = () => {
    setSearch("")
    setStatusFilter("ALL")
    setSortBy("newest")
    setDatePreset("ALL")
    setCustomFromDate("")
    setCustomToDate("")
  }

  const getStatusOptionsForOrder = (order: ReadyMadeOrder) => [order.status, ...(readyMadeTransitions[order.status] || [])]

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Ready-Made Orders</h1>
      </div>

      <FeedbackToasts error={error} success={success} />

      <Card className="p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order/customer" className="w-full sm:max-w-md" />
          <Button type="button" variant="outline" onClick={() => setIsFilterModalOpen(true)}>
            Filters
            {activeFiltersCount > 0 ? <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs text-primary-foreground">{activeFiltersCount}</span> : null}
          </Button>
          {activeFiltersCount > 0 ? <Button type="button" variant="ghost" onClick={clearFilters}>Clear Filters</Button> : null}
        </div>

        {selectedRowIds.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p>Selected: <span className="font-medium">{selectedRowIds.length}</span></p>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => runBulkStatusUpdate("CONFIRMED")} disabled={bulkActionLoading !== null}>{bulkActionLoading === "CONFIRMED" ? "Updating..." : "Set Confirmed"}</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => runBulkStatusUpdate("PROCESSING")} disabled={bulkActionLoading !== null}>{bulkActionLoading === "PROCESSING" ? "Updating..." : "Set Processing"}</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => runBulkStatusUpdate("SHIPPED")} disabled={bulkActionLoading !== null}>{bulkActionLoading === "SHIPPED" ? "Updating..." : "Set Shipped"}</Button>
              <Button type="button" size="sm" variant="destructive" onClick={() => runBulkStatusUpdate("CANCELLED")} disabled={bulkActionLoading !== null}>{bulkActionLoading === "CANCELLED" ? "Updating..." : "Set Cancelled"}</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedRowIds([])} disabled={bulkActionLoading !== null}>Clear Selection</Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Total Records: <span className="font-medium text-foreground">{totalRecords}</span></div>
        )}

        {loading ? (
          <p className="text-muted-foreground">Loading ready-made orders...</p>
        ) : totalRecords === 0 ? (
          <p className="text-muted-foreground">No ready-made orders found.</p>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"><input type="checkbox" checked={allPageSelected} onChange={toggleSelectAllPageRows} aria-label="Select all rows on current page" /></TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell><input type="checkbox" checked={selectedRowIds.includes(order.id)} onChange={() => toggleRowSelection(order.id)} aria-label={`Select row for ${order.orderNumber}`} /></TableCell>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p>{order.customerName}</p>
                          <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={order.status === "CANCELLED" ? "destructive" : "secondary"}>{order.status}</Badge></TableCell>
                      <TableCell>Rs. {order.totalAmount.toFixed(2)}</TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <select className="h-8 rounded-md border bg-background px-2 text-xs" value={order.status} onChange={async (e) => {
                            const nextStatus = e.target.value as ReadyMadeOrder["status"]
                            setError("")
                            setSuccess("")
                            const ok = await updateOrderStatus(order, nextStatus)
                            if (!ok) {
                              setError("Failed to update order status.")
                              return
                            }
                            setSuccess("Order status updated.")
                            await loadOrders()
                          }}>
                            {getStatusOptionsForOrder(order).map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                          <Button asChild type="button" variant="outline" size="sm">
                            <Link href={`/admin/ready-made-orders/${order.id}`}>Details</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span>Rows per page</span>
                <select className="h-9 rounded-md border bg-background" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Page {safeCurrentPage} of {totalPages}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={safeCurrentPage <= 1}>Previous</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={safeCurrentPage >= totalPages}>Next</Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <ResponsiveFilterModal
        open={isFilterModalOpen}
        onOpenChange={setIsFilterModalOpen}
        title="Filter Ready-Made Orders"
        description="Apply one or more filters to narrow listing results."
        desktopContentClassName="sm:max-w-xl"
        footer={
          <>
            <Button type="button" variant="outline" onClick={clearFilters}>Clear</Button>
            <Button type="button" onClick={() => setIsFilterModalOpen(false)}>Apply Filters</Button>
          </>
        }
      >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Status</p>
              <select className="h-10 w-full rounded-md border bg-background px-3" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "ALL" | ReadyMadeOrder["status"])}>
                <option value="ALL">All Status</option>
                <option value="PENDING">PENDING</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="SHIPPED">SHIPPED</option>
                <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Sort</p>
              <select className="h-10 w-full rounded-md border bg-background px-3" value={sortBy} onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "amount_desc" | "amount_asc")}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="amount_desc">Amount High-Low</option>
                <option value="amount_asc">Amount Low-High</option>
              </select>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Date Filter</p>
              <select className="h-10 w-full rounded-md border bg-background px-3" value={datePreset} onChange={(e) => setDatePreset(e.target.value as DatePreset)}>
                <option value="ALL">All Dates</option>
                <option value="TODAY">Today</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="THIS_WEEK">This Week</option>
                <option value="LAST_WEEK">Last Week</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>
            {datePreset === "CUSTOM" ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Custom Date Range</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <DatePicker value={customFromDate} onChange={setCustomFromDate} placeholder="From date" />
                  <DatePicker value={customToDate} onChange={setCustomToDate} placeholder="To date" />
                </div>
              </div>
            ) : null}
          </div>
      </ResponsiveFilterModal>
    </div>
  )
}

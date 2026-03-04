"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DatePicker } from "@/components/ui/date-picker"
import { FeedbackToasts } from "@/components/admin/feedback-toasts"
import { ResponsiveFilterModal } from "@/components/ui/responsive-filter-modal"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { RowActionsMenu } from "@/components/admin/row-actions-menu"
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

type CustomOrder = {
  id: string
  source: "CUSTOM"
  orderNumber: string
  customerName: string
  customerEmail: string
  serviceKey?: string | null
  stitchingService: string
  clothSource?: "OWN" | "FROM_US"
  clothName?: string | null
  clothPrice?: number
  stitchingPrice?: number
  totalAmount: number
  status: "PENDING" | "ASSIGNED" | "STITCHING" | "QC" | "COMPLETED" | "DELIVERED" | "CANCELLED"
  assignedTailorId?: string | null
  assignedTailorName?: string | null
  payoutAmount?: number | null
  payoutStatus?: "PENDING" | "APPROVED" | "PAID" | null
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

type DatePreset = "ALL" | "TODAY" | "YESTERDAY" | "THIS_WEEK" | "LAST_WEEK" | "CUSTOM"

const customTransitions: Record<CustomOrder["status"], CustomOrder["status"][]> = {
  PENDING: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["STITCHING", "CANCELLED"],
  STITCHING: ["QC", "CANCELLED"],
  QC: ["COMPLETED", "STITCHING", "CANCELLED"],
  COMPLETED: ["DELIVERED"],
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

export default function CustomOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<CustomOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | CustomOrder["status"]>("ALL")
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount_desc" | "amount_asc">("newest")
  const [datePreset, setDatePreset] = useState<DatePreset>("ALL")
  const [customFromDate, setCustomFromDate] = useState("")
  const [customToDate, setCustomToDate] = useState("")
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [bulkActionLoading, setBulkActionLoading] = useState<string | null>(null)

  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null)
  const [eligibleTailors, setEligibleTailors] = useState<EligibleTailor[]>([])
  const [selectedTailorId, setSelectedTailorId] = useState("")
  const [loadingTailors, setLoadingTailors] = useState(false)

  const loadOrders = async () => {
    try {
      const response = await fetch("/api/admin/custom-orders", { cache: "no-store" })
      if (!response.ok) {
        setOrders([])
        setError("Failed to load custom orders.")
        return
      }
      const data = (await response.json()) as CustomOrder[]
      setOrders(data)
    } catch {
      setOrders([])
      setError("Failed to load custom orders.")
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
        order.customerEmail.toLowerCase().includes(q) ||
        order.stitchingService.toLowerCase().includes(q)

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

  const updateOrderStatus = async (order: CustomOrder, status: CustomOrder["status"]) => {
    const response = await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "CUSTOM", status }),
    })
    return response.ok
  }

  const runBulkStatusUpdate = async (status: CustomOrder["status"]) => {
    if (selectedRowIds.length === 0) return
    setBulkActionLoading(status)
    setError("")
    setSuccess("")
    try {
      const selected = orders.filter((order) => selectedRowIds.includes(order.id) && status !== "ASSIGNED")
      const results = await Promise.allSettled(selected.map((order) => updateOrderStatus(order, status)))
      const successCount = results.filter((result) => result.status === "fulfilled" && result.value).length
      const failedCount = selected.length - successCount
      if (successCount > 0) setSuccess(`${successCount} custom order(s) updated.`)
      if (failedCount > 0) setError(`${failedCount} custom order(s) failed.`)
      setSelectedRowIds([])
      await loadOrders()
    } finally {
      setBulkActionLoading(null)
    }
  }

  const openAssignDialog = async (orderId: string) => {
    setAssigningOrderId(orderId)
    setSelectedTailorId("")
    setEligibleTailors([])
    setAssignDialogOpen(true)
    setLoadingTailors(true)
    try {
      const response = await fetch(`/api/admin/custom-orders/${orderId}/tailors`, { cache: "no-store" })
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to load tailors." }))
        setError(data.error || "Failed to load tailors.")
        return
      }
      const data = (await response.json()) as EligibleTailor[]
      setEligibleTailors(data)
      if (data[0]) setSelectedTailorId(data[0].id)
    } finally {
      setLoadingTailors(false)
    }
  }

  const assignSelectedTailor = async () => {
    if (!assigningOrderId || !selectedTailorId) return
    setError("")
    setSuccess("")

    const response = await fetch(`/api/admin/custom-orders/${assigningOrderId}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tailorId: selectedTailorId }),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: "Failed to assign tailor." }))
      setError(data.error || "Failed to assign tailor.")
      return
    }

    setAssignDialogOpen(false)
    setSuccess("Tailor assigned successfully.")
    await loadOrders()
  }

  const clearFilters = () => {
    setSearch("")
    setStatusFilter("ALL")
    setSortBy("newest")
    setDatePreset("ALL")
    setCustomFromDate("")
    setCustomToDate("")
  }

  const getStatusOptionsForOrder = (order: CustomOrder) => [order.status, ...(customTransitions[order.status] || [])]

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Custom Orders</h1>
      </div>

      <FeedbackToasts error={error} success={success} />

      <Card className="p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search custom order/customer" className="w-full sm:max-w-md" />
          <Button type="button" variant="outline" onClick={() => setIsFilterModalOpen(true)}>
            Filters
            {activeFiltersCount > 0 ? <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs text-primary-foreground">{activeFiltersCount}</span> : null}
          </Button>
          {activeFiltersCount > 0 ? <Button type="button" variant="ghost" onClick={clearFilters}>Clear Filters</Button> : null}
        </div>

        {selectedRowIds.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p>Selected: <span className="font-medium">{selectedRowIds.length}</span></p>
            <div className="flex items-center gap-2">
              <RowActionsMenu
                triggerLabel="Bulk Actions"
                items={[
                  {
                    label: bulkActionLoading === "STITCHING" ? "Updating..." : "Set Stitching",
                    onSelect: () => void runBulkStatusUpdate("STITCHING"),
                    disabled: bulkActionLoading !== null,
                  },
                  {
                    label: bulkActionLoading === "COMPLETED" ? "Updating..." : "Set Completed",
                    onSelect: () => void runBulkStatusUpdate("COMPLETED"),
                    disabled: bulkActionLoading !== null,
                  },
                  {
                    label: bulkActionLoading === "DELIVERED" ? "Updating..." : "Set Delivered",
                    onSelect: () => void runBulkStatusUpdate("DELIVERED"),
                    disabled: bulkActionLoading !== null,
                  },
                  {
                    label: bulkActionLoading === "CANCELLED" ? "Updating..." : "Set Cancelled",
                    onSelect: () => void runBulkStatusUpdate("CANCELLED"),
                    disabled: bulkActionLoading !== null,
                    destructive: true,
                    separatorBefore: true,
                  },
                ]}
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedRowIds([])} disabled={bulkActionLoading !== null}>Clear Selection</Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Total Records: <span className="font-medium text-foreground">{totalRecords}</span></div>
        )}

        {loading ? (
          <div className="rounded-md border p-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 border-b py-3 last:border-b-0">
                <Skeleton className="col-span-1 h-5 w-5 rounded-sm" />
                <Skeleton className="col-span-1 h-5 w-20" />
                <Skeleton className="col-span-2 h-5 w-28" />
                <Skeleton className="col-span-2 h-5 w-24" />
                <Skeleton className="col-span-1 h-5 w-16" />
                <Skeleton className="col-span-2 h-5 w-24" />
                <Skeleton className="col-span-1 h-5 w-20" />
                <Skeleton className="col-span-2 h-8 w-28 justify-self-end" />
              </div>
            ))}
          </div>
        ) : totalRecords === 0 ? (
          <Empty className="border-0 p-10">
            <EmptyHeader>
              <EmptyTitle>No custom orders found</EmptyTitle>
              <EmptyDescription>Try changing filters or search terms.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"><input type="checkbox" checked={allPageSelected} onChange={toggleSelectAllPageRows} aria-label="Select all rows on current page" /></TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned Tailor</TableHead>
                    <TableHead>Active Payout</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/admin/custom-orders/${order.id}`)}
                    >
                      <TableCell><input type="checkbox" onClick={(event) => event.stopPropagation()} checked={selectedRowIds.includes(order.id)} onChange={() => toggleRowSelection(order.id)} aria-label={`Select row for ${order.orderNumber}`} /></TableCell>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p>{order.customerName}</p>
                          <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{order.stitchingService}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.clothSource === "FROM_US" ? `From TailorHub${order.clothName ? ` (${order.clothName})` : ""}` : "Own Cloth"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={order.status === "CANCELLED" ? "destructive" : "secondary"}>{order.status}</Badge></TableCell>
                      <TableCell>{order.assignedTailorName || "Not assigned"}</TableCell>
                      <TableCell>{order.payoutAmount ? `Rs. ${order.payoutAmount.toFixed(2)} (${order.payoutStatus})` : "-"}</TableCell>
                      <TableCell>Rs. {order.totalAmount.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end">
                          <RowActionsMenu
                            items={[
                              ...getStatusOptionsForOrder(order).map((status) => ({
                                label: `Set ${status}`,
                                onSelect: async () => {
                                  if (status === "ASSIGNED") {
                                    await openAssignDialog(order.id)
                                    return
                                  }
                                  setError("")
                                  setSuccess("")
                                  const ok = await updateOrderStatus(order, status)
                                  if (!ok) {
                                    setError("Failed to update custom order status.")
                                    return
                                  }
                                  setSuccess("Custom order status updated.")
                                  await loadOrders()
                                },
                                disabled: status === order.status,
                              })),
                              ...(order.status === "PENDING"
                                ? [
                                    {
                                      label: "Assign Tailor",
                                      onSelect: () => void openAssignDialog(order.id),
                                      separatorBefore: true,
                                    },
                                  ]
                                : []),
                              {
                                label: "Open Chat",
                                onSelect: () => router.push(`/admin/chats?orderId=${order.id}`),
                              },
                            ]}
                          />
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
        title="Filter Custom Orders"
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
              <select className="h-10 w-full rounded-md border bg-background px-3" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "ALL" | CustomOrder["status"])}>
                <option value="ALL">All Status</option>
                <option value="PENDING">PENDING</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="STITCHING">STITCHING</option>
                <option value="QC">QC</option>
                <option value="COMPLETED">COMPLETED</option>
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

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Tailor</DialogTitle>
            <DialogDescription>
              Select a tailor for this custom order. Tailors with matching specialization are shown first.
            </DialogDescription>
          </DialogHeader>

          {loadingTailors ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="grid grid-cols-12 gap-2">
                  <Skeleton className="col-span-1 h-4 w-4 rounded-sm" />
                  <Skeleton className="col-span-3 h-4 w-24" />
                  <Skeleton className="col-span-4 h-4 w-full" />
                  <Skeleton className="col-span-2 h-4 w-16" />
                  <Skeleton className="col-span-2 h-4 w-16" />
                </div>
              ))}
            </div>
          ) : eligibleTailors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active tailor available for this service.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Tailor</TableHead>
                    <TableHead>Specializations</TableHead>
                    <TableHead>Active Orders</TableHead>
                    <TableHead>Match</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eligibleTailors.map((tailor) => (
                    <TableRow key={tailor.id}>
                      <TableCell>
                        <input type="radio" name="assign-tailor" checked={selectedTailorId === tailor.id} onChange={() => setSelectedTailorId(tailor.id)} />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{tailor.name}</p>
                          <p className="text-xs text-muted-foreground">{tailor.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{tailor.specializations || "-"}</TableCell>
                      <TableCell>{tailor.activeOrders}</TableCell>
                      <TableCell>
                        <Badge variant={tailor.specializationMatch ? "default" : "secondary"}>
                          {tailor.specializationMatch ? "Matched" : "Fallback"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button type="button" onClick={assignSelectedTailor} disabled={!selectedTailorId || loadingTailors}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

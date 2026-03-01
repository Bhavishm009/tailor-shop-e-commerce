"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DatePicker } from "@/components/ui/date-picker"
import { FeedbackToasts } from "@/components/admin/feedback-toasts"
import { ResponsiveFilterModal } from "@/components/ui/responsive-filter-modal"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
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

type ReviewRecord = {
  id: string
  customerName: string
  customerEmail: string
  tailorName: string
  tailorEmail: string
  rating: number
  comment: string
  isApproved: boolean
  createdAt: string
}

type DatePreset = "ALL" | "TODAY" | "YESTERDAY" | "THIS_WEEK" | "LAST_WEEK" | "CUSTOM"

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

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [search, setSearch] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<"ALL" | "APPROVED" | "PENDING">("ALL")
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "rating_desc" | "rating_asc">("newest")
  const [datePreset, setDatePreset] = useState<DatePreset>("ALL")
  const [customFromDate, setCustomFromDate] = useState("")
  const [customToDate, setCustomToDate] = useState("")
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [bulkActionLoading, setBulkActionLoading] = useState<string | null>(null)

  const loadReviews = async () => {
    try {
      const response = await fetch("/api/admin/reviews", { cache: "no-store" })
      if (!response.ok) {
        setReviews([])
        setError("Failed to load reviews.")
        return
      }
      const data = (await response.json()) as ReviewRecord[]
      setReviews(data)
    } catch {
      setReviews([])
      setError("Failed to load reviews.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReviews()
  }, [])

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (search.trim()) count += 1
    if (statusFilter !== "ALL") count += 1
    if (selectedCategories.length > 0) count += 1
    if (datePreset !== "ALL") count += 1
    if (datePreset === "CUSTOM" && (customFromDate || customToDate)) count += 1
    return count
  }, [search, statusFilter, selectedCategories, datePreset, customFromDate, customToDate])

  const filteredReviews = useMemo(() => {
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

    const filtered = reviews.filter((review) => {
      const queryMatch =
        q.length === 0 ||
        review.customerName.toLowerCase().includes(q) ||
        review.customerEmail.toLowerCase().includes(q) ||
        review.tailorName.toLowerCase().includes(q) ||
        review.comment.toLowerCase().includes(q)

      const status = review.isApproved ? "APPROVED" : "PENDING"
      const statusMatch = statusFilter === "ALL" || statusFilter === status

      const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(String(review.rating))

      const createdAt = new Date(review.createdAt)
      let dateMatch = true

      if (datePreset === "TODAY") {
        dateMatch = createdAt >= todayStart
      } else if (datePreset === "YESTERDAY") {
        dateMatch = createdAt >= yesterdayStart && createdAt <= yesterdayEnd
      } else if (datePreset === "THIS_WEEK") {
        dateMatch = createdAt >= thisWeekStart
      } else if (datePreset === "LAST_WEEK") {
        dateMatch = createdAt >= lastWeekStart && createdAt <= lastWeekEnd
      } else if (datePreset === "CUSTOM") {
        const from = customFromDate ? getStartOfDay(new Date(customFromDate)) : null
        const to = customToDate ? getEndOfDay(new Date(customToDate)) : null
        if (from && createdAt < from) dateMatch = false
        if (to && createdAt > to) dateMatch = false
      }

      return queryMatch && statusMatch && categoryMatch && dateMatch
    })

    return filtered.sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      if (sortBy === "rating_desc") return b.rating - a.rating
      return a.rating - b.rating
    })
  }, [reviews, search, selectedCategories, statusFilter, sortBy, datePreset, customFromDate, customToDate])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, selectedCategories, sortBy, datePreset, customFromDate, customToDate])

  useEffect(() => {
    setSelectedRowIds((prev) => prev.filter((id) => filteredReviews.some((review) => review.id === id)))
  }, [filteredReviews])

  const totalRecords = filteredReviews.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * pageSize
  const paginatedReviews = filteredReviews.slice(startIndex, startIndex + pageSize)

  const pageRowIds = paginatedReviews.map((review) => review.id)
  const allPageSelected = pageRowIds.length > 0 && pageRowIds.every((id) => selectedRowIds.includes(id))

  const toggleRowSelection = (id: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    )
  }

  const toggleSelectAllPageRows = () => {
    setSelectedRowIds((prev) => {
      if (allPageSelected) {
        return prev.filter((id) => !pageRowIds.includes(id))
      }
      return Array.from(new Set([...prev, ...pageRowIds]))
    })
  }

  const setReviewStatus = async (id: string, isApproved: boolean) => {
    const response = await fetch(`/api/admin/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isApproved }),
    })
    return response.ok
  }

  const deleteReview = async (id: string) => {
    const response = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" })
    return response.ok
  }

  const runBulk = async (action: "approve" | "pending" | "delete") => {
    if (selectedRowIds.length === 0) return

    setError("")
    setSuccess("")
    setBulkActionLoading(action)

    try {
      const ids = [...selectedRowIds]
      const results = await Promise.allSettled(
        ids.map((id) => {
          if (action === "approve") return setReviewStatus(id, true)
          if (action === "pending") return setReviewStatus(id, false)
          return deleteReview(id)
        })
      )

      const successCount = results.filter((result) => result.status === "fulfilled" && result.value).length
      const failedCount = ids.length - successCount

      if (successCount > 0) setSuccess(`${successCount} review(s) updated.`)
      if (failedCount > 0) setError(`${failedCount} review(s) failed.`)

      setSelectedRowIds([])
      await loadReviews()
    } finally {
      setBulkActionLoading(null)
    }
  }

  const clearFilters = () => {
    setSearch("")
    setSelectedCategories([])
    setStatusFilter("ALL")
    setSortBy("newest")
    setDatePreset("ALL")
    setCustomFromDate("")
    setCustomToDate("")
  }

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((value) => value !== category)
        : [...prev, category]
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Reviews Listing</h1>
      </div>

      <FeedbackToasts error={error} success={success} />

      <Card className="p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer/tailor/comment" className="w-full sm:max-w-md" />
          <Button type="button" variant="outline" onClick={() => setIsFilterModalOpen(true)}>
            Filters
            {activeFiltersCount > 0 ? (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs text-primary-foreground">{activeFiltersCount}</span>
            ) : null}
          </Button>
          {activeFiltersCount > 0 ? <Button type="button" variant="ghost" onClick={clearFilters}>Clear Filters</Button> : null}
        </div>

        {selectedRowIds.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p>Selected: <span className="font-medium">{selectedRowIds.length}</span></p>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => runBulk("approve")} disabled={bulkActionLoading !== null}>{bulkActionLoading === "approve" ? "Updating..." : "Approve Selected"}</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => runBulk("pending")} disabled={bulkActionLoading !== null}>{bulkActionLoading === "pending" ? "Updating..." : "Mark Pending"}</Button>
              <Button type="button" size="sm" variant="destructive" onClick={() => runBulk("delete")} disabled={bulkActionLoading !== null}>{bulkActionLoading === "delete" ? "Deleting..." : "Delete Selected"}</Button>
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
                <Skeleton className="col-span-2 h-5 w-24" />
                <Skeleton className="col-span-2 h-5 w-24" />
                <Skeleton className="col-span-1 h-5 w-10" />
                <Skeleton className="col-span-1 h-5 w-16" />
                <Skeleton className="col-span-3 h-5 w-full" />
                <Skeleton className="col-span-1 h-5 w-20" />
                <Skeleton className="col-span-1 h-8 w-16 justify-self-end" />
              </div>
            ))}
          </div>
        ) : totalRecords === 0 ? (
          <Empty className="border-0 p-10">
            <EmptyHeader>
              <EmptyTitle>No reviews found</EmptyTitle>
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
                    <TableHead>Customer</TableHead>
                    <TableHead>Tailor</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedReviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell><input type="checkbox" checked={selectedRowIds.includes(review.id)} onChange={() => toggleRowSelection(review.id)} aria-label={`Select row for ${review.customerName}`} /></TableCell>
                      <TableCell>
                        <div>
                          <p>{review.customerName}</p>
                          <p className="text-xs text-muted-foreground">{review.customerEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{review.tailorName}</p>
                          <p className="text-xs text-muted-foreground">{review.tailorEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>{review.rating}/5</TableCell>
                      <TableCell><Badge variant={review.isApproved ? "default" : "secondary"}>{review.isApproved ? "APPROVED" : "PENDING"}</Badge></TableCell>
                      <TableCell className="max-w-sm truncate">{review.comment || "-"}</TableCell>
                      <TableCell>{new Date(review.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={async () => {
                            setError("")
                            setSuccess("")
                            const ok = await setReviewStatus(review.id, !review.isApproved)
                            if (ok) {
                              setSuccess("Review status updated.")
                              await loadReviews()
                            } else {
                              setError("Failed to update review status.")
                            }
                          }}>
                            {review.isApproved ? "Mark Pending" : "Approve"}
                          </Button>
                          <Button type="button" variant="destructive" size="sm" onClick={async () => {
                            setError("")
                            setSuccess("")
                            const ok = await deleteReview(review.id)
                            if (ok) {
                              setSuccess("Review deleted.")
                              await loadReviews()
                            } else {
                              setError("Failed to delete review.")
                            }
                          }}>
                            Delete
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
                <select className="h-9 rounded-md border bg-background " value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}>
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
        title="Filter Reviews"
        description="Apply one or more filters to narrow listing results."
        desktopContentClassName="sm:max-w-2xl"
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
              <select className="h-10 w-full rounded-md border bg-background px-3" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "ALL" | "APPROVED" | "PENDING")}>
                <option value="ALL">All Status</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Sort</p>
              <select className="h-10 w-full rounded-md border bg-background px-3" value={sortBy} onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "rating_desc" | "rating_asc")}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="rating_desc">Rating High-Low</option>
                <option value="rating_asc">Rating Low-High</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <p className="text-sm font-medium">Ratings (Multi Select)</p>
              <div className="space-y-2 rounded-md border p-3">
                {["5", "4", "3", "2", "1"].map((category) => (
                  <label key={category} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={selectedCategories.includes(category)} onChange={() => toggleCategory(category)} />
                    <span>{category} stars</span>
                  </label>
                ))}
              </div>
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

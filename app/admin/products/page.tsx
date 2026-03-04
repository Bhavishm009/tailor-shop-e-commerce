"use client"

import Image from "next/image"
import Link from "next/link"
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
import { RowActionsMenu } from "@/components/admin/row-actions-menu"
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

type Product = {
  id: string
  name: string
  description?: string | null
  price: number
  category: string
  clothType?: string | null
  colors?: unknown
  material?: string | null
  stock: number
  isActive: boolean
  image?: string | null
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

export default function AdminProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [search, setSearch] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL")
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "price_asc" | "price_desc" | "stock_desc">("newest")
  const [datePreset, setDatePreset] = useState<DatePreset>("ALL")
  const [customFromDate, setCustomFromDate] = useState("")
  const [customToDate, setCustomToDate] = useState("")
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [bulkActionLoading, setBulkActionLoading] = useState<string | null>(null)

  const loadProducts = async () => {
    try {
      const response = await fetch("/api/products?all=1", { cache: "no-store" })
      if (!response.ok) {
        setProducts([])
        setError("Failed to load products.")
        return
      }
      const data = (await response.json()) as Product[]
      setProducts(data)
    } catch {
      setProducts([])
      setError("Failed to load products.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const categories = useMemo(() => {
    const values = Array.from(new Set(products.map((product) => product.category).filter(Boolean)))
    return values.sort((a, b) => a.localeCompare(b))
  }, [products])

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (search.trim()) count += 1
    if (statusFilter !== "ALL") count += 1
    if (selectedCategories.length > 0) count += 1
    if (datePreset !== "ALL") count += 1
    if (datePreset === "CUSTOM" && (customFromDate || customToDate)) count += 1
    return count
  }, [search, statusFilter, selectedCategories, datePreset, customFromDate, customToDate])

  const filteredProducts = useMemo(() => {
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

    const filtered = products.filter((product) => {
      const queryMatch =
        q.length === 0 ||
        product.name.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q) ||
        (product.material?.toLowerCase().includes(q) ?? false)

      const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(product.category)

      const statusMatch =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && product.isActive) ||
        (statusFilter === "INACTIVE" && !product.isActive)

      const createdAt = new Date(product.createdAt)
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

      return queryMatch && categoryMatch && statusMatch && dateMatch
    })

    return filtered.sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      if (sortBy === "price_asc") return a.price - b.price
      if (sortBy === "price_desc") return b.price - a.price
      return b.stock - a.stock
    })
  }, [products, search, selectedCategories, statusFilter, sortBy, datePreset, customFromDate, customToDate])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, selectedCategories, sortBy, datePreset, customFromDate, customToDate])

  useEffect(() => {
    setSelectedRowIds((prev) => prev.filter((id) => filteredProducts.some((product) => product.id === id)))
  }, [filteredProducts])

  const totalRecords = filteredProducts.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * pageSize
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + pageSize)

  const pageRowIds = paginatedProducts.map((product) => product.id)
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

  const onDeleteProduct = async (productId: string) => {
    setError("")
    setSuccess("")
    setDeletingId(productId)

    try {
      const response = await fetch(`/api/products/${productId}`, { method: "DELETE" })
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to delete product." }))
        setError(data.error || "Failed to delete product.")
        return
      }

      setSuccess("Product deleted successfully.")
      await loadProducts()
    } finally {
      setDeletingId(null)
    }
  }

  const onToggleStatus = async (product: Product) => {
    setError("")
    setSuccess("")

    const response = await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !product.isActive }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: "Failed to update status." }))
      setError(data.error || "Failed to update status.")
      return
    }

    setSuccess(product.isActive ? "Product set to inactive." : "Product set to active.")
    await loadProducts()
  }

  const onBulkToggleStatus = async (isActive: boolean) => {
    if (selectedRowIds.length === 0) return
    setError("")
    setSuccess("")
    setBulkActionLoading(isActive ? "activate" : "deactivate")

    try {
      const selectedIds = [...selectedRowIds]
      const results = await Promise.allSettled(
        selectedIds.map((id) =>
          fetch(`/api/products/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive }),
          })
        )
      )

      const successCount = results.filter(
        (result) => result.status === "fulfilled" && result.value.ok
      ).length
      const failedCount = selectedIds.length - successCount

      if (successCount > 0) {
        setSuccess(`${successCount} product(s) updated.`)
      }
      if (failedCount > 0) {
        setError(`${failedCount} product(s) failed to update.`)
      }

      setSelectedRowIds([])
      await loadProducts()
    } finally {
      setBulkActionLoading(null)
    }
  }

  const onBulkDelete = async () => {
    if (selectedRowIds.length === 0) return
    setError("")
    setSuccess("")
    setBulkActionLoading("delete")

    try {
      const selectedIds = [...selectedRowIds]
      const results = await Promise.allSettled(
        selectedIds.map((id) => fetch(`/api/products/${id}`, { method: "DELETE" }))
      )

      const successCount = results.filter(
        (result) => result.status === "fulfilled" && result.value.ok
      ).length
      const failedCount = selectedIds.length - successCount

      if (successCount > 0) {
        setSuccess(`${successCount} product(s) deleted.`)
      }
      if (failedCount > 0) {
        setError(`${failedCount} product(s) failed to delete.`)
      }

      setSelectedRowIds([])
      await loadProducts()
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
    <div className="p-2 md:p-8 space-y-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Product Listing</h1>
        <Button asChild>
          <Link href="/admin/products/new">Create Product</Link>
        </Button>
      </div>

      <FeedbackToasts error={error} success={success} />

      <Card className="p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name/category/material"
            className="w-full lg:max-w-2xl"
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
            <Button type="button" variant="ghost" onClick={clearFilters}>
              Clear Filters
            </Button>
          ) : null}
        </div>

        {selectedRowIds.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p>Selected: <span className="font-medium">{selectedRowIds.length}</span></p>
            <div className="flex items-center gap-2">
              <RowActionsMenu
                triggerLabel="Bulk Actions"
                items={[
                  {
                    label: bulkActionLoading === "activate" ? "Updating..." : "Set Active",
                    onSelect: () => void onBulkToggleStatus(true),
                    disabled: bulkActionLoading !== null,
                  },
                  {
                    label: bulkActionLoading === "deactivate" ? "Updating..." : "Set Inactive",
                    onSelect: () => void onBulkToggleStatus(false),
                    disabled: bulkActionLoading !== null,
                  },
                  {
                    label: bulkActionLoading === "delete" ? "Deleting..." : "Delete Selected",
                    onSelect: () => void onBulkDelete(),
                    disabled: bulkActionLoading !== null,
                    destructive: true,
                    separatorBefore: true,
                  },
                ]}
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedRowIds([])} disabled={bulkActionLoading !== null}>
                Clear Selection
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Total Records: <span className="font-medium text-foreground">{totalRecords}</span>
          </div>
        )}

        {loading ? (
          <div className="rounded-md border p-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 border-b py-3 last:border-b-0">
                <Skeleton className="col-span-1 h-5 w-5 rounded-sm" />
                <Skeleton className="col-span-3 h-12 w-full" />
                <Skeleton className="col-span-2 h-5 w-24" />
                <Skeleton className="col-span-1 h-5 w-16" />
                <Skeleton className="col-span-1 h-5 w-10" />
                <Skeleton className="col-span-1 h-5 w-16" />
                <Skeleton className="col-span-1 h-5 w-20" />
                <Skeleton className="col-span-2 h-8 w-24 justify-self-end" />
              </div>
            ))}
          </div>
        ) : totalRecords === 0 ? (
          <Empty className="border-0 p-10">
            <EmptyHeader>
              <EmptyTitle>No products found</EmptyTitle>
              <EmptyDescription>Try changing filters or search terms.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={toggleSelectAllPageRows}
                        aria-label="Select all rows on current page"
                      />
                    </TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProducts.map((product) => (
                    <TableRow
                      key={product.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedRowIds.includes(product.id)}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => toggleRowSelection(product.id)}
                          aria-label={`Select row for ${product.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {product.image ? (
                            <div className="relative aspect-video w-24 overflow-hidden rounded border bg-muted/30">
                              <Image src={product.image} alt={product.name} fill className="object-contain" />
                            </div>
                          ) : null}
                          <div className="space-y-1">
                            <p className="font-medium">{product.name}</p>
                            <p className="max-w-xl truncate text-xs text-muted-foreground">
                              {product.clothType || product.material || "Material not set"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>Rs. {Number(product.price).toFixed(2)}</TableCell>
                      <TableCell>{product.stock}</TableCell>
                      <TableCell>
                        <Badge variant={product.isActive ? "default" : "secondary"}>{product.isActive ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell>{new Date(product.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end">
                          <RowActionsMenu
                            items={[
                              {
                                label: "Edit",
                                onSelect: () => {
                                  router.push(`/admin/products/${product.id}/edit`)
                                },
                              },
                              {
                                label: product.isActive ? "Set Inactive" : "Set Active",
                                onSelect: () => void onToggleStatus(product),
                              },
                              {
                                label: deletingId === product.id ? "Deleting..." : "Delete",
                                onSelect: () => void onDeleteProduct(product.id),
                                disabled: deletingId === product.id,
                                destructive: true,
                                separatorBefore: true,
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
                <select
                  className="h-9 rounded-md border bg-background"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Page {safeCurrentPage} of {totalPages}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={safeCurrentPage <= 1}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={safeCurrentPage >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <ResponsiveFilterModal
        open={isFilterModalOpen}
        onOpenChange={setIsFilterModalOpen}
        title="Filter Products"
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
              <select className="h-10 w-full rounded-md border bg-background px-3" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")}>
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Sort</p>
              <select className="h-10 w-full rounded-md border bg-background px-3" value={sortBy} onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "price_asc" | "price_desc" | "stock_desc")}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="price_asc">Price Low-High</option>
                <option value="price_desc">Price High-Low</option>
                <option value="stock_desc">Stock High-Low</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <p className="text-sm font-medium">Categories (Multi Select)</p>
              <div className="max-h-44 space-y-2 overflow-y-auto rounded-md border p-3">
                {categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No categories available.</p>
                ) : (
                  categories.map((category) => (
                    <label key={category} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category)}
                        onChange={() => toggleCategory(category)}
                      />
                      <span>{category}</span>
                    </label>
                  ))
                )}
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

"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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

type TailorRecord = {
  id: string
  name: string
  email: string
  specializations: string
  yearsExperience: number
  averageRating: number
  totalOrders: number
  isActive: boolean
  createdAt: string
}

type ServiceOption = {
  id: string
  key: string
  name: string
  category: string
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

export default function TailorsPage() {
  const [tailors, setTailors] = useState<TailorRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [search, setSearch] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL")
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name_asc" | "rating_desc">("newest")
  const [datePreset, setDatePreset] = useState<DatePreset>("ALL")
  const [customFromDate, setCustomFromDate] = useState("")
  const [customToDate, setCustomToDate] = useState("")
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [bulkActionLoading, setBulkActionLoading] = useState<string | null>(null)
  const [services, setServices] = useState<ServiceOption[]>([])
  const [specDialogOpen, setSpecDialogOpen] = useState(false)
  const [activeTailor, setActiveTailor] = useState<TailorRecord | null>(null)
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([])
  const [savingSpecs, setSavingSpecs] = useState(false)

  const loadTailors = async () => {
    try {
      const response = await fetch("/api/admin/tailors", { cache: "no-store" })
      if (!response.ok) {
        setTailors([])
        setError("Failed to load tailors.")
        return
      }
      const data = (await response.json()) as TailorRecord[]
      setTailors(data)
    } catch {
      setTailors([])
      setError("Failed to load tailors.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTailors()
  }, [])

  useEffect(() => {
    const loadServices = async () => {
      const response = await fetch("/api/stitching-services", { cache: "no-store" })
      if (!response.ok) return
      const data = (await response.json()) as ServiceOption[]
      setServices(data)
    }
    loadServices()
  }, [])

  const specializations = useMemo(() => {
    const all = tailors
      .flatMap((tailor) => tailor.specializations.split(",").map((item) => item.trim()).filter(Boolean))
    const values = Array.from(new Set(all))
    return values.sort((a, b) => a.localeCompare(b))
  }, [tailors])

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (search.trim()) count += 1
    if (statusFilter !== "ALL") count += 1
    if (selectedCategories.length > 0) count += 1
    if (datePreset !== "ALL") count += 1
    if (datePreset === "CUSTOM" && (customFromDate || customToDate)) count += 1
    return count
  }, [search, statusFilter, selectedCategories, datePreset, customFromDate, customToDate])

  const filteredTailors = useMemo(() => {
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

    const filtered = tailors.filter((tailor) => {
      const queryMatch =
        q.length === 0 ||
        tailor.name.toLowerCase().includes(q) ||
        tailor.email.toLowerCase().includes(q) ||
        tailor.specializations.toLowerCase().includes(q)

      const statusMatch =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && tailor.isActive) ||
        (statusFilter === "INACTIVE" && !tailor.isActive)

      const categoryMatch =
        selectedCategories.length === 0 ||
        selectedCategories.some((category) => tailor.specializations.includes(category))

      const createdAt = new Date(tailor.createdAt)
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
      if (sortBy === "name_asc") return a.name.localeCompare(b.name)
      return b.averageRating - a.averageRating
    })
  }, [tailors, search, selectedCategories, statusFilter, sortBy, datePreset, customFromDate, customToDate])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, selectedCategories, sortBy, datePreset, customFromDate, customToDate])

  useEffect(() => {
    setSelectedRowIds((prev) => prev.filter((id) => filteredTailors.some((tailor) => tailor.id === id)))
  }, [filteredTailors])

  const totalRecords = filteredTailors.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * pageSize
  const paginatedTailors = filteredTailors.slice(startIndex, startIndex + pageSize)

  const pageRowIds = paginatedTailors.map((tailor) => tailor.id)
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

  const setTailorActive = async (tailorId: string, isActive: boolean) => {
    const response = await fetch(`/api/admin/tailors/${tailorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    })
    return response.ok
  }

  const deleteTailor = async (tailorId: string) => {
    const response = await fetch(`/api/admin/tailors/${tailorId}`, { method: "DELETE" })
    return response.ok
  }

  const runBulk = async (action: "activate" | "deactivate" | "delete") => {
    if (selectedRowIds.length === 0) return

    setError("")
    setSuccess("")
    setBulkActionLoading(action)

    try {
      const ids = [...selectedRowIds]
      const results = await Promise.allSettled(
        ids.map((id) => {
          if (action === "activate") return setTailorActive(id, true)
          if (action === "deactivate") return setTailorActive(id, false)
          return deleteTailor(id)
        })
      )

      const successCount = results.filter((result) => result.status === "fulfilled" && result.value).length
      const failedCount = ids.length - successCount

      if (successCount > 0) setSuccess(`${successCount} tailor(s) updated.`)
      if (failedCount > 0) setError(`${failedCount} tailor(s) failed.`)

      setSelectedRowIds([])
      await loadTailors()
    } finally {
      setBulkActionLoading(null)
    }
  }

  const runSingle = async (tailorId: string, action: "activate" | "deactivate" | "delete") => {
    setError("")
    setSuccess("")
    const ok =
      action === "activate"
        ? await setTailorActive(tailorId, true)
        : action === "deactivate"
          ? await setTailorActive(tailorId, false)
          : await deleteTailor(tailorId)

    if (!ok) {
      setError("Failed to update tailor.")
      return
    }

    setSuccess("Tailor updated.")
    await loadTailors()
  }

  const openSpecsDialog = (tailor: TailorRecord) => {
    setActiveTailor(tailor)
    setSelectedSpecs(
      (tailor.specializations || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    )
    setSpecDialogOpen(true)
  }

  const toggleSpec = (key: string) => {
    setSelectedSpecs((prev) =>
      prev.includes(key) ? prev.filter((value) => value !== key) : [...prev, key],
    )
  }

  const saveSpecs = async () => {
    if (!activeTailor) return
    setSavingSpecs(true)
    setError("")
    setSuccess("")
    try {
      const response = await fetch(`/api/admin/tailors/${activeTailor.id}/specializations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specializations: selectedSpecs }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to update specializations." }))
        setError(data.error || "Failed to update specializations.")
        return
      }
      setSuccess("Specializations updated.")
      setSpecDialogOpen(false)
      await loadTailors()
    } finally {
      setSavingSpecs(false)
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
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Tailors Listing</h1>
      </div>

      {error ? <Card className="p-4 text-sm text-red-600 border-red-300">{error}</Card> : null}
      {success ? <Card className="p-4 text-sm text-green-700 border-green-300">{success}</Card> : null}

      <Card className="p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tailor/email/specializations"
            className="max-w-md"
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
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => runBulk("activate")} disabled={bulkActionLoading !== null}>
                {bulkActionLoading === "activate" ? "Updating..." : "Set Active"}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => runBulk("deactivate")} disabled={bulkActionLoading !== null}>
                {bulkActionLoading === "deactivate" ? "Updating..." : "Set Inactive"}
              </Button>
              <Button type="button" size="sm" variant="destructive" onClick={() => runBulk("delete")} disabled={bulkActionLoading !== null}>
                {bulkActionLoading === "delete" ? "Deleting..." : "Delete Selected"}
              </Button>
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
          <p className="text-muted-foreground">Loading tailors...</p>
        ) : totalRecords === 0 ? (
          <p className="text-muted-foreground">No tailors found.</p>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAllPageRows} aria-label="Select all rows on current page" />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Specializations</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTailors.map((tailor) => (
                    <TableRow key={tailor.id}>
                      <TableCell>
                        <input type="checkbox" checked={selectedRowIds.includes(tailor.id)} onChange={() => toggleRowSelection(tailor.id)} aria-label={`Select row for ${tailor.name}`} />
                      </TableCell>
                      <TableCell className="font-medium">{tailor.name}</TableCell>
                      <TableCell>{tailor.email}</TableCell>
                      <TableCell>{tailor.specializations || "-"}</TableCell>
                      <TableCell>{tailor.yearsExperience} yrs</TableCell>
                      <TableCell>{tailor.averageRating.toFixed(1)}</TableCell>
                      <TableCell>
                        <Badge variant={tailor.isActive ? "default" : "secondary"}>{tailor.isActive ? "active" : "inactive"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => openSpecsDialog(tailor)}>
                            Manage Specs
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => runSingle(tailor.id, tailor.isActive ? "deactivate" : "activate")}>
                            {tailor.isActive ? "Set Inactive" : "Set Active"}
                          </Button>
                          <Button type="button" variant="destructive" size="sm" onClick={() => runSingle(tailor.id, "delete")}>
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
                <select className="h-9 rounded-md border bg-background px-2" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}>
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

      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Filter Tailors</DialogTitle>
            <DialogDescription>Apply one or more filters to narrow listing results.</DialogDescription>
          </DialogHeader>

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
              <select className="h-10 w-full rounded-md border bg-background px-3" value={sortBy} onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "name_asc" | "rating_desc")}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="name_asc">Name A-Z</option>
                <option value="rating_desc">Rating High-Low</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <p className="text-sm font-medium">Specializations (Multi Select)</p>
              <div className="max-h-44 space-y-2 overflow-y-auto rounded-md border p-3">
                {specializations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No specializations available.</p>
                ) : (
                  specializations.map((category) => (
                    <label key={category} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={selectedCategories.includes(category)} onChange={() => toggleCategory(category)} />
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
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" value={customFromDate} onChange={(e) => setCustomFromDate(e.target.value)} />
                  <Input type="date" value={customToDate} onChange={(e) => setCustomToDate(e.target.value)} />
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={clearFilters}>Clear</Button>
            <Button type="button" onClick={() => setIsFilterModalOpen(false)}>Apply Filters</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={specDialogOpen} onOpenChange={setSpecDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Manage Tailor Specializations</DialogTitle>
            <DialogDescription>
              {activeTailor ? `Assign or remove stitching methods for ${activeTailor.name}.` : "Assign specializations."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto rounded-md border p-3">
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stitching services configured.</p>
            ) : (
              services.map((service) => (
                <label key={service.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={selectedSpecs.includes(service.key)} onChange={() => toggleSpec(service.key)} />
                  <span>{service.name}</span>
                  <span className="text-xs text-muted-foreground">({service.category})</span>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSpecDialogOpen(false)}>Cancel</Button>
            <Button type="button" onClick={saveSpecs} disabled={savingSpecs}>{savingSpecs ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DatePicker } from "@/components/ui/date-picker"
import { ResponsiveFilterModal } from "@/components/ui/responsive-filter-modal"
import { Spinner } from "@/components/ui/spinner"
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
import { validateEmail, validateIndianMobile } from "@/lib/validation"
import { toast } from "sonner"

type UserRecord = {
  id: string
  name: string
  email: string
  phone?: string | null
  dateOfBirth?: string | null
  role: "ADMIN" | "TAILOR" | "CUSTOMER"
  status: "active" | "inactive"
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

export default function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [search, setSearch] = useState("")
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL")
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name_asc" | "name_desc">("newest")
  const [datePreset, setDatePreset] = useState<DatePreset>("ALL")
  const [customFromDate, setCustomFromDate] = useState("")
  const [customToDate, setCustomToDate] = useState("")
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [bulkActionLoading, setBulkActionLoading] = useState<string | null>(null)
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    role: "CUSTOMER" as "ADMIN" | "TAILOR" | "CUSTOMER",
    dateOfBirth: "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  })

  const isNewUserNameValid = newUser.name.trim().length >= 2
  const isNewUserEmailValid = validateEmail(newUser.email)
  const isNewUserPhoneValid = validateIndianMobile(newUser.phone)
  const isNewUserDobValid = Boolean(newUser.dateOfBirth)
  const isNewUserStreetValid = newUser.street.trim().length > 0
  const isNewUserCityValid = newUser.city.trim().length > 0
  const isNewUserStateValid = newUser.state.trim().length > 0
  const isNewUserCountryValid = newUser.country.trim().length > 0
  const isNewUserPostalValid = /^\d{6}$/.test(newUser.postalCode)
  const canCreateUser =
    isNewUserNameValid &&
    isNewUserEmailValid &&
    isNewUserPhoneValid &&
    isNewUserDobValid &&
    isNewUserStreetValid &&
    isNewUserCityValid &&
    isNewUserStateValid &&
    isNewUserCountryValid &&
    isNewUserPostalValid &&
    !creatingUser

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" })
      if (!response.ok) {
        setUsers([])
        setError("Failed to load users.")
        return
      }
      const data = (await response.json()) as UserRecord[]
      setUsers(data)
    } catch {
      setUsers([])
      setError("Failed to load users.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  useEffect(() => {
    if (success) toast.success(success)
  }, [success])

  const roleOptions = useMemo(() => {
    const values = Array.from(new Set(users.map((user) => user.role)))
    return values.sort((a, b) => a.localeCompare(b))
  }, [users])

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (search.trim()) count += 1
    if (statusFilter !== "ALL") count += 1
    if (selectedRoles.length > 0) count += 1
    if (datePreset !== "ALL") count += 1
    if (datePreset === "CUSTOM" && (customFromDate || customToDate)) count += 1
    return count
  }, [search, statusFilter, selectedRoles, datePreset, customFromDate, customToDate])

  const filteredUsers = useMemo(() => {
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

    const filtered = users.filter((user) => {
      const queryMatch =
        q.length === 0 ||
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.role.toLowerCase().includes(q)

      const statusMatch =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && user.status === "active") ||
        (statusFilter === "INACTIVE" && user.status === "inactive")

      const roleMatch = selectedRoles.length === 0 || selectedRoles.includes(user.role)

      const createdAt = new Date(user.createdAt)
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

      return queryMatch && statusMatch && roleMatch && dateMatch
    })

    return filtered.sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      if (sortBy === "name_asc") return a.name.localeCompare(b.name)
      return b.name.localeCompare(a.name)
    })
  }, [users, search, selectedRoles, statusFilter, sortBy, datePreset, customFromDate, customToDate])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, selectedRoles, sortBy, datePreset, customFromDate, customToDate])

  useEffect(() => {
    setSelectedRowIds((prev) => prev.filter((id) => filteredUsers.some((user) => user.id === id)))
  }, [filteredUsers])

  const totalRecords = filteredUsers.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * pageSize
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + pageSize)

  const pageRowIds = paginatedUsers.map((user) => user.id)
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

  const updateUserRole = async (userId: string, role: "TAILOR" | "CUSTOMER") => {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    })
    return response.ok
  }

  const deleteUser = async (userId: string) => {
    const response = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" })
    return response.ok
  }

  const runBulk = async (action: "to-tailor" | "to-customer" | "delete") => {
    if (selectedRowIds.length === 0) return

    setError("")
    setSuccess("")
    setBulkActionLoading(action)

    try {
      const ids = [...selectedRowIds]
      const results = await Promise.allSettled(
        ids.map((id) => {
          if (action === "to-tailor") return updateUserRole(id, "TAILOR")
          if (action === "to-customer") return updateUserRole(id, "CUSTOMER")
          return deleteUser(id)
        })
      )

      const successCount = results.filter((result) => result.status === "fulfilled" && result.value).length
      const failedCount = ids.length - successCount

      if (successCount > 0) setSuccess(`${successCount} user(s) updated.`)
      if (failedCount > 0) setError(`${failedCount} user(s) failed.`)

      setSelectedRowIds([])
      await loadUsers()
    } finally {
      setBulkActionLoading(null)
    }
  }

  const runSingle = async (userId: string, action: "to-tailor" | "to-customer" | "delete") => {
    setError("")
    setSuccess("")
    const ok =
      action === "to-tailor"
        ? await updateUserRole(userId, "TAILOR")
        : action === "to-customer"
          ? await updateUserRole(userId, "CUSTOMER")
          : await deleteUser(userId)

    if (!ok) {
      setError("Failed to update user.")
      return
    }

    setSuccess("User updated.")
    await loadUsers()
  }

  const clearFilters = () => {
    setSearch("")
    setSelectedRoles([])
    setStatusFilter("ALL")
    setSortBy("newest")
    setDatePreset("ALL")
    setCustomFromDate("")
    setCustomToDate("")
  }

  const createUser = async () => {
    setError("")
    setSuccess("")
    setCreatingUser(true)

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          dateOfBirth: newUser.dateOfBirth,
          address: {
            street: newUser.street,
            city: newUser.city,
            state: newUser.state,
            postalCode: newUser.postalCode,
            country: newUser.country,
          },
        }),
      })

      const data = (await response.json()) as { error?: string }

      if (!response.ok) {
        setError(data.error || "Failed to create customer.")
        return
      }

      setSuccess("User added successfully.")
      setNewUser({
        name: "",
        email: "",
        phone: "",
        role: "CUSTOMER",
        dateOfBirth: "",
        street: "",
        city: "",
        state: "",
        postalCode: "",
        country: "India",
      })
      setIsAddCustomerOpen(false)
      await loadUsers()
    } finally {
      setCreatingUser(false)
    }
  }

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role)
        ? prev.filter((value) => value !== role)
        : [...prev, role]
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Users Listing</h1>
        <Button type="button" onClick={() => setIsAddCustomerOpen(true)}>
          Add User
        </Button>
      </div>

      <Card className="p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name/email/role"
            className="w-full sm:max-w-md"
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
              <Button type="button" size="sm" variant="outline" onClick={() => runBulk("to-tailor")} disabled={bulkActionLoading !== null}>
                {bulkActionLoading === "to-tailor" ? "Updating..." : "Set Tailor"}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => runBulk("to-customer")} disabled={bulkActionLoading !== null}>
                {bulkActionLoading === "to-customer" ? "Updating..." : "Set Customer"}
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
          <p className="text-muted-foreground">Loading users...</p>
        ) : totalRecords === 0 ? (
          <Empty className="border-0 p-10">
            <EmptyHeader>
              <EmptyTitle>No users found</EmptyTitle>
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
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>DOB</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedRowIds.includes(user.id)}
                          onChange={() => toggleRowSelection(user.id)}
                          aria-label={`Select row for ${user.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone || "-"}</TableCell>
                      <TableCell>{user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === "active" ? "default" : "secondary"}>{user.status}</Badge>
                      </TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => runSingle(user.id, user.role === "TAILOR" ? "to-customer" : "to-tailor")}
                          >
                            {user.role === "TAILOR" ? "Set Customer" : "Set Tailor"}
                          </Button>
                          <Button type="button" variant="destructive" size="sm" onClick={() => runSingle(user.id, "delete")}>
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
                <Button type="button" variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={safeCurrentPage <= 1}>
                  Previous
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={safeCurrentPage >= totalPages}>
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
        title="Filter Users"
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
              <select className="h-10 w-full rounded-md border bg-background px-3" value={sortBy} onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "name_asc" | "name_desc")}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="name_asc">Name A-Z</option>
                <option value="name_desc">Name Z-A</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <p className="text-sm font-medium">Roles (Multi Select)</p>
              <div className="max-h-44 space-y-2 overflow-y-auto rounded-md border p-3">
                {roleOptions.map((role) => (
                  <label key={role} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={selectedRoles.includes(role)} onChange={() => toggleRole(role)} />
                    <span>{role}</span>
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

      <Dialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>Create a customer, tailor, or admin account directly from the admin panel.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3">
            <Input
              placeholder="Full name"
              value={newUser.name}
              onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))}
            />
            {!isNewUserNameValid && newUser.name ? <p className="text-xs text-red-600">Name is too short</p> : null}
            <Input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
            />
            {!isNewUserEmailValid && newUser.email ? <p className="text-xs text-red-600">Invalid email</p> : null}
            <Input
              type="tel"
              placeholder="Indian mobile (e.g. 9876543210)"
              value={newUser.phone}
              onChange={(e) => setNewUser((prev) => ({ ...prev, phone: e.target.value }))}
            />
            {!isNewUserPhoneValid && newUser.phone ? (
              <p className="text-xs text-red-600">Enter valid Indian mobile (starts with 6-9)</p>
            ) : null}
            <select
              className="h-10 rounded-md border bg-background px-3"
              value={newUser.role}
              onChange={(e) =>
                setNewUser((prev) => ({ ...prev, role: e.target.value as "ADMIN" | "TAILOR" | "CUSTOMER" }))
              }
            >
              <option value="CUSTOMER">Customer</option>
              <option value="TAILOR">Tailor</option>
              <option value="ADMIN">Admin</option>
            </select>
            <DatePicker
              value={newUser.dateOfBirth}
              onChange={(value) => setNewUser((prev) => ({ ...prev, dateOfBirth: value }))}
              placeholder="Date of birth"
            />
            {!isNewUserDobValid ? <p className="text-xs text-red-600">Date of birth is required</p> : null}
            <Input placeholder="Street" value={newUser.street} onChange={(e) => setNewUser((prev) => ({ ...prev, street: e.target.value }))} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input placeholder="City" value={newUser.city} onChange={(e) => setNewUser((prev) => ({ ...prev, city: e.target.value }))} />
              <Input placeholder="State" value={newUser.state} onChange={(e) => setNewUser((prev) => ({ ...prev, state: e.target.value }))} />
              <Input placeholder="PIN code" value={newUser.postalCode} onChange={(e) => setNewUser((prev) => ({ ...prev, postalCode: e.target.value }))} />
              <Input placeholder="Country" value={newUser.country} onChange={(e) => setNewUser((prev) => ({ ...prev, country: e.target.value }))} />
            </div>
            {!isNewUserStreetValid ? <p className="text-xs text-red-600">Street is required</p> : null}
            {!isNewUserCityValid ? <p className="text-xs text-red-600">City is required</p> : null}
            {!isNewUserStateValid ? <p className="text-xs text-red-600">State is required</p> : null}
            {!isNewUserPostalValid ? <p className="text-xs text-red-600">PIN code must be 6 digits</p> : null}
            {!isNewUserCountryValid ? <p className="text-xs text-red-600">Country is required</p> : null}
          </div>

          <DialogFooter className="justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-w-32"
              onClick={() => setIsAddCustomerOpen(false)}
              disabled={creatingUser}
            >
              Cancel
            </Button>
            <Button type="button" size="lg" className="min-w-40" onClick={createUser} disabled={!canCreateUser}>
              {creatingUser ? <><Spinner className="mr-2" />Creating...</> : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DatePicker } from "@/components/ui/date-picker"
import { ResponsiveFilterModal } from "@/components/ui/responsive-filter-modal"
import { Spinner } from "@/components/ui/spinner"
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { MeasurementGuidePanel } from "@/components/measurement-guide-panel"
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
type MeasurementField = {
  key: string
  label: string
  unit?: string
  image?: string | null
}

type StitchingServiceOption = {
  id: string
  key: string
  name: string
  category: string
  customerPrice: number
  tailorRate: number
  measurementType?: string
  measurementFields?: MeasurementField[]
  measurementGuideImage?: string | null
}

const EMPTY_MEASUREMENT_VALUES: Record<string, string> = {}

const createInitialMeasurementForm = () => ({
  serviceKey: "",
  name: "",
  notes: "",
  values: { ...EMPTY_MEASUREMENT_VALUES },
})

const createInitialUserForm = () => ({
  name: "",
  email: "",
  phone: "",
  role: "CUSTOMER" as "ADMIN" | "TAILOR" | "CUSTOMER",
  dateOfBirth: "",
  addAddress: false,
  street: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  autoLocating: false,
  measurementEnabled: false,
  measurementServiceKey: "",
  measurementName: "",
  measurementNotes: "",
  measurementValues: { ...EMPTY_MEASUREMENT_VALUES },
})

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
  const router = useRouter()
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
  const [isAddMeasurementOpen, setIsAddMeasurementOpen] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)
  const [creatingMeasurement, setCreatingMeasurement] = useState(false)
  const [loadingServices, setLoadingServices] = useState(false)
  const [serviceOptions, setServiceOptions] = useState<StitchingServiceOption[]>([])
  const [newUserFormSubmitted, setNewUserFormSubmitted] = useState(false)
  const [measurementTargetUser, setMeasurementTargetUser] = useState<{ id: string; name: string } | null>(null)
  const [measurementForm, setMeasurementForm] = useState(createInitialMeasurementForm)
  const [newUser, setNewUser] = useState(createInitialUserForm)

  const isNewUserNameValid = newUser.name.trim().length >= 2
  const isNewUserEmailValid = validateEmail(newUser.email)
  const isNewUserPhoneValid = validateIndianMobile(newUser.phone)
  const isNewUserDobValid = Boolean(newUser.dateOfBirth)
  const isNewUserStreetValid = !newUser.addAddress || newUser.street.trim().length > 0
  const isNewUserCityValid = !newUser.addAddress || newUser.city.trim().length > 0
  const isNewUserStateValid = !newUser.addAddress || newUser.state.trim().length > 0
  const isNewUserCountryValid = !newUser.addAddress || newUser.country.trim().length > 0
  const isNewUserPostalValid = !newUser.addAddress || /^\d{6}$/.test(newUser.postalCode)
  const selectedNewUserService = serviceOptions.find((service) => service.key === newUser.measurementServiceKey)
  const selectedNewUserMeasurementFields = selectedNewUserService?.measurementFields || []
  const selectedMeasurementService = serviceOptions.find((service) => service.key === measurementForm.serviceKey)
  const selectedMeasurementFields = selectedMeasurementService?.measurementFields || []
  const isOptionalMeasurementValid =
    !newUser.measurementEnabled ||
    (newUser.measurementName.trim().length > 0 && (!serviceOptions.length || Boolean(newUser.measurementServiceKey)))
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
    isOptionalMeasurementValid &&
    !creatingUser
  const canCreateMeasurement =
    measurementForm.name.trim().length > 0 &&
    (!serviceOptions.length || Boolean(measurementForm.serviceKey)) &&
    !creatingMeasurement

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
    const loadStitchingServices = async () => {
      setLoadingServices(true)
      try {
        const response = await fetch("/api/stitching-services", { cache: "no-store" })
        if (!response.ok) return
        const data = (await response.json()) as StitchingServiceOption[]
        setServiceOptions(data)
      } catch {
        setServiceOptions([])
      } finally {
        setLoadingServices(false)
      }
    }
    void loadStitchingServices()
  }, [])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  useEffect(() => {
    if (success) toast.success(success)
  }, [success])

  const updateAddressFromPostalCode = async (postalCode: string) => {
    if (!/^\d{6}$/.test(postalCode)) return
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${postalCode}`)
      if (!response.ok) return
      const payload = (await response.json()) as Array<{
        Status?: string
        PostOffice?: Array<{ District?: string; State?: string; Country?: string }>
      }>
      const first = payload[0]
      const office = first?.PostOffice?.[0]
      if (first?.Status !== "Success" || !office) return
      setNewUser((prev) => ({
        ...prev,
        city: prev.city.trim() ? prev.city : office.District || prev.city,
        state: prev.state.trim() ? prev.state : office.State || prev.state,
        country: prev.country.trim() ? prev.country : office.Country || prev.country || "India",
      }))
    } catch {
      // best-effort autofill; silently ignore failures
    }
  }

  const autofillAddressFromLocation = async () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.")
      return
    }
    setNewUser((prev) => ({ ...prev, addAddress: true, autoLocating: true }))
    setError("")
    const getCurrentPosition = () =>
      new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      })

    try {
      const position = await getCurrentPosition()
      const { latitude, longitude } = position.coords
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`,
      )
      if (!response.ok) throw new Error("Failed to resolve address from location.")
      const data = (await response.json()) as {
        address?: {
          road?: string
          suburb?: string
          city?: string
          town?: string
          village?: string
          state?: string
          postcode?: string
          country?: string
        }
      }
      const locationAddress = data.address || {}
      const normalizedPostCode = (locationAddress.postcode || "").replace(/\D/g, "").slice(0, 6)
      setNewUser((prev) => ({
        ...prev,
        street: prev.street || [locationAddress.road, locationAddress.suburb].filter(Boolean).join(", "),
        city: prev.city || locationAddress.city || locationAddress.town || locationAddress.village || "",
        state: prev.state || locationAddress.state || "",
        postalCode: prev.postalCode || normalizedPostCode,
        country: prev.country || locationAddress.country || "India",
      }))
    } catch {
      setError("Unable to auto-detect address. Please enter address manually.")
    } finally {
      setNewUser((prev) => ({ ...prev, autoLocating: false }))
    }
  }

  const setNewUserMeasurementValue = (fieldKey: string, value: string) => {
    setNewUser((prev) => ({
      ...prev,
      measurementValues: {
        ...prev.measurementValues,
        [fieldKey]: value,
      },
    }))
  }

  const setMeasurementValue = (fieldKey: string, value: string) => {
    setMeasurementForm((prev) => ({
      ...prev,
      values: {
        ...prev.values,
        [fieldKey]: value,
      },
    }))
  }

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
    setNewUserFormSubmitted(true)
    setError("")
    setSuccess("")
    if (!canCreateUser) {
      setError("Please correct the highlighted fields before creating the user.")
      return
    }

    setCreatingUser(true)

    try {
      const measurementData = Object.entries(newUser.measurementValues).reduce<Record<string, number | string | null>>(
        (acc, [key, rawValue]) => {
          if (!rawValue?.trim()) return acc
          const numeric = Number(rawValue)
          acc[key] = Number.isFinite(numeric) ? numeric : rawValue
          return acc
        },
        {},
      )

      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          dateOfBirth: newUser.dateOfBirth,
          address: newUser.addAddress
            ? {
                street: newUser.street,
                city: newUser.city,
                state: newUser.state,
                postalCode: newUser.postalCode,
                country: newUser.country,
              }
            : undefined,
          measurement:
            newUser.role === "CUSTOMER" && newUser.measurementEnabled && newUser.measurementName.trim()
              ? {
                  name: newUser.measurementName,
                  notes: newUser.measurementNotes,
                  serviceKey: newUser.measurementServiceKey || undefined,
                  measurementType: selectedNewUserService?.measurementType || undefined,
                  measurementData,
                }
              : undefined,
        }),
      })

      const data = (await response.json()) as { error?: string }

      if (!response.ok) {
        setError(data.error || "Failed to create customer.")
        return
      }

      setSuccess("User added successfully.")
      setNewUser(createInitialUserForm())
      setNewUserFormSubmitted(false)
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

  const openAddMeasurement = (user: UserRecord) => {
    setMeasurementTargetUser({ id: user.id, name: user.name })
    setMeasurementForm(createInitialMeasurementForm())
    setIsAddMeasurementOpen(true)
  }

  const addMeasurementForUser = async () => {
    if (!measurementTargetUser) return
    setError("")
    setSuccess("")
    setCreatingMeasurement(true)
    try {
      const measurementData = Object.entries(measurementForm.values).reduce<Record<string, number | string | null>>(
        (acc, [key, rawValue]) => {
          if (!rawValue?.trim()) return acc
          const numeric = Number(rawValue)
          acc[key] = Number.isFinite(numeric) ? numeric : rawValue
          return acc
        },
        {},
      )
      const response = await fetch(`/api/admin/users/${measurementTargetUser.id}/measurements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...measurementForm,
          measurementType: selectedMeasurementService?.measurementType || undefined,
          measurementData,
        }),
      })
      const data = (await response.json().catch(() => ({ error: "Failed to add measurement." }))) as { error?: string }
      if (!response.ok) {
        setError(data.error || "Failed to add measurement.")
        return
      }
      setSuccess("Verified measurement added successfully.")
      setIsAddMeasurementOpen(false)
    } finally {
      setCreatingMeasurement(false)
    }
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
                    label: bulkActionLoading === "to-tailor" ? "Updating..." : "Set Tailor",
                    onSelect: () => void runBulk("to-tailor"),
                    disabled: bulkActionLoading !== null,
                  },
                  {
                    label: bulkActionLoading === "to-customer" ? "Updating..." : "Set Customer",
                    onSelect: () => void runBulk("to-customer"),
                    disabled: bulkActionLoading !== null,
                  },
                  {
                    label: bulkActionLoading === "delete" ? "Deleting..." : "Delete Selected",
                    onSelect: () => void runBulk("delete"),
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
                <Skeleton className="col-span-2 h-5 w-24" />
                <Skeleton className="col-span-2 h-5 w-28" />
                <Skeleton className="col-span-1 h-5 w-16" />
                <Skeleton className="col-span-1 h-5 w-16" />
                <Skeleton className="col-span-1 h-5 w-16" />
                <Skeleton className="col-span-1 h-5 w-16" />
                <Skeleton className="col-span-1 h-5 w-20" />
                <Skeleton className="col-span-2 h-8 w-24 justify-self-end" />
              </div>
            ))}
          </div>
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
                    <TableRow key={user.id} className="cursor-pointer" onClick={() => router.push(`/admin/users/${user.id}`)}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedRowIds.includes(user.id)}
                          onClick={(event) => event.stopPropagation()}
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
                        <div className="flex items-center justify-end">
                          <RowActionsMenu
                            items={[
                              {
                                label: user.role === "TAILOR" ? "Set Customer" : "Set Tailor",
                                onSelect: () => void runSingle(user.id, user.role === "TAILOR" ? "to-customer" : "to-tailor"),
                              },
                              ...(user.role === "CUSTOMER"
                                ? [
                                    {
                                      label: "Add Measurement",
                                      onSelect: () => openAddMeasurement(user),
                                    },
                                  ]
                                : []),
                              {
                                label: "Delete",
                                onSelect: () => void runSingle(user.id, "delete"),
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

      <Sheet
        open={isAddCustomerOpen}
        onOpenChange={(open) => {
          setIsAddCustomerOpen(open)
          if (!open) {
            setNewUser(createInitialUserForm())
            setNewUserFormSubmitted(false)
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
          <SheetHeader>
            <SheetTitle>Add User</SheetTitle>
            <SheetDescription>Create a customer, tailor, or admin account directly from the admin panel.</SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-1 gap-3 px-4 pb-4">
            <Input
              placeholder="Full name"
              value={newUser.name}
              onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))}
            />
            {!isNewUserNameValid && (newUser.name || newUserFormSubmitted) ? <p className="text-xs text-red-600">Name is too short</p> : null}
            <Input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
            />
            {!isNewUserEmailValid && (newUser.email || newUserFormSubmitted) ? <p className="text-xs text-red-600">Invalid email</p> : null}
            <Input
              type="tel"
              placeholder="Indian mobile (e.g. 9876543210)"
              value={newUser.phone}
              onChange={(e) => setNewUser((prev) => ({ ...prev, phone: e.target.value }))}
            />
            {!isNewUserPhoneValid && (newUser.phone || newUserFormSubmitted) ? (
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
            {!isNewUserDobValid && newUserFormSubmitted ? <p className="text-xs text-red-600">Date of birth is required</p> : null}

            {!newUser.addAddress ? (
              <div className="rounded-md border border-dashed p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">Address is optional while creating user.</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewUser((prev) => ({ ...prev, addAddress: true }))}
                  >
                    Add Address
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">Address Details</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => void autofillAddressFromLocation()} disabled={newUser.autoLocating}>
                      {newUser.autoLocating ? "Detecting..." : "Use Current Location"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setNewUser((prev) => ({
                          ...prev,
                          addAddress: false,
                          street: "",
                          city: "",
                          state: "",
                          postalCode: "",
                          country: "India",
                          autoLocating: false,
                        }))
                      }
                    >
                      Remove Address
                    </Button>
                  </div>
                </div>
                <Input placeholder="Street" value={newUser.street} onChange={(e) => setNewUser((prev) => ({ ...prev, street: e.target.value }))} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input placeholder="City" value={newUser.city} onChange={(e) => setNewUser((prev) => ({ ...prev, city: e.target.value }))} />
                  <Input placeholder="State" value={newUser.state} onChange={(e) => setNewUser((prev) => ({ ...prev, state: e.target.value }))} />
                  <Input
                    placeholder="PIN code"
                    inputMode="numeric"
                    maxLength={6}
                    value={newUser.postalCode}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 6)
                      setNewUser((prev) => ({ ...prev, postalCode: digitsOnly }))
                      if (digitsOnly.length === 6) {
                        void updateAddressFromPostalCode(digitsOnly)
                      }
                    }}
                  />
                  <Input placeholder="Country" value={newUser.country} onChange={(e) => setNewUser((prev) => ({ ...prev, country: e.target.value }))} />
                </div>
                {!isNewUserStreetValid && newUserFormSubmitted ? <p className="text-xs text-red-600">Street is required</p> : null}
                {!isNewUserCityValid && newUserFormSubmitted ? <p className="text-xs text-red-600">City is required</p> : null}
                {!isNewUserStateValid && newUserFormSubmitted ? <p className="text-xs text-red-600">State is required</p> : null}
                {!isNewUserPostalValid && newUserFormSubmitted ? <p className="text-xs text-red-600">PIN code must be 6 digits</p> : null}
                {!isNewUserCountryValid && newUserFormSubmitted ? <p className="text-xs text-red-600">Country is required</p> : null}
              </div>
            )}

            {newUser.role === "CUSTOMER" ? (
              <div className="space-y-3 rounded-md border p-3">
                {!newUser.measurementEnabled ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">You can attach a verified measurement profile now.</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setNewUser((prev) => ({ ...prev, measurementEnabled: true }))}
                    >
                      Add Measurement
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">Verified Measurement</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setNewUser((prev) => ({
                            ...prev,
                            measurementEnabled: false,
                            measurementServiceKey: "",
                            measurementName: "",
                            measurementNotes: "",
                            measurementValues: {},
                          }))
                        }
                      >
                        Remove Measurement
                      </Button>
                    </div>
                    <select
                      className="h-10 rounded-md border bg-background px-3"
                      value={newUser.measurementServiceKey}
                      onChange={(e) =>
                        setNewUser((prev) => ({
                          ...prev,
                          measurementServiceKey: e.target.value,
                          measurementValues: {},
                          measurementName: prev.measurementName || `${e.target.selectedOptions[0]?.text || "Measurement"} - Admin Verified`,
                        }))
                      }
                    >
                      <option value="">Select stitching option</option>
                      {serviceOptions.map((service) => (
                        <option key={service.id} value={service.key}>
                          {service.name} ({service.category})
                        </option>
                      ))}
                    </select>
                    {!newUser.measurementServiceKey && newUserFormSubmitted ? <p className="text-xs text-red-600">Select stitching option for measurement</p> : null}
                    <Input
                      placeholder="Measurement profile name"
                      value={newUser.measurementName}
                      onChange={(e) => setNewUser((prev) => ({ ...prev, measurementName: e.target.value }))}
                    />
                    {!newUser.measurementName.trim() && newUserFormSubmitted ? <p className="text-xs text-red-600">Measurement profile name is required</p> : null}

                    {selectedNewUserMeasurementFields.length > 0 ? (
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_280px]">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {selectedNewUserMeasurementFields.map((field) => (
                            <div key={field.key} className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">
                                {field.label}{field.unit ? ` (${field.unit})` : ""}
                              </label>
                              {field.image ? (
                                <img src={field.image} alt={field.label} className="h-20 w-full rounded border object-cover" />
                              ) : null}
                              <Input
                                type="number"
                                inputMode="decimal"
                                placeholder={`Enter ${field.label}`}
                                value={newUser.measurementValues[field.key] || ""}
                                onChange={(e) => setNewUserMeasurementValue(field.key, e.target.value)}
                              />
                            </div>
                          ))}
                        </div>
                        <MeasurementGuidePanel
                          measurementType={selectedNewUserService?.measurementType}
                          imageSrc={selectedNewUserService?.measurementGuideImage}
                          fields={selectedNewUserMeasurementFields}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {loadingServices ? "Loading stitching options..." : "Select stitching option to load measurement fields."}
                      </p>
                    )}

                    <Input
                      placeholder="Measurement notes"
                      value={newUser.measurementNotes}
                      onChange={(e) => setNewUser((prev) => ({ ...prev, measurementNotes: e.target.value }))}
                    />
                  </>
                )}
              </div>
            ) : null}
          </div>

          <SheetFooter className="px-4 pb-4">
            <div className="flex w-full justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-w-32"
              onClick={() => {
                setIsAddCustomerOpen(false)
                setNewUser(createInitialUserForm())
                setNewUserFormSubmitted(false)
              }}
              disabled={creatingUser}
            >
              Cancel
            </Button>
            <Button type="button" size="lg" className="min-w-40" onClick={createUser} disabled={!canCreateUser}>
              {creatingUser ? <><Spinner className="mr-2" />Creating...</> : "Create User"}
            </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={isAddMeasurementOpen}
        onOpenChange={(open) => {
          setIsAddMeasurementOpen(open)
          if (!open) {
            setMeasurementForm(createInitialMeasurementForm())
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
          <SheetHeader>
            <SheetTitle>Add Verified Measurement</SheetTitle>
            <SheetDescription>
              Add admin-verified measurement for {measurementTargetUser?.name || "customer"}.
            </SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-1 gap-3 px-4 pb-4">
            <select
              className="h-10 rounded-md border bg-background px-3"
              value={measurementForm.serviceKey}
              onChange={(e) =>
                setMeasurementForm((prev) => ({
                  ...prev,
                  serviceKey: e.target.value,
                  values: {},
                  name: prev.name || `${e.target.selectedOptions[0]?.text || "Measurement"} - Admin Verified`,
                }))
              }
            >
              <option value="">Select stitching option</option>
              {serviceOptions.map((service) => (
                <option key={service.id} value={service.key}>
                  {service.name} ({service.category})
                </option>
              ))}
            </select>
            <Input
              placeholder="Measurement profile name"
              value={measurementForm.name}
              onChange={(e) => setMeasurementForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            {selectedMeasurementFields.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedMeasurementFields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        {field.label}{field.unit ? ` (${field.unit})` : ""}
                      </label>
                      {field.image ? (
                        <img src={field.image} alt={field.label} className="h-20 w-full rounded border object-cover" />
                      ) : null}
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder={`Enter ${field.label}`}
                        value={measurementForm.values[field.key] || ""}
                        onChange={(e) => setMeasurementValue(field.key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                <MeasurementGuidePanel
                  measurementType={selectedMeasurementService?.measurementType}
                  imageSrc={selectedMeasurementService?.measurementGuideImage}
                  fields={selectedMeasurementFields}
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {loadingServices ? "Loading stitching options..." : "Select stitching option to load measurement fields."}
              </p>
            )}
            <Input
              placeholder="Notes"
              value={measurementForm.notes}
              onChange={(e) => setMeasurementForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <SheetFooter className="px-4 pb-4">
            <div className="flex w-full justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddMeasurementOpen(false)
                setMeasurementForm(createInitialMeasurementForm())
              }}
              disabled={creatingMeasurement}
            >
              Cancel
            </Button>
            <Button type="button" onClick={addMeasurementForUser} disabled={!canCreateMeasurement}>
              {creatingMeasurement ? <><Spinner className="mr-2" />Saving...</> : "Save Verified Measurement"}
            </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

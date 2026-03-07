"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { FeedbackToasts } from "@/components/admin/feedback-toasts"
import { MeasurementGuidePanel } from "@/components/measurement-guide-panel"
import { ContactActions } from "@/components/contact-actions"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { ChevronLeft } from "lucide-react"

type UserDetail = {
  id: string
  name: string
  email: string
  phone?: string | null
  role: "ADMIN" | "TAILOR" | "CUSTOMER"
  status: "active" | "inactive"
  dateOfBirth?: string | null
  createdAt: string
  updatedAt: string
  customerAddresses: Array<{
    id: string
    street: string
    city: string
    state: string
    postalCode: string
    country: string
    isDefault: boolean
  }>
  measurements: Array<{
    id: string
    name: string
    isVerified: boolean
    source?: string | null
    notes?: string | null
    chest?: number | null
    waist?: number | null
    hip?: number | null
    shoulder?: number | null
    sleeveLength?: number | null
    garmentLength?: number | null
    createdAt: string
  }>
  orders: Array<{
    id: string
    status: string
    totalAmount: number
    createdAt: string
  }>
  stitchingOrders: Array<{
    id: string
    status: string
    price: number
    stitchingService: string
    createdAt: string
  }>
  summary: {
    readyMadeOrders: number
    customOrders: number
    readyMadeAmount: number
    customAmount: number
    measurements: number
    verifiedMeasurements: number
  }
}

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
  measurementType?: string
  measurementFields?: MeasurementField[]
  measurementGuideImage?: string | null
}

const createMeasurementForm = () => ({
  serviceKey: "",
  name: "",
  notes: "",
  values: {} as Record<string, string>,
})

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>()
  const userId = typeof params?.id === "string" ? params.id : ""
  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [savingMeasurement, setSavingMeasurement] = useState(false)
  const [services, setServices] = useState<StitchingServiceOption[]>([])
  const [measurementForm, setMeasurementForm] = useState(createMeasurementForm)
  const selectedService = services.find((service) => service.key === measurementForm.serviceKey)
  const selectedFields = selectedService?.measurementFields || []
  const serviceSelectOptions = useMemo(
    () =>
      services.map((service) => ({
        value: service.key,
        label: `${service.name} (${service.category})`,
        searchText: `${service.name} ${service.category} ${service.key}`,
      })),
    [services],
  )

  const canAddMeasurement =
    user?.role === "CUSTOMER" &&
    measurementForm.name.trim().length > 0 &&
    Boolean(measurementForm.serviceKey) &&
    !savingMeasurement

  const loadUser = async () => {
    if (!userId) return
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/admin/users/${userId}`, { cache: "no-store" })
      const data = (await response.json().catch(() => ({ error: "Failed to load user details." }))) as UserDetail & {
        error?: string
      }
      if (!response.ok) {
        setError(data.error || "Failed to load user details.")
        setUser(null)
        return
      }
      setUser(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadUser()
  }, [userId])

  useEffect(() => {
    const loadServices = async () => {
      try {
        const response = await fetch("/api/stitching-services", { cache: "no-store" })
        if (!response.ok) return
        const data = (await response.json()) as StitchingServiceOption[]
        setServices(data)
      } catch {
        setServices([])
      }
    }
    void loadServices()
  }, [])

  const latestOrders = useMemo(() => user?.orders.slice(0, 5) || [], [user?.orders])
  const latestCustomOrders = useMemo(() => user?.stitchingOrders.slice(0, 5) || [], [user?.stitchingOrders])

  const addVerifiedMeasurement = async () => {
    if (!user || user.role !== "CUSTOMER") return
    setSavingMeasurement(true)
    setError("")
    setSuccess("")
    try {
      const measurementData = Object.entries(measurementForm.values).reduce<Record<string, number | string | null>>(
        (acc, [key, value]) => {
          if (!value?.trim()) return acc
          const parsed = Number(value)
          acc[key] = Number.isFinite(parsed) ? parsed : value
          return acc
        },
        {},
      )
      const response = await fetch(`/api/admin/users/${user.id}/measurements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...measurementForm,
          measurementType: selectedService?.measurementType || undefined,
          measurementData,
        }),
      })
      const data = (await response.json().catch(() => ({ error: "Failed to add measurement." }))) as { error?: string }
      if (!response.ok) {
        setError(data.error || "Failed to add measurement.")
        return
      }
      setSuccess("Verified measurement added successfully.")
      setMeasurementForm(createMeasurementForm())
      await loadUser()
    } finally {
      setSavingMeasurement(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <Card className="space-y-3 p-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-72" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-4 p-4 md:p-8">
        <Button variant="ghost" asChild>
          <Link href="/admin/users">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Link>
        </Button>
        <Card className="border-red-300 p-6 text-red-600">{error || "User not found."}</Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" asChild>
          <Link href="/admin/users">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Link>
        </Button>
      </div>

      <FeedbackToasts error={error} success={success} />

      <Card className="space-y-4 p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">{user.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{user.role}</Badge>
            <Badge variant={user.status === "active" ? "default" : "secondary"}>{user.status}</Badge>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Phone</p>
            <p className="font-medium">{user.phone || "-"}</p>
            <ContactActions phone={user.phone} name={user.name} whatsappMessage={`Hello ${user.name}, sharing your account details.`} className="mt-2 flex items-center gap-2" />
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">DOB</p>
            <p className="font-medium">{user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : "-"}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Joined</p>
            <p className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Updated</p>
            <p className="font-medium">{new Date(user.updatedAt).toLocaleDateString()}</p>
          </Card>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Ready-Made Orders</p>
          <p className="text-xl font-semibold">{user.summary.readyMadeOrders}</p>
          <p className="text-xs text-muted-foreground">Rs. {user.summary.readyMadeAmount.toFixed(2)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Custom Orders</p>
          <p className="text-xl font-semibold">{user.summary.customOrders}</p>
          <p className="text-xs text-muted-foreground">Rs. {user.summary.customAmount.toFixed(2)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Measurements</p>
          <p className="text-xl font-semibold">{user.summary.measurements}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Verified Measurements</p>
          <p className="text-xl font-semibold">{user.summary.verifiedMeasurements}</p>
        </Card>
      </div>

      <Card className="space-y-3 p-5">
        <h2 className="text-lg font-semibold">Addresses</h2>
        {user.customerAddresses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No addresses found.</p>
        ) : (
          <div className="space-y-2">
            {user.customerAddresses.map((address) => (
              <div key={address.id} className="rounded-md border p-3 text-sm">
                <div className="mb-1 flex items-center gap-2">
                  {address.isDefault ? <Badge>Default</Badge> : null}
                </div>
                <p>{address.street}</p>
                <p className="text-muted-foreground">
                  {address.city}, {address.state}, {address.postalCode}, {address.country}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="text-lg font-semibold">Measurements</h2>
        {user.role === "CUSTOMER" ? (
          <div className="space-y-3 rounded-md border p-3">
            <p className="text-sm font-medium">Add Verified Measurement</p>
            <div className="space-y-1">
              <label htmlFor="user-detail-measurement-service" className="text-sm font-medium">Stitching Service</label>
              <SearchableSelect
                id="user-detail-measurement-service"
                value={measurementForm.serviceKey}
                onValueChange={(value) => {
                  const selected = services.find((service) => service.key === value)
                  setMeasurementForm((prev) => ({
                    ...prev,
                    serviceKey: value,
                    values: {},
                    name: prev.name || `${selected?.name || "Measurement"} - Admin Verified`,
                  }))
                }}
                options={serviceSelectOptions}
                placeholder="Select stitching option"
                searchPlaceholder="Search services..."
                emptyLabel="No stitching service found."
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="user-detail-measurement-profile-name" className="text-sm font-medium">Profile Name</label>
              <Input id="user-detail-measurement-profile-name" placeholder="Profile name" value={measurementForm.name} onChange={(e) => setMeasurementForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            {selectedFields.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {selectedFields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        {field.label}{field.unit ? ` (${field.unit})` : ""}
                      </label>
                      {field.image ? (
                        <img src={field.image} alt={field.label} className="h-20 w-full rounded border object-cover" />
                      ) : null}
                      <Input
                        placeholder={`Enter ${field.label}`}
                        type="number"
                        value={measurementForm.values[field.key] || ""}
                        onChange={(e) =>
                          setMeasurementForm((prev) => ({
                            ...prev,
                            values: {
                              ...prev.values,
                              [field.key]: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <MeasurementGuidePanel
                  measurementType={selectedService?.measurementType}
                  imageSrc={selectedService?.measurementGuideImage}
                  fields={selectedFields}
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Select stitching option to load measurement fields.</p>
            )}
            <div className="space-y-1">
              <label htmlFor="user-detail-measurement-notes" className="text-sm font-medium">Notes</label>
              <Input id="user-detail-measurement-notes" placeholder="Notes" value={measurementForm.notes} onChange={(e) => setMeasurementForm((prev) => ({ ...prev, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={addVerifiedMeasurement} disabled={!canAddMeasurement}>
                {savingMeasurement ? "Saving..." : "Add Verified Measurement"}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Measurement management is available for customer users only.</p>
        )}
        {user.measurements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No measurements found.</p>
        ) : (
          <div className="space-y-2">
            {user.measurements.map((measurement) => (
              <div key={measurement.id} className="rounded-md border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <p className="font-medium">{measurement.name}</p>
                  {measurement.isVerified ? <Badge>Verified</Badge> : <Badge variant="outline">Suggested</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-3">
                  <p>Chest: {measurement.chest ?? "-"}</p>
                  <p>Waist: {measurement.waist ?? "-"}</p>
                  <p>Hip: {measurement.hip ?? "-"}</p>
                  <p>Shoulder: {measurement.shoulder ?? "-"}</p>
                  <p>Sleeve: {measurement.sleeveLength ?? "-"}</p>
                  <p>Length: {measurement.garmentLength ?? "-"}</p>
                </div>
                {measurement.notes ? <p className="mt-1 text-xs text-muted-foreground">{measurement.notes}</p> : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3 p-5">
          <h2 className="text-lg font-semibold">Recent Ready-Made Orders</h2>
          {latestOrders.length === 0 ? <p className="text-sm text-muted-foreground">No ready-made orders.</p> : null}
          {latestOrders.map((order) => (
            <div key={order.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">ORD-{order.id.slice(-6).toUpperCase()}</p>
              <p className="text-muted-foreground">{order.status} • Rs. {order.totalAmount.toFixed(2)}</p>
            </div>
          ))}
        </Card>
        <Card className="space-y-3 p-5">
          <h2 className="text-lg font-semibold">Recent Custom Orders</h2>
          {latestCustomOrders.length === 0 ? <p className="text-sm text-muted-foreground">No custom orders.</p> : null}
          {latestCustomOrders.map((order) => (
            <div key={order.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">ST-{order.id.slice(-6).toUpperCase()}</p>
              <p className="text-muted-foreground">{order.stitchingService}</p>
              <p className="text-muted-foreground">{order.status} • Rs. {order.price.toFixed(2)}</p>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

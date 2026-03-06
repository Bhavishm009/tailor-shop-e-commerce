"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Plus, Upload, X, User, Package } from "lucide-react"
import type { ClothType } from "@prisma/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { FeedbackToasts } from "@/components/admin/feedback-toasts"
import { Spinner } from "@/components/ui/spinner"
import { uploadFile, isValidImageFile } from "@/lib/file-upload"

type Customer = {
  id: string
  name: string
  email: string
  phone?: string | null
}

type MeasurementOption = { id: string; name: string; isVerified?: boolean }
type ServiceOption = { id: string; key: string; name: string; category: string; customerPrice: number }
type FabricOption = {
  id: string
  name: string
  clothType: ClothType
  buyRatePerMeter: number
  sellRatePerMeter: number
  stockMeters: number
  image?: string | null
  description?: string | null
}

type OrderItemForm = {
  clientId: string
  serviceKey: string
  measurementId: string
  quantity: number
  fabricMode: "WITHOUT_FABRIC" | "WITH_OWN_FABRIC" | "WITH_SHOP_FABRIC"
  clothType: string
  fabricOptionId: string
  fabricMeters: string
  fabricImageUrl: string
  notes: string
}

const clothTypes = [
  { value: "COTTON", label: "Cotton" },
  { value: "SILK", label: "Silk" },
  { value: "WOOL", label: "Wool" },
  { value: "LINEN", label: "Linen" },
  { value: "POLYESTER", label: "Polyester" },
  { value: "BLEND", label: "Fabric Blend" },
  { value: "CUSTOM", label: "Custom" },
]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)

function makeClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function createItem(): OrderItemForm {
  return {
    clientId: makeClientId(),
    serviceKey: "",
    measurementId: "",
    quantity: 1,
    fabricMode: "WITHOUT_FABRIC",
    clothType: "",
    fabricOptionId: "",
    fabricMeters: "1",
    fabricImageUrl: "",
    notes: "",
  }
}

export default function AdminCreateCustomOrderPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("")
  const [measurementOptions, setMeasurementOptions] = useState<MeasurementOption[]>([])
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([])
  const [fabricOptions, setFabricOptions] = useState<FabricOption[]>([])

  const [items, setItems] = useState<OrderItemForm[]>([createItem()])
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [contactName, setContactName] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [addressLine1, setAddressLine1] = useState("")
  const [addressCity, setAddressCity] = useState("")
  const [addressState, setAddressState] = useState("")
  const [addressPostalCode, setAddressPostalCode] = useState("")
  const [addressCountry, setAddressCountry] = useState("India")

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [customersResponse, serviceResponse, fabricResponse] = await Promise.all([
          fetch("/api/admin/users?role=CUSTOMER", { cache: "no-store" }),
          fetch("/api/stitching-services", { cache: "no-store" }),
          fetch("/api/cloth-options", { cache: "no-store" }),
        ])

        if (customersResponse.ok) {
          const data = (await customersResponse.json()) as Customer[]
          setCustomers(data)
        }
        if (serviceResponse.ok) {
          const data = (await serviceResponse.json()) as ServiceOption[]
          setServiceOptions(data)
        }
        if (fabricResponse.ok) {
          const data = (await fabricResponse.json()) as FabricOption[]
          setFabricOptions(data)
        }
      } finally {
        setLoadingMeta(false)
      }
    }

    void loadMeta()
  }, [])

  // Load customer's measurements when customer is selected
  useEffect(() => {
    if (!selectedCustomerId) {
      setMeasurementOptions([])
      return
    }

    const loadMeasurements = async () => {
      try {
        const response = await fetch(`/api/admin/users/${selectedCustomerId}/measurements`, { cache: "no-store" })
        if (response.ok) {
          const data = (await response.json()) as MeasurementOption[]
          setMeasurementOptions(data)
        }
      } catch {
        setMeasurementOptions([])
      }
    }

    void loadMeasurements()
  }, [selectedCustomerId])

  const updateItem = (clientId: string, next: Partial<OrderItemForm>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.clientId !== clientId) return item
        const merged = { ...item, ...next }
        if (next.fabricMode === "WITHOUT_FABRIC") {
          merged.fabricOptionId = ""
          merged.fabricMeters = "1"
          merged.fabricImageUrl = ""
        }
        if (next.fabricMode === "WITH_OWN_FABRIC") {
          merged.fabricOptionId = ""
          merged.fabricMeters = "1"
        }
        if (next.fabricMode === "WITH_SHOP_FABRIC") {
          merged.fabricImageUrl = ""
        }
        if (next.fabricOptionId) {
          const option = fabricOptions.find((fabric) => fabric.id === next.fabricOptionId)
          if (option) merged.clothType = option.clothType
        }
        return merged
      }),
    )
  }

  const addItem = () => setItems((prev) => [...prev, createItem()])
  const removeItem = (clientId: string) => setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.clientId !== clientId) : prev))

  const handleFileChange = async (clientId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    setError("")
    if (!isValidImageFile(file)) {
      setError("Fabric image must be JPG/PNG/WebP/GIF and less than 10MB.")
      return
    }

    setUploadingItemId(clientId)
    setUploadProgress(0)
    try {
      const uploaded = await uploadFile(file, "/tailorhub/custom-orders/fabric", setUploadProgress)
      updateItem(clientId, { fabricImageUrl: uploaded.url })
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload fabric image.")
    } finally {
      setUploadingItemId(null)
    }
  }

  const lines = useMemo(() => {
    return items.map((item) => {
      const service = serviceOptions.find((serviceItem) => serviceItem.key === item.serviceKey)
      const qty = Math.max(1, item.quantity || 1)
      const stitchingUnit = service?.customerPrice || 0

      const selectedFabric = item.fabricMode === "WITH_SHOP_FABRIC" ? fabricOptions.find((fabric) => fabric.id === item.fabricOptionId) : null
      const meters = Number(item.fabricMeters)
      const safeMeters = Number.isFinite(meters) && meters > 0 ? meters : 0
      const fabricUnit = selectedFabric ? selectedFabric.sellRatePerMeter * safeMeters : 0

      return {
        clientId: item.clientId,
        serviceName: service?.name || "-",
        quantity: qty,
        stitchingUnit,
        fabricUnit,
        lineTotal: (stitchingUnit + fabricUnit) * qty,
        selectedFabric,
      }
    })
  }, [items, serviceOptions, fabricOptions])

  const estimatedTotal = lines.reduce((sum, line) => sum + line.lineTotal, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!selectedCustomerId) {
      setError("Please select a customer.")
      return
    }

    if (items.length === 0) {
      setError("Add at least one stitching item.")
      return
    }

    for (const item of items) {
      if (!item.serviceKey || !item.measurementId) {
        setError("Select stitching service and measurement for every item.")
        return
      }
      if (item.fabricMode !== "WITH_SHOP_FABRIC" && !item.clothType) {
        setError("Select cloth type for each item when fabric is not selected from us.")
        return
      }
      if (item.fabricMode === "WITH_SHOP_FABRIC") {
        if (!item.fabricOptionId) {
          setError("Select fabric for each item marked as with fabric.")
          return
        }
        const meters = Number(item.fabricMeters)
        if (!Number.isFinite(meters) || meters <= 0) {
          setError("Enter valid required meters for all selected fabrics.")
          return
        }
        const selectedFabric = fabricOptions.find((fabric) => fabric.id === item.fabricOptionId)
        if (!selectedFabric) {
          setError("Selected fabric is invalid.")
          return
        }
        const required = meters * Math.max(1, item.quantity || 1)
        if (required > selectedFabric.stockMeters) {
          setError(`Not enough stock for ${selectedFabric.name}. Required ${required.toFixed(2)}m.`)
          return
        }
      }
    }

    const hasAnyAddressInput = [addressLine1, addressCity, addressState, addressPostalCode, addressCountry]
      .some((value) => value.trim().length > 0)
    if (hasAnyAddressInput) {
      if (!addressLine1.trim() || !addressCity.trim() || !addressState.trim() || !addressPostalCode.trim() || !addressCountry.trim()) {
        setError("Complete all address fields or leave all blank.")
        return
      }
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/admin/custom-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          contactName: contactName.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          addressLine1: addressLine1.trim() || undefined,
          addressCity: addressCity.trim() || undefined,
          addressState: addressState.trim() || undefined,
          addressPostalCode: addressPostalCode.trim() || undefined,
          addressCountry: addressCountry.trim() || undefined,
          items: items.map((item) => ({
            serviceKey: item.serviceKey,
            measurementId: item.measurementId,
            quantity: Math.max(1, item.quantity || 1),
            fabricMode: item.fabricMode,
            clothType: item.clothType || undefined,
            fabricOptionId: item.fabricOptionId || undefined,
            fabricMeters: item.fabricMode === "WITH_SHOP_FABRIC" ? Number(item.fabricMeters) : undefined,
            fabricImage: item.fabricMode === "WITH_OWN_FABRIC" ? item.fabricImageUrl || null : null,
            notes: item.notes || undefined,
          })),
        }),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => ({ error: "Failed to create custom order." }))) as { error?: string }
        setError(data.error || "Failed to create custom order.")
        return
      }

      setSuccess("Custom order created successfully.")
      router.push("/admin/custom-orders")
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingMeta) {
    return (
      <div className="p-4 md:p-8">
        <Card className="p-6 text-muted-foreground">Loading order form...</Card>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/admin/custom-orders">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Custom Orders
          </Link>
        </Button>

        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Create Custom Order for Customer</h1>
          <p className="text-muted-foreground">Create stitching orders on behalf of your customers with flexible fabric options.</p>
        </div>

        <FeedbackToasts error={error} success={success} />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Selection */}
          <Card className="p-5 md:p-6 space-y-4">
            <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Details
            </h2>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Customer *</label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} ({customer.email})
                      {customer.phone ? ` - ${customer.phone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCustomerId && (
              <div className="text-sm text-muted-foreground p-3 bg-muted/20 rounded-md">
                Selected customer: {customers.find(c => c.id === selectedCustomerId)?.name}
              </div>
            )}
          </Card>

          {/* Order Items */}
          <Card className="p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
                <Package className="h-5 w-5" />
                Stitching Items
              </h2>
              <Button type="button" variant="outline" onClick={addItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => {
                const selectedService = serviceOptions.find((service) => service.key === item.serviceKey)
                const filteredFabricOptions = fabricOptions.filter(
                  (fabric) => (!item.clothType || fabric.clothType === item.clothType) && fabric.stockMeters > 0,
                )
                const selectedFabric = fabricOptions.find((fabric) => fabric.id === item.fabricOptionId)

                return (
                  <div key={item.clientId} className="rounded-md border p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">Item #{index + 1}</p>
                      <Button type="button" variant="ghost" size="icon" disabled={items.length <= 1} onClick={() => removeItem(item.clientId)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Stitching Service *</label>
                        <Select value={item.serviceKey} onValueChange={(value) => updateItem(item.clientId, { serviceKey: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select service" />
                          </SelectTrigger>
                          <SelectContent>
                            {serviceOptions.map((service) => (
                              <SelectItem key={service.key} value={service.key}>
                                {service.name} - Rs. {formatCurrency(service.customerPrice)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Measurement Profile *</label>
                        <Select 
                          value={item.measurementId} 
                          onValueChange={(value) => updateItem(item.clientId, { measurementId: value })}
                          disabled={!selectedCustomerId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={selectedCustomerId ? "Select saved measurement" : "Select customer first"} />
                          </SelectTrigger>
                          <SelectContent>
                            {measurementOptions.map((measurement) => (
                              <SelectItem key={measurement.id} value={measurement.id}>
                                {measurement.name} {measurement.isVerified ? "- Verified" : "- Suggested"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor={`qty-${item.clientId}`} className="text-sm font-medium">Quantity</label>
                        <Input
                          id={`qty-${item.clientId}`}
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => {
                            const qty = Number(e.target.value)
                            updateItem(item.clientId, { quantity: Number.isFinite(qty) && qty > 0 ? qty : 1 })
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Fabric Option *</label>
                        <Select value={item.fabricMode} onValueChange={(value) => updateItem(item.clientId, { fabricMode: value as OrderItemForm["fabricMode"] })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select fabric mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="WITHOUT_FABRIC">Stitching Only (No Fabric)</SelectItem>
                            <SelectItem value="WITH_OWN_FABRIC">With Customer's Own Fabric</SelectItem>
                            <SelectItem value="WITH_SHOP_FABRIC">With Fabric from Shop</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Cloth Type</label>
                      <Select
                        value={item.clothType}
                        onValueChange={(value) => updateItem(item.clientId, { clothType: value, fabricOptionId: "" })}
                        disabled={item.fabricMode === "WITH_SHOP_FABRIC"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={item.fabricMode === "WITH_SHOP_FABRIC" ? "Auto from selected fabric" : "Select cloth type"} />
                        </SelectTrigger>
                        <SelectContent>
                          {clothTypes.map((clothType) => (
                            <SelectItem key={clothType.value} value={clothType.value}>
                              {clothType.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {item.fabricMode === "WITH_SHOP_FABRIC" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Select Fabric *</label>
                          <Select value={item.fabricOptionId} onValueChange={(value) => updateItem(item.clientId, { fabricOptionId: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select fabric" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredFabricOptions.map((fabric) => (
                                <SelectItem key={fabric.id} value={fabric.id}>
                                  {fabric.name} ({fabric.clothType}) - Rs. {formatCurrency(fabric.sellRatePerMeter)}/meter - Stock {fabric.stockMeters.toFixed(2)}m
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedFabric?.description ? (
                            <p className="text-xs text-muted-foreground">{selectedFabric.description}</p>
                          ) : null}
                          {selectedFabric ? (
                            <p className="text-xs text-muted-foreground">
                              Available stock: {selectedFabric.stockMeters.toFixed(2)}m
                            </p>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          <label htmlFor={`meters-${item.clientId}`} className="text-sm font-medium">Required Meters</label>
                          <Input
                            id={`meters-${item.clientId}`}
                            type="number"
                            min={0.1}
                            step={0.1}
                            value={item.fabricMeters}
                            onChange={(e) => updateItem(item.clientId, { fabricMeters: e.target.value })}
                          />
                        </div>
                        {selectedFabric?.image ? (
                          <div className="md:col-span-2">
                            <p className="text-sm font-medium mb-2">Selected Fabric Preview</p>
                            <img src={selectedFabric.image} alt={selectedFabric.name} className="h-36 w-full rounded-md border object-cover" />
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {item.fabricMode === "WITH_OWN_FABRIC" ? (
                      <div className="space-y-2 rounded-md border p-3">
                        <label className="text-sm font-medium">Upload Customer's Fabric Image (Optional)</label>
                        <input
                          ref={(node) => {
                            fileInputRefs.current[item.clientId] = node
                          }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => void handleFileChange(item.clientId, e)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRefs.current[item.clientId]?.click()}
                          disabled={uploadingItemId === item.clientId}
                        >
                          {uploadingItemId === item.clientId ? (
                            <>
                              <Spinner className="mr-2" />Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />Upload Fabric Image
                            </>
                          )}
                        </Button>
                        {uploadingItemId === item.clientId ? (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Uploading: {uploadProgress}%</p>
                            <Progress value={uploadProgress} />
                          </div>
                        ) : null}
                        {item.fabricImageUrl ? (
                          <img src={item.fabricImageUrl} alt="Uploaded fabric" className="h-32 w-full rounded border object-cover" />
                        ) : null}
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <label htmlFor={`notes-${item.clientId}`} className="text-sm font-medium">Item Notes</label>
                      <Textarea
                        id={`notes-${item.clientId}`}
                        value={item.notes}
                        onChange={(e) => updateItem(item.clientId, { notes: e.target.value })}
                        placeholder="Any special instructions for this item"
                        rows={2}
                      />
                    </div>

                    {selectedService ? (
                      <p className="text-xs text-muted-foreground">Base stitching: Rs. {formatCurrency(selectedService.customerPrice)} per piece</p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Contact and Delivery Address */}
          <Card className="p-5 md:p-6 space-y-4">
            <h2 className="text-lg md:text-xl font-semibold">Contact and Delivery Address</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="contact-name" className="text-sm font-medium">Contact Name</label>
                <Input id="contact-name" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Receiver full name" />
              </div>
              <div className="space-y-2">
                <label htmlFor="contact-phone" className="text-sm font-medium">Phone Number</label>
                <Input id="contact-phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="10-digit mobile number" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label htmlFor="address-line1" className="text-sm font-medium">Address Line</label>
                <Input id="address-line1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="House no, street, area" />
              </div>
              <div className="space-y-2">
                <label htmlFor="address-city" className="text-sm font-medium">City</label>
                <Input id="address-city" value={addressCity} onChange={(e) => setAddressCity(e.target.value)} placeholder="City" />
              </div>
              <div className="space-y-2">
                <label htmlFor="address-state" className="text-sm font-medium">State</label>
                <Input id="address-state" value={addressState} onChange={(e) => setAddressState(e.target.value)} placeholder="State" />
              </div>
              <div className="space-y-2">
                <label htmlFor="address-postal" className="text-sm font-medium">Pincode</label>
                <Input id="address-postal" value={addressPostalCode} onChange={(e) => setAddressPostalCode(e.target.value.replace(/\D+/g, "").slice(0, 6))} placeholder="Pincode" />
              </div>
              <div className="space-y-2">
                <label htmlFor="address-country" className="text-sm font-medium">Country</label>
                <Input id="address-country" value={addressCountry} onChange={(e) => setAddressCountry(e.target.value)} placeholder="Country" />
              </div>
            </div>
          </Card>

          {/* Bill Summary */}
          <Card className="p-5 md:p-6 space-y-4">
            <h2 className="text-lg md:text-xl font-semibold">Bill Summary</h2>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left">Item</th>
                    <th className="px-3 py-2 text-right">Stitching</th>
                    <th className="px-3 py-2 text-right">Fabric</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={line.clientId} className="border-t">
                      <td className="px-3 py-2">{idx + 1}. {line.serviceName}</td>
                      <td className="px-3 py-2 text-right">Rs. {formatCurrency(line.stitchingUnit)}</td>
                      <td className="px-3 py-2 text-right">Rs. {formatCurrency(line.fabricUnit)}</td>
                      <td className="px-3 py-2 text-right">{line.quantity}</td>
                      <td className="px-3 py-2 text-right">Rs. {formatCurrency(line.lineTotal)}</td>
                    </tr>
                  ))}
                  <tr className="border-t bg-muted/20">
                    <td className="px-3 py-2 font-semibold" colSpan={4}>Estimated Total</td>
                    <td className="px-3 py-2 text-right font-semibold">Rs. {formatCurrency(estimatedTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <Button type="submit" size="lg" className="min-w-44" disabled={submitting || !selectedCustomerId}>
                {submitting ? (
                  <>
                    <Spinner className="mr-2" />Creating...
                  </>
                ) : (
                  "Create Order"
                )}
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </div>
  )
}
"use client"

import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { FeedbackToasts } from "@/components/admin/feedback-toasts"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { RowActionsMenu } from "@/components/admin/row-actions-menu"
import { MeasurementGuidePanel } from "@/components/measurement-guide-panel"
import { uploadFile, isValidImageFile } from "@/lib/file-upload"
import { ArrowDown, ArrowUp, Plus, Upload, X } from "lucide-react"
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

type MeasurementField = {
  key: string
  label: string
  unit?: string
  image?: string | null
}

type StitchingService = {
  id: string
  key: string
  category: string
  name: string
  measurementType?: string | null
  measurementGuideImage?: string | null
  measurementFields?: MeasurementField[] | null
  customerPrice: number
  tailorRate: number
  isActive: boolean
  createdAt: string
}

type ServiceFormState = {
  id: string
  key: string
  category: string
  name: string
  measurementType: string
  measurementGuideImage: string
  measurementFields: Array<{ clientId: string; key: string; label: string; unit?: string; image?: string | null }>
  customerPrice: string
  tailorRate: string
  isActive: boolean
}

function createClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

const initialForm: ServiceFormState = {
  id: "",
  key: "",
  category: "",
  name: "",
  measurementType: "CUSTOM",
  measurementGuideImage: "",
  measurementFields: [{ clientId: createClientId(), key: "measurement_1", label: "", unit: "in", image: null }],
  customerPrice: "",
  tailorRate: "",
  isActive: true,
}

function normalizeFieldKey(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
}

export default function AdminStitchingServicesPage() {
  const [services, setServices] = useState<StitchingService[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL")

  const [panelOpen, setPanelOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingFieldIndex, setUploadingFieldIndex] = useState<number | null>(null)
  const [form, setForm] = useState<ServiceFormState>(initialForm)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const loadServices = async () => {
    try {
      const response = await fetch("/api/admin/stitching-services", { cache: "no-store" })
      if (!response.ok) {
        setServices([])
        setError("Failed to load stitching services.")
        return
      }
      const data = (await response.json()) as StitchingService[]
      setServices(data)
    } catch {
      setServices([])
      setError("Failed to load stitching services.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadServices()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return services.filter((service) => {
      const queryMatch =
        q.length === 0 ||
        service.key.toLowerCase().includes(q) ||
        service.category.toLowerCase().includes(q) ||
        service.name.toLowerCase().includes(q)

      const statusMatch =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && service.isActive) ||
        (statusFilter === "INACTIVE" && !service.isActive)

      return queryMatch && statusMatch
    })
  }, [services, search, statusFilter])

  const openCreate = () => {
    setForm(initialForm)
    setPanelOpen(true)
  }

  const openEdit = (service: StitchingService) => {
    const fields =
      Array.isArray(service.measurementFields) && service.measurementFields.length > 0
        ? service.measurementFields.map((field) => ({ ...field, clientId: createClientId() }))
        : [{ clientId: createClientId(), key: "measurement_1", label: "", unit: "in", image: null }]
    setForm({
      id: service.id,
      key: service.key,
      category: service.category,
      name: service.name,
      measurementType: service.measurementType || "CUSTOM",
      measurementGuideImage: service.measurementGuideImage || "",
      measurementFields: fields,
      customerPrice: String(service.customerPrice),
      tailorRate: String(service.tailorRate),
      isActive: service.isActive,
    })
    setPanelOpen(true)
  }

  const addField = () => {
    setForm((prev) => ({
      ...prev,
      measurementFields: [
        ...prev.measurementFields,
        { clientId: createClientId(), key: `measurement_${prev.measurementFields.length + 1}`, label: "", unit: "in", image: null },
      ],
    }))
  }

  const updateField = (index: number, next: Partial<MeasurementField>) => {
    setForm((prev) => ({
      ...prev,
      measurementFields: prev.measurementFields.map((field, fieldIndex) => {
        if (fieldIndex !== index) return field
        const label = typeof next.label === "string" ? next.label : field.label
        return {
          ...field,
          ...next,
          key: next.key ? normalizeFieldKey(next.key) : normalizeFieldKey(label) || field.key,
        }
      }),
    }))
  }

  const removeField = (index: number) => {
    setForm((prev) => ({
      ...prev,
      measurementFields: prev.measurementFields.filter((_, fieldIndex) => fieldIndex !== index),
    }))
  }

  const moveField = (index: number, direction: "up" | "down") => {
    setForm((prev) => {
      const next = [...prev.measurementFields]
      const swapWith = direction === "up" ? index - 1 : index + 1
      if (swapWith < 0 || swapWith >= next.length) return prev
      ;[next[index], next[swapWith]] = [next[swapWith], next[index]]
      return {
        ...prev,
        measurementFields: next,
      }
    })
  }

  const handleGuideImageUpload = async (file: File) => {
    if (!isValidImageFile(file)) {
      setError("Guide image must be JPG/PNG/WebP/GIF and less than 10MB.")
      return
    }
    setUploadingImage(true)
    setError("")
    try {
      const uploaded = await uploadFile(file, "/tailorhub/stitching-services/guides")
      setForm((prev) => ({ ...prev, measurementGuideImage: uploaded.url }))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload guide image.")
    } finally {
      setUploadingImage(false)
    }
  }

  const handleFieldImageUpload = async (index: number, file: File) => {
    if (!isValidImageFile(file)) {
      setError("Field image must be JPG/PNG/WebP/GIF and less than 10MB.")
      return
    }
    setUploadingFieldIndex(index)
    setError("")
    try {
      const uploaded = await uploadFile(file, "/tailorhub/stitching-services/field-guides")
      setForm((prev) => ({
        ...prev,
        measurementFields: prev.measurementFields.map((field, fieldIndex) =>
          fieldIndex === index ? { ...field, image: uploaded.url } : field,
        ),
      }))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload field image.")
    } finally {
      setUploadingFieldIndex(null)
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    const measurementFields = form.measurementFields
      .map((field) => ({
        key: normalizeFieldKey(field.key || field.label),
        label: field.label.trim(),
        unit: field.unit?.trim() || "in",
        image: field.image || null,
      }))
      .filter((field) => field.label.length > 0 && field.key.length > 0)

    if (measurementFields.length === 0) {
      setError("Add at least one measurement input field.")
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        key: form.key,
        category: form.category,
        name: form.name,
        measurementType: form.measurementType,
        measurementGuideImage: form.measurementGuideImage || null,
        measurementFields,
        customerPrice: Number(form.customerPrice),
        tailorRate: Number(form.tailorRate),
        isActive: form.isActive,
      }

      const isEdit = Boolean(form.id)
      const response = await fetch(isEdit ? `/api/admin/stitching-services/${form.id}` : "/api/admin/stitching-services", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to save stitching service." }))
        setError(data.error || "Failed to save stitching service.")
        return
      }

      setSuccess(isEdit ? "Service updated." : "Service created.")
      setPanelOpen(false)
      setForm(initialForm)
      await loadServices()
    } finally {
      setSubmitting(false)
    }
  }

  const onDelete = async (id: string) => {
    setError("")
    setSuccess("")
    const response = await fetch(`/api/admin/stitching-services/${id}`, { method: "DELETE" })
    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: "Failed to delete service." }))
      setError(data.error || "Failed to delete service.")
      return
    }
    setSuccess("Service deleted.")
    await loadServices()
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Stitching Services</h1>
        <Button type="button" onClick={openCreate}>Add Service</Button>
      </div>

      <FeedbackToasts error={error} success={success} />

      <Card className="p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search key/category/name" className="w-full lg:max-w-2xl" />
          <select className="h-10 rounded-md border bg-background" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")}>
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {loading ? (
          <div className="rounded-md border p-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 border-b py-3 last:border-b-0">
                <Skeleton className="col-span-2 h-5 w-24" />
                <Skeleton className="col-span-2 h-5 w-28" />
                <Skeleton className="col-span-2 h-5 w-20" />
                <Skeleton className="col-span-2 h-5 w-24" />
                <Skeleton className="col-span-2 h-5 w-20" />
                <Skeleton className="col-span-2 h-8 w-24 justify-self-end" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Empty className="border-0 p-10">
            <EmptyHeader>
              <EmptyTitle>No stitching services found</EmptyTitle>
              <EmptyDescription>Try changing filters or add a new service.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Customer Price</TableHead>
                  <TableHead>Tailor Rate</TableHead>
                  <TableHead>Inputs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>{service.category}</TableCell>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>{service.key}</TableCell>
                    <TableCell>Rs. {service.customerPrice.toFixed(2)}</TableCell>
                    <TableCell>Rs. {service.tailorRate.toFixed(2)}</TableCell>
                    <TableCell>{Array.isArray(service.measurementFields) ? service.measurementFields.length : 0}</TableCell>
                    <TableCell>
                      <Badge variant={service.isActive ? "default" : "secondary"}>{service.isActive ? "ACTIVE" : "INACTIVE"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end">
                        <RowActionsMenu
                          items={[
                            { label: "Edit", onSelect: () => openEdit(service) },
                            {
                              label: "Delete",
                              onSelect: () => void onDelete(service.id),
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
        )}
      </Card>

      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
          <SheetHeader>
            <SheetTitle>{form.id ? "Edit Service" : "Add Service"}</SheetTitle>
            <SheetDescription>
              Configure service, upload a guide image, and define measurement inputs in the exact sequence.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={onSubmit} className="space-y-4 px-4 pb-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} placeholder="Category (e.g. Shirt)" required />
              <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Service name" required />
              <Input value={form.key} onChange={(e) => setForm((prev) => ({ ...prev, key: e.target.value }))} placeholder="Unique key" required />
              <Input value={form.measurementType} onChange={(e) => setForm((prev) => ({ ...prev, measurementType: e.target.value.toUpperCase() }))} placeholder="Measurement type tag (e.g. SHIRT)" required />
              <Input value={form.customerPrice} onChange={(e) => setForm((prev) => ({ ...prev, customerPrice: e.target.value }))} type="number" min="0" step="0.01" placeholder="Customer price" required />
              <Input value={form.tailorRate} onChange={(e) => setForm((prev) => ({ ...prev, tailorRate: e.target.value }))} type="number" min="0" step="0.01" placeholder="Tailor rate" required />
            </div>

            <div className="rounded-md border bg-card p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-semibold">Measurement Inputs (Ordered)</p>
                <Button type="button" size="sm" variant="outline" onClick={addField}>
                  <Plus className="mr-2 h-4 w-4" /> Add Input
                </Button>
              </div>

              <div className="space-y-3">
                {form.measurementFields.map((field, index) => (
                    <div key={field.clientId} className="rounded-md border bg-background p-3 space-y-3">
                    <div className="text-xs font-medium text-muted-foreground">Input #{index + 1}</div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_110px_auto]">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Input Label</label>
                        <Input
                          className="bg-background"
                          value={field.label}
                          onChange={(e) => updateField(index, { label: e.target.value })}
                          placeholder={`e.g. Chest`}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Unit</label>
                        <Input
                          className="bg-background"
                          value={field.unit || "in"}
                          onChange={(e) => updateField(index, { unit: e.target.value })}
                          placeholder="in"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Button type="button" size="icon" variant="ghost" onClick={() => moveField(index, "up")} disabled={index === 0}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => moveField(index, "down")}
                          disabled={index === form.measurementFields.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeField(index)}
                          disabled={form.measurementFields.length <= 1}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Field Image URL (Optional)</label>
                        <Input
                          className="bg-background"
                          value={field.image || ""}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              measurementFields: prev.measurementFields.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, image: e.target.value } : item,
                              ),
                            }))
                          }
                          placeholder="https://..."
                        />
                      </div>
                      <input
                        id={`field-image-${field.clientId}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          e.currentTarget.value = ""
                          if (file) void handleFieldImageUpload(index, file)
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingFieldIndex === index}
                        onClick={() => {
                          const picker = document.getElementById(`field-image-${field.clientId}`) as HTMLInputElement | null
                          picker?.click()
                        }}
                      >
                        {uploadingFieldIndex === index ? <><Spinner className="mr-2" />Uploading...</> : <><Upload className="mr-2 h-4 w-4" />Upload Field Image</>}
                      </Button>
                      {field.image ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              measurementFields: prev.measurementFields.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, image: null } : item,
                              ),
                            }))
                          }
                        >
                          Remove Image
                        </Button>
                      ) : (
                        <div className="h-9 w-0" />
                      )}
                    </div>

                    {field.image ? (
                      <img
                        src={field.image}
                        alt={`${field.label || `Field ${index + 1}`} guide`}
                        className="h-28 w-full rounded border object-contain bg-muted/20"
                      />
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="rounded-md border bg-muted/10 p-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">Main Guide Image (Visible to admin + customer)</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}>
                    {uploadingImage ? <><Spinner className="mr-2" />Uploading...</> : <><Upload className="mr-2 h-4 w-4" />Upload</>}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ""
                      if (file) void handleGuideImageUpload(file)
                    }}
                  />
                </div>
                <Input
                  className="bg-background"
                  value={form.measurementGuideImage}
                  onChange={(e) => setForm((prev) => ({ ...prev, measurementGuideImage: e.target.value }))}
                  placeholder="Guide image URL"
                />
                <MeasurementGuidePanel
                  measurementType={form.measurementType}
                  imageSrc={form.measurementGuideImage || null}
                  title="Guide Preview"
                  fields={form.measurementFields.filter((item) => item.label.trim().length > 0)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-md border p-3">
              <input id="service-active" type="checkbox" checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
              <label htmlFor="service-active" className="text-sm">Active service</label>
            </div>

            <SheetFooter className="px-0">
              <div className="flex w-full justify-end gap-3">
                <Button type="button" variant="outline" size="lg" className="min-w-32" onClick={() => setPanelOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="lg" className="min-w-36" disabled={submitting}>
                  {submitting ? <><Spinner className="mr-2" />Saving...</> : form.id ? "Update" : "Create"}
                </Button>
              </div>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}

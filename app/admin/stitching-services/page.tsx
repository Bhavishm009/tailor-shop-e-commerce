"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { FeedbackToasts } from "@/components/admin/feedback-toasts"
import { Spinner } from "@/components/ui/spinner"
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

type StitchingService = {
  id: string
  key: string
  category: string
  name: string
  customerPrice: number
  tailorRate: number
  isActive: boolean
  createdAt: string
}

const initialForm = {
  id: "",
  key: "",
  category: "",
  name: "",
  customerPrice: "",
  tailorRate: "",
  isActive: true,
}

export default function AdminStitchingServicesPage() {
  const [services, setServices] = useState<StitchingService[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL")

  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(initialForm)

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
    loadServices()
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
    setModalOpen(true)
  }

  const openEdit = (service: StitchingService) => {
    setForm({
      id: service.id,
      key: service.key,
      category: service.category,
      name: service.name,
      customerPrice: String(service.customerPrice),
      tailorRate: String(service.tailorRate),
      isActive: service.isActive,
    })
    setModalOpen(true)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSubmitting(true)

    try {
      const payload = {
        key: form.key,
        category: form.category,
        name: form.name,
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
      setModalOpen(false)
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
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search key/category/name" className="w-full sm:max-w-md" />
          <select className="h-10 rounded-md border bg-background px-3" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")}>
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
                    <TableCell>
                      <Badge variant={service.isActive ? "default" : "secondary"}>{service.isActive ? "ACTIVE" : "INACTIVE"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => openEdit(service)}>Edit</Button>
                        <Button type="button" variant="destructive" size="sm" onClick={() => onDelete(service.id)}>Delete</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Service" : "Add Service"}</DialogTitle>
            <DialogDescription>Configure category, stitching method, customer price, and tailor payout rate.</DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} placeholder="Category (e.g. Shirt)" required />
              <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Method name" required />
              <Input value={form.key} onChange={(e) => setForm((prev) => ({ ...prev, key: e.target.value }))} placeholder="Unique key" required />
              <div className="flex items-center gap-2">
                <input id="service-active" type="checkbox" checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
                <label htmlFor="service-active" className="text-sm">Active service</label>
              </div>
              <Input value={form.customerPrice} onChange={(e) => setForm((prev) => ({ ...prev, customerPrice: e.target.value }))} type="number" min="0" step="0.01" placeholder="Customer price" required />
              <Input value={form.tailorRate} onChange={(e) => setForm((prev) => ({ ...prev, tailorRate: e.target.value }))} type="number" min="0" step="0.01" placeholder="Tailor rate" required />
            </div>

            <DialogFooter className="justify-center gap-3">
              <Button type="button" variant="outline" size="lg" className="min-w-32" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" size="lg" className="min-w-36" disabled={submitting}>
                {submitting ? <><Spinner className="mr-2" />Saving...</> : form.id ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

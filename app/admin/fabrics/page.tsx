"use client"

import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"
import { FeedbackToasts } from "@/components/admin/feedback-toasts"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { RowActionsMenu } from "@/components/admin/row-actions-menu"
import { uploadFile, isValidImageFile } from "@/lib/file-upload"
import { Upload } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type FabricRecord = {
  id: string
  name: string
  clothType: string
  buyRatePerMeter: number
  sellRatePerMeter: number
  stockMeters: number
  image?: string | null
  description?: string | null
  isActive: boolean
}

const initialForm = {
  id: "",
  name: "",
  clothType: "COTTON",
  buyRatePerMeter: "",
  sellRatePerMeter: "",
  stockMeters: "",
  image: "",
  description: "",
  isActive: true,
}

export default function AdminFabricsPage() {
  const [fabrics, setFabrics] = useState<FabricRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [search, setSearch] = useState("")
  const [panelOpen, setPanelOpen] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const imageInputRef = useRef<HTMLInputElement | null>(null)

  const loadFabrics = async () => {
    try {
      const response = await fetch("/api/admin/fabrics", { cache: "no-store" })
      if (!response.ok) {
        setError("Failed to load fabrics.")
        setFabrics([])
        return
      }
      const data = (await response.json()) as FabricRecord[]
      setFabrics(data)
    } catch {
      setError("Failed to load fabrics.")
      setFabrics([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadFabrics()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return fabrics
    return fabrics.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.clothType.toLowerCase().includes(q),
    )
  }, [fabrics, search])

  const openCreate = () => {
    setForm(initialForm)
    setPanelOpen(true)
  }

  const openEdit = (item: FabricRecord) => {
    setForm({
      id: item.id,
      name: item.name,
      clothType: item.clothType,
      buyRatePerMeter: String(item.buyRatePerMeter),
      sellRatePerMeter: String(item.sellRatePerMeter),
      stockMeters: String(item.stockMeters),
      image: item.image || "",
      description: item.description || "",
      isActive: item.isActive,
    })
    setPanelOpen(true)
  }

  const handleUploadImage = async (file: File) => {
    if (!isValidImageFile(file)) {
      setError("Image must be JPG/PNG/WebP/GIF and under 10MB.")
      return
    }
    setUploadingImage(true)
    try {
      const uploaded = await uploadFile(file, "/tailorhub/fabrics")
      setForm((prev) => ({ ...prev, image: uploaded.url }))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload image.")
    } finally {
      setUploadingImage(false)
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSubmitting(true)
    try {
      const payload = {
        name: form.name,
        clothType: form.clothType,
        buyRatePerMeter: Number(form.buyRatePerMeter),
        sellRatePerMeter: Number(form.sellRatePerMeter),
        stockMeters: Number(form.stockMeters),
        image: form.image || null,
        description: form.description || null,
        isActive: form.isActive,
      }
      const isEdit = Boolean(form.id)
      const response = await fetch(isEdit ? `/api/admin/fabrics/${form.id}` : "/api/admin/fabrics", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to save fabric." }))
        setError(data.error || "Failed to save fabric.")
        return
      }
      setSuccess(isEdit ? "Fabric updated." : "Fabric created.")
      setPanelOpen(false)
      await loadFabrics()
    } finally {
      setSubmitting(false)
    }
  }

  const onDelete = async (id: string) => {
    setError("")
    setSuccess("")
    const response = await fetch(`/api/admin/fabrics/${id}`, { method: "DELETE" })
    if (!response.ok) {
      setError("Failed to delete fabric.")
      return
    }
    setSuccess("Fabric deleted.")
    await loadFabrics()
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Fabric Rates</h1>
        <Button onClick={openCreate}>Add Fabric</Button>
      </div>

      <FeedbackToasts error={error} success={success} />

      <Card className="p-4 md:p-6 space-y-4">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search fabric name/type" />
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Empty className="border-0 p-10">
            <EmptyHeader>
              <EmptyTitle>No fabrics found</EmptyTitle>
              <EmptyDescription>Add your first fabric option.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fabric</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Buy /m</TableHead>
                  <TableHead>Sell /m</TableHead>
                  <TableHead>Stock (m)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.clothType}</TableCell>
                    <TableCell>Rs. {item.buyRatePerMeter.toFixed(2)}</TableCell>
                    <TableCell>Rs. {item.sellRatePerMeter.toFixed(2)}</TableCell>
                    <TableCell>{item.stockMeters.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={item.isActive ? "default" : "secondary"}>{item.isActive ? "ACTIVE" : "INACTIVE"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <RowActionsMenu
                          items={[
                            { label: "Edit", onSelect: () => openEdit(item) },
                            { label: "Delete", onSelect: () => void onDelete(item.id), destructive: true, separatorBefore: true },
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
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
          <SheetHeader>
            <SheetTitle>{form.id ? "Edit Fabric" : "Add Fabric"}</SheetTitle>
            <SheetDescription>Set buy and sell per-meter rates with optional fabric image.</SheetDescription>
          </SheetHeader>

          <form className="space-y-4 px-4 pb-4" onSubmit={onSubmit}>
            <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Fabric name" required />
            <select className="h-10 w-full rounded-md border bg-background px-3" value={form.clothType} onChange={(e) => setForm((prev) => ({ ...prev, clothType: e.target.value }))}>
              <option value="COTTON">COTTON</option>
              <option value="SILK">SILK</option>
              <option value="WOOL">WOOL</option>
              <option value="LINEN">LINEN</option>
              <option value="POLYESTER">POLYESTER</option>
              <option value="BLEND">BLEND</option>
              <option value="CUSTOM">CUSTOM</option>
            </select>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input value={form.buyRatePerMeter} onChange={(e) => setForm((prev) => ({ ...prev, buyRatePerMeter: e.target.value }))} type="number" min="0" step="0.01" placeholder="Buy rate per meter" required />
              <Input value={form.sellRatePerMeter} onChange={(e) => setForm((prev) => ({ ...prev, sellRatePerMeter: e.target.value }))} type="number" min="0" step="0.01" placeholder="Sell rate per meter" required />
              <Input value={form.stockMeters} onChange={(e) => setForm((prev) => ({ ...prev, stockMeters: e.target.value }))} type="number" min="0" step="0.01" placeholder="Stock in meters" required />
            </div>
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Image</p>
                <Button type="button" variant="outline" size="sm" onClick={() => imageInputRef.current?.click()} disabled={uploadingImage}>
                  {uploadingImage ? <><Spinner className="mr-2" />Uploading...</> : <><Upload className="mr-2 h-4 w-4" />Upload</>}
                </Button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ""
                    if (file) void handleUploadImage(file)
                  }}
                />
              </div>
              <Input value={form.image} onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))} placeholder="Image URL" />
              {form.image ? <img src={form.image} alt={form.name || "Fabric"} className="h-32 w-full rounded border object-cover" /> : null}
            </div>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Description"
              className="h-24 w-full rounded-md border bg-background p-3 text-sm"
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
              Active
            </label>
            <SheetFooter className="px-0">
              <div className="flex w-full justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setPanelOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save Fabric"}</Button>
              </div>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}

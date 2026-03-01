"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { FeedbackToasts } from "@/components/admin/feedback-toasts"

type ProductMasterType = "CATEGORY" | "SUBCATEGORY" | "CLOTH_TYPE" | "MATERIAL" | "SIZE" | "COLOR"

type MasterItem = {
  id: string
  name: string
  type: ProductMasterType
  parentId?: string | null
  isActive: boolean
}

export default function ProductMastersPage() {
  const [items, setItems] = useState<MasterItem[]>([])
  const [error, setError] = useState("")
  const [name, setName] = useState("")
  const [type, setType] = useState<ProductMasterType>("CATEGORY")
  const [parentId, setParentId] = useState("")
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/product-masters?includeInactive=1", { cache: "no-store" })
      if (!response.ok) {
        setError("Failed to load product masters.")
        return
      }
      const data = (await response.json()) as MasterItem[]
      setItems(data)
    } catch {
      setError("Failed to load product masters.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const categories = items.filter((item) => item.type === "CATEGORY" && item.isActive)

  const [creating, setCreating] = useState(false)

  const create = async () => {
    setError("")
    setCreating(true)
    try {
      const response = await fetch("/api/admin/product-masters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, parentId: type === "SUBCATEGORY" ? parentId || null : null }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(data.error || "Failed to create master.")
        return
      }
      setName("")
      setParentId("")
      await load()
    } finally {
      setCreating(false)
    }
  }

  const toggleActive = async (item: MasterItem) => {
    await fetch(`/api/admin/product-masters/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    })
    await load()
  }

  const remove = async (id: string) => {
    await fetch(`/api/admin/product-masters/${id}`, { method: "DELETE" })
    await load()
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Product Masters</h1>
      <FeedbackToasts error={error} />

      <Card className="p-4 space-y-3">
        <h2 className="text-lg font-semibold">Add Master Value</h2>
        <div className="grid md:grid-cols-4 gap-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <select className="h-10 rounded-md border bg-background px-3" value={type} onChange={(e) => setType(e.target.value as ProductMasterType)}>
            <option value="CATEGORY">CATEGORY</option>
            <option value="SUBCATEGORY">SUBCATEGORY</option>
            <option value="CLOTH_TYPE">CLOTH_TYPE</option>
            <option value="MATERIAL">MATERIAL</option>
            <option value="SIZE">SIZE</option>
            <option value="COLOR">COLOR</option>
          </select>
          <select
            className="h-10 rounded-md border bg-background px-3"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            disabled={type !== "SUBCATEGORY"}
          >
            <option value="">Parent Category</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <Button type="button" onClick={create} disabled={creating || loading || !name.trim()}>
            {creating ? "Adding..." : "Add"}
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Name</th>
                <th className="py-2">Type</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, index) => (
                    <tr key={`skeleton-${index}`} className="border-b">
                      <td className="py-2"><Skeleton className="h-4 w-36" /></td>
                      <td className="py-2"><Skeleton className="h-4 w-24" /></td>
                      <td className="py-2"><Skeleton className="h-4 w-16" /></td>
                      <td className="py-2">
                        <div className="flex justify-end gap-2">
                          <Skeleton className="h-8 w-16" />
                          <Skeleton className="h-8 w-16" />
                        </div>
                      </td>
                    </tr>
                  ))
                : items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2">{item.name}</td>
                      <td className="py-2">{item.type}</td>
                      <td className="py-2">{item.isActive ? "Active" : "Inactive"}</td>
                      <td className="py-2">
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => toggleActive(item)}>
                            {item.isActive ? "Disable" : "Enable"}
                          </Button>
                          <Button type="button" variant="destructive" size="sm" onClick={() => remove(item.id)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

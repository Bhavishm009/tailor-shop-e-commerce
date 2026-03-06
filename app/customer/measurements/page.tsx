"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FeedbackToasts } from "@/components/feedback-toasts"
import { Spinner } from "@/components/ui/spinner"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Plus, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { MeasurementGuidePanel } from "@/components/measurement-guide-panel"

interface Measurement {
  id: string
  name: string
  isVerified?: boolean
  source?: string | null
  measurementType?: string | null
  measurementData?: Record<string, number | string | null> | null
  chest?: number
  waist?: number
  hip?: number
  shoulder?: number
  sleeveLength?: number
  garmentLength?: number
  notes?: string
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

export default function MeasurementsPage() {
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [services, setServices] = useState<StitchingServiceOption[]>([])
  const [formData, setFormData] = useState({
    serviceKey: "",
    name: "",
    values: {} as Record<string, string>,
    notes: "",
  })
  const selectedService = services.find((service) => service.key === formData.serviceKey)
  const selectedFields = selectedService?.measurementFields || []

  useEffect(() => {
    const loadMeasurements = async () => {
      setError("")
      try {
        const [measurementResponse, serviceResponse] = await Promise.all([
          fetch("/api/measurements", { cache: "no-store" }),
          fetch("/api/stitching-services", { cache: "no-store" }),
        ])
        if (!measurementResponse.ok) {
          const data = await measurementResponse.json().catch(() => ({ error: "Failed to load measurements." }))
          setError(data.error || "Failed to load measurements.")
          return
        }
        const data = (await measurementResponse.json()) as Measurement[]
        setMeasurements(data)
        if (serviceResponse.ok) {
          const serviceData = (await serviceResponse.json()) as StitchingServiceOption[]
          setServices(serviceData)
        }
      } catch {
        setError("Failed to load measurements.")
      } finally {
        setLoading(false)
      }
    }

    void loadMeasurements()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name.startsWith("measurement_")) {
      const fieldKey = name.replace("measurement_", "")
      setFormData((prev) => ({
        ...prev,
        values: {
          ...prev.values,
          [fieldKey]: value,
        },
      }))
      return
    }
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const asNumber = (value: string) => {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  const handleAddMeasurement = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSaving(true)

    try {
      const measurementData = Object.entries(formData.values).reduce<Record<string, number | string | null>>((acc, [key, raw]) => {
        if (!raw?.trim()) return acc
        const numeric = Number(raw)
        acc[key] = Number.isFinite(numeric) ? numeric : raw
        return acc
      }, {})
      const response = await fetch("/api/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          measurementType: selectedService?.measurementType || "GENERIC",
          measurementData,
          notes: formData.notes || null,
          chest: asNumber(formData.values.chest || ""),
          waist: asNumber(formData.values.waist || ""),
          hip: asNumber(formData.values.hip || ""),
          shoulder: asNumber(formData.values.shoulder || ""),
          sleeveLength: asNumber(formData.values.sleeveLength || ""),
          garmentLength: asNumber(formData.values.garmentLength || ""),
        }),
      })

      const data = (await response.json().catch(() => ({ error: "Failed to save measurement." }))) as
        | Measurement
        | { error?: string }
      if (!response.ok) {
        setError((data as { error?: string }).error || "Failed to save measurement.")
        return
      }

      setMeasurements((prev) => [data as Measurement, ...prev])
      setFormData({
        serviceKey: "",
        name: "",
        values: {},
        notes: "",
      })
      setShowForm(false)
      setSuccess("Measurement saved successfully.")
    } catch {
      setError("Failed to save measurement.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setError("")
    setSuccess("")
    setDeletingId(id)
    try {
      const response = await fetch(`/api/measurements/${id}`, { method: "DELETE" })
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to delete measurement." }))
        setError(data.error || "Failed to delete measurement.")
        return
      }
      setMeasurements((prev) => prev.filter((m) => m.id !== id))
      setSuccess("Measurement deleted successfully.")
    } catch {
      setError("Failed to delete measurement.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">Measurement Profiles</h1>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Measurement
          </Button>
        </div>
        <FeedbackToasts error={error} success={success} />

        {showForm && (
          <Card className="p-5 md:p-8 mb-6 md:mb-8">
            <h2 className="text-xl font-bold mb-6">New Measurement Profile</h2>
            <form onSubmit={handleAddMeasurement} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Stitching Option</label>
                <select
                  value={formData.serviceKey}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      serviceKey: e.target.value,
                      values: {},
                      name: prev.name || `${e.target.selectedOptions[0]?.text || "Measurement"} Profile`,
                    }))
                  }
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  required
                >
                  <option value="">Select stitching option</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.key}>
                      {service.name} ({service.category})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Profile Name</label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Formal Shirt"
                  required
                />
              </div>

              {selectedFields.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                    {selectedFields.map((field) => (
                      <div key={field.key}>
                        {field.image ? (
                          <img src={field.image} alt={field.label} className="mb-2 h-20 w-full rounded border object-cover" />
                        ) : null}
                        <label className="block text-sm font-medium mb-2">
                          {field.label}
                          {field.unit ? ` (${field.unit})` : ""}
                        </label>
                        <Input
                          name={`measurement_${field.key}`}
                          type="number"
                          step="0.5"
                          value={formData.values[field.key] || ""}
                          onChange={handleChange}
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
                <p className="text-sm text-muted-foreground">Select stitching option to show measurement inputs.</p>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Any additional notes..."
                  className="w-full p-2 border rounded text-sm"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" size="lg" className="min-w-44" disabled={saving}>{saving ? <><Spinner className="mr-2" />Saving...</> : "Save Measurement"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Loading measurements...</p>
          </Card>
        ) : measurements.length === 0 ? (
          <Card className="p-0">
            <Empty className="border-0 p-10">
              <EmptyHeader>
                <EmptyTitle>No measurements saved yet</EmptyTitle>
                <EmptyDescription>Create your first measurement profile to continue custom stitching.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </Card>
        ) : (
          <div className="grid gap-4">
            {measurements.map((measurement) => (
              <Card key={measurement.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold">{measurement.name}</h3>
                      {measurement.isVerified ? (
                        <Badge>Verified</Badge>
                      ) : (
                        <Badge variant="outline">Suggested by you</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {measurement.isVerified ? "Added and verified by admin" : "Customer suggested measurement"}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 text-sm">
                      {Object.entries(measurement.measurementData || {}).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-muted-foreground">{key}:</span>
                          <p className="font-semibold">{String(value)} cm</p>
                        </div>
                      ))}
                      {!measurement.measurementData || Object.keys(measurement.measurementData).length === 0
                        ? [
                            { key: "chest", label: "Chest" },
                            { key: "waist", label: "Waist" },
                            { key: "hip", label: "Hip" },
                            { key: "shoulder", label: "Shoulder" },
                            { key: "sleeveLength", label: "Sleeve" },
                            { key: "garmentLength", label: "Length" },
                          ].map((field) => {
                            const value = measurement[field.key as "chest" | "waist" | "hip" | "shoulder" | "sleeveLength" | "garmentLength"]
                            return value ? (
                              <div key={field.key}>
                                <span className="text-muted-foreground">{field.label}:</span>
                                <p className="font-semibold">{value} cm</p>
                              </div>
                            ) : null
                          })
                        : null}
                    </div>
                    {measurement.notes && <p className="text-sm text-muted-foreground mt-4">{measurement.notes}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deletingId === measurement.id}
                    onClick={() => handleDelete(measurement.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

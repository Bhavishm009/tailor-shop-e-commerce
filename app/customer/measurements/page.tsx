"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2 } from "lucide-react"

interface Measurement {
  id: string
  name: string
  chest?: number
  waist?: number
  hip?: number
  shoulder?: number
  sleeveLength?: number
  garmentLength?: number
  notes?: string
}

export default function MeasurementsPage() {
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    chest: "",
    waist: "",
    hip: "",
    shoulder: "",
    sleeveLength: "",
    garmentLength: "",
    notes: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddMeasurement = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: API call to save measurement
    const newMeasurement: Measurement = {
      id: Math.random().toString(),
      ...formData,
      chest: formData.chest ? Number.parseFloat(formData.chest) : undefined,
      waist: formData.waist ? Number.parseFloat(formData.waist) : undefined,
      hip: formData.hip ? Number.parseFloat(formData.hip) : undefined,
      shoulder: formData.shoulder ? Number.parseFloat(formData.shoulder) : undefined,
      sleeveLength: formData.sleeveLength ? Number.parseFloat(formData.sleeveLength) : undefined,
      garmentLength: formData.garmentLength ? Number.parseFloat(formData.garmentLength) : undefined,
    }
    setMeasurements((prev) => [...prev, newMeasurement])
    setFormData({
      name: "",
      chest: "",
      waist: "",
      hip: "",
      shoulder: "",
      sleeveLength: "",
      garmentLength: "",
      notes: "",
    })
    setShowForm(false)
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Measurement Profiles</h1>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Measurement
          </Button>
        </div>

        {showForm && (
          <Card className="p-8 mb-8">
            <h2 className="text-xl font-bold mb-6">New Measurement Profile</h2>
            <form onSubmit={handleAddMeasurement} className="space-y-6">
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

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { name: "chest", label: "Chest (cm)" },
                  { name: "waist", label: "Waist (cm)" },
                  { name: "hip", label: "Hip (cm)" },
                  { name: "shoulder", label: "Shoulder (cm)" },
                  { name: "sleeveLength", label: "Sleeve Length (cm)" },
                  { name: "garmentLength", label: "Garment Length (cm)" },
                ].map((field) => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium mb-2">{field.label}</label>
                    <Input
                      name={field.name}
                      type="number"
                      step="0.5"
                      value={formData[field.name as keyof typeof formData]}
                      onChange={handleChange}
                    />
                  </div>
                ))}
              </div>

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
                <Button type="submit">Save Measurement</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {measurements.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No measurements saved yet</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {measurements.map((measurement) => (
              <Card key={measurement.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold">{measurement.name}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 text-sm">
                      {[
                        { key: "chest", label: "Chest" },
                        { key: "waist", label: "Waist" },
                        { key: "hip", label: "Hip" },
                        { key: "shoulder", label: "Shoulder" },
                        { key: "sleeveLength", label: "Sleeve" },
                        { key: "garmentLength", label: "Length" },
                      ].map(
                        (field) =>
                          measurement[field.key as keyof Measurement] && (
                            <div key={field.key}>
                              <span className="text-muted-foreground">{field.label}:</span>
                              <p className="font-semibold">{measurement[field.key as keyof Measurement]} cm</p>
                            </div>
                          ),
                      )}
                    </div>
                    {measurement.notes && <p className="text-sm text-muted-foreground mt-4">{measurement.notes}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMeasurements((prev) => prev.filter((m) => m.id !== measurement.id))}
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

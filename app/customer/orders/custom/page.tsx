"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { ChevronLeft, Upload } from "lucide-react"
import { uploadFile, isValidImageFile } from "@/lib/file-upload"
import { FeedbackToasts } from "@/components/feedback-toasts"
import { Spinner } from "@/components/ui/spinner"
import type { ClothType } from "@prisma/client"

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

export default function CustomStitchingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [uploadingFabric, setUploadingFabric] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [measurementOptions, setMeasurementOptions] = useState<Array<{ id: string; name: string; isVerified?: boolean }>>([])
  const [serviceOptions, setServiceOptions] = useState<
    Array<{ id: string; key: string; name: string; category: string; customerPrice: number; tailorRate: number }>
  >([])
  const [clothOptions, setClothOptions] = useState<
    Array<{ id: string; name: string; clothType: ClothType; price: number; description?: string }>
  >([])

  const [formData, setFormData] = useState({
    clothSource: "OWN" as "OWN" | "FROM_US",
    clothType: "",
    clothOptionId: "",
    fabricImageUrl: "",
    serviceKey: "",
    measurementId: "",
    notes: "",
  })

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const loadMeta = async () => {
      const [measurementResponse, serviceResponse] = await Promise.all([
        fetch("/api/measurements", { cache: "no-store" }),
        fetch("/api/stitching-services", { cache: "no-store" }),
      ])
      const clothResponse = await fetch("/api/cloth-options", { cache: "no-store" })
      if (measurementResponse.ok) {
        const measurementData = (await measurementResponse.json()) as Array<{ id: string; name: string; isVerified?: boolean }>
        setMeasurementOptions(measurementData)
      }
      if (serviceResponse.ok) {
        const serviceData = (await serviceResponse.json()) as Array<{
          id: string
          key: string
          name: string
          category: string
          customerPrice: number
          tailorRate: number
        }>
        setServiceOptions(serviceData)
      }
      if (clothResponse.ok) {
        const clothData = (await clothResponse.json()) as Array<{
          id: string
          name: string
          clothType: ClothType
          price: number
          description?: string
        }>
        setClothOptions(clothData)
      }
    }
    loadMeta()
  }, [])

  const selectedService = serviceOptions.find((service) => service.key === formData.serviceKey)
  const selectedClothOption = clothOptions.find((item) => item.id === formData.clothOptionId)
  const clothCharge = formData.clothSource === "FROM_US" ? selectedClothOption?.price || 0 : 0
  const estimatedTotal = (selectedService?.customerPrice || 0) + clothCharge

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    setError("")
    if (!isValidImageFile(file)) {
      setError("Fabric image must be JPG/PNG/WebP/GIF and less than 10MB.")
      return
    }

    setUploadingFabric(true)
    setUploadProgress(0)
    try {
      const uploaded = await uploadFile(file, "/tailorhub/custom-orders/fabric", setUploadProgress)
      setFormData((prev) => ({ ...prev, fabricImageUrl: uploaded.url }))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload fabric image.")
    } finally {
      setUploadingFabric(false)
    }
  }

  const handleChange = (value: string, field: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!formData.measurementId || !formData.serviceKey || !formData.clothType) {
      setError("Please complete all required fields.")
      return
    }
    if (formData.clothSource === "FROM_US" && !formData.clothOptionId) {
      setError("Please select cloth from our options.")
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/stitching-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clothType: formData.clothType,
          clothSource: formData.clothSource,
          clothOptionId: formData.clothOptionId || undefined,
          fabricImage: formData.fabricImageUrl || null,
          serviceKey: formData.serviceKey,
          measurementId: formData.measurementId,
          notes: formData.notes,
        }),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => ({ error: "Failed to create custom order." }))) as {
          error?: string
          url?: string
        }
        if (data.url?.includes("/api/auth/error")) {
          setError("Your session expired. Please login again and place the order.")
          return
        }
        setError(data.error || "Failed to create custom order.")
        return
      }

      setSuccess("Custom order created successfully.")
      router.push("/customer/orders")
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/customer/orders">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Link>
        </Button>

        <h1 className="text-2xl md:text-3xl font-bold mb-2">Create Custom Stitching Order</h1>
        <p className="text-muted-foreground mb-6 md:mb-8">Fill in your details and upload your fabric</p>

        <FeedbackToasts error={error} success={success} />

        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-2 flex-1 rounded ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <Card className="p-5 md:p-8">
              <h2 className="text-xl font-bold mb-6">Select Fabric Type</h2>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-3">Cloth Source</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, clothSource: "OWN", clothOptionId: "" }))
                      }
                      className={`rounded-lg border p-3 text-left ${formData.clothSource === "OWN" ? "border-primary bg-primary/5" : ""}`}
                    >
                      <p className="font-medium">I have my own cloth</p>
                      <p className="text-xs text-muted-foreground">No cloth charge</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, clothSource: "FROM_US" }))}
                      className={`rounded-lg border p-3 text-left ${formData.clothSource === "FROM_US" ? "border-primary bg-primary/5" : ""}`}
                    >
                      <p className="font-medium">Choose cloth from us</p>
                      <p className="text-xs text-muted-foreground">Cloth charge will be added</p>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-3">Cloth Type</label>
                  <Select value={formData.clothType} onValueChange={(value) => handleChange(value, "clothType")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a cloth type" />
                    </SelectTrigger>
                    <SelectContent>
                      {clothTypes.map((cloth) => (
                        <SelectItem key={cloth.value} value={cloth.value}>
                          {cloth.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.clothSource === "FROM_US" ? (
                  <div>
                    <label className="block text-sm font-medium mb-3">Choose Cloth Option</label>
                    <Select
                      value={formData.clothOptionId}
                      onValueChange={(value) => {
                        const option = clothOptions.find((item) => item.id === value)
                        setFormData((prev) => ({
                          ...prev,
                          clothOptionId: value,
                          clothType: option?.clothType || prev.clothType,
                        }))
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select cloth option" />
                      </SelectTrigger>
                      <SelectContent>
                        {clothOptions.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({item.clothType}) - Rs. {formatCurrency(item.price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedClothOption?.description ? (
                      <p className="mt-2 text-xs text-muted-foreground">{selectedClothOption.description}</p>
                    ) : null}
                  </div>
                ) : null}

                {formData.clothSource === "OWN" ? (
                  <div>
                  <label className="block text-sm font-medium mb-3">Upload Fabric Image</label>
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="fabric-image"
                    />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                      <p className="font-medium">Click to upload or drag and drop</p>
                      <p className="text-sm text-muted-foreground">PNG, JPG up to 10MB</p>
                    </button>
                    {uploadingFabric ? (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs text-muted-foreground">Uploading: {uploadProgress}%</p>
                        <Progress value={uploadProgress} />
                      </div>
                    ) : null}
                    {formData.fabricImageUrl ? <p className="text-sm text-green-600 mt-2">Fabric image uploaded</p> : null}
                  </div>
                </div>
                ) : null}
              </div>

              <Button type="button" onClick={() => setStep(2)} disabled={!formData.clothType}>
                Continue
              </Button>
            </Card>
          )}

          {step === 2 && (
            <Card className="p-5 md:p-8">
              <h2 className="text-xl font-bold mb-6">Select Stitching Service</h2>
              <RadioGroup
                value={formData.serviceKey}
                onValueChange={(value) => handleChange(value, "serviceKey")}
              >
                <div className="space-y-3 mb-6">
                  {serviceOptions.map((service) => (
                    <div
                      key={service.key}
                      className="flex items-center border rounded-lg p-4 cursor-pointer hover:bg-secondary"
                    >
                      <RadioGroupItem value={service.key} id={service.key} />
                      <label htmlFor={service.key} className="flex-1 ml-3 cursor-pointer">
                        <p className="font-medium">{service.name}</p>
                        <p className="text-xs text-muted-foreground">{service.category}</p>
                        <p className="text-sm text-muted-foreground">Price: Rs. {formatCurrency(service.customerPrice)}</p>
                      </label>
                    </div>
                  ))}
                </div>
              </RadioGroup>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="button" onClick={() => setStep(3)} disabled={!formData.serviceKey}>
                  Continue
                </Button>
              </div>
            </Card>
          )}

          {step === 3 && (
            <Card className="p-5 md:p-8">
              <h2 className="text-xl font-bold mb-6">Select Measurements & Review</h2>
              <div className="space-y-6 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-3">Saved Measurements</label>
                  <Select
                    value={formData.measurementId}
                    onValueChange={(value) => handleChange(value, "measurementId")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a saved measurement profile" />
                    </SelectTrigger>
                    <SelectContent>
                      {measurementOptions.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} {item.isVerified ? "- Verified" : "- Suggested"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Additional Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleChange(e.target.value, "notes")}
                    placeholder="Any special requirements or preferences..."
                    className="w-full p-2 border rounded text-sm"
                    rows={3}
                  />
                </div>

                <div className="bg-secondary p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Estimated Price</p>
                  <p className="text-sm text-muted-foreground">Stitching: Rs. {formatCurrency(selectedService?.customerPrice ?? 0)}</p>
                  <p className="text-sm text-muted-foreground">Cloth: Rs. {formatCurrency(clothCharge)}</p>
                  <p className="text-3xl font-bold mt-1">Rs. {formatCurrency(estimatedTotal)}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button type="submit" size="lg" className="min-w-40" disabled={submitting}>
                  {submitting ? <><Spinner className="mr-2" />Placing...</> : "Place Order"}
                </Button>
              </div>
            </Card>
          )}
        </form>
      </div>
    </div>
  )
}

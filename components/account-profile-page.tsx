"use client"

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PhoneInputWithContact } from "@/components/ui/phone-input-with-contact"
import { Progress } from "@/components/ui/progress"
import { FeedbackToasts } from "@/components/feedback-toasts"
import { Spinner } from "@/components/ui/spinner"
import { isValidImageFile, uploadFile } from "@/lib/file-upload"
import { validateIndianMobile } from "@/lib/validation"

type AccountProfile = {
  id: string
  name: string
  email: string
  phone?: string | null
  profileImage?: string | null
  role: "ADMIN" | "TAILOR" | "CUSTOMER"
  tailorProfile?: {
    bio?: string | null
    specializations?: string | null
    yearsExperience?: number
  } | null
}

type AccountProfilePageProps = {
  title: string
}

type ServiceOption = {
  id: string
  key: string
  name: string
  category: string
}

type AddressRecord = {
  id: string
  street: string
  city: string
  state: string
  postalCode: string
  country: string
  isDefault: boolean
}

export function AccountProfilePage({ title }: AccountProfilePageProps) {
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageUploadProgress, setImageUploadProgress] = useState(0)
  const [pendingProfilePreview, setPendingProfilePreview] = useState("")

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [role, setRole] = useState<"ADMIN" | "TAILOR" | "CUSTOMER">("CUSTOMER")

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [profileImage, setProfileImage] = useState("")
  const [bio, setBio] = useState("")
  const [specializations, setSpecializations] = useState("")
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([])
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([])
  const [yearsExperience, setYearsExperience] = useState("")
  const [passkeys, setPasskeys] = useState<{ id: string; createdAt: string; lastUsedAt?: string | null }[]>([])
  const [passkeyBusy, setPasskeyBusy] = useState(false)
  const [addresses, setAddresses] = useState<AddressRecord[]>([])
  const [addressBusy, setAddressBusy] = useState(false)
  const [addressStreet, setAddressStreet] = useState("")
  const [addressCity, setAddressCity] = useState("")
  const [addressState, setAddressState] = useState("")
  const [addressPostalCode, setAddressPostalCode] = useState("")
  const [addressCountry, setAddressCountry] = useState("India")
  const [addressDefault, setAddressDefault] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      setError("")
      try {
        const response = await fetch("/api/account/profile", { cache: "no-store" })
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Failed to load profile." }))
          setError(data.error || "Failed to load profile.")
          return
        }

        const profile = (await response.json()) as AccountProfile
        setRole(profile.role)
        setName(profile.name)
        setEmail(profile.email)
        setPhone(profile.phone || "")
        setProfileImage(profile.profileImage || "")
        setBio(profile.tailorProfile?.bio || "")
        setSpecializations(profile.tailorProfile?.specializations || "")
        setSelectedSpecializations(
          (profile.tailorProfile?.specializations || "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
        )
        setYearsExperience(String(profile.tailorProfile?.yearsExperience ?? ""))
      } catch {
        setError("Failed to load profile.")
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  useEffect(() => {
    const loadPasskeys = async () => {
      const response = await fetch("/api/account/passkeys", { cache: "no-store" })
      if (!response.ok) return
      const data = (await response.json()) as { id: string; createdAt: string; lastUsedAt?: string | null }[]
      setPasskeys(data)
    }
    void loadPasskeys()
  }, [])

  useEffect(() => {
    const loadAddresses = async () => {
      const response = await fetch("/api/account/addresses", { cache: "no-store" })
      if (!response.ok) return
      const data = (await response.json()) as AddressRecord[]
      setAddresses(data)
    }
    void loadAddresses()
  }, [])

  useEffect(() => {
    if (role !== "TAILOR") return
    const loadServices = async () => {
      const response = await fetch("/api/stitching-services", { cache: "no-store" })
      if (!response.ok) return
      const data = (await response.json()) as ServiceOption[]
      setServiceOptions(data)
    }
    loadServices()
  }, [role])

  const onUploadProfileImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setError("")
    setSuccess("")

    if (!isValidImageFile(file)) {
      setError("Profile picture must be JPG/PNG/WebP/GIF and less than 10MB.")
      return
    }

    setUploadingImage(true)
    setImageUploadProgress(0)
    const localPreview = URL.createObjectURL(file)
    setPendingProfilePreview(localPreview)
    try {
      const uploaded = await uploadFile(file, "/tailorhub/profiles", setImageUploadProgress)
      setProfileImage(uploaded.url)
      setSuccess("Profile image uploaded.")
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload profile image.")
    } finally {
      setUploadingImage(false)
      if (localPreview) URL.revokeObjectURL(localPreview)
      setPendingProfilePreview("")
    }
  }

  const onSaveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSavingProfile(true)

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          profileImage,
          bio: role === "TAILOR" ? bio : undefined,
          specializations: role === "TAILOR" ? specializations : undefined,
          yearsExperience: role === "TAILOR" ? Number(yearsExperience || 0) : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to update profile." }))
        setError(data.error || "Failed to update profile.")
        return
      }

      if (role === "TAILOR") {
        await fetch("/api/account/specializations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ specializations: selectedSpecializations }),
        })
      }

      setSuccess("Profile updated successfully.")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update profile.")
    } finally {
      setSavingProfile(false)
    }
  }

  const registerPasskey = async () => {
    setError("")
    setSuccess("")
    setPasskeyBusy(true)
    try {
      const { startRegistration } = await import("@simplewebauthn/browser")
      const optionsResponse = await fetch("/api/auth/passkey/register/options", {
        method: "POST",
      })
      const optionsData = (await optionsResponse.json()) as {
        error?: string
        challengeId?: string
        options?: unknown
      }
      if (!optionsResponse.ok || !optionsData.options || !optionsData.challengeId) {
        throw new Error(optionsData.error || "Failed to initialize passkey registration")
      }

      const registrationResponse = await startRegistration(optionsData.options as any)
      const verifyResponse = await fetch("/api/auth/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: optionsData.challengeId,
          response: registrationResponse,
        }),
      })
      const verifyData = (await verifyResponse.json()) as { error?: string }
      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || "Passkey registration failed")
      }

      const listResponse = await fetch("/api/account/passkeys", { cache: "no-store" })
      if (listResponse.ok) {
        const listData = (await listResponse.json()) as { id: string; createdAt: string; lastUsedAt?: string | null }[]
        setPasskeys(listData)
      }
      setSuccess("Passkey added successfully.")
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "Failed to register passkey.")
    } finally {
      setPasskeyBusy(false)
    }
  }

  const removePasskey = async (id: string) => {
    setError("")
    setSuccess("")
    setPasskeyBusy(true)
    try {
      const response = await fetch("/api/account/passkeys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(data.error || "Failed to remove passkey")
      }

      setPasskeys((prev) => prev.filter((item) => item.id !== id))
      setSuccess("Passkey removed.")
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Failed to remove passkey.")
    } finally {
      setPasskeyBusy(false)
    }
  }

  const addAddress = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    if (!addressStreet || !addressCity || !addressState || !addressPostalCode || !addressCountry) {
      setError("All address fields are required.")
      return
    }

    setAddressBusy(true)
    try {
      const response = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          street: addressStreet,
          city: addressCity,
          state: addressState,
          postalCode: addressPostalCode,
          country: addressCountry,
          isDefault: addressDefault,
        }),
      })
      const data = (await response.json()) as AddressRecord | { error?: string }
      if (!response.ok) {
        setError((data as { error?: string }).error || "Failed to add address.")
        return
      }
      const added = data as AddressRecord
      setAddresses((prev) => {
        const next = addressDefault ? prev.map((item) => ({ ...item, isDefault: false })) : prev
        return [added, ...next]
      })
      setAddressStreet("")
      setAddressCity("")
      setAddressState("")
      setAddressPostalCode("")
      setAddressCountry("India")
      setAddressDefault(false)
      setSuccess("Address added.")
    } finally {
      setAddressBusy(false)
    }
  }

  const setDefaultAddress = async (id: string) => {
    setAddressBusy(true)
    try {
      const response = await fetch(`/api/account/addresses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      })
      if (!response.ok) {
        setError("Failed to set default address.")
        return
      }
      setAddresses((prev) => prev.map((item) => ({ ...item, isDefault: item.id === id })))
    } finally {
      setAddressBusy(false)
    }
  }

  const deleteAddress = async (id: string) => {
    setAddressBusy(true)
    try {
      const response = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" })
      if (!response.ok) {
        setError("Failed to delete address.")
        return
      }
      setAddresses((prev) => prev.filter((item) => item.id !== id))
    } finally {
      setAddressBusy(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading profile...</div>
  }

  const groupedServices = serviceOptions.reduce<Record<string, ServiceOption[]>>((acc, service) => {
    if (!acc[service.category]) acc[service.category] = []
    acc[service.category].push(service)
    return acc
  }, {})

  const toggleSpecialization = (key: string) => {
    setSelectedSpecializations((prev) =>
      prev.includes(key) ? prev.filter((value) => value !== key) : [...prev, key],
    )
  }

  const isPhoneValid = !phone.trim() || validateIndianMobile(phone)

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">{title}</h1>

      <FeedbackToasts error={error} success={success} />

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Profile Information</h2>
        <form onSubmit={onSaveProfile} className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={onUploadProfileImage}
          />

          <div className="flex items-center gap-4">
            <div className="size-24 rounded-full border overflow-hidden bg-muted">
              {pendingProfilePreview || profileImage ? (
                <img src={pendingProfilePreview || profileImage} alt="Profile" className="size-24 object-cover" />
              ) : (
                <div className="size-24 flex items-center justify-center text-sm text-muted-foreground">No image</div>
              )}
            </div>
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}>
              {uploadingImage ? "Uploading..." : "Change Profile Picture"}
            </Button>
          </div>

          {uploadingImage ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Upload progress: {imageUploadProgress}%</p>
              <Progress value={imageUploadProgress} />
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" required />
            <PhoneInputWithContact value={phone} onChange={setPhone} placeholder="Phone number" />
          </div>
          {!isPhoneValid ? <p className="text-xs text-red-600">Enter a valid Indian mobile number</p> : null}

          {role === "TAILOR" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
                type="number"
                min="0"
                placeholder="Years of Experience"
              />
              <div className="md:col-span-2">
                <Input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <p className="text-sm font-medium">Specializations</p>
                <div className="space-y-3 rounded-md border p-3 max-h-64 overflow-y-auto">
                  {Object.keys(groupedServices).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No stitching services configured yet.</p>
                  ) : (
                    Object.entries(groupedServices).map(([category, items]) => (
                      <div key={category} className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">{category}</p>
                        {items.map((item) => (
                          <label key={item.id} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={selectedSpecializations.includes(item.key)} onChange={() => toggleSpecialization(item.key)} />
                            <span>{item.name}</span>
                          </label>
                        ))}
                      </div>
                    ))
                  )}
                </div>
                {specializations ? (
                  <p className="text-xs text-muted-foreground">Current stored value: {specializations}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          <Button type="submit" size="lg" className="min-w-40 mx-auto flex" disabled={savingProfile || !isPhoneValid}>
            {savingProfile ? <><Spinner className="mr-2" />Saving...</> : "Save Profile"}
          </Button>
        </form>
      </Card>

      {role === "CUSTOMER" ? (
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Saved Addresses</h2>
          <form onSubmit={addAddress} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} placeholder="Street" />
            <Input value={addressCity} onChange={(e) => setAddressCity(e.target.value)} placeholder="City" />
            <Input value={addressState} onChange={(e) => setAddressState(e.target.value)} placeholder="State" />
            <Input value={addressPostalCode} onChange={(e) => setAddressPostalCode(e.target.value)} placeholder="Postal code" />
            <Input value={addressCountry} onChange={(e) => setAddressCountry(e.target.value)} placeholder="Country" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={addressDefault} onChange={(e) => setAddressDefault(e.target.checked)} />
              Set as default
            </label>
            <div className="md:col-span-2">
              <Button type="submit" size="lg" className="min-w-36" disabled={addressBusy}>{addressBusy ? <><Spinner className="mr-2" />Saving...</> : "Add Address"}</Button>
            </div>
          </form>
          {addresses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No addresses saved yet.</p>
          ) : (
            <div className="space-y-2">
              {addresses.map((address) => (
                <div key={address.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                  <p className="text-sm">
                    {address.street}, {address.city}, {address.state}, {address.postalCode}, {address.country}
                    {address.isDefault ? " (Default)" : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    {!address.isDefault ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => void setDefaultAddress(address.id)} disabled={addressBusy}>
                        Make Default
                      </Button>
                    ) : null}
                    <Button type="button" size="sm" variant="destructive" onClick={() => void deleteAddress(address.id)} disabled={addressBusy}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Passkeys</h2>
          <Button type="button" variant="outline" onClick={registerPasskey} disabled={passkeyBusy}>
            {passkeyBusy ? "Please wait..." : "Add Passkey"}
          </Button>
        </div>
        {passkeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No passkeys registered yet.</p>
        ) : (
          <div className="space-y-2">
            {passkeys.map((passkey) => (
              <div key={passkey.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="text-sm">
                  <p className="font-medium">Passkey</p>
                  <p className="text-muted-foreground">
                    Added: {new Date(passkey.createdAt).toLocaleString()}
                    {passkey.lastUsedAt ? ` | Last used: ${new Date(passkey.lastUsedAt).toLocaleString()}` : ""}
                  </p>
                </div>
                <Button type="button" size="sm" variant="destructive" onClick={() => removePasskey(passkey.id)} disabled={passkeyBusy}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

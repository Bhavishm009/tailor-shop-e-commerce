"use client"

import Image from "next/image"
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { isValidImageFile, uploadFile } from "@/lib/file-upload"

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

export function AccountProfilePage({ title }: AccountProfilePageProps) {
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageUploadProgress, setImageUploadProgress] = useState(0)

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

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

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
    try {
      const uploaded = await uploadFile(file, "/tailorhub/profiles", setImageUploadProgress)
      setProfileImage(uploaded.url)
      setSuccess("Profile image uploaded.")
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload profile image.")
    } finally {
      setUploadingImage(false)
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
    } finally {
      setSavingProfile(false)
    }
  }

  const onChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSavingPassword(true)

    try {
      const response = await fetch("/api/account/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to update password." }))
        setError(data.error || "Failed to update password.")
        return
      }

      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setSuccess("Password updated successfully.")
    } finally {
      setSavingPassword(false)
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

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">{title}</h1>

      {error ? <Card className="p-4 text-sm text-red-600 border-red-300">{error}</Card> : null}
      {success ? <Card className="p-4 text-sm text-green-700 border-green-300">{success}</Card> : null}

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
              {profileImage ? (
                <Image src={profileImage} alt="Profile" width={96} height={96} className="size-24 object-cover" />
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
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
          </div>

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

          <Button type="submit" disabled={savingProfile}>
            {savingProfile ? "Saving..." : "Save Profile"}
          </Button>
        </form>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Change Password</h2>
        <form onSubmit={onChangePassword} className="space-y-3 max-w-xl">
          <Input
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            type="password"
            required
          />
          <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" type="password" required />
          <Input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            type="password"
            required
          />
          <Button type="submit" disabled={savingPassword}>
            {savingPassword ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </Card>
    </div>
  )
}

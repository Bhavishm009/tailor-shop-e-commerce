"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type PhoneInputWithContactProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  onContactPicked?: (contact: { name?: string; phone: string }) => void
}

type ContactSelectResult = {
  name?: string[]
  tel?: string[]
}

function normalizePhone(rawPhone: string) {
  const digits = rawPhone.replace(/\D+/g, "")
  if (!digits) return ""
  return digits.length > 10 ? digits.slice(-10) : digits
}

export function PhoneInputWithContact({
  id,
  value,
  onChange,
  placeholder = "10-digit mobile number",
  className,
  onContactPicked,
}: PhoneInputWithContactProps) {
  const [supported, setSupported] = useState(false)
  const [picking, setPicking] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const hasPicker =
      "contacts" in navigator &&
      typeof (navigator as Navigator & { contacts?: { select?: unknown } }).contacts?.select === "function"
    setSupported(hasPicker)
  }, [])

  const pickFromContact = async () => {
    if (!supported || picking) return
    setPicking(true)
    try {
      const contactApi = (navigator as Navigator & {
        contacts?: {
          select: (properties: Array<"name" | "tel">, options?: { multiple?: boolean }) => Promise<ContactSelectResult[]>
        }
      }).contacts

      if (!contactApi?.select) return
      const selected = await contactApi.select(["name", "tel"], { multiple: false })
      const first = selected?.[0]
      const phoneRaw = first?.tel?.[0] || ""
      const phone = normalizePhone(phoneRaw)
      if (!phone) return
      onChange(phone)
      onContactPicked?.({
        name: first?.name?.[0],
        phone,
      })
    } finally {
      setPicking(false)
    }
  }

  return (
    <div className={`flex gap-2 ${className || ""}`}>
      <Input id={id} type="tel" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      <Button
        type="button"
        variant="outline"
        onClick={() => void pickFromContact()}
        disabled={!supported || picking}
        title={!supported ? "Contact picker is not supported in this browser." : undefined}
      >
        {picking ? "Picking..." : "Pick Contact"}
      </Button>
    </div>
  )
}

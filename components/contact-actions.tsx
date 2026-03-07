"use client"

import { Button } from "@/components/ui/button"
import { MessageCircle, Phone } from "lucide-react"

type ContactActionsProps = {
  phone?: string | null
  name?: string
  whatsappMessage?: string
  className?: string
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D+/g, "")
  if (digits.length === 0) return ""
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 12 && digits.startsWith("91")) return digits
  return digits
}

export function ContactActions({ phone, name, whatsappMessage, className }: ContactActionsProps) {
  const rawPhone = (phone || "").trim()
  if (!rawPhone) return null

  const normalized = normalizePhone(rawPhone)
  const message = whatsappMessage || `Hello ${name || ""}`.trim()

  const onCall = () => {
    if (typeof window === "undefined") return
    window.location.href = `tel:${rawPhone}`
  }

  const onWhatsapp = () => {
    if (typeof window === "undefined" || !normalized) return
    const encodedMessage = encodeURIComponent(message)
    window.open(`https://wa.me/${normalized}?text=${encodedMessage}`, "_blank", "noopener,noreferrer")
  }

  return (
    <div className={className || "flex items-center gap-2"}>
      <Button type="button" size="sm" variant="outline" onClick={onCall}>
        <Phone className="mr-2 h-4 w-4" />
        Call
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={onWhatsapp} disabled={!normalized}>
        <MessageCircle className="mr-2 h-4 w-4" />
        WhatsApp
      </Button>
    </div>
  )
}

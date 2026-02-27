export function getRpId() {
  const explicit = process.env.PASSKEY_RP_ID || process.env.NEXT_PUBLIC_PASSKEY_RP_ID
  if (explicit) return explicit

  const fromUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL
  if (fromUrl) {
    try {
      return new URL(fromUrl).hostname
    } catch {
      // fall back to localhost below
    }
  }

  return "localhost"
}

export function getRpName() {
  return process.env.PASSKEY_RP_NAME || "TailorHub"
}

export function getExpectedOrigins() {
  const origins = [
    process.env.PASSKEY_ORIGIN,
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    "http://localhost:3000",
  ].filter(Boolean) as string[]

  return Array.from(new Set(origins))
}

import { cookies, headers } from "next/headers"
import { getDictionary, normalizeLanguage, type LanguageCode } from "@/lib/i18n"

function parseAcceptLanguage(raw: string | null): LanguageCode {
  if (!raw) return "en"
  const candidates = raw
    .split(",")
    .map((entry) => entry.trim().split(";")[0]?.toLowerCase() || "")
    .filter(Boolean)

  for (const candidate of candidates) {
    const direct = normalizeLanguage(candidate)
    if (direct !== "en" || candidate === "en") return direct
    const base = candidate.split("-")[0]
    const normalizedBase = normalizeLanguage(base)
    if (normalizedBase !== "en" || base === "en") return normalizedBase
  }
  return "en"
}

export async function getServerLanguage(): Promise<LanguageCode> {
  const cookieStore = await cookies()
  const lang = cookieStore.get("lang")?.value
  if (lang) return normalizeLanguage(lang)
  const headerStore = await headers()
  return parseAcceptLanguage(headerStore.get("accept-language"))
}

export async function getServerDictionary() {
  const lang = await getServerLanguage()
  return getDictionary(lang)
}

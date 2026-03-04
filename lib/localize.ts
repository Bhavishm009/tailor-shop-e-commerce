import type { LanguageCode } from "@/lib/i18n"

type LocalizedRecord = Partial<Record<LanguageCode, string>>

const catalogTranslations: Record<string, LocalizedRecord> = {
  shirt: { hi: "शर्ट", mr: "शर्ट" },
  shirts: { hi: "शर्ट्स", mr: "शर्ट्स" },
  pant: { hi: "पैंट", mr: "पॅंट" },
  pants: { hi: "पैंट्स", mr: "पॅंट्स" },
  trouser: { hi: "ट्राउज़र", mr: "ट्राउझर" },
  trousers: { hi: "ट्राउज़र्स", mr: "ट्राउझर्स" },
  kurta: { hi: "कुर्ता", mr: "कुर्ता" },
  kurti: { hi: "कुर्ती", mr: "कुर्ती" },
  saree: { hi: "साड़ी", mr: "साडी" },
  dress: { hi: "ड्रेस", mr: "ड्रेस" },
  jacket: { hi: "जैकेट", mr: "जॅकेट" },
  cotton: { hi: "कॉटन", mr: "कॉटन" },
  linen: { hi: "लिनेन", mr: "लिनेन" },
  silk: { hi: "सिल्क", mr: "सिल्क" },
  wool: { hi: "ऊन", mr: "लोकर" },
  red: { hi: "लाल", mr: "लाल" },
  black: { hi: "काला", mr: "काळा" },
  blue: { hi: "नीला", mr: "निळा" },
  white: { hi: "सफेद", mr: "पांढरा" },
  green: { hi: "हरा", mr: "हिरवा" },
  yellow: { hi: "पीला", mr: "पिवळा" },
  brown: { hi: "भूरा", mr: "तपकिरी" },
  gray: { hi: "धूसर", mr: "राखाडी" },
}

function parseJsonIfPossible(value: string) {
  const trimmed = value.trim()
  if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) return null
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return null
  }
}

function isLocalizedRecord(value: unknown): value is LocalizedRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function getLocalizedText(value: unknown, language: LanguageCode, fallback = ""): string {
  if (value == null) return fallback

  if (typeof value === "string") {
    const parsed = parseJsonIfPossible(value)
    if (isLocalizedRecord(parsed)) {
      return String(parsed[language] || parsed.en || fallback)
    }
    return value || fallback
  }

  if (isLocalizedRecord(value)) {
    return String(value[language] || value.en || fallback)
  }

  return String(value)
}

export function localizeCatalogLabel(value: string | null | undefined, language: LanguageCode) {
  const raw = String(value || "").trim()
  if (!raw) return ""
  if (language === "en") return raw

  const tokens = raw.split(/\s+/)
  const translated = tokens.map((token) => {
    const normalized = token.toLowerCase()
    return catalogTranslations[normalized]?.[language] || token
  })
  return translated.join(" ")
}

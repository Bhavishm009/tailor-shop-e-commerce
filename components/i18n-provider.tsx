"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { getDictionary, normalizeLanguage, type LanguageCode } from "@/lib/i18n"

type I18nContextValue = {
  language: LanguageCode
  setLanguage: (language: LanguageCode) => void
  dictionary: ReturnType<typeof getDictionary>
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({
  children,
  initialLanguage = "en",
}: {
  children: React.ReactNode
  initialLanguage?: LanguageCode
}) {
  const router = useRouter()
  const [language, setLanguageState] = useState<LanguageCode>(normalizeLanguage(initialLanguage))

  useEffect(() => {
    if (typeof window === "undefined") return
    const cookieLang = document.cookie
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith("lang="))
      ?.split("=")[1]
    const localLang = window.localStorage.getItem("lang")
    const nextLang = normalizeLanguage(localLang || cookieLang || "en")
    setLanguageState(nextLang)
  }, [])

  const setLanguage = (nextLanguage: LanguageCode) => {
    const normalized = normalizeLanguage(nextLanguage)
    setLanguageState(normalized)
    if (typeof window !== "undefined") {
      window.localStorage.setItem("lang", normalized)
      document.cookie = `lang=${normalized}; path=/; max-age=${60 * 60 * 24 * 365}`
      router.refresh()
    }
  }

  const dictionary = useMemo(() => getDictionary(language), [language])
  const value = useMemo(
    () => ({
      language,
      setLanguage,
      dictionary,
    }),
    [language, dictionary],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider")
  }
  return context
}

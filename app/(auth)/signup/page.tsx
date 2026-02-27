"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { FeedbackToasts } from "@/components/feedback-toasts"
import { Spinner } from "@/components/ui/spinner"
import { Scissors } from "lucide-react"
import { GlobalNavbar } from "@/components/global-navbar"
import { validateEmail, validateIndianMobile } from "@/lib/validation"

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    dateOfBirth: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState("")
  const [providers, setProviders] = useState<{ google: boolean; facebook: boolean }>({ google: false, facebook: false })

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/auth/providers", { cache: "no-store" })
      if (!response.ok) return
      const data = (await response.json()) as Record<string, unknown>
      setProviders({
        google: Boolean(data.google),
        facebook: Boolean(data.facebook),
      })
    })()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!validateEmail(formData.email)) {
      setError("Enter a valid email")
      return
    }
    if (!validateIndianMobile(formData.phone)) {
      setError("Enter a valid Indian mobile number")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          dateOfBirth: formData.dateOfBirth,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Signup failed")
      }

      router.push("/login")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed")
    } finally {
      setLoading(false)
    }
  }

  const handleSocialSignup = async (provider: "google" | "facebook") => {
    setError("")
    if ((provider === "google" && !providers.google) || (provider === "facebook" && !providers.facebook)) {
      setError(`${provider === "google" ? "Google" : "Facebook"} login is not configured yet. Ask admin to add provider keys.`)
      return
    }
    setSocialLoading(provider)
    try {
      await signIn(provider)
    } finally {
      setSocialLoading("")
    }
  }

  const isNameValid = formData.name.trim().length >= 2
  const isEmailValid = validateEmail(formData.email)
  const isPhoneValid = validateIndianMobile(formData.phone)
  const isDobValid = Boolean(formData.dateOfBirth)
  const canSubmit = isNameValid && isEmailValid && isPhoneValid && isDobValid && !loading && !socialLoading

  return (
    <div className="min-h-screen bg-background">
      <GlobalNavbar />
      <div className="px-4 py-8 md:py-12 flex items-center justify-center">
        <div className="w-full max-w-5xl">
          <Card className="overflow-hidden p-0">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="relative hidden lg:block min-h-[680px]">
                <img src="/placeholder.jpg" alt="TailorHub signup" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/45 p-8 flex flex-col justify-end text-white">
                  <div className="flex items-center gap-2 mb-4">
                    <Scissors className="w-7 h-7" />
                    <h1 className="text-2xl font-bold">TailorHub</h1>
                  </div>
                  <h2 className="text-3xl font-bold leading-tight">Create your account and start shopping or stitching.</h2>
                  <p className="mt-3 text-sm text-white/90">Sign up with details or continue quickly using social login.</p>
                </div>
              </div>

              <div className="p-5 sm:p-7 md:p-8">
                <div className="flex items-center gap-2 mb-5 lg:hidden">
                  <Scissors className="w-7 h-7 text-primary" />
                  <h1 className="text-2xl font-bold">TailorHub</h1>
                </div>
                <h2 className="text-2xl font-bold mb-5">Create Account</h2>

                <FeedbackToasts error={error} />

                <div className="space-y-2 mb-4">
                  <Button type="button" variant="outline" className="w-full" disabled={loading || Boolean(socialLoading)} onClick={() => handleSocialSignup("google")}>
                    <span className="mr-2 inline-flex">
                      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.6 12 2.6 6.9 2.6 2.7 6.8 2.7 12s4.2 9.4 9.3 9.4c5.4 0 9-3.8 9-9.1 0-.6-.1-1.1-.2-1.6H12z" />
                      </svg>
                    </span>
                    {socialLoading === "google" ? "Redirecting..." : "Continue with Google"}
                  </Button>
                  <Button type="button" variant="outline" className="w-full" disabled={loading || Boolean(socialLoading)} onClick={() => handleSocialSignup("facebook")}>
                    <span className="mr-2 inline-flex">
                      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.8v-8.3H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.3A12 12 0 0 0 24 12z" />
                      </svg>
                    </span>
                    {socialLoading === "facebook" ? "Redirecting..." : "Continue with Facebook"}
                  </Button>
                </div>

                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or sign up with email</span>
                  </div>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-2">
                      Full Name
                    </label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      required
                    />
                    {!isNameValid && formData.name ? <p className="text-xs text-red-600 mt-1">Name is too short</p> : null}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                      Email
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      required
                    />
                    {!isEmailValid && formData.email ? <p className="text-xs text-red-600 mt-1">Invalid email</p> : null}
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium mb-2">
                      Mobile Number
                    </label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="9876543210"
                      required
                    />
                    {!isPhoneValid && formData.phone ? (
                      <p className="text-xs text-red-600 mt-1">Enter valid Indian mobile (starts with 6-9)</p>
                    ) : null}
                  </div>

                  <div>
                    <label htmlFor="dateOfBirth" className="block text-sm font-medium mb-2">
                      Date of Birth
                    </label>
                    <DatePicker
                      value={formData.dateOfBirth}
                      onChange={(value) => setFormData((prev) => ({ ...prev, dateOfBirth: value }))}
                      placeholder="Select date of birth"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={!canSubmit}>
                    {loading ? <><Spinner className="mr-2" />Creating account...</> : "Sign Up"}
                  </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground mt-4">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

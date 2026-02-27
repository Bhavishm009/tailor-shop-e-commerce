"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { FeedbackToasts } from "@/components/feedback-toasts"
import { Spinner } from "@/components/ui/spinner"
import { Scissors } from "lucide-react"
import { GlobalNavbar } from "@/components/global-navbar"
import { getDashboardByRole } from "@/lib/role-routes"
import { validateEmail } from "@/lib/validation"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [otpRequested, setOtpRequested] = useState(false)
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState("")
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
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

  const isEmailValid = validateEmail(email)
  const canRequestOtp = isEmailValid && !loading
  const canVerifyOtp = isEmailValid && otp.trim().length === 6 && !loading

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setInfo("")
    setLoading(true)

    try {
      if (otpRequested) {
        if (otp.trim().length !== 6) {
          throw new Error("Enter the 6-digit OTP sent to your email")
        }

        const result = await signIn("credentials", {
          email,
          otp: otp.trim(),
          redirect: false,
        })

        const hasCredentialsError =
          !result ||
          Boolean(result.error) ||
          Boolean(result.url && result.url.includes("error=CredentialsSignin"))

        if (hasCredentialsError) {
          throw new Error("Invalid OTP or expired OTP")
        }

        const sessionResponse = await fetch("/api/auth/session")
        const session = await sessionResponse.json()
        const targetPath = getDashboardByRole(session?.user?.role)

        router.push(targetPath)
        router.refresh()
        return
      }

      const otpResponse = await fetch("/api/auth/request-login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const otpData = (await otpResponse.json()) as { error?: string }

      if (!otpResponse.ok) {
        throw new Error(otpData.error || "Login failed")
      }

      setOtpRequested(true)
      setInfo("OTP sent to your email. Enter it below to continue.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  const handleSocialLogin = async (provider: "google" | "facebook") => {
    setError("")
    setInfo("")
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

  const handlePasskeyLogin = async () => {
    setError("")
    setInfo("")
    setPasskeyLoading(true)
    try {
      const { startAuthentication } = await import("@simplewebauthn/browser")

      const optionsResponse = await fetch("/api/auth/passkey/auth/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const optionsData = (await optionsResponse.json()) as {
        error?: string
        challengeId?: string
        options?: unknown
      }
      if (!optionsResponse.ok || !optionsData.options || !optionsData.challengeId) {
        throw new Error(optionsData.error || "Passkey is not available right now")
      }

      const passkeyResponse = await startAuthentication(optionsData.options as any)

      const verifyResponse = await fetch("/api/auth/passkey/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: optionsData.challengeId,
          response: passkeyResponse,
        }),
      })
      const verifyData = (await verifyResponse.json()) as { error?: string; loginToken?: string }
      if (!verifyResponse.ok || !verifyData.loginToken) {
        throw new Error(verifyData.error || "Passkey verification failed")
      }

      const result = await signIn("passkey", {
        loginToken: verifyData.loginToken,
        redirect: false,
      })
      if (!result || result.error) {
        throw new Error("Passkey sign in failed")
      }

      const sessionResponse = await fetch("/api/auth/session")
      const session = await sessionResponse.json()
      const targetPath = getDashboardByRole(session?.user?.role)
      router.push(targetPath)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passkey sign in failed")
    } finally {
      setPasskeyLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <GlobalNavbar />
      <div className="px-4 py-12 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Scissors className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">TailorHub</h1>
          </div>

          <Card className="p-5 sm:p-6 md:p-8">
            <h2 className="text-2xl font-bold mb-6">Sign In</h2>

            <FeedbackToasts error={error} info={info} />

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  onBlur={() => setEmailTouched(true)}
                  placeholder="you@example.com"
                  required
                  disabled={otpRequested}
                />
                {emailTouched && !isEmailValid ? (
                  <p className="text-xs text-red-600 mt-1">Enter a valid email address</p>
                ) : null}
              </div>

              {otpRequested ? (
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium mb-2">
                    Email OTP
                  </label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    required
                  />
                </div>
              ) : null}

              <Button type="submit" className="w-full" disabled={otpRequested ? !canVerifyOtp : !canRequestOtp}>
                {loading ? <><Spinner className="mr-2" />Signing in...</> : otpRequested ? "Verify OTP and Sign In" : "Send OTP"}
              </Button>

              {otpRequested ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setOtpRequested(false)
                    setOtp("")
                    setError("")
                    setInfo("")
                  }}
                >
                  Back
                </Button>
              ) : null}
            </form>

            <div className="mt-4 space-y-2">
              <Button type="button" variant="outline" className="w-full" onClick={handlePasskeyLogin} disabled={passkeyLoading || loading || socialLoading.length > 0}>
                {passkeyLoading ? "Signing in with passkey..." : "Sign in with Passkey"}
              </Button>

              <Button type="button" variant="outline" className="w-full" onClick={() => handleSocialLogin("google")} disabled={loading || passkeyLoading || socialLoading.length > 0}>
                <span className="mr-2 inline-flex">
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.6 12 2.6 6.9 2.6 2.7 6.8 2.7 12s4.2 9.4 9.3 9.4c5.4 0 9-3.8 9-9.1 0-.6-.1-1.1-.2-1.6H12z" />
                  </svg>
                </span>
                {socialLoading === "google" ? "Redirecting..." : "Continue with Google"}
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => handleSocialLogin("facebook")} disabled={loading || passkeyLoading || socialLoading.length > 0}>
                <span className="mr-2 inline-flex">
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.8v-8.3H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.3A12 12 0 0 0 24 12z" />
                  </svg>
                </span>
                {socialLoading === "facebook" ? "Redirecting..." : "Continue with Facebook"}
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Don't have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}

import type { NextAuthOptions } from "next-auth"
import NextAuth from "next-auth"
import { getServerSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import FacebookProvider from "next-auth/providers/facebook"
import { db } from "@/lib/db"
import { verifyAndConsumeLoginOtp } from "@/lib/otp-store"
import { generateSystemPasswordHash } from "@/lib/auth-utils"
import { consumePasskeyLoginToken } from "@/lib/passkey-login-store"
import { getAuthSecret } from "@/lib/auth-secret"

export const authOptions: NextAuthOptions = {
  secret: getAuthSecret() || undefined,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!account) return false

      if (account.provider === "credentials" || account.provider === "passkey") {
        return true
      }

      const email = user.email?.trim().toLowerCase()
      if (!email) return false

      let existing = await db.user.findUnique({
        where: { email },
      })

      if (!existing) {
        const hashedPassword = await generateSystemPasswordHash()
        existing = await db.user.create({
          data: {
            email,
            name: user.name || email.split("@")[0],
            password: hashedPassword,
            role: "CUSTOMER",
            profileImage: user.image || null,
          },
        })
      } else if (user.image && !existing.profileImage) {
        existing = await db.user.update({
          where: { id: existing.id },
          data: {
            profileImage: user.image,
          },
        })
      }

      ;(user as any).id = existing.id
      ;(user as any).role = existing.role
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.picture = (user as any).image || null
      }

      if ((!token.id || !token.role) && token.email) {
        const existing = await db.user.findUnique({
          where: { email: token.email.trim().toLowerCase() },
          select: {
            id: true,
            role: true,
            profileImage: true,
          },
        })
        if (existing) {
          token.id = existing.id
          token.role = existing.role
          token.picture = existing.profileImage || token.picture || null
        }
      }

      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as "ADMIN" | "TAILOR" | "CUSTOMER"
        session.user.image = (token.picture as string | null | undefined) || null
      }
      return session
    },
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email
        const otp = credentials?.otp

        if (typeof email !== "string" || typeof otp !== "string") {
          return null
        }

        const user = await db.user.findUnique({
          where: { email: email.trim().toLowerCase() },
        })

        if (!user) {
          return null
        }

        if (!(await verifyAndConsumeLoginOtp(user.email, otp.trim()))) {
          return null
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.profileImage,
          role: user.role,
        }
      },
    }),
    CredentialsProvider({
      id: "passkey",
      name: "passkey",
      credentials: {
        loginToken: { label: "Passkey Login Token", type: "text" },
      },
      async authorize(credentials) {
        const loginToken = credentials?.loginToken
        if (typeof loginToken !== "string") {
          return null
        }

        const tokenRecord = consumePasskeyLoginToken(loginToken.trim())
        if (!tokenRecord) {
          return null
        }

        const user = await db.user.findUnique({
          where: { id: tokenRecord.userId },
        })

        if (!user) {
          return null
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.profileImage,
          role: user.role,
        }
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    ...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
      ? [
          FacebookProvider({
            clientId: process.env.FACEBOOK_CLIENT_ID,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
}

const authHandler = NextAuth(authOptions)

export const handlers = {
  GET: authHandler,
  POST: authHandler,
}

export function auth() {
  return getServerSession(authOptions)
}

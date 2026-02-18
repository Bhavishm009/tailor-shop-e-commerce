import type { NextAuthOptions } from "next-auth"
import NextAuth from "next-auth"
import { getServerSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "@/lib/db"
import { verifyPassword } from "@/lib/auth-utils"

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.picture = (user as any).image || null
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
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email
        const password = credentials?.password

        if (typeof email !== "string" || typeof password !== "string") {
          return null
        }

        const user = await db.user.findUnique({
          where: { email },
        })

        if (!user) {
          return null
        }

        const isValidPassword = await verifyPassword(password, user.password)

        if (!isValidPassword) {
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

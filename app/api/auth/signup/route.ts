import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hashPassword } from "@/lib/auth-utils"

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const safeRole = role === "TAILOR" ? "TAILOR" : "CUSTOMER"

    const user = await db.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: safeRole,
      },
    })

    // If tailor, create tailor profile
    if (user.role === "TAILOR") {
      await db.tailorProfile.create({
        data: {
          userId: user.id,
        },
      })
    }

    return NextResponse.json(
      {
        message: "User created successfully",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[auth/signup]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

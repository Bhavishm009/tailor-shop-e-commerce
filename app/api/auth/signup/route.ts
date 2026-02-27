import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { generateSystemPasswordHash } from "@/lib/auth-utils"
import { normalizeIndianPhone, validateIndianMobile } from "@/lib/validation"

export async function POST(request: NextRequest) {
  try {
    const { email, name, phone, dateOfBirth } = await request.json()
    const normalizedEmail = String(email || "").trim().toLowerCase()

    if (!normalizedEmail || !name || !phone || !dateOfBirth) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!validateIndianMobile(phone)) {
      return NextResponse.json({ error: "Valid Indian mobile number is required" }, { status: 400 })
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 })
    }

    const parsedDob = new Date(dateOfBirth)
    if (Number.isNaN(parsedDob.getTime())) {
      return NextResponse.json({ error: "Invalid date of birth" }, { status: 400 })
    }

    const hashedPassword = await generateSystemPasswordHash()

    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        name,
        password: hashedPassword,
        phone: normalizeIndianPhone(phone),
        role: "CUSTOMER",
        dateOfBirth: parsedDob,
      },
    })

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

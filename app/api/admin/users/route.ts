import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"
import { generateSystemPasswordHash } from "@/lib/auth-utils"
import { normalizeIndianPhone, validateIndianMobile } from "@/lib/validation"

export async function GET() {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const users = await db.user.findMany({
      include: {
        tailorProfile: {
          select: {
            isActive: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(
      users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
        status: user.role === "TAILOR" ? (user.tailorProfile?.isActive ? "active" : "inactive") : "active",
      }))
    )
  } catch (error) {
    console.error("[admin/users/get]", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const body = (await request.json()) as {
      name?: string
      email?: string
      phone?: string
      role?: "ADMIN" | "TAILOR" | "CUSTOMER"
      dateOfBirth?: string
      address?: {
        street?: string
        city?: string
        state?: string
        postalCode?: string
        country?: string
      }
    }

    const name = body.name?.trim() || ""
    const email = body.email?.trim().toLowerCase() || ""
    const phone = body.phone?.trim() || ""
    const role = body.role === "ADMIN" || body.role === "TAILOR" ? body.role : "CUSTOMER"

    if (!name || !email || !phone) {
      return NextResponse.json({ error: "Name, email and phone are required" }, { status: 400 })
    }

    if (!validateIndianMobile(phone)) {
      return NextResponse.json({ error: "Valid Indian mobile number is required" }, { status: 400 })
    }

    if (!body.dateOfBirth) {
      return NextResponse.json({ error: "Date of birth is required" }, { status: 400 })
    }

    const parsedDob = new Date(body.dateOfBirth)
    if (Number.isNaN(parsedDob.getTime())) {
      return NextResponse.json({ error: "Invalid date of birth" }, { status: 400 })
    }

    const address = body.address || {}
    const hasCompleteAddress =
      typeof address.street === "string" &&
      typeof address.city === "string" &&
      typeof address.state === "string" &&
      typeof address.postalCode === "string" &&
      typeof address.country === "string" &&
      address.street.trim() &&
      address.city.trim() &&
      address.state.trim() &&
      address.postalCode.trim() &&
      address.country.trim()

    if (!hasCompleteAddress) {
      return NextResponse.json({ error: "Complete address is required" }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 })
    }

    const hashedPassword = await generateSystemPasswordHash()
    const user = await db.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone: normalizeIndianPhone(phone),
          role,
          dateOfBirth: parsedDob,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          dateOfBirth: true,
          createdAt: true,
        },
      })

      if (createdUser.role === "TAILOR") {
        await tx.tailorProfile.create({
          data: {
            userId: createdUser.id,
          },
        })
      }

      await tx.address.create({
        data: {
          userId: createdUser.id,
          street: address.street!.trim(),
          city: address.city!.trim(),
          state: address.state!.trim(),
          postalCode: address.postalCode!.trim(),
          country: address.country!.trim(),
          isDefault: true,
        },
      })

      return createdUser
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error("[admin/users/post]", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}

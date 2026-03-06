import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"
import { generateSystemPasswordHash } from "@/lib/auth-utils"
import { normalizeIndianPhone, validateIndianMobile } from "@/lib/validation"

export async function GET(request: Request) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role")

    const whereClause: any = {}
    if (role) {
      whereClause.role = role
    }

    const users = await db.user.findMany({
      where: whereClause,
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
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        role: user.role,
        status: user.role === "TAILOR" ? (user.tailorProfile?.isActive ? "active" : "inactive") : "active",
        createdAt: user.createdAt,
      }))
    )
  } catch (error) {
    console.error("[admin/users/get]", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { session, response } = await requireRole("ADMIN")
    if (response || !session) return response

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
      measurement?: {
        name?: string
        serviceKey?: string
        measurementType?: string
        measurementData?: Record<string, number | string | null>
        notes?: string
        chest?: number | string
        waist?: number | string
        hip?: number | string
        shoulder?: number | string
        sleeveLength?: number | string
        garmentLength?: number | string
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
    const hasAnyAddressValue = [address.street, address.city, address.state, address.postalCode, address.country].some(
      (value) => typeof value === "string" && value.trim().length > 0,
    )
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

    if (hasAnyAddressValue && !hasCompleteAddress) {
      return NextResponse.json({ error: "Provide complete address or leave it empty." }, { status: 400 })
    }
    if (hasCompleteAddress && !/^\d{6}$/.test(address.postalCode!.trim())) {
      return NextResponse.json({ error: "PIN code must be 6 digits" }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 })
    }

    const hashedPassword = await generateSystemPasswordHash()
    const user = await db.$transaction(async (tx) => {
      const asNumber = (value: unknown) => {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : undefined
      }
      let createdMeasurementId: string | null = null

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

      if (hasCompleteAddress) {
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
      }

      if (createdUser.role === "CUSTOMER" && body.measurement?.name?.trim()) {
        const measurementData = body.measurement.measurementData || {}
        const measurement = await tx.measurement.create({
          data: {
            userId: createdUser.id,
            name: body.measurement.name.trim(),
            notes: body.measurement.notes?.trim() || "Added and verified by admin",
            isVerified: true,
            source: "ADMIN",
            verifiedByAdminId: session.user.id,
            verifiedAt: new Date(),
            measurementType: body.measurement.measurementType || null,
            measurementData,
            chest: asNumber(body.measurement.chest ?? measurementData.chest),
            waist: asNumber(body.measurement.waist ?? measurementData.waist),
            hip: asNumber(body.measurement.hip ?? measurementData.hip),
            shoulder: asNumber(body.measurement.shoulder ?? measurementData.shoulder),
            sleeveLength: asNumber(body.measurement.sleeveLength ?? measurementData.sleeveLength),
            garmentLength: asNumber(body.measurement.garmentLength ?? measurementData.garmentLength),
          },
        })
        createdMeasurementId = measurement.id
      }

      return {
        ...createdUser,
        createdMeasurementId,
      }
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error("[admin/users/post]", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}

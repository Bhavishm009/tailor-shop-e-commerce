import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"

export async function GET() {
  try {
    const { session, response } = await requireAuth()
    if (response || !session) return response

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        tailorProfile: {
          select: {
            bio: true,
            specializations: true,
            yearsExperience: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profileImage: user.profileImage,
      role: user.role,
      notifyEmail: user.notifyEmail,
      notifyPush: user.notifyPush,
      notifyOrders: user.notifyOrders,
      notifyOffers: user.notifyOffers,
      tailorProfile: user.tailorProfile
        ? {
            bio: user.tailorProfile.bio,
            specializations: user.tailorProfile.specializations,
            yearsExperience: user.tailorProfile.yearsExperience,
          }
        : null,
    })
  } catch (error) {
    console.error("[account/profile/get]", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { session, response } = await requireAuth()
    if (response || !session) return response

    const body = (await request.json()) as {
      name?: string
      email?: string
      phone?: string
      profileImage?: string | null
      notifyEmail?: boolean
      notifyPush?: boolean
      notifyOrders?: boolean
      notifyOffers?: boolean
      bio?: string
      specializations?: string
      yearsExperience?: number
    }

    const existing = await db.user.findUnique({
      where: { id: session.user.id },
      include: { tailorProfile: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const nextName = body.name === undefined ? existing.name : body.name.trim()
    const nextEmail = body.email === undefined ? existing.email : body.email.trim().toLowerCase()

    if (!nextName) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    if (!nextEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const nextYearsExperience =
      body.yearsExperience === undefined
        ? existing.tailorProfile?.yearsExperience
        : Number.isFinite(body.yearsExperience)
          ? Math.max(0, Math.floor(body.yearsExperience))
          : 0

    const updated = await db.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: session.user.id },
        data: {
          name: nextName,
          email: nextEmail,
          phone: body.phone === undefined ? existing.phone : body.phone?.trim() || null,
          profileImage: body.profileImage === undefined ? existing.profileImage : body.profileImage || null,
          notifyEmail: typeof body.notifyEmail === "boolean" ? body.notifyEmail : existing.notifyEmail,
          notifyPush: typeof body.notifyPush === "boolean" ? body.notifyPush : existing.notifyPush,
          notifyOrders: typeof body.notifyOrders === "boolean" ? body.notifyOrders : existing.notifyOrders,
          notifyOffers: typeof body.notifyOffers === "boolean" ? body.notifyOffers : existing.notifyOffers,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          profileImage: true,
          role: true,
          notifyEmail: true,
          notifyPush: true,
          notifyOrders: true,
          notifyOffers: true,
        },
      })

      if (updatedUser.role === "TAILOR") {
        await tx.tailorProfile.upsert({
          where: { userId: updatedUser.id },
          update: {
            bio: body.bio === undefined ? existing.tailorProfile?.bio : body.bio?.trim() || null,
            specializations:
              body.specializations === undefined
                ? existing.tailorProfile?.specializations
                : body.specializations?.trim() || null,
            yearsExperience: nextYearsExperience ?? 0,
          },
          create: {
            userId: updatedUser.id,
            bio: body.bio?.trim() || null,
            specializations: body.specializations?.trim() || null,
            yearsExperience: nextYearsExperience ?? 0,
          },
        })
      }

      return updatedUser
    })

    const updatedProfile = await db.user.findUnique({
      where: { id: updated.id },
      include: {
        tailorProfile: {
          select: {
            bio: true,
            specializations: true,
            yearsExperience: true,
          },
        },
      },
    })

    if (!updatedProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: updatedProfile.id,
      name: updatedProfile.name,
      email: updatedProfile.email,
      phone: updatedProfile.phone,
      profileImage: updatedProfile.profileImage,
      role: updatedProfile.role,
      notifyEmail: updatedProfile.notifyEmail,
      notifyPush: updatedProfile.notifyPush,
      notifyOrders: updatedProfile.notifyOrders,
      notifyOffers: updatedProfile.notifyOffers,
      tailorProfile: updatedProfile.tailorProfile
        ? {
            bio: updatedProfile.tailorProfile.bio,
            specializations: updatedProfile.tailorProfile.specializations,
            yearsExperience: updatedProfile.tailorProfile.yearsExperience,
          }
        : null,
    })
  } catch (error) {
    console.error("[account/profile/patch]", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}

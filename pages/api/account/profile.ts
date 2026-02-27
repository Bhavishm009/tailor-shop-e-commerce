import type { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth/next"
import { Prisma } from "@prisma/client"
import { authOptions } from "@/auth"
import { db } from "@/lib/db"
import { deleteManyImageKitFilesByUrls } from "@/lib/imagekit"
import { normalizeIndianPhone, validateIndianMobile } from "@/lib/validation"

type ApiError = { error: string }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiError | Record<string, unknown>>,
) {
  if (req.method !== "GET" && req.method !== "PATCH") {
    res.setHeader("Allow", "GET, PATCH")
    return res.status(405).json({ error: "Method not allowed" })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  if (req.method === "GET") {
    try {
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
        return res.status(404).json({ error: "User not found" })
      }

      return res.status(200).json({
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
      console.error("[pages/account/profile/get]", error)
      return res.status(500).json({ error: "Failed to fetch profile" })
    }
  }

  try {
    const body = (req.body || {}) as {
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
      return res.status(404).json({ error: "User not found" })
    }

    const nextName = body.name === undefined ? existing.name : body.name.trim()
    const nextEmail = body.email === undefined ? existing.email : body.email.trim().toLowerCase()

    if (!nextName) {
      return res.status(400).json({ error: "Name is required" })
    }
    if (!nextEmail) {
      return res.status(400).json({ error: "Email is required" })
    }

    if (body.phone !== undefined && body.phone?.trim() && !validateIndianMobile(body.phone)) {
      return res.status(400).json({ error: "Valid Indian mobile number is required" })
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
          phone:
            body.phone === undefined
              ? existing.phone
              : body.phone?.trim()
                ? normalizeIndianPhone(body.phone)
                : null,
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

    if (existing.profileImage && existing.profileImage !== updated.profileImage) {
      await deleteManyImageKitFilesByUrls([existing.profileImage])
    }

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
      return res.status(404).json({ error: "User not found" })
    }

    return res.status(200).json({
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
    console.error("[pages/account/profile/patch]", error)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ error: "Email is already in use by another account." })
    }
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to update profile" })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"
import { createOrderNotification } from "@/lib/notifications"
import { resolveMeasurementType } from "@/lib/measurement-presets"
import { getClothOptionById } from "@/lib/cloth-options"
import type { ClothSource, ClothType } from "@prisma/client"

const CLOTH_TYPES: ClothType[] = ["COTTON", "SILK", "WOOL", "LINEN", "POLYESTER", "BLEND", "CUSTOM"]

export async function GET() {
  try {
    const { session, response } = await requireRole("CUSTOMER")
    if (response || !session) return response

    const orders = await db.stitchingOrder.findMany({
      where: {
        customerId: session.user.id,
      },
      include: {
        assignment: {
          include: {
            tailor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error("[stitching-orders/get]", error)
    return NextResponse.json({ error: "Failed to fetch stitching orders" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, response } = await requireRole("CUSTOMER")
    if (response || !session) return response

    const body = (await request.json()) as {
      clothType?: ClothType
      clothSource?: ClothSource
      clothOptionId?: string
      fabricImage?: string | null
      serviceKey?: string
      measurementId?: string
      measurementName?: string
      measurementData?: Record<string, number | string | null>
      notes?: string
      contactName?: string
      contactPhone?: string
      addressLine1?: string
      addressCity?: string
      addressState?: string
      addressPostalCode?: string
      addressCountry?: string
    }

    const service = await db.stitchingService.findFirst({
      where: {
        key: String(body.serviceKey || ""),
        isActive: true,
      },
    })
    if (!service) {
      return NextResponse.json({ error: "Invalid stitching service" }, { status: 400 })
    }

    if (!body.clothType || !CLOTH_TYPES.includes(body.clothType)) {
      return NextResponse.json({ error: "Invalid cloth type" }, { status: 400 })
    }
    const clothSource = body.clothSource === "FROM_US" ? "FROM_US" : "OWN"
    const clothOption = body.clothOptionId ? getClothOptionById(body.clothOptionId) : null
    if (clothSource === "FROM_US" && !clothOption) {
      return NextResponse.json({ error: "Please select cloth from our options." }, { status: 400 })
    }
    if (clothSource === "FROM_US" && clothOption && clothOption.clothType !== body.clothType) {
      return NextResponse.json({ error: "Selected cloth type does not match cloth option." }, { status: 400 })
    }

    const measurementType = resolveMeasurementType(service.key, service.name)

    const asNumber = (value: unknown) => {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : undefined
    }

    let measurementId = body.measurementId
    if (measurementId) {
      const existingMeasurement = await db.measurement.findFirst({
        where: {
          id: measurementId,
          userId: session.user.id,
        },
      })
      if (!existingMeasurement) {
        return NextResponse.json({ error: "Invalid measurement" }, { status: 400 })
      }
    } else {
      if (!body.measurementData || Object.keys(body.measurementData).length === 0) {
        return NextResponse.json({ error: "Measurement details are required" }, { status: 400 })
      }

      const measurement = await db.measurement.create({
        data: {
          userId: session.user.id,
          name: body.measurementName?.trim() || `${service.name} measurements`,
          notes: body.notes || null,
          measurementType,
          measurementData: body.measurementData,
          chest: asNumber(body.measurementData.chest),
          waist: asNumber(body.measurementData.waist),
          hip: asNumber(body.measurementData.hip),
          shoulder: asNumber(body.measurementData.shoulder),
          sleeveLength: asNumber(body.measurementData.sleeveLength),
          garmentLength: asNumber(body.measurementData.garmentLength),
        },
      })

      measurementId = measurement.id
    }

    const address =
      body.addressLine1 && body.addressCity && body.addressState && body.addressPostalCode && body.addressCountry
        ? {
            addressLine1: body.addressLine1,
            addressCity: body.addressCity,
            addressState: body.addressState,
            addressPostalCode: body.addressPostalCode,
            addressCountry: body.addressCountry,
          }
        : await db.address
            .findFirst({
              where: { userId: session.user.id },
              orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
            })
            .then((value) =>
              value
                ? {
                    addressLine1: value.street,
                    addressCity: value.city,
                    addressState: value.state,
                    addressPostalCode: value.postalCode,
                    addressCountry: value.country,
                  }
                : null,
            )

    const stitchingPrice = service.customerPrice
    const clothPrice = clothSource === "FROM_US" ? clothOption?.price || 0 : 0
    const totalPrice = stitchingPrice + clothPrice

    const stitchingOrder = await db.stitchingOrder.create({
      data: {
        customerId: session.user.id,
        measurementId: measurementId!,
        clothType: body.clothType,
        clothSource,
        clothName: clothSource === "FROM_US" ? clothOption?.name || null : null,
        clothPrice,
        stitchingPrice,
        serviceKey: service.key,
        stitchingService: service.name,
        price: totalPrice,
        notes: body.notes,
        fabricImage: body.fabricImage,
        contactName: body.contactName || session.user.name,
        contactPhone: body.contactPhone || null,
        addressLine1: address?.addressLine1 || null,
        addressCity: address?.addressCity || null,
        addressState: address?.addressState || null,
        addressPostalCode: address?.addressPostalCode || null,
        addressCountry: address?.addressCountry || null,
      },
    })

    const admins = await db.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    })

    try {
      await Promise.all([
        ...admins.map((admin) =>
          createOrderNotification({
            userId: admin.id,
            title: "New custom order",
            message: `A new custom order (${service.name}) is waiting for assignment.`,
            type: "CUSTOM_ORDER_CREATED",
            link: "/admin/custom-orders",
          })
        ),
        createOrderNotification({
          userId: session.user.id,
          title: "Custom order placed",
          message: `Your custom order for ${service.name} has been created and is waiting for assignment.`,
          type: "CUSTOM_ORDER_CREATED",
          link: "/customer/orders",
        }),
      ])
    } catch (notifyError) {
      console.error("[stitching-orders/create/notify]", notifyError)
    }

    return NextResponse.json(stitchingOrder, { status: 201 })
  } catch (error) {
    console.error("[stitching-orders/create]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create stitching order" },
      { status: 500 },
    )
  }
}

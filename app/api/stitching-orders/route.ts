import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"
import { createOrderNotification } from "@/lib/notifications"
import { resolveMeasurementType } from "@/lib/measurement-presets"
import { CLOTH_OPTIONS } from "@/lib/cloth-options"
import type { ClothType } from "@prisma/client"

const CLOTH_TYPES: ClothType[] = ["COTTON", "SILK", "WOOL", "LINEN", "POLYESTER", "BLEND", "CUSTOM"]

type ItemInput = {
  serviceKey?: string
  measurementId?: string
  measurementName?: string
  measurementData?: Record<string, number | string | null>
  quantity?: number
  fabricMode?: "WITHOUT_FABRIC" | "WITH_OWN_FABRIC" | "WITH_SHOP_FABRIC"
  clothType?: ClothType
  fabricOptionId?: string
  fabricMeters?: number
  fabricImage?: string | null
  notes?: string
}

async function ensureFabricDefaultsIfEmpty() {
  const count = await db.fabricOption.count()
  if (count > 0) return

  await db.fabricOption.createMany({
    data: CLOTH_OPTIONS.map((item) => ({
      id: item.id,
      name: item.name,
      clothType: item.clothType,
      buyRatePerMeter: item.buyRatePerMeter,
      sellRatePerMeter: item.sellRatePerMeter,
      stockMeters: item.stockMeters,
      image: item.image || null,
      description: item.description || null,
      isActive: true,
    })),
    skipDuplicates: true,
  })
}

function asNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

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
      items?: ItemInput[]
      clothType?: ClothType
      clothSource?: "OWN" | "FROM_US"
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

    await ensureFabricDefaultsIfEmpty()

    const normalizedItems: ItemInput[] =
      Array.isArray(body.items) && body.items.length > 0
        ? body.items
        : [
            {
              serviceKey: body.serviceKey,
              measurementId: body.measurementId,
              measurementName: body.measurementName,
              measurementData: body.measurementData,
              quantity: 1,
              fabricMode: body.clothSource === "FROM_US" ? "WITH_SHOP_FABRIC" : "WITH_OWN_FABRIC",
              clothType: body.clothType,
              fabricOptionId: body.clothOptionId,
              fabricImage: body.fabricImage,
              notes: body.notes,
            },
          ]

    if (normalizedItems.length === 0) {
      return NextResponse.json({ error: "At least one item is required." }, { status: 400 })
    }

    const fallbackAddress = await db.address.findFirst({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    })

    const address =
      body.addressLine1 && body.addressCity && body.addressState && body.addressPostalCode && body.addressCountry
        ? {
            addressLine1: body.addressLine1,
            addressCity: body.addressCity,
            addressState: body.addressState,
            addressPostalCode: body.addressPostalCode,
            addressCountry: body.addressCountry,
          }
        : fallbackAddress
          ? {
              addressLine1: fallbackAddress.street,
              addressCity: fallbackAddress.city,
              addressState: fallbackAddress.state,
              addressPostalCode: fallbackAddress.postalCode,
              addressCountry: fallbackAddress.country,
            }
          : null

    const createdOrders = []

    for (const item of normalizedItems) {
      if (!item.serviceKey) {
        return NextResponse.json({ error: "serviceKey is required for every item." }, { status: 400 })
      }

      const service = await db.stitchingService.findFirst({
        where: {
          key: String(item.serviceKey),
          isActive: true,
        },
      })
      if (!service) {
        return NextResponse.json({ error: `Invalid stitching service for item: ${item.serviceKey}` }, { status: 400 })
      }

      const measurementType = service.measurementType || resolveMeasurementType(service.key, service.name)

      let measurementId = item.measurementId
      if (measurementId) {
        const existingMeasurement = await db.measurement.findFirst({
          where: {
            id: measurementId,
            userId: session.user.id,
          },
        })
        if (!existingMeasurement) {
          return NextResponse.json({ error: "Invalid measurement selected." }, { status: 400 })
        }
      } else {
        if (!item.measurementData || Object.keys(item.measurementData).length === 0) {
          return NextResponse.json({ error: "Measurement details are required for each item." }, { status: 400 })
        }

        const measurement = await db.measurement.create({
          data: {
            userId: session.user.id,
            name: item.measurementName?.trim() || `${service.name} measurements`,
            notes: item.notes || null,
            measurementType,
            measurementData: item.measurementData,
            chest: asNumber(item.measurementData.chest),
            waist: asNumber(item.measurementData.waist),
            hip: asNumber(item.measurementData.hip),
            shoulder: asNumber(item.measurementData.shoulder),
            sleeveLength: asNumber(item.measurementData.sleeveLength),
            garmentLength: asNumber(item.measurementData.garmentLength),
          },
        })

        measurementId = measurement.id
      }

      const mode = item.fabricMode || "WITHOUT_FABRIC"
      const quantity = Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0 ? Math.floor(Number(item.quantity)) : 1

      let clothType: ClothType = item.clothType && CLOTH_TYPES.includes(item.clothType) ? item.clothType : "CUSTOM"
      let clothName: string | null = null
      let clothPrice = 0
      let clothSource: "OWN" | "FROM_US" = "OWN"
      let fabricImage: string | null = item.fabricImage || null

      if (mode === "WITH_SHOP_FABRIC") {
        if (!item.fabricOptionId) {
          return NextResponse.json({ error: "Fabric option is required for items with fabric." }, { status: 400 })
        }
        const fabric = await db.fabricOption.findFirst({
          where: { id: item.fabricOptionId, isActive: true },
        })
        if (!fabric) {
          return NextResponse.json({ error: "Invalid fabric option selected." }, { status: 400 })
        }

        const meters = Number(item.fabricMeters)
        if (!Number.isFinite(meters) || meters <= 0) {
          return NextResponse.json({ error: "Valid fabric meters are required." }, { status: 400 })
        }

        const requiredMeters = meters * quantity
        const stockUpdated = await db.fabricOption.updateMany({
          where: { id: fabric.id, stockMeters: { gte: requiredMeters } },
          data: { stockMeters: { decrement: requiredMeters } },
        })
        if (stockUpdated.count === 0) {
          return NextResponse.json(
            { error: `Insufficient stock for ${fabric.name}. Required ${requiredMeters.toFixed(2)}m.` },
            { status: 400 },
          )
        }

        clothType = fabric.clothType
        clothName = fabric.name
        clothPrice = fabric.sellRatePerMeter * meters
        clothSource = "FROM_US"
        fabricImage = fabric.image || null
      } else if (mode === "WITH_OWN_FABRIC") {
        if (!CLOTH_TYPES.includes(clothType)) {
          return NextResponse.json({ error: "Cloth type is required for own fabric items." }, { status: 400 })
        }
        clothSource = "OWN"
      } else {
        if (!CLOTH_TYPES.includes(clothType)) clothType = "CUSTOM"
        clothSource = "OWN"
        fabricImage = null
      }

      const stitchingPrice = service.customerPrice

      for (let index = 0; index < quantity; index += 1) {
        const order = await db.stitchingOrder.create({
          data: {
            customerId: session.user.id,
            measurementId: measurementId!,
            clothType,
            clothSource,
            clothName,
            clothPrice,
            stitchingPrice,
            serviceKey: service.key,
            stitchingService: service.name,
            price: stitchingPrice + clothPrice,
            notes: item.notes || null,
            fabricImage,
            contactName: body.contactName || session.user.name,
            contactPhone: body.contactPhone || null,
            addressLine1: address?.addressLine1 || null,
            addressCity: address?.addressCity || null,
            addressState: address?.addressState || null,
            addressPostalCode: address?.addressPostalCode || null,
            addressCountry: address?.addressCountry || null,
          },
        })
        createdOrders.push(order)
      }
    }

    const admins = await db.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    })

    try {
      const firstService = createdOrders[0]?.stitchingService || "Custom"
      await Promise.all([
        ...admins.map((admin) =>
          createOrderNotification({
            userId: admin.id,
            title: "New custom order",
            message: `${createdOrders.length} custom order(s) (${firstService}) are waiting for assignment.`,
            type: "CUSTOM_ORDER_CREATED",
            link: "/admin/custom-orders",
          }),
        ),
        createOrderNotification({
          userId: session.user.id,
          title: "Custom order placed",
          message: `Your ${createdOrders.length} custom order item(s) are created and waiting for assignment.`,
          type: "CUSTOM_ORDER_CREATED",
          link: "/customer/orders",
        }),
      ])
    } catch (notifyError) {
      console.error("[stitching-orders/create/notify]", notifyError)
    }

    return NextResponse.json({
      count: createdOrders.length,
      orderIds: createdOrders.map((item) => item.id),
      orders: createdOrders,
    }, { status: 201 })
  } catch (error) {
    console.error("[stitching-orders/create]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create stitching order" },
      { status: 500 },
    )
  }
}

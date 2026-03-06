import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"
import { createOrderNotification } from "@/lib/notifications"
import { resolveMeasurementType } from "@/lib/measurement-presets"
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

function asNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export async function GET() {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const orders = await db.stitchingOrder.findMany({
      include: {
        customer: {
          select: { name: true, email: true },
        },
        assignment: {
          include: {
            tailor: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(
      orders.map((order) => ({
        id: order.id,
        source: "CUSTOM" as const,
        orderNumber: `ST-${order.id.slice(-6).toUpperCase()}`,
        customerName: order.customer.name,
        customerEmail: order.customer.email,
        serviceKey: order.serviceKey,
        stitchingService: order.stitchingService,
        clothSource: order.clothSource,
        clothName: order.clothName,
        clothPrice: order.clothPrice,
        stitchingPrice: order.stitchingPrice,
        totalAmount: order.price,
        status: order.status,
        assignedTailorId: order.assignment?.tailorId || null,
        assignedTailorName: order.assignment?.tailor.name || null,
        payoutAmount: order.assignment?.payoutAmount || null,
        payoutStatus: order.assignment?.payoutStatus || null,
        createdAt: order.createdAt,
      })),
    )
  } catch (error) {
    console.error("[admin/custom-orders/get]", error)
    return NextResponse.json({ error: "Failed to load custom orders" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const body = (await request.json()) as {
      customerId?: string
      items?: ItemInput[]
      serviceKey?: string
      clothType?: ClothType
      clothSource?: "OWN" | "FROM_US"
      clothOptionId?: string
      notes?: string
      fabricImage?: string | null
      measurementId?: string
      measurementName?: string
      measurementData?: Record<string, number | string | null>
      contactName?: string
      contactPhone?: string
      addressLine1?: string
      addressCity?: string
      addressState?: string
      addressPostalCode?: string
      addressCountry?: string
    }

    if (!body.customerId) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 })
    }

    const customer = await db.user.findFirst({
      where: { id: body.customerId, role: "CUSTOMER" },
      select: { id: true, name: true },
    })
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    const fallbackAddress = await db.address.findFirst({
      where: { userId: customer.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    })

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

    const createdOrders = []

    for (const item of normalizedItems) {
      if (!item.serviceKey) {
        return NextResponse.json({ error: "serviceKey is required for every item." }, { status: 400 })
      }

      const service = await db.stitchingService.findFirst({
        where: { key: item.serviceKey, isActive: true },
      })
      if (!service) {
        return NextResponse.json({ error: "Invalid stitching service" }, { status: 400 })
      }

      const measurementType = service.measurementType || resolveMeasurementType(service.key, service.name)

      let measurementId = item.measurementId
      if (measurementId) {
        const existing = await db.measurement.findFirst({
          where: {
            id: measurementId,
            userId: customer.id,
          },
        })
        if (!existing) {
          return NextResponse.json({ error: "Invalid measurement for selected customer" }, { status: 400 })
        }
      } else {
        if (!item.measurementData || Object.keys(item.measurementData).length === 0) {
          return NextResponse.json({ error: "Measurement details are required" }, { status: 400 })
        }

        const createdMeasurement = await db.measurement.create({
          data: {
            userId: customer.id,
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
        measurementId = createdMeasurement.id
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
          return NextResponse.json({ error: "Fabric option is required for with-fabric items." }, { status: 400 })
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
          return NextResponse.json({ error: "Cloth type is required for own-fabric items." }, { status: 400 })
        }
      } else {
        if (!CLOTH_TYPES.includes(clothType)) clothType = "CUSTOM"
        fabricImage = null
      }

      for (let index = 0; index < quantity; index += 1) {
        const customOrder = await db.stitchingOrder.create({
          data: {
            customerId: customer.id,
            measurementId: measurementId!,
            clothType,
            clothSource,
            clothName,
            clothPrice,
            stitchingPrice: service.customerPrice,
            fabricImage,
            serviceKey: service.key,
            stitchingService: service.name,
            price: service.customerPrice + clothPrice,
            notes: item.notes || null,
            contactName: body.contactName || customer.name,
            contactPhone: body.contactPhone || null,
            addressLine1: body.addressLine1 || fallbackAddress?.street || null,
            addressCity: body.addressCity || fallbackAddress?.city || null,
            addressState: body.addressState || fallbackAddress?.state || null,
            addressPostalCode: body.addressPostalCode || fallbackAddress?.postalCode || null,
            addressCountry: body.addressCountry || fallbackAddress?.country || null,
          },
        })
        createdOrders.push(customOrder)
      }
    }

    await createOrderNotification({
      userId: customer.id,
      title: "Custom order booked",
      message: `Admin booked ${createdOrders.length} custom order item(s) for you.`,
      type: "CUSTOM_ORDER_CREATED",
      link: "/customer/orders",
    })

    return NextResponse.json({ count: createdOrders.length, orders: createdOrders }, { status: 201 })
  } catch (error) {
    console.error("[admin/custom-orders/create]", error)
    return NextResponse.json({ error: "Failed to create custom order" }, { status: 500 })
  }
}

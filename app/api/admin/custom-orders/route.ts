import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"
import { createOrderNotification } from "@/lib/notifications"
import { resolveMeasurementType } from "@/lib/measurement-presets"
import { getClothOptionById } from "@/lib/cloth-options"
import type { ClothSource, ClothType } from "@prisma/client"

const CLOTH_TYPES: ClothType[] = ["COTTON", "SILK", "WOOL", "LINEN", "POLYESTER", "BLEND", "CUSTOM"]

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
      serviceKey?: string
      clothType?: ClothType
      clothSource?: ClothSource
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

    if (!body.customerId || !body.serviceKey || !body.clothType) {
      return NextResponse.json({ error: "customerId, serviceKey and clothType are required" }, { status: 400 })
    }

    if (!CLOTH_TYPES.includes(body.clothType)) {
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

    const customer = await db.user.findFirst({
      where: { id: body.customerId, role: "CUSTOMER" },
      select: { id: true, name: true },
    })
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    const service = await db.stitchingService.findFirst({
      where: { key: body.serviceKey, isActive: true },
    })
    if (!service) {
      return NextResponse.json({ error: "Invalid stitching service" }, { status: 400 })
    }

    const measurementType = service.measurementType || resolveMeasurementType(service.key, service.name)
    const asNumber = (value: unknown) => {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : undefined
    }

    let measurementId = body.measurementId
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
      if (!body.measurementData || Object.keys(body.measurementData).length === 0) {
        return NextResponse.json({ error: "Measurement details are required" }, { status: 400 })
      }

      const createdMeasurement = await db.measurement.create({
        data: {
          userId: customer.id,
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
      measurementId = createdMeasurement.id
    }

    const fallbackAddress = await db.address.findFirst({
      where: { userId: customer.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    })

    const stitchingPrice = service.customerPrice
    const clothPrice = clothSource === "FROM_US" ? clothOption?.price || 0 : 0
    const totalPrice = stitchingPrice + clothPrice

    const customOrder = await db.stitchingOrder.create({
      data: {
        customerId: customer.id,
        measurementId: measurementId!,
        clothType: body.clothType,
        clothSource,
        clothName: clothSource === "FROM_US" ? clothOption?.name || null : null,
        clothPrice,
        stitchingPrice,
        fabricImage: body.fabricImage || null,
        serviceKey: service.key,
        stitchingService: service.name,
        price: totalPrice,
        notes: body.notes || null,
        contactName: body.contactName || customer.name,
        contactPhone: body.contactPhone || null,
        addressLine1: body.addressLine1 || fallbackAddress?.street || null,
        addressCity: body.addressCity || fallbackAddress?.city || null,
        addressState: body.addressState || fallbackAddress?.state || null,
        addressPostalCode: body.addressPostalCode || fallbackAddress?.postalCode || null,
        addressCountry: body.addressCountry || fallbackAddress?.country || null,
      },
    })

    await createOrderNotification({
      userId: customer.id,
      title: "Custom order booked",
      message: `Admin booked a custom order (${service.name}) for you.`,
      type: "CUSTOM_ORDER_CREATED",
      link: "/customer/orders",
    })

    return NextResponse.json(customOrder, { status: 201 })
  } catch (error) {
    console.error("[admin/custom-orders/create]", error)
    return NextResponse.json({ error: "Failed to create custom order" }, { status: 500 })
  }
}

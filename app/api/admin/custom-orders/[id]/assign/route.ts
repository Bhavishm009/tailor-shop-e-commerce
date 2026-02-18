import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"
import { createOrderNotification } from "@/lib/notifications"

function parseSpecializations(specializations: string | null | undefined) {
  if (!specializations) return []
  return specializations
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
}

function specializationMatches(specializations: string | null | undefined, serviceKey: string, serviceName: string) {
  if (!specializations) return false
  const specs = parseSpecializations(specializations)
  return (
    specs.includes(serviceKey.toLowerCase()) ||
    specs.some((spec) => serviceName.toLowerCase().includes(spec) || spec.includes(serviceName.toLowerCase()))
  )
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const { id } = await params
    const body = (await request.json()) as { tailorId?: string }

    const order = await db.stitchingOrder.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, name: true },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Custom order not found" }, { status: 404 })
    }

    if (order.status !== "PENDING") {
      return NextResponse.json({ error: "Only pending custom orders can be assigned" }, { status: 400 })
    }

    const service = await db.stitchingService.findFirst({
      where: {
        OR: [{ key: order.serviceKey || "" }, { name: order.stitchingService }],
      },
    })
    if (!service) {
      return NextResponse.json({ error: "Invalid service configuration" }, { status: 400 })
    }

    let selectedTailorId = body.tailorId

    if (!selectedTailorId) {
      const eligibleTailors = await db.user.findMany({
        where: {
          role: "TAILOR",
          tailorProfile: {
            is: {
              isActive: true,
            },
          },
        },
        include: {
          tailorProfile: true,
          assignments: {
            include: {
              stitchingOrder: {
                select: {
                  status: true,
                },
              },
            },
          },
        },
      })

      const matchedTailors = eligibleTailors.filter((tailor) =>
        specializationMatches(tailor.tailorProfile?.specializations, service.key, service.name),
      )

      const sourceTailors = matchedTailors.length > 0 ? matchedTailors : eligibleTailors

      const ranked = sourceTailors
        .map((tailor) => {
          const activeLoad = tailor.assignments.filter(
            (assignment) =>
              assignment.stitchingOrder.status === "ASSIGNED" ||
              assignment.stitchingOrder.status === "STITCHING",
          ).length
          return {
            tailorId: tailor.id,
            activeLoad,
          }
        })
        .sort((a, b) => a.activeLoad - b.activeLoad)

      selectedTailorId = ranked[0]?.tailorId
    }

    if (!selectedTailorId) {
      return NextResponse.json({ error: "No active tailor available for this service" }, { status: 400 })
    }

    const tailor = await db.user.findUnique({
      where: { id: selectedTailorId },
      include: { tailorProfile: true },
    })

    if (!tailor || tailor.role !== "TAILOR") {
      return NextResponse.json({ error: "Tailor not found" }, { status: 404 })
    }

    const updated = await db.$transaction(async (tx) => {
      const updatedOrder = await tx.stitchingOrder.update({
        where: { id: order.id },
        data: { status: "ASSIGNED" },
      })

      const assignment = await tx.assignment.upsert({
        where: { stitchingOrderId: order.id },
        create: {
          stitchingOrderId: order.id,
          tailorId: tailor.id,
          tailorProfileId: tailor.tailorProfile?.id,
          payoutRate: service.tailorRate,
          payoutAmount: service.tailorRate,
          payoutStatus: "PENDING",
        },
        update: {
          tailorId: tailor.id,
          tailorProfileId: tailor.tailorProfile?.id,
          payoutRate: service.tailorRate,
          payoutAmount: service.tailorRate,
          payoutStatus: "PENDING",
          paidAt: null,
          assignedAt: new Date(),
          completedAt: null,
        },
      })

      return { updatedOrder, assignment }
    })

    await Promise.all([
      createOrderNotification({
        userId: tailor.id,
        title: "New custom order assigned",
        message: `You were assigned ${order.stitchingService} for ${order.customer.name}.`,
        type: "CUSTOM_ORDER_ASSIGNED",
        link: "/tailor/orders",
      }),
      createOrderNotification({
        userId: order.customerId,
        title: "Tailor assigned",
        message: `Your ${order.stitchingService} order has been assigned to ${tailor.name}.`,
        type: "CUSTOM_ORDER_ASSIGNED",
        link: "/customer/orders",
      }),
    ])

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[admin/custom-orders/assign]", error)
    return NextResponse.json({ error: "Failed to assign tailor" }, { status: 500 })
  }
}

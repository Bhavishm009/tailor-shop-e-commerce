import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

function normalizeCode(rawCode: string) {
  const normalized = rawCode.trim().toUpperCase()
  const match = /^ST-([A-Z0-9]{4,})$/.exec(normalized)
  return match ? match[1].toLowerCase() : ""
}

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { session, response } = await requireRole("TAILOR")
    if (response || !session) return response

    const { code } = await params
    const suffix = normalizeCode(code)
    if (!suffix) {
      return NextResponse.json({ error: "Invalid order code format" }, { status: 400 })
    }

    const assignment = await db.assignment.findFirst({
      where: {
        tailorId: session.user.id,
        stitchingOrder: {
          id: {
            endsWith: suffix,
            mode: "insensitive",
          },
        },
      },
      include: {
        stitchingOrder: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
            measurement: true,
          },
        },
      },
    })

    if (!assignment) {
      return NextResponse.json({ error: "Order not found for this tailor" }, { status: 404 })
    }

    return NextResponse.json({
      id: assignment.stitchingOrder.id,
      orderCode: `ST-${assignment.stitchingOrder.id.slice(-6).toUpperCase()}`,
      stitchingService: assignment.stitchingOrder.stitchingService,
      clothType: assignment.stitchingOrder.clothType,
      status: assignment.stitchingOrder.status,
      customer: assignment.stitchingOrder.customer,
      notes: assignment.stitchingOrder.notes,
      measurement: assignment.stitchingOrder.measurement,
      createdAt: assignment.stitchingOrder.createdAt,
      assignedAt: assignment.assignedAt,
    })
  } catch (error) {
    console.error("[tailor/orders/scan/get]", error)
    return NextResponse.json({ error: "Failed to fetch scanned order" }, { status: 500 })
  }
}

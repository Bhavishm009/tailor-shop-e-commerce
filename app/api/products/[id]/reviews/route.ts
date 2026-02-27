import { NextResponse, type NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"
import { Prisma } from "@prisma/client"

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
}

type RouteContext = {
  params: Promise<{ id: string }>
}

function isMissingProductReviewTable(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code ?? "") : ""
  const metaTable =
    typeof error === "object" && error !== null && "meta" in error
      ? String(((error as { meta?: { table?: unknown } }).meta?.table as string | undefined) ?? "")
      : ""
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : ""

  return (
    (error instanceof Prisma.PrismaClientKnownRequestError || code === "P2021") &&
    (metaTable.includes("ProductReview") || message.includes("ProductReview") || message.includes("does not exist"))
  )
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id: productId } = await context.params

    const reviews = await db.productReview
      .findMany({
        where: { productId, isApproved: true },
        include: {
          customer: {
            select: {
              name: true,
              profileImage: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
      .catch((error) => {
        if (isMissingProductReviewTable(error)) return []
        throw error
      })

    return NextResponse.json(
      reviews.map((item) => ({
        id: item.id,
        rating: item.rating,
        title: item.title,
        comment: item.comment,
        photos: toStringArray(item.photos),
        createdAt: item.createdAt,
        customer: item.customer,
      })),
    )
  } catch (error) {
    console.error("[product-reviews/get]", error)
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { session, response } = await requireRole("CUSTOMER")
    if (response || !session) return response

    const { id: productId } = await context.params
    const body = (await request.json()) as {
      rating?: number
      title?: string
      comment?: string
      photos?: string[]
    }

    const rating = Math.floor(Number(body.rating) || 0)
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 })
    }

    const existing = await db.productReview
      .findFirst({
        where: {
          productId,
          customerId: session.user.id,
        },
        select: { id: true },
      })
      .catch((error) => {
        if (isMissingProductReviewTable(error)) return null
        throw error
      })

    if (existing) {
      return NextResponse.json({ error: "You already reviewed this product." }, { status: 409 })
    }

    const deliveredItem = await db.orderItem.findFirst({
      where: {
        productId,
        order: {
          customerId: session.user.id,
          status: "DELIVERED",
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        orderId: true,
      },
    })

    if (!deliveredItem) {
      return NextResponse.json({ error: "You can review this product only after delivery." }, { status: 403 })
    }

    const photos = toStringArray(body.photos).slice(0, 5)
    const review = await db.productReview
      .create({
        data: {
          productId,
          customerId: session.user.id,
          orderId: deliveredItem.orderId,
          rating,
          title: body.title?.trim() || null,
          comment: body.comment?.trim() || null,
          photos,
          isApproved: true,
        },
        include: {
          customer: {
            select: {
              name: true,
              profileImage: true,
            },
          },
        },
      })
      .catch((error) => {
        if (isMissingProductReviewTable(error)) {
          throw new Error("PRODUCT_REVIEW_TABLE_MISSING")
        }
        throw error
      })

    return NextResponse.json(
      {
        id: review.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        photos: toStringArray(review.photos),
        createdAt: review.createdAt,
        customer: review.customer,
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_REVIEW_TABLE_MISSING") {
      return NextResponse.json(
        { error: "Product reviews are temporarily unavailable. Please run the latest database migration." },
        { status: 503 },
      )
    }
    console.error("[product-reviews/post]", error)
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 })
  }
}

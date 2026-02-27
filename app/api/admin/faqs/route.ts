import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/api-auth"

export async function GET(request: Request) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const url = new URL(request.url)
    const q = url.searchParams.get("q")?.trim() || ""

    const items = await db.faq.findMany({
      where: {
        isActive: true,
        ...(q
          ? {
              OR: [
                { question: { contains: q, mode: "insensitive" } },
                { answer: { contains: q, mode: "insensitive" } },
                { category: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 30,
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error("[admin/faqs/get]", error)
    return NextResponse.json({ error: "Failed to fetch FAQs" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { response } = await requireRole("ADMIN")
    if (response) return response

    const body = (await request.json()) as {
      question?: string
      answer?: string
      category?: string
    }

    const question = body.question?.trim() || ""
    const answer = body.answer?.trim() || ""
    const category = body.category?.trim() || null

    if (!question || !answer) {
      return NextResponse.json({ error: "Question and answer are required" }, { status: 400 })
    }

    const faq = await db.faq.create({
      data: {
        question,
        answer,
        category,
      },
    })

    return NextResponse.json(faq, { status: 201 })
  } catch (error) {
    console.error("[admin/faqs/post]", error)
    return NextResponse.json({ error: "Failed to create FAQ" }, { status: 500 })
  }
}

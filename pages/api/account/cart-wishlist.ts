import type { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/auth"
import { db } from "@/lib/db"
import { emitToUser } from "@/lib/realtime-server"

type CartItem = {
  id: string
  name: string
  price: number
  image: string | null
  quantity: number
}

type WishlistItem = {
  id: string
  name: string
  price: number
  image: string | null
}

type WishlistList = {
  id: string
  name: string
  items: WishlistItem[]
}

type WishlistState = {
  currentListId: string
  lists: WishlistList[]
}

function sanitizeCart(input: unknown): CartItem[] {
  if (!Array.isArray(input)) return []
  return input
    .map((item) => {
      const value = item as Partial<CartItem>
      if (!value || typeof value.id !== "string" || typeof value.name !== "string") return null
      const price = Number(value.price)
      const quantity = Number(value.quantity)
      if (!Number.isFinite(price) || price < 0 || !Number.isFinite(quantity) || quantity <= 0) return null
      return {
        id: value.id,
        name: value.name,
        price,
        quantity: Math.floor(quantity),
        image: typeof value.image === "string" ? value.image : null,
      }
    })
    .filter((item): item is CartItem => item !== null)
}

function sanitizeWishlist(input: unknown): WishlistItem[] {
  if (!Array.isArray(input)) return []
  const dedupe = new Map<string, WishlistItem>()
  for (const item of input) {
    const value = item as Partial<WishlistItem>
    if (!value || typeof value.id !== "string" || typeof value.name !== "string") continue
    const price = Number(value.price)
    if (!Number.isFinite(price) || price < 0) continue
    dedupe.set(value.id, {
      id: value.id,
      name: value.name,
      price,
      image: typeof value.image === "string" ? value.image : null,
    })
  }
  return [...dedupe.values()]
}

function normalizeWishlistState(input: unknown): WishlistState {
  const defaultList: WishlistList = { id: "default", name: "My Wishlist", items: [] }

  if (Array.isArray(input)) {
    return { currentListId: "default", lists: [{ ...defaultList, items: sanitizeWishlist(input) }] }
  }
  if (!input || typeof input !== "object") {
    return { currentListId: "default", lists: [defaultList] }
  }

  const payload = input as { currentListId?: unknown; lists?: unknown }
  const rawLists = Array.isArray(payload.lists) ? payload.lists : []
  const lists: WishlistList[] = rawLists
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null
      const value = entry as { id?: unknown; name?: unknown; items?: unknown }
      const id = typeof value.id === "string" && value.id.trim() ? value.id : `list-${index + 1}`
      const name = typeof value.name === "string" && value.name.trim() ? value.name.trim() : `Wishlist ${index + 1}`
      return { id, name, items: sanitizeWishlist(value.items) }
    })
    .filter((entry): entry is WishlistList => entry !== null)

  const safeLists = lists.length > 0 ? lists : [defaultList]
  const currentListId =
    typeof payload.currentListId === "string" && safeLists.some((entry) => entry.id === payload.currentListId)
      ? payload.currentListId
      : safeLists[0].id

  return { currentListId, lists: safeLists }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "PATCH") {
    res.setHeader("Allow", "GET, PATCH")
    return res.status(405).json({ error: "Method not allowed" })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  // Verify user exists in database
  const userExists = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true }
  })
  
  if (!userExists) {
    return res.status(404).json({ error: "User not found" })
  }

  if (req.method === "GET") {
    try {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { cart: true, wishlist: true },
      })
      if (!user) {
        return res.status(404).json({ error: "User not found" })
      }

      const wishlistState = normalizeWishlistState(user.wishlist)
      const active = wishlistState.lists.find((entry) => entry.id === wishlistState.currentListId) || wishlistState.lists[0]
      return res.status(200).json({
        cart: sanitizeCart(user.cart),
        wishlist: active?.items || [],
        wishlistState,
      })
    } catch (error) {
      console.error("[pages/account/cart-wishlist/get]", error)
      return res.status(500).json({ error: "Failed to load cart and wishlist" })
    }
  }

  try {
    const body = (req.body || {}) as { cart?: unknown; wishlist?: unknown; wishlistState?: unknown }
    const cart = body.cart === undefined ? undefined : sanitizeCart(body.cart)
    const wishlistState = body.wishlistState === undefined ? undefined : normalizeWishlistState(body.wishlistState)
    const wishlist =
      body.wishlist === undefined
        ? undefined
        : normalizeWishlistState({
            currentListId: "default",
            lists: [{ id: "default", name: "My Wishlist", items: sanitizeWishlist(body.wishlist) }],
          })

    const updated = await db.user.update({
      where: { id: session.user.id },
      data: {
        ...(cart !== undefined ? { cart } : {}),
        ...(wishlistState !== undefined
          ? { wishlist: wishlistState }
          : wishlist !== undefined
            ? { wishlist }
            : {}),
      },
      select: { cart: true, wishlist: true },
    })

    if (cart !== undefined) {
      emitToUser(session.user.id, "commerce:cart-updated", { cart })
    }
    if (wishlistState !== undefined || wishlist !== undefined) {
      const emittedState = wishlistState ?? wishlist ?? normalizeWishlistState([])
      const active = emittedState.lists.find((entry) => entry.id === emittedState.currentListId) || emittedState.lists[0]
      emitToUser(session.user.id, "commerce:wishlist-updated", {
        wishlist: active?.items || [],
        wishlistState: emittedState,
      })
    }

    const nextState = normalizeWishlistState(updated.wishlist)
    const nextActive = nextState.lists.find((entry) => entry.id === nextState.currentListId) || nextState.lists[0]
    return res.status(200).json({
      cart: sanitizeCart(updated.cart),
      wishlist: nextActive?.items || [],
      wishlistState: nextState,
    })
  } catch (error) {
    console.error("[pages/account/cart-wishlist/patch]", error)
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return res.status(404).json({ error: "User not found. Please log in again." })
    }
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to save cart and wishlist" })
  }
}

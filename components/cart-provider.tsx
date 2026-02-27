"use client"

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { useSession } from "next-auth/react"
import { useRealtimeSocket } from "@/hooks/use-realtime-socket"

const GUEST_CART_STORAGE_KEY = "tailorhub_cart_guest"
const GUEST_WISHLIST_STORAGE_KEY = "tailorhub_wishlist_guest"

export type CartItem = {
  id: string
  name: string
  price: number
  image?: string | null
  quantity: number
}

export type WishlistItem = {
  id: string
  name: string
  price: number
  image?: string | null
}

export type WishlistList = {
  id: string
  name: string
  items: WishlistItem[]
}

export type WishlistState = {
  currentListId: string
  lists: WishlistList[]
}

type CartContextValue = {
  items: CartItem[]
  wishlist: WishlistItem[]
  wishlistLists: WishlistList[]
  currentWishlistId: string
  count: number
  wishlistCount: number
  total: number
  addItem: (item: Omit<CartItem, "quantity">) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  addToWishlist: (item: WishlistItem) => void
  removeFromWishlist: (id: string) => void
  toggleWishlist: (item: WishlistItem) => void
  isInWishlist: (id: string) => boolean
  isInCart: (id: string) => boolean
  clearWishlist: () => void
  createWishlist: (name: string) => void
  renameWishlist: (id: string, name: string) => void
  removeWishlist: (id: string) => void
  setCurrentWishlist: (id: string) => void
  moveWishlistItemToList: (itemId: string, fromListId: string, toListId: string) => void
  moveAllWishlistItemsToList: (fromListId: string, toListId: string) => void
}

const CartContext = createContext<CartContextValue | null>(null)

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function mergeCart(serverCart: CartItem[], guestCart: CartItem[]) {
  const map = new Map<string, CartItem>()
  for (const item of serverCart) {
    map.set(item.id, { ...item, quantity: Math.max(1, Math.floor(item.quantity)) })
  }
  for (const item of guestCart) {
    const existing = map.get(item.id)
    if (existing) {
      map.set(item.id, { ...existing, quantity: existing.quantity + Math.max(1, Math.floor(item.quantity)) })
    } else {
      map.set(item.id, { ...item, quantity: Math.max(1, Math.floor(item.quantity)) })
    }
  }
  return [...map.values()]
}

function normalizeWishlistItems(input: unknown): WishlistItem[] {
  if (!Array.isArray(input)) return []

  const map = new Map<string, WishlistItem>()
  for (const item of input) {
    const value = item as Partial<WishlistItem>
    if (!value || typeof value.id !== "string" || typeof value.name !== "string") continue
    const price = Number(value.price)
    if (!Number.isFinite(price) || price < 0) continue

    map.set(value.id, {
      id: value.id,
      name: value.name,
      price,
      image: typeof value.image === "string" ? value.image : null,
    })
  }

  return [...map.values()]
}

function normalizeWishlistState(input: unknown): WishlistState {
  const defaultList: WishlistList = { id: "default", name: "My Wishlist", items: [] }

  if (Array.isArray(input)) {
    return {
      currentListId: "default",
      lists: [{ ...defaultList, items: normalizeWishlistItems(input) }],
    }
  }

  if (!input || typeof input !== "object") {
    return {
      currentListId: defaultList.id,
      lists: [defaultList],
    }
  }

  const payload = input as { currentListId?: unknown; lists?: unknown }
  const rawLists = Array.isArray(payload.lists) ? payload.lists : []
  const lists: WishlistList[] = rawLists
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null
      const value = entry as { id?: unknown; name?: unknown; items?: unknown }
      const id = typeof value.id === "string" && value.id.trim() ? value.id : `list-${index + 1}`
      const name = typeof value.name === "string" && value.name.trim() ? value.name.trim() : `Wishlist ${index + 1}`
      return {
        id,
        name,
        items: normalizeWishlistItems(value.items),
      }
    })
    .filter((entry): entry is WishlistList => entry !== null)

  const safeLists = lists.length > 0 ? lists : [defaultList]
  const currentListId =
    typeof payload.currentListId === "string" && safeLists.some((entry) => entry.id === payload.currentListId)
      ? payload.currentListId
      : safeLists[0].id

  return { currentListId, lists: safeLists }
}

function mergeWishlistState(serverState: WishlistState, guestState: WishlistState): WishlistState {
  const listMap = new Map<string, WishlistList>()

  for (const list of serverState.lists) {
    listMap.set(list.id, { ...list, items: normalizeWishlistItems(list.items) })
  }

  for (const list of guestState.lists) {
    const existing = listMap.get(list.id)
    if (!existing) {
      listMap.set(list.id, { ...list, items: normalizeWishlistItems(list.items) })
      continue
    }

    const mergedItems = normalizeWishlistItems([...existing.items, ...list.items])
    listMap.set(list.id, { ...existing, items: mergedItems })
  }

  const lists = [...listMap.values()]
  const currentListId = lists.some((entry) => entry.id === serverState.currentListId)
    ? serverState.currentListId
    : lists.some((entry) => entry.id === guestState.currentListId)
      ? guestState.currentListId
      : lists[0]?.id || "default"

  if (lists.length === 0) {
    return { currentListId: "default", lists: [{ id: "default", name: "My Wishlist", items: [] }] }
  }

  return { currentListId, lists }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const userId = session?.user?.id ?? null
  const socket = useRealtimeSocket(userId)

  const [items, setItems] = useState<CartItem[]>([])
  const [wishlistState, setWishlistState] = useState<WishlistState>({
    currentListId: "default",
    lists: [{ id: "default", name: "My Wishlist", items: [] }],
  })
  const [hydrated, setHydrated] = useState(false)

  const syncTimeoutRef = useRef<number | null>(null)
  const suppressCartSyncRef = useRef(false)
  const suppressWishlistSyncRef = useRef(false)

  const wishlist = useMemo(() => {
    const active = wishlistState.lists.find((entry) => entry.id === wishlistState.currentListId)
    return active?.items || []
  }, [wishlistState])

  useEffect(() => {
    const load = async () => {
      if (status === "loading") return

      if (!userId) {
        const guestCart = readStorage<CartItem[]>(GUEST_CART_STORAGE_KEY, [])
        const guestWishlist = readStorage<unknown>(GUEST_WISHLIST_STORAGE_KEY, [])
        setItems(Array.isArray(guestCart) ? guestCart : [])
        setWishlistState(normalizeWishlistState(guestWishlist))
        setHydrated(true)
        return
      }

      try {
        const response = await fetch("/api/account/cart-wishlist", { cache: "no-store" })
        const data = response.ok
          ? ((await response.json()) as { cart: CartItem[]; wishlist?: WishlistItem[]; wishlistState?: WishlistState })
          : { cart: [], wishlistState: normalizeWishlistState([]) }

        const guestCart = readStorage<CartItem[]>(GUEST_CART_STORAGE_KEY, [])
        const guestWishlist = readStorage<unknown>(GUEST_WISHLIST_STORAGE_KEY, [])

        const mergedCart = mergeCart(data.cart || [], guestCart)
        const mergedWishlistState = mergeWishlistState(normalizeWishlistState(data.wishlistState ?? data.wishlist ?? []), normalizeWishlistState(guestWishlist))

        setItems(mergedCart)
        setWishlistState(mergedWishlistState)

        if (guestCart.length > 0 || normalizeWishlistState(guestWishlist).lists.some((entry) => entry.items.length > 0)) {
          await fetch("/api/account/cart-wishlist", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cart: mergedCart, wishlistState: mergedWishlistState }),
          })

          window.localStorage.removeItem(GUEST_CART_STORAGE_KEY)
          window.localStorage.removeItem(GUEST_WISHLIST_STORAGE_KEY)
        }
      } catch {
        const guestCart = readStorage<CartItem[]>(GUEST_CART_STORAGE_KEY, [])
        const guestWishlist = readStorage<unknown>(GUEST_WISHLIST_STORAGE_KEY, [])
        setItems(guestCart)
        setWishlistState(normalizeWishlistState(guestWishlist))
      } finally {
        setHydrated(true)
      }
    }

    load()
  }, [status, userId])

  useEffect(() => {
    if (!socket || !userId) return

    const onCartUpdated = ({ cart }: { cart?: CartItem[] }) => {
      if (!Array.isArray(cart)) return
      suppressCartSyncRef.current = true
      setItems(cart)
    }

    const onWishlistUpdated = ({ wishlist: nextWishlist, wishlistState: nextWishlistState }: { wishlist?: WishlistItem[]; wishlistState?: WishlistState }) => {
      suppressWishlistSyncRef.current = true
      if (nextWishlistState) {
        setWishlistState(normalizeWishlistState(nextWishlistState))
        return
      }
      if (Array.isArray(nextWishlist)) {
        setWishlistState(normalizeWishlistState(nextWishlist))
      }
    }

    socket.on("commerce:cart-updated", onCartUpdated)
    socket.on("commerce:wishlist-updated", onWishlistUpdated)

    return () => {
      socket.off("commerce:cart-updated", onCartUpdated)
      socket.off("commerce:wishlist-updated", onWishlistUpdated)
    }
  }, [socket, userId])

  useEffect(() => {
    if (!hydrated) return

    if (!userId) {
      window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(items))
      return
    }

    window.localStorage.setItem(`tailorhub_cart_user_${userId}`, JSON.stringify(items))

    if (suppressCartSyncRef.current) {
      suppressCartSyncRef.current = false
      return
    }

    if (syncTimeoutRef.current) {
      window.clearTimeout(syncTimeoutRef.current)
    }

    syncTimeoutRef.current = window.setTimeout(() => {
      fetch("/api/account/cart-wishlist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart: items }),
      }).catch(() => undefined)

      socket?.emit("commerce:cart-updated", { userId, cart: items })
    }, 300)

    return () => {
      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [hydrated, items, socket, userId])

  useEffect(() => {
    if (!hydrated) return

    if (!userId) {
      window.localStorage.setItem(GUEST_WISHLIST_STORAGE_KEY, JSON.stringify(wishlistState))
      return
    }

    window.localStorage.setItem(`tailorhub_wishlist_user_${userId}`, JSON.stringify(wishlistState))

    if (suppressWishlistSyncRef.current) {
      suppressWishlistSyncRef.current = false
      return
    }

    fetch("/api/account/cart-wishlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wishlistState }),
    }).catch(() => undefined)

    socket?.emit("commerce:wishlist-updated", { userId, wishlistState })
  }, [hydrated, socket, userId, wishlistState])

  const addItem = (item: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((entry) => entry.id === item.id)
      if (existing) {
        return prev.map((entry) => (entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry))
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id)
      return
    }
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, quantity } : item)))
  }

  const clearCart = () => {
    setItems([])
  }

  const setCurrentWishlist = (id: string) => {
    setWishlistState((prev) => {
      if (!prev.lists.some((entry) => entry.id === id)) return prev
      return { ...prev, currentListId: id }
    })
  }

  const createWishlist = (name: string) => {
    const safeName = name.trim()
    if (!safeName) return

    setWishlistState((prev) => {
      const id = `list-${Date.now()}`
      return {
        ...prev,
        currentListId: id,
        lists: [...prev.lists, { id, name: safeName, items: [] }],
      }
    })
  }

  const renameWishlist = (id: string, name: string) => {
    const safeName = name.trim()
    if (!safeName) return

    setWishlistState((prev) => ({
      ...prev,
      lists: prev.lists.map((entry) => (entry.id === id ? { ...entry, name: safeName } : entry)),
    }))
  }

  const removeWishlist = (id: string) => {
    setWishlistState((prev) => {
      if (prev.lists.length <= 1) {
        return {
          currentListId: "default",
          lists: [{ id: "default", name: "My Wishlist", items: [] }],
        }
      }

      const nextLists = prev.lists.filter((entry) => entry.id !== id)
      const nextCurrent = nextLists.some((entry) => entry.id === prev.currentListId) ? prev.currentListId : nextLists[0].id
      return {
        currentListId: nextCurrent,
        lists: nextLists,
      }
    })
  }

  const moveWishlistItemToList = (itemId: string, fromListId: string, toListId: string) => {
    if (fromListId === toListId) return

    setWishlistState((prev) => {
      const fromList = prev.lists.find((entry) => entry.id === fromListId)
      const toList = prev.lists.find((entry) => entry.id === toListId)
      if (!fromList || !toList) return prev

      const item = fromList.items.find((entry) => entry.id === itemId)
      if (!item) return prev

      return {
        ...prev,
        lists: prev.lists.map((entry) => {
          if (entry.id === fromListId) {
            return { ...entry, items: entry.items.filter((wishlistItem) => wishlistItem.id !== itemId) }
          }
          if (entry.id === toListId) {
            if (entry.items.some((wishlistItem) => wishlistItem.id === item.id)) return entry
            return { ...entry, items: [...entry.items, item] }
          }
          return entry
        }),
      }
    })
  }

  const moveAllWishlistItemsToList = (fromListId: string, toListId: string) => {
    if (fromListId === toListId) return

    setWishlistState((prev) => {
      const fromList = prev.lists.find((entry) => entry.id === fromListId)
      const toList = prev.lists.find((entry) => entry.id === toListId)
      if (!fromList || !toList || fromList.items.length === 0) return prev

      const toMap = new Map(toList.items.map((item) => [item.id, item]))
      for (const item of fromList.items) {
        if (!toMap.has(item.id)) toMap.set(item.id, item)
      }

      return {
        ...prev,
        lists: prev.lists.map((entry) => {
          if (entry.id === fromListId) return { ...entry, items: [] }
          if (entry.id === toListId) return { ...entry, items: [...toMap.values()] }
          return entry
        }),
      }
    })
  }

  const addToWishlist = (item: WishlistItem) => {
    setWishlistState((prev) => ({
      ...prev,
      lists: prev.lists.map((entry) => {
        if (entry.id !== prev.currentListId) return entry
        if (entry.items.some((existing) => existing.id === item.id)) return entry
        return { ...entry, items: [...entry.items, item] }
      }),
    }))
  }

  const removeFromWishlist = (id: string) => {
    setWishlistState((prev) => ({
      ...prev,
      lists: prev.lists.map((entry) =>
        entry.id === prev.currentListId ? { ...entry, items: entry.items.filter((item) => item.id !== id) } : entry,
      ),
    }))
  }

  const toggleWishlist = (item: WishlistItem) => {
    setWishlistState((prev) => ({
      ...prev,
      lists: prev.lists.map((entry) => {
        if (entry.id !== prev.currentListId) return entry
        if (entry.items.some((existing) => existing.id === item.id)) {
          return { ...entry, items: entry.items.filter((existing) => existing.id !== item.id) }
        }
        return { ...entry, items: [...entry.items, item] }
      }),
    }))
  }

  const clearWishlist = () => {
    setWishlistState((prev) => ({
      ...prev,
      lists: prev.lists.map((entry) => (entry.id === prev.currentListId ? { ...entry, items: [] } : entry)),
    }))
  }

  const isInWishlist = (id: string) => wishlist.some((item) => item.id === id)
  const isInCart = (id: string) => items.some((item) => item.id === id)

  const count = useMemo(() => items.length, [items])
  const wishlistCount = useMemo(() => wishlist.length, [wishlist])
  const total = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items])

  const value: CartContextValue = {
    items,
    wishlist,
    wishlistLists: wishlistState.lists,
    currentWishlistId: wishlistState.currentListId,
    count,
    wishlistCount,
    total,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    isInWishlist,
    isInCart,
    clearWishlist,
    createWishlist,
    renameWishlist,
    removeWishlist,
    setCurrentWishlist,
    moveWishlistItemToList,
    moveAllWishlistItemsToList,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used inside CartProvider")
  }
  return context
}

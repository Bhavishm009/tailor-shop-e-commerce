"use client"

import Link from "next/link"
import Image from "next/image"
import { useMemo, useState } from "react"
import { GlobalNavbar } from "@/components/global-navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useCart } from "@/components/cart-provider"
import { AddToCartButton } from "@/components/add-to-cart-button"

type MoveSelectionMap = Record<string, string>

export default function WishlistPage() {
  const {
    wishlist,
    wishlistLists,
    currentWishlistId,
    setCurrentWishlist,
    createWishlist,
    removeWishlist,
    removeFromWishlist,
    clearWishlist,
    moveWishlistItemToList,
    moveAllWishlistItemsToList,
    addItem,
  } = useCart()

  const [newListName, setNewListName] = useState("")
  const [moveTargets, setMoveTargets] = useState<MoveSelectionMap>({})
  const [deleteListId, setDeleteListId] = useState<string | null>(null)
  const [deleteMoveTargetId, setDeleteMoveTargetId] = useState("")

  const currentList = useMemo(
    () => wishlistLists.find((entry) => entry.id === currentWishlistId) || wishlistLists[0],
    [wishlistLists, currentWishlistId],
  )

  const otherLists = useMemo(
    () => wishlistLists.filter((entry) => entry.id !== currentWishlistId),
    [wishlistLists, currentWishlistId],
  )

  const pendingDeleteList = useMemo(
    () => wishlistLists.find((entry) => entry.id === deleteListId) || null,
    [wishlistLists, deleteListId],
  )

  const openDeleteFlow = (listId: string) => {
    const list = wishlistLists.find((entry) => entry.id === listId)
    if (!list) return

    if (list.items.length === 0) {
      removeWishlist(listId)
      return
    }

    if (wishlistLists.length <= 1) {
      setDeleteListId(listId)
      setDeleteMoveTargetId("")
      return
    }

    const defaultTarget = wishlistLists.find((entry) => entry.id !== listId)?.id || ""
    setDeleteListId(listId)
    setDeleteMoveTargetId(defaultTarget)
  }

  const onMoveAndDelete = () => {
    if (!pendingDeleteList || !deleteMoveTargetId) return
    moveAllWishlistItemsToList(pendingDeleteList.id, deleteMoveTargetId)
    removeWishlist(pendingDeleteList.id)
    setDeleteListId(null)
    setDeleteMoveTargetId("")
  }

  return (
    <main className="min-h-screen bg-background">
      <GlobalNavbar />
      <section className="max-w-6xl mx-auto px-4 py-10 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold">Your Wishlists</h1>
          <p className="text-sm text-muted-foreground">Organize products into multiple wishlists and move items as needed.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <Card className="p-4 space-y-4 h-fit">
            <h2 className="font-semibold">Lists</h2>
            <div className="space-y-2">
              {wishlistLists.map((list) => (
                <div key={list.id} className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={list.id === currentWishlistId ? "default" : "outline"}
                    className="flex-1 justify-between"
                    onClick={() => setCurrentWishlist(list.id)}
                  >
                    <span className="truncate">{list.name}</span>
                    <span className="text-xs">{list.items.length}</span>
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => openDeleteFlow(list.id)} aria-label={`Delete ${list.name}`}>
                    x
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <input
                value={newListName}
                onChange={(event) => setNewListName(event.target.value)}
                className="h-10 rounded-md border bg-background px-3 w-full"
                placeholder="New wishlist name"
              />
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  const name = newListName.trim()
                  if (!name) return
                  createWishlist(name)
                  setNewListName("")
                }}
              >
                Create List
              </Button>
            </div>
          </Card>

          <div className="space-y-4">
            {pendingDeleteList ? (
              <Card className="p-4 space-y-3 border-amber-300">
                <p className="text-sm">
                  <span className="font-semibold">{pendingDeleteList.name}</span> has {pendingDeleteList.items.length} product(s).
                  Move items before deleting this wishlist.
                </p>
                {wishlistLists.length <= 1 ? (
                  <p className="text-sm text-muted-foreground">
                    You only have one wishlist. Move or clear items first, then delete.
                  </p>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select value={deleteMoveTargetId} onChange={(event) => setDeleteMoveTargetId(event.target.value)} className="h-10 rounded-md border bg-background px-3 flex-1">
                      {wishlistLists
                        .filter((entry) => entry.id !== pendingDeleteList.id)
                        .map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            Move to {entry.name}
                          </option>
                        ))}
                    </select>
                    <Button type="button" onClick={onMoveAndDelete} disabled={!deleteMoveTargetId}>
                      Move Items & Delete
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setDeleteListId(null)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </Card>
            ) : null}

            {!currentList || wishlist.length === 0 ? (
              <Card className="p-6 text-center space-y-3">
                <p className="text-muted-foreground">{currentList?.name || "Wishlist"} is empty.</p>
                <Button asChild>
                  <Link href="/products">Browse Products</Link>
                </Button>
              </Card>
            ) : (
              <>
                <Card className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{currentList.name}</p>
                    <p className="text-sm text-muted-foreground">{wishlist.length} item(s)</p>
                  </div>
                  <Button variant="outline" onClick={clearWishlist}>
                    Clear List
                  </Button>
                </Card>

                <div className="space-y-4">
                  {wishlist.map((item) => {
                    const defaultMoveTo = moveTargets[item.id] || otherLists[0]?.id || ""

                    return (
                      <Card key={item.id} className="p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {item.image ? (
                            <Image src={item.image} alt={item.name} width={120} height={120} className="h-16 w-16 rounded-md object-cover border" />
                          ) : (
                            <div className="h-16 w-16 rounded-md bg-muted border" />
                          )}
                          <div>
                            <Link href={`/products/${item.id}`} className="font-semibold hover:text-primary hover:underline">
                              {item.name}
                            </Link>
                            <p className="text-sm text-muted-foreground">Price: Rs. {item.price.toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <AddToCartButton id={item.id} name={item.name} price={item.price} image={item.image} stock={999} />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              addItem({ id: item.id, name: item.name, price: item.price, image: item.image })
                              removeFromWishlist(item.id)
                            }}
                          >
                            Move To Cart
                          </Button>
                          {otherLists.length > 0 ? (
                            <>
                              <select
                                className="h-10 rounded-md border bg-background px-3"
                                value={defaultMoveTo}
                                onChange={(event) =>
                                  setMoveTargets((prev) => ({
                                    ...prev,
                                    [item.id]: event.target.value,
                                  }))
                                }
                              >
                                {otherLists.map((list) => (
                                  <option key={list.id} value={list.id}>
                                    {list.name}
                                  </option>
                                ))}
                              </select>
                              <Button
                                type="button"
                                variant="outline"
                                disabled={!defaultMoveTo}
                                onClick={() => moveWishlistItemToList(item.id, currentWishlistId, defaultMoveTo)}
                              >
                                Move
                              </Button>
                            </>
                          ) : null}
                          <Button variant="ghost" onClick={() => removeFromWishlist(item.id)}>
                            Remove
                          </Button>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

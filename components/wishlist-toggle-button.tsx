"use client"

import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/components/cart-provider"

type Props = {
  id: string
  name: string
  price: number
  image?: string | null
  className?: string
  iconOnly?: boolean
}

export function WishlistToggleButton({ id, name, price, image, className, iconOnly = false }: Props) {
  const { isInWishlist, toggleWishlist } = useCart()
  const active = isInWishlist(id)

  return (
    <Button
      type="button"
      variant={iconOnly ? "secondary" : active ? "default" : "outline"}
      className={className}
      onClick={(event) => {
        event.stopPropagation()
        toggleWishlist({ id, name, price, image })
      }}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
    >
      <Heart className={`h-4 w-4 ${active ? "fill-current text-red-500" : ""}`} />
      {iconOnly ? null : <span className="ml-2">{active ? "Wishlisted" : "Wishlist"}</span>}
    </Button>
  )
}

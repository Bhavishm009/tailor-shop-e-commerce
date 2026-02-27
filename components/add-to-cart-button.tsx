"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useCart } from "@/components/cart-provider"

type Props = {
  id: string
  name: string
  price: number
  image?: string | null
  stock: number
  className?: string
}

export function AddToCartButton({ id, name, price, image, stock, className }: Props) {
  const router = useRouter()
  const { addItem, isInCart } = useCart()
  const inCart = isInCart(id)

  return (
    <Button
      className={className}
      onClick={() => {
        if (inCart) {
          router.push("/cart")
          return
        }
        addItem({
          id,
          name,
          price,
          image,
        })
      }}
      disabled={stock <= 0}
    >
      {stock <= 0 ? "Out Of Stock" : inCart ? "Go To Cart" : "Add To Cart"}
    </Button>
  )
}

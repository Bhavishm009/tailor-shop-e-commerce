"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { AddToCartButton } from "@/components/add-to-cart-button"
import { Carousel, CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"

type ProductRailItem = {
  id: string
  name: string
  price: number
  image: string | null
  images: unknown
  category: string
  clothType: string | null
  stock: number
}

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
}

export function ProductRailCarousel({
  items,
  title,
  subtitle,
}: {
  items: ProductRailItem[]
  title: string
  subtitle: string
}) {
  const [api, setApi] = useState<CarouselApi | null>(null)
  const [showControls, setShowControls] = useState(false)

  useEffect(() => {
    if (!api) return

    const refresh = () => {
      setShowControls(api.canScrollPrev() || api.canScrollNext())
    }

    refresh()
    api.on("reInit", refresh)
    api.on("select", refresh)

    return () => {
      api.off("reInit", refresh)
      api.off("select", refresh)
    }
  }, [api])

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <Carousel opts={{ align: "start" }} className="px-0 sm:px-12" setApi={setApi}>
        <CarouselContent>
          {items.map((item) => {
            const itemImages = Array.from(new Set([item.image, ...toStringArray(item.images)].filter(Boolean) as string[]))
            const cover = itemImages[0] || null

            return (
              <CarouselItem key={item.id} className="basis-[84%] sm:basis-[48%] lg:basis-[31%] xl:basis-[24%]">
                <Card className="h-full p-4 space-y-3">
                  {cover ? (
                    <Image src={cover} alt={item.name} width={800} height={600} className="h-40 w-full rounded-lg object-cover" />
                  ) : (
                    <div className="h-40 rounded-lg bg-muted" />
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold line-clamp-1">{item.name}</h3>
                      <Badge variant="outline" className="text-[10px]">
                        {item.category}
                      </Badge>
                    </div>
                    {item.clothType ? <p className="text-xs text-muted-foreground">Type: {item.clothType}</p> : null}
                    <p className="text-lg font-bold">Rs. {item.price.toFixed(2)}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <AddToCartButton
                      className="w-full"
                      id={item.id}
                      name={item.name}
                      price={item.price}
                      image={cover}
                      stock={item.stock}
                    />
                    <Link href={`/products/${item.id}`} className="h-9 rounded-md border flex items-center justify-center text-sm hover:bg-muted">
                      View Details
                    </Link>
                  </div>
                </Card>
              </CarouselItem>
            )
          })}
        </CarouselContent>
        {showControls ? <CarouselPrevious className="hidden sm:flex left-2" /> : null}
        {showControls ? <CarouselNext className="hidden sm:flex right-2" /> : null}
      </Carousel>
    </section>
  )
}

"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import useEmblaCarousel from "embla-carousel-react"
import { PlayCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AddToCartButton } from "@/components/add-to-cart-button"
import { WishlistToggleButton } from "@/components/wishlist-toggle-button"
import { getOptimizedImageUrl } from "@/lib/media-url"
import { useI18n } from "@/components/i18n-provider"
import { getLocalizedText, localizeCatalogLabel } from "@/lib/localize"

type ProductListingCardProps = {
  id: string
  name: string
  description: string | null
  price: number
  category: string
  clothType: string | null
  material: string | null
  stock: number
  image: string | null
  images: unknown
  videos: unknown
}

type Slide = {
  kind: "image" | "video"
  url: string
}

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
}

export function ProductListingCard(props: ProductListingCardProps) {
  const { language, dictionary } = useI18n()
  const router = useRouter()
  const [activeIndex, setActiveIndex] = useState(0)
  const [dragged, setDragged] = useState(false)
  const [viewportRef, emblaApi] = useEmblaCarousel({ align: "start", loop: false, dragFree: false })

  const slides = useMemo<Slide[]>(() => {
    const imageSlides = Array.from(new Set([props.image, ...toStringArray(props.images)].filter(Boolean) as string[])).map((url) => ({
      kind: "image" as const,
      url,
    }))
    const videoSlides = toStringArray(props.videos).map((url) => ({
      kind: "video" as const,
      url,
    }))
    return [...imageSlides, ...videoSlides]
  }, [props.image, props.images, props.videos])

  useEffect(() => {
    if (!emblaApi) return

    const onSelect = () => setActiveIndex(emblaApi.selectedScrollSnap())
    const onPointerDown = () => setDragged(false)
    const onPointerUp = () => {
      const diff = Math.abs(emblaApi.scrollProgress() - emblaApi.selectedScrollSnap() / Math.max(1, emblaApi.scrollSnapList().length - 1))
      if (diff > 0.01) setDragged(true)
      setTimeout(() => setDragged(false), 120)
    }

    emblaApi.on("select", onSelect)
    emblaApi.on("reInit", onSelect)
    emblaApi.on("pointerDown", onPointerDown)
    emblaApi.on("pointerUp", onPointerUp)
    onSelect()

    return () => {
      emblaApi.off("select", onSelect)
      emblaApi.off("reInit", onSelect)
      emblaApi.off("pointerDown", onPointerDown)
      emblaApi.off("pointerUp", onPointerUp)
    }
  }, [emblaApi])

  const goDetails = () => router.push(`/products/${props.id}`)
  const localizedName = getLocalizedText(props.name, language, props.name)
  const localizedDescription = getLocalizedText(props.description, language, "") || dictionary.common.noDescription
  const localizedCategory = localizeCatalogLabel(props.category, language)
  const localizedClothType = localizeCatalogLabel(props.clothType, language)
  const localizedMaterial = localizeCatalogLabel(props.material, language)

  return (
    <Card
      className="p-3 space-y-2.5 cursor-pointer transition-shadow hover:shadow-md"
      role="button"
      tabIndex={0}
      onClick={(event) => {
        const target = event.target as HTMLElement
        if (target.closest("[data-no-nav='true']") || dragged) return
        goDetails()
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          goDetails()
        }
      }}
    >
      <div className="relative rounded-md overflow-hidden aspect-3/4 min-h-[240px]" data-no-nav="true">
        <div ref={viewportRef} className="h-full overflow-hidden">
          <div className="flex h-full">
            {slides.length > 0 ? (
              slides.map((slide, index) => (
                <div key={`${slide.kind}-${slide.url}-${index}`} className="min-w-0 shrink-0 grow-0 basis-full h-full">
                  {slide.kind === "image" ? (
                    <Image
                      src={getOptimizedImageUrl(slide.url, "card")}
                      alt={localizedName}
                      width={640}
                      height={800}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-black text-white flex items-center justify-center gap-2">
                      <PlayCircle className="h-4 w-4" />
                      <span className="text-sm">Video</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="min-w-0 shrink-0 grow-0 basis-full h-full">
                <div className="bg-muted h-full" />
              </div>
            )}
          </div>
        </div>

        {slides.length > 0 ? (
          <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1.5 z-10" data-no-nav="true">
            {slides.map((slide, index) => (
              <button
                key={`${slide.kind}-${slide.url}-dot-${index}`}
                type="button"
                aria-label={`Go to media ${index + 1}`}
                onClick={(e) => {
                  e.stopPropagation()
                  emblaApi?.scrollTo(index)
                }}
                className={`h-2 w-2 rounded-full transition-colors shadow-md ${index === activeIndex ? "bg-primary scale-110" : "bg-white/90 border border-gray-300"}`}
              />
            ))}
          </div>
        ) : null}

        <div data-no-nav="true">
          <WishlistToggleButton
            id={props.id}
            name={localizedName}
            price={props.price}
            image={props.image}
            iconOnly
            className="absolute right-2 top-2 h-8 w-8 p-0 rounded-full bg-background/85 hover:bg-background z-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-base line-clamp-1">{localizedName}</h2>
          <Badge variant="outline">{localizedCategory || props.category}</Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{localizedDescription}</p>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {props.clothType ? <span>Type: {localizedClothType || props.clothType}</span> : null}
          {props.material ? <span>{dictionary.common.material}: {localizedMaterial || props.material}</span> : null}
        </div>
        <p className="text-lg font-bold">Rs. {props.price.toFixed(2)}</p>
      </div>

      <div className="pt-0.5" data-no-nav="true">
        <AddToCartButton
          className="w-full"
          id={props.id}
          name={localizedName}
          price={props.price}
          image={props.image}
          stock={props.stock}
        />
      </div>
    </Card>
  )
}

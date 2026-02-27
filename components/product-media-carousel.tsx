"use client"

import Image from "next/image"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { getOptimizedImageUrl } from "@/lib/media-url"

type Props = {
  images: string[]
  videos: string[]
  productName: string
}

type Slide = {
  kind: "image" | "video"
  url: string
}

export function ProductMediaCarousel({ images, videos, productName }: Props) {
  const slides = useMemo<Slide[]>(
    () => [
      ...images.map((url) => ({ kind: "image" as const, url })),
      ...videos.map((url) => ({ kind: "video" as const, url })),
    ],
    [images, videos],
  )
  const [index, setIndex] = useState(0)
  const [openPreview, setOpenPreview] = useState(false)

  if (slides.length === 0) {
    return <div className="h-[420px] bg-muted rounded-md" />
  }

  const active = slides[index]

  return (
    <div className="space-y-3">
      <div className="relative rounded-md overflow-hidden bg-muted">
        <button type="button" className="w-full text-left" onClick={() => setOpenPreview(true)}>
          {active.kind === "image" ? (
            <Image src={getOptimizedImageUrl(active.url, "detail")} alt={productName} width={1100} height={860} className="w-full h-[420px] object-cover" />
          ) : (
            <video src={active.url} controls className="w-full h-[420px] object-cover bg-black" />
          )}
        </button>
        {slides.length > 1 ? (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-between px-3 pointer-events-none">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Previous media"
              className="pointer-events-auto"
              onClick={() => setIndex((prev) => (prev <= 0 ? slides.length - 1 : prev - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Next media"
              className="pointer-events-auto"
              onClick={() => setIndex((prev) => (prev + 1) % slides.length)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {slides.map((slide, idx) => (
          <button
            key={`${slide.kind}-${slide.url}-${idx}`}
            type="button"
            onClick={() => setIndex(idx)}
            className={`h-16 w-20 rounded border shrink-0 ${idx === index ? "ring-2 ring-primary" : ""}`}
          >
            {slide.kind === "image" ? (
              <Image src={getOptimizedImageUrl(slide.url, "thumb")} alt={`${productName}-${idx + 1}`} width={140} height={100} className="h-16 w-20 object-cover rounded" />
            ) : (
              <div className="h-16 w-20 rounded bg-black text-white text-xs flex items-center justify-center">Video</div>
            )}
          </button>
        ))}
      </div>
      {slides.length > 1 ? (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setIndex((prev) => (prev <= 0 ? slides.length - 1 : prev - 1))}>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setIndex((prev) => (prev + 1) % slides.length)}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
      <Dialog open={openPreview} onOpenChange={setOpenPreview}>
        <DialogContent className="max-w-6xl p-2 bg-black border-black">
          <div className="relative rounded-md overflow-hidden bg-black">
            {active.kind === "image" ? (
              <Image src={getOptimizedImageUrl(active.url, "detail")} alt={productName} width={1800} height={1200} className="w-full h-[80vh] object-contain" />
            ) : (
              <video src={active.url} controls className="w-full h-[80vh] object-contain bg-black" />
            )}
            {slides.length > 1 ? (
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-between px-3 pointer-events-none">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  aria-label="Previous media"
                  className="pointer-events-auto"
                  onClick={() => setIndex((prev) => (prev <= 0 ? slides.length - 1 : prev - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  aria-label="Next media"
                  className="pointer-events-auto"
                  onClick={() => setIndex((prev) => (prev + 1) % slides.length)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

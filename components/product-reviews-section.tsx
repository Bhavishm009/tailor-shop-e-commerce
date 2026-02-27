"use client"

import { FormEvent, useMemo, useState } from "react"
import Image from "next/image"
import { Star } from "lucide-react"
import { uploadFile, isValidImageFile } from "@/lib/file-upload"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { FeedbackToasts } from "@/components/feedback-toasts"

type ReviewItem = {
  id: string
  rating: number
  title: string | null
  comment: string | null
  photos: string[]
  createdAt: string
  customer: {
    name: string
    profileImage: string | null
  }
}

export function ProductReviewsSection({
  productId,
  initialReviews,
  canReview,
  reason,
}: {
  productId: string
  initialReviews: ReviewItem[]
  canReview: boolean
  reason: "not-signed-in" | "not-customer" | "not-delivered" | "already-reviewed" | "eligible"
}) {
  const [reviews, setReviews] = useState(initialReviews)
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState("")
  const [comment, setComment] = useState("")
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [openPhoto, setOpenPhoto] = useState<string | null>(null)

  const average = useMemo(() => {
    if (reviews.length === 0) return 0
    return reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length
  }, [reviews])

  const onUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setError("")

    try {
      const next: string[] = []
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i]
        if (!isValidImageFile(file)) {
          setError("Only JPG/PNG/WebP/GIF images up to 10MB are allowed.")
          continue
        }
        const uploaded = await uploadFile(file, "/tailorhub/reviews")
        next.push(uploaded.url)
      }
      const deduped = Array.from(new Set([...photos, ...next])).slice(0, 5)
      setPhotos(deduped)
    } catch {
      setError("Failed to upload one or more review photos.")
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      const response = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title, comment, photos }),
      })

      const payload = await response.json()
      if (!response.ok) {
        setError(payload.error || "Failed to submit review.")
        return
      }

      setReviews((prev) => [payload, ...prev])
      setTitle("")
      setComment("")
      setPhotos([])
    } catch {
      setError("Failed to submit review.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Customer Reviews</h2>
          <p className="text-sm text-muted-foreground">
            {reviews.length > 0 ? `${average.toFixed(1)} / 5 from ${reviews.length} review${reviews.length > 1 ? "s" : ""}` : "No reviews yet."}
          </p>
        </div>
      </div>

      <Card className="p-4 md:p-5 space-y-3">
        <FeedbackToasts error={error} />
        {canReview ? (
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Rate this product</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} type="button" onClick={() => setRating(value)} aria-label={`Rate ${value} star`}>
                    <Star className={cn("h-5 w-5", value <= rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground")} />
                  </button>
                ))}
              </div>
            </div>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Review title (optional)"
              className="h-10 w-full rounded-md border bg-background px-3"
              maxLength={120}
            />
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Share your experience with this product"
              className="min-h-28 w-full rounded-md border bg-background px-3 py-2"
              maxLength={1200}
            />
            <div className="space-y-2">
              <p className="text-sm font-medium">Add photos (up to 5)</p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={(event) => onUploadFiles(event.target.files)}
                disabled={uploading || photos.length >= 5}
              />
              {photos.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {photos.map((url) => (
                    <div key={url} className="relative">
                      <Image src={url} alt="Review photo" width={80} height={80} className="h-16 w-16 rounded object-cover border" />
                      <button
                        type="button"
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-black text-white text-xs"
                        onClick={() => setPhotos((prev) => prev.filter((item) => item !== url))}
                        aria-label="Remove photo"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" disabled={submitting || uploading}>
              {submitting ? "Submitting..." : "Submit Review"}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            {reason === "not-signed-in"
              ? "Sign in as a customer to write a review."
              : reason === "not-customer"
                ? "Only customer accounts can submit product reviews."
                : reason === "not-delivered"
                  ? "You can review this product after your order is delivered."
                  : "You already reviewed this product."}
          </p>
        )}
      </Card>

      {reviews.length === 0 ? (
        <Card className="p-6 text-muted-foreground">No customer reviews yet.</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((review) => (
            <Card key={review.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{review.customer.name}</p>
                <p className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Star key={value} className={cn("h-4 w-4", value <= review.rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground")} />
                ))}
              </div>
              {review.title ? <p className="font-semibold">{review.title}</p> : null}
              {review.comment ? <p className="text-sm text-muted-foreground">{review.comment}</p> : null}
              {review.photos.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {review.photos.map((url) => (
                    <button key={url} type="button" onClick={() => setOpenPhoto(url)}>
                      <Image src={url} alt="Review attachment" width={120} height={120} className="h-16 w-16 rounded border object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!openPhoto} onOpenChange={() => setOpenPhoto(null)}>
        <DialogContent className="max-w-4xl p-2 bg-black border-black" showCloseButton>
          {openPhoto ? <Image src={openPhoto} alt="Review photo large view" width={1400} height={1000} className="w-full h-auto rounded" /> : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}

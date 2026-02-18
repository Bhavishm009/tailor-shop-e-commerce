"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { ChevronLeft, Star } from "lucide-react"

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState("")
  const [showReview, setShowReview] = useState(false)

  const statusTimeline = [
    { step: "Pending", completed: true },
    { step: "Assigned", completed: true },
    { step: "Stitching", completed: false },
    { step: "Completed", completed: false },
    { step: "Delivered", completed: false },
  ]

  return (
    <div className="p-8">
      <div className="max-w-4xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/customer/orders">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Link>
        </Button>

        {/* Order Header */}
        <Card className="p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Order #ORD-2025-001</h1>
              <p className="text-muted-foreground mt-1">Placed on Jan 15, 2025</p>
            </div>
            <Badge className="bg-purple-100 text-purple-800">In Stitching</Badge>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold mt-1">₹500</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Status</p>
              <Badge variant="outline" className="mt-1">
                Completed
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expected Delivery</p>
              <p className="text-lg font-semibold mt-1">Jan 22, 2025</p>
            </div>
          </div>
        </Card>

        {/* Timeline */}
        <Card className="p-8 mb-8">
          <h2 className="text-xl font-bold mb-6">Order Status</h2>
          <div className="space-y-4">
            {statusTimeline.map((status, i) => (
              <div key={i} className="flex items-center gap-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    status.completed ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {status.completed ? "✓" : i + 1}
                </div>
                <p className={status.completed ? "font-medium" : "text-muted-foreground"}>{status.step}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Order Details Tabs */}
        <Tabs defaultValue="details" className="mb-8">
          <TabsList>
            <TabsTrigger value="details">Order Details</TabsTrigger>
            <TabsTrigger value="measurements">Measurements</TabsTrigger>
            <TabsTrigger value="tailor">Tailor Info</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-6">
            <Card className="p-8">
              <h3 className="text-lg font-bold mb-6">Order Information</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Service Type</p>
                    <p className="font-medium">Custom Stitching - Formal Shirt</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cloth Type</p>
                    <p className="font-medium">Cotton</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm mt-1">Please add extra buttons with the shirt</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="measurements" className="mt-6">
            <Card className="p-8">
              <h3 className="text-lg font-bold mb-6">Measurements Used</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {[
                  { label: "Chest", value: "40 cm" },
                  { label: "Waist", value: "32 cm" },
                  { label: "Hip", value: "40 cm" },
                  { label: "Shoulder", value: "18 cm" },
                  { label: "Sleeve Length", value: "33 cm" },
                  { label: "Garment Length", value: "28 cm" },
                ].map((m, i) => (
                  <div key={i}>
                    <p className="text-sm text-muted-foreground">{m.label}</p>
                    <p className="font-semibold mt-1">{m.value}</p>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="tailor" className="mt-6">
            <Card className="p-8">
              <h3 className="text-lg font-bold mb-6">Assigned Tailor</h3>
              <div className="flex items-start gap-6 mb-6">
                <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                <div>
                  <h4 className="font-bold">Priya Sharma</h4>
                  <p className="text-sm text-muted-foreground">Experience: 8 years</p>
                  <div className="flex items-center gap-1 mt-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                    <span className="text-sm ml-1">4.8</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Specializations: Formal Shirts, Sarees, Blouses</p>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Review Section */}
        {!showReview && (
          <Button onClick={() => setShowReview(true)} className="w-full">
            Leave a Review
          </Button>
        )}

        {showReview && (
          <Card className="p-8">
            <h3 className="text-lg font-bold mb-6">Rate Your Tailor</h3>
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium mb-3">Rating</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setRating(star)} className="focus:outline-none">
                      <Star
                        className={`w-8 h-8 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Review (Optional)</label>
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Share your experience with this tailor..."
                  className="w-full p-3 border rounded-lg text-sm"
                  rows={4}
                />
              </div>

              <div className="flex gap-3">
                <Button disabled={rating === 0}>Submit Review</Button>
                <Button variant="outline" onClick={() => setShowReview(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

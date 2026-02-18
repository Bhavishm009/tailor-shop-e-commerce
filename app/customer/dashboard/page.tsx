"use client"

import { useSession } from "next-auth/react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Package, Ruler, TrendingUp } from "lucide-react"

export default function CustomerDashboard() {
  const { data: session } = useSession()

  const stats = [
    { label: "Active Orders", value: "2", icon: Package },
    { label: "Total Orders", value: "8", icon: TrendingUp },
    { label: "Saved Measurements", value: "3", icon: Ruler },
  ]

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {session?.user?.name}!</h1>
        <p className="text-muted-foreground mb-8">Manage your orders and customize your wardrobe</p>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <Card key={i} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                  </div>
                  <Icon className="w-10 h-10 text-primary opacity-20" />
                </div>
              </Card>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-8">
            <h3 className="text-xl font-bold mb-4">Custom Stitching</h3>
            <p className="text-muted-foreground mb-6">Create a new custom order with your preferences</p>
            <Button asChild>
              <Link href="/customer/orders/custom">Place Custom Order</Link>
            </Button>
          </Card>

          <Card className="p-8">
            <h3 className="text-xl font-bold mb-4">Ready-Made Clothing</h3>
            <p className="text-muted-foreground mb-6">Browse and purchase from our collection</p>
            <Button asChild variant="outline">
              <Link href="/products">Shop Now</Link>
            </Button>
          </Card>
        </div>

        {/* Recent Orders */}
        <Card className="p-6 mt-8">
          <h3 className="text-lg font-bold mb-4">Recent Orders</h3>
          <p className="text-muted-foreground">No orders yet. Start shopping!</p>
        </Card>
      </div>
    </div>
  )
}

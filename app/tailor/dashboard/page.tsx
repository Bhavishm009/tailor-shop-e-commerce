"use client"

import { useSession } from "next-auth/react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Package, Clock, CheckCircle, DollarSign } from "lucide-react"

export default function TailorDashboard() {
  const { data: session } = useSession()

  const stats = [
    {
      label: "Active Orders",
      value: "3",
      icon: Clock,
      color: "text-yellow-600",
    },
    {
      label: "Completed This Month",
      value: "12",
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      label: "Monthly Earnings",
      value: "₹18,500",
      icon: DollarSign,
      color: "text-blue-600",
    },
  ]

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Welcome, {session?.user?.name}!</h1>
        <p className="text-muted-foreground mb-8">Manage your stitching orders and track earnings</p>

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
                  <Icon className={`w-10 h-10 ${stat.color} opacity-20`} />
                </div>
              </Card>
            )
          })}
        </div>

        {/* Active Orders */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Active Orders</h2>
            <Button asChild variant="outline">
              <Link href="/tailor/orders">View All</Link>
            </Button>
          </div>
          <p className="text-muted-foreground">You have 3 active orders assigned to you</p>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-8">
            <Package className="w-10 h-10 text-primary mb-4" />
            <h3 className="text-lg font-bold mb-2">View Assigned Orders</h3>
            <p className="text-muted-foreground mb-4">Check measurements and order details</p>
            <Button asChild>
              <Link href="/tailor/orders">View Orders</Link>
            </Button>
          </Card>

          <Card className="p-8">
            <DollarSign className="w-10 h-10 text-primary mb-4" />
            <h3 className="text-lg font-bold mb-2">Earnings Report</h3>
            <p className="text-muted-foreground mb-4">Track your monthly earnings</p>
            <Button asChild variant="outline">
              <Link href="/tailor/earnings">View Earnings</Link>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}

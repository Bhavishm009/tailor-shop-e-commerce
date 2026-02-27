"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Package, Clock, CheckCircle, DollarSign } from "lucide-react"

type TailorAccount = {
  totalAssigned: number
  completed: number
  totalPayout: number
  paid: number
  pending: number
  assignments: Array<{
    id: string
    totalDue: number
    paidAmount: number
    pendingAmount: number
    payoutStatus: "PENDING" | "APPROVED" | "PAID"
    stitchingOrder: {
      id: string
      stitchingService: string
      status: string
      createdAt: string
    }
  }>
}

export default function TailorDashboard() {
  const { data: session } = useSession()
  const [data, setData] = useState<TailorAccount | null>(null)

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/tailor/account", { cache: "no-store" })
      if (!response.ok) return
      setData((await response.json()) as TailorAccount)
    }
    void load()
  }, [])

  const activeOrders = useMemo(
    () => (data ? data.assignments.filter((item) => ["ASSIGNED", "STITCHING", "QC"].includes(item.stitchingOrder.status)).length : 0),
    [data],
  )

  const stats = [
    { label: "Active Orders", value: String(activeOrders), icon: Clock, color: "text-yellow-600" },
    { label: "Completed Orders", value: String(data?.completed || 0), icon: CheckCircle, color: "text-green-600" },
    { label: "Total Payout", value: `Rs. ${(data?.totalPayout || 0).toFixed(2)}`, icon: DollarSign, color: "text-blue-600" },
    { label: "Pending Payout", value: `Rs. ${(data?.pending || 0).toFixed(2)}`, icon: Package, color: "text-orange-600" },
  ]

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Welcome, {session?.user?.name}!</h1>
        <p className="text-muted-foreground mb-6 md:mb-8">Manage your stitching orders and track earnings</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label} className="p-6">
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

        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Active Orders</h2>
            <Button asChild variant="outline">
              <Link href="/tailor/orders">View All</Link>
            </Button>
          </div>
          <p className="text-muted-foreground">You have {activeOrders} active orders assigned.</p>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <Card className="p-6 md:p-8">
            <Package className="w-10 h-10 text-primary mb-4" />
            <h3 className="text-lg font-bold mb-2">View Assigned Orders</h3>
            <p className="text-muted-foreground mb-4">Check measurements and order details</p>
            <Button asChild>
              <Link href="/tailor/orders">View Orders</Link>
            </Button>
          </Card>

          <Card className="p-6 md:p-8">
            <DollarSign className="w-10 h-10 text-primary mb-4" />
            <h3 className="text-lg font-bold mb-2">Earnings Report</h3>
            <p className="text-muted-foreground mb-4">Track your monthly earnings</p>
            <Button asChild variant="outline">
              <Link href="/tailor/earnings">View Earnings</Link>
            </Button>
          </Card>

          <Card className="p-6 md:p-8">
            <Clock className="w-10 h-10 text-primary mb-4" />
            <h3 className="text-lg font-bold mb-2">Account Panel</h3>
            <p className="text-muted-foreground mb-4">See payout and assignment details</p>
            <Button asChild variant="outline">
              <Link href="/tailor/account">Open Panel</Link>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}

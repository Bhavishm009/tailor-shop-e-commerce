"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

type EarningsResponse = {
  totalAssignments: number
  completedAssignments: number
  totalEarnings: number
  paidEarnings: number
  approvedPending: number
  thisMonthEarnings: number
  thisMonthOrders: number
  monthlyTrend: Array<{ month: string; earnings: number; orders: number }>
}

export default function EarningsPage() {
  const [data, setData] = useState<EarningsResponse | null>(null)

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/tailor/earnings", { cache: "no-store" })
      if (!response.ok) return
      const json = (await response.json()) as EarningsResponse
      setData(json)
    }

    load()
  }, [])

  const averagePerOrder = useMemo(() => {
    if (!data || data.completedAssignments === 0) return 0
    return data.totalEarnings / data.completedAssignments
  }, [data])

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">Earnings</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">This Month</p>
            <p className="text-2xl md:text-3xl font-bold mt-2">Rs. {(data?.thisMonthEarnings || 0).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">{data?.thisMonthOrders || 0} completed orders</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Total Earnings</p>
            <p className="text-2xl md:text-3xl font-bold mt-2">Rs. {(data?.totalEarnings || 0).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">{data?.completedAssignments || 0} completed orders</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Paid Amount</p>
            <p className="text-2xl md:text-3xl font-bold mt-2">Rs. {(data?.paidEarnings || 0).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">Approved pending: Rs. {(data?.approvedPending || 0).toFixed(2)}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Average Order</p>
            <p className="text-2xl md:text-3xl font-bold mt-2">Rs. {averagePerOrder.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">per completed order</p>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-bold mb-6">Monthly Earnings</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.monthlyTrend || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="earnings" fill="#3b82f6" name="Earnings (Rs.)" />
              <Bar dataKey="orders" fill="#10b981" name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}

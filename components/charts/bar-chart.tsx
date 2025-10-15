"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface BarChartProps {
  data: Array<{
    month: string
    amount: number
  }>
  className?: string
}

export function BillingBarChart({ data, className }: BarChartProps) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 150, 136, 0.1)" />
          <XAxis dataKey="month" stroke="rgba(0, 77, 64, 0.7)" fontSize={12} />
          <YAxis
            stroke="rgba(0, 77, 64, 0.7)"
            fontSize={12}
            tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              border: "1px solid rgba(0, 150, 136, 0.2)",
              borderRadius: "8px",
              backdropFilter: "blur(10px)",
            }}
            formatter={(value) => [`Rp ${Number(value).toLocaleString("id-ID")}`, "Total Tagihan (Incl. Bln Lalu)"]}
          />
          <Bar dataKey="amount" fill="#009688" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

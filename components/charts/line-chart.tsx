"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface LineChartProps {
  data: Array<{
    month: string
    usage: number
  }>
  className?: string
}

export function UsageLineChart({ data, className }: LineChartProps) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 150, 136, 0.1)" />
          <XAxis dataKey="month" stroke="rgba(0, 77, 64, 0.7)" fontSize={12} />
          <YAxis stroke="rgba(0, 77, 64, 0.7)" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              border: "1px solid rgba(0, 150, 136, 0.2)",
              borderRadius: "8px",
              backdropFilter: "blur(10px)",
            }}
            formatter={(value) => [`${value} m³`, "Pemakaian"]}
          />
          <Line
            type="monotone"
            dataKey="usage"
            stroke="#009688"
            strokeWidth={3}
            dot={{ fill: "#009688", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: "#009688", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

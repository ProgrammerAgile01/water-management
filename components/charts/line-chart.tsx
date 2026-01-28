"use client";

import { formatPeriod } from "@/lib/format-period-chart-dashboard";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface LineChartProps {
  data: Array<{
    month: string;
    usage: number;
  }>;
  className?: string;
}

export function UsageLineChart({ data, className }: LineChartProps) {
  const isTimeline = data.some((d: any) => d.month?.includes("-"));

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(0, 150, 136, 0.1)"
          />
          <XAxis
            dataKey="month"
            tickFormatter={formatPeriod}
            angle={isTimeline ? -35 : 0}
            textAnchor={isTimeline ? "end" : "middle"}
            height={isTimeline ? 60 : 30}
            fontSize={isTimeline ? 11 : 12}
          />
          <YAxis fontSize={12} />

          <Tooltip
            labelFormatter={formatPeriod}
            formatter={(value) => [`${value} m³`, "Pemakaian"]}
            contentStyle={{
              backgroundColor: "rgba(255,255,255,.95)",
              borderRadius: 8,
              border: "1px solid rgba(0,150,136,.2)",
            }}
          />

          <Line
            type="monotone"
            dataKey="usage"
            stroke="#009688"
            strokeWidth={3}
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

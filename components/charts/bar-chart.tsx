"use client";

import { formatPeriod } from "@/lib/format-period-chart-dashboard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface BarChartProps {
  data: Array<{
    month: string;
    amount: number;
  }>;
  className?: string;
}

export function BillingBarChart({ data, className }: BarChartProps) {
  const isTimeline = data.some((d: any) => d.month?.includes("-"));

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
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

          <YAxis
            fontSize={12}
            tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)} jt`}
          />

          <Tooltip
            labelFormatter={formatPeriod}
            formatter={(v) => [
              `Rp ${Number(v).toLocaleString("id-ID")}`,
              "Total Tagihan",
            ]}
            contentStyle={{
              backgroundColor: "rgba(255,255,255,.95)",
              borderRadius: 8,
              border: "1px solid rgba(0,150,136,.2)",
            }}
          />

          <Bar dataKey="amount" fill="#009688" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

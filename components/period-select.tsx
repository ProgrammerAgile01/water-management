"use client"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PeriodSelectProps {
  onPeriodChange?: (period: string) => void
}

export function PeriodSelect({ onPeriodChange }: PeriodSelectProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("2024-01")

  const generatePeriods = () => {
    const periods = []
    const currentDate = new Date()

    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const monthName = date.toLocaleDateString("id-ID", { month: "long", year: "numeric" })

      periods.push({
        value: `${year}-${month}`,
        label: monthName,
      })
    }

    return periods
  }

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value)
    onPeriodChange?.(value)
  }

  return (
    <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
      <SelectTrigger className="w-48 bg-card/50">
        <SelectValue placeholder="Pilih Periode" />
      </SelectTrigger>
      <SelectContent>
        {generatePeriods().map((period) => (
          <SelectItem key={period.value} value={period.value}>
            {period.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

export function MeterReadingForm() {
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const generatePeriods = () => {
    const periods = []
    const currentDate = new Date()

    for (let i = 0; i < 6; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1)
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

  const handleStartReading = async () => {
    if (!selectedPeriod) {
      toast({
        title: "Periode Belum Dipilih",
        description: "Silakan pilih periode pencatatan terlebih dahulu",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Simulate loading customer data
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Data Pelanggan Dimuat",
        description: `Periode ${selectedPeriod} siap untuk pencatatan`,
      })

      // In real app, this would trigger loading customer data in MeterGrid
    } catch (error) {
      toast({
        title: "Gagal Memuat Data",
        description: "Terjadi kesalahan saat memuat data pelanggan",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div className="space-y-2">
          <Label htmlFor="period" className="text-base font-medium">
            Periode Pencatatan
          </Label>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="h-12 bg-card/50">
              <SelectValue placeholder="Pilih periode..." />
            </SelectTrigger>
            <SelectContent>
              {generatePeriods().map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleStartReading} className="h-12" disabled={isLoading}>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Memuat...
            </div>
          ) : (
            "Mulai Pencatatan"
          )}
        </Button>
      </div>

      {selectedPeriod && (
        <div className="p-4 bg-primary/10 rounded-lg">
          <p className="text-sm text-primary font-medium">
            Periode terpilih: {generatePeriods().find((p) => p.value === selectedPeriod)?.label}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Pastikan semua meter sudah dibaca sebelum mengirim tagihan
          </p>
        </div>
      )}
    </div>
  )
}

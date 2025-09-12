"use client"
import { GlassCard } from "./glass-card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Search } from "lucide-react"
import { useBillingStore } from "@/lib/billing-store"

export function BillingFilters() {
  const {
    selectedPeriode,
    selectedStatus,
    searchQuery,
    setSelectedPeriode,
    setSelectedStatus,
    setSearchQuery,
    refreshData,
  } = useBillingStore()

  const periodeOptions = [
    { value: "semua", label: "Semua Periode" },
    { value: "Juli 2025", label: "Juli 2025" },
    { value: "Juni 2025", label: "Juni 2025" },
    { value: "Mei 2025", label: "Mei 2025" },
  ]

  const statusOptions = [
    { value: "semua", label: "Semua Status" },
    { value: "belum-lunas", label: "Belum Lunas" },
    { value: "lunas", label: "Lunas" },
  ]

  return (
    <GlassCard className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Periode Dropdown */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Periode Tagihan</label>
          <Select value={selectedPeriode} onValueChange={setSelectedPeriode}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih periode" />
            </SelectTrigger>
            <SelectContent>
              {periodeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Dropdown */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Status Tagihan</label>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Cari Warga/Zona</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nama warga atau zona..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground opacity-0">Actions</label>
          <Button onClick={refreshData} className="w-full bg-transparent" variant="outline">
            Refresh Data
          </Button>
        </div>
      </div>
    </GlassCard>
  )
}

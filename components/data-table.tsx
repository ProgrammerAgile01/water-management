"use client"

import { useState } from "react"
import { GlassCard } from "./glass-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface DataTableProps {
  title: string
  data: Array<{
    id: string
    periode: string
    totalM3: number
    tagihan: number
    sudahBayar: number
    belumBayar: number
    status: "paid" | "unpaid" | "partial"
  }>
}

export function DataTable({ title, data }: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  const filteredData = data.filter((item) => item.periode.toLowerCase().includes(searchTerm.toLowerCase()))

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Lunas</Badge>
      case "unpaid":
        return <Badge variant="destructive">Belum Bayar</Badge>
      case "partial":
        return <Badge variant="secondary">Sebagian</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <Input
          placeholder="Cari periode..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-48 bg-card/50"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/20">
              <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Periode</th>
              <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Total m³</th>
              <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Tagihan</th>
              <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Sudah Bayar</th>
              <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Belum Bayar</th>
              <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item) => (
              <tr key={item.id} className="border-b border-border/10 hover:bg-muted/20">
                <td className="py-3 px-2 text-sm font-medium text-foreground">{item.periode}</td>
                <td className="py-3 px-2 text-sm text-right text-foreground">{item.totalM3.toLocaleString()} m³</td>
                <td className="py-3 px-2 text-sm text-right text-foreground">
                  Rp {item.tagihan.toLocaleString("id-ID")}
                </td>
                <td className="py-3 px-2 text-sm text-right text-green-600">
                  Rp {item.sudahBayar.toLocaleString("id-ID")}
                </td>
                <td className="py-3 px-2 text-sm text-right text-red-600">
                  Rp {item.belumBayar.toLocaleString("id-ID")}
                </td>
                <td className="py-3 px-2 text-center">{getStatusBadge(item.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Menampilkan {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredData.length)} dari{" "}
            {filteredData.length} data
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="bg-transparent"
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="bg-transparent"
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}
    </GlassCard>
  )
}

"use client"

import { GlassCard } from "./glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

interface Customer {
  id: string
  nama: string
  kodeCustomer: string
  noWA: string
  alamat: string
  meterAwal: number
  status: "aktif" | "nonaktif"
  tanggalDaftar: string
}

interface UsageHistory {
  id: string
  periode: string
  meterAwal: number
  meterAkhir: number
  jmlPakai: number
  tarifPerM3: number
  abonemen: number
  denda: number
  total: number
  statusBayar: "lunas" | "belum" | "sebagian"
  tanggalBayar?: string
}

interface CustomerHistoryModalProps {
  customer: Customer
  onClose: () => void
}

// Mock usage history data
const mockUsageHistory: UsageHistory[] = [
  {
    id: "1",
    periode: "Januari 2024",
    meterAwal: 1000,
    meterAkhir: 1025,
    jmlPakai: 25,
    tarifPerM3: 2500,
    abonemen: 15000,
    denda: 0,
    total: 77500,
    statusBayar: "lunas",
    tanggalBayar: "2024-01-28",
  },
  {
    id: "2",
    periode: "Februari 2024",
    meterAwal: 1025,
    meterAkhir: 1048,
    jmlPakai: 23,
    tarifPerM3: 2500,
    abonemen: 15000,
    denda: 0,
    total: 72500,
    statusBayar: "lunas",
    tanggalBayar: "2024-02-25",
  },
  {
    id: "3",
    periode: "Maret 2024",
    meterAwal: 1048,
    meterAkhir: 1075,
    jmlPakai: 27,
    tarifPerM3: 2500,
    abonemen: 15000,
    denda: 0,
    total: 82500,
    statusBayar: "sebagian",
    tanggalBayar: "2024-03-20",
  },
  {
    id: "4",
    periode: "April 2024",
    meterAwal: 1075,
    meterAkhir: 1102,
    jmlPakai: 27,
    tarifPerM3: 2500,
    abonemen: 15000,
    denda: 5000,
    total: 87500,
    statusBayar: "belum",
  },
]

export function CustomerHistoryModal({ customer, onClose }: CustomerHistoryModalProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "lunas":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Lunas</Badge>
      case "belum":
        return <Badge variant="destructive">Belum Bayar</Badge>
      case "sebagian":
        return <Badge variant="secondary">Sebagian</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <GlassCard className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{customer.nama}</h2>
              <p className="text-muted-foreground">Kode: {customer.kodeCustomer}</p>
              <p className="text-sm text-muted-foreground mt-1">{customer.alamat}</p>
            </div>
            <Button variant="outline" size="sm" onClick={onClose} className="bg-transparent">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-muted/20 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">No. WhatsApp</p>
              <p className="font-medium text-foreground">{customer.noWA}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Meter Awal</p>
              <p className="font-medium text-foreground">{customer.meterAwal}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-1">
                {customer.status === "aktif" ? (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Aktif</Badge>
                ) : (
                  <Badge variant="secondary">Non-aktif</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Usage History Table */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Histori Pemakaian</h3>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-card/90 backdrop-blur-sm">
                  <tr className="border-b border-border/20">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Periode</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Meter Awal</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Meter Akhir</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Jml Pakai</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Tarif/m³</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Abonemen</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Denda</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Total</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mockUsageHistory.map((history) => (
                    <tr key={history.id} className="border-b border-border/10 hover:bg-muted/20">
                      <td className="py-3 px-2 text-sm font-medium text-foreground">{history.periode}</td>
                      <td className="py-3 px-2 text-sm text-center text-foreground">{history.meterAwal}</td>
                      <td className="py-3 px-2 text-sm text-center text-foreground">{history.meterAkhir}</td>
                      <td className="py-3 px-2 text-sm text-center font-medium text-primary">{history.jmlPakai} m³</td>
                      <td className="py-3 px-2 text-sm text-right text-foreground">
                        Rp {history.tarifPerM3.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-2 text-sm text-right text-foreground">
                        Rp {history.abonemen.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-2 text-sm text-right text-foreground">
                        {history.denda > 0 ? `Rp ${history.denda.toLocaleString("id-ID")}` : "-"}
                      </td>
                      <td className="py-3 px-2 text-sm text-right font-bold text-foreground">
                        Rp {history.total.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-2 text-center">{getStatusBadge(history.statusBayar)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4 max-h-96 overflow-y-auto">
              {mockUsageHistory.map((history) => (
                <div key={history.id} className="p-4 bg-muted/20 rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-foreground">{history.periode}</p>
                      <p className="text-sm text-primary font-medium">{history.jmlPakai} m³</p>
                    </div>
                    {getStatusBadge(history.statusBayar)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Meter:</span> {history.meterAwal} → {history.meterAkhir}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tarif:</span> Rp{" "}
                      {history.tarifPerM3.toLocaleString("id-ID")}/m³
                    </div>
                    <div>
                      <span className="text-muted-foreground">Abonemen:</span> Rp{" "}
                      {history.abonemen.toLocaleString("id-ID")}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Denda:</span>{" "}
                      {history.denda > 0 ? `Rp ${history.denda.toLocaleString("id-ID")}` : "-"}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/20">
                    <p className="font-bold text-foreground">Total: Rp {history.total.toLocaleString("id-ID")}</p>
                    {history.tanggalBayar && (
                      <p className="text-sm text-muted-foreground">
                        Dibayar: {new Date(history.tanggalBayar).toLocaleDateString("id-ID")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end mt-6 pt-4 border-t border-border/20">
            <Button onClick={onClose} className="px-8">
              Tutup
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

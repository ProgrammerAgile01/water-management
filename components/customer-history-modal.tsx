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
        return <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100 border-teal-200">Lunas</Badge>
      case "belum":
        return <Badge variant="destructive">Belum Bayar</Badge>
      case "sebagian":
        return <Badge variant="secondary">Sebagian</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-teal-900/40 via-cyan-900/30 to-blue-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="w-full max-w-6xl h-[90vh] overflow-y-auto">
        <GlassCard className="p-6 bg-gradient-to-br from-teal-50/90 via-cyan-50/80 to-blue-50/90 backdrop-blur-md border-2 border-teal-200/30 shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-teal-900">{customer.nama}</h2>
              <p className="text-teal-700">Kode: {customer.kodeCustomer}</p>
              <p className="text-sm text-teal-600 mt-1">{customer.alamat}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="bg-teal-50/50 border-teal-200 hover:bg-teal-100/70 text-teal-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-teal-50/30 rounded-lg border border-teal-200/20">
            <div>
              <p className="text-sm text-teal-600">No. WhatsApp</p>
              <p className="font-medium text-teal-900">{customer.noWA}</p>
            </div>
            <div>
              <p className="text-sm text-teal-600">Meter Awal</p>
              <p className="font-medium text-teal-900">{customer.meterAwal}</p>
            </div>
            <div>
              <p className="text-sm text-teal-600">Status</p>
              <div className="mt-1">
                {customer.status === "aktif" ? (
                  <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100 border-teal-200">Aktif</Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-700 border-gray-200">Non-aktif</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Usage History Table */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-teal-900">Histori Pemakaian</h3>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-teal-50/90 backdrop-blur-sm">
                  <tr className="border-b border-teal-200/30">
                    <th className="text-left py-3 px-2 text-sm font-medium text-teal-700">Periode</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-teal-700">Meter Awal</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-teal-700">Meter Akhir</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-teal-700">Jml Pakai</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-teal-700">Tarif/m³</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-teal-700">Abonemen</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-teal-700">Denda</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-teal-700">Total</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-teal-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mockUsageHistory.map((history) => (
                    <tr key={history.id} className="border-b border-teal-200/20 hover:bg-teal-50/30">
                      <td className="py-3 px-2 text-sm font-medium text-teal-900">{history.periode}</td>
                      <td className="py-3 px-2 text-sm text-center text-teal-800">{history.meterAwal}</td>
                      <td className="py-3 px-2 text-sm text-center text-teal-800">{history.meterAkhir}</td>
                      <td className="py-3 px-2 text-sm text-center font-medium text-teal-600">{history.jmlPakai} m³</td>
                      <td className="py-3 px-2 text-sm text-right text-teal-800">
                        Rp {history.tarifPerM3.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-2 text-sm text-right text-teal-800">
                        Rp {history.abonemen.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-2 text-sm text-right text-teal-800">
                        {history.denda > 0 ? `Rp ${history.denda.toLocaleString("id-ID")}` : "-"}
                      </td>
                      <td className="py-3 px-2 text-sm text-right font-bold text-teal-900">
                        Rp {history.total.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-2 text-center">{getStatusBadge(history.statusBayar)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
              {mockUsageHistory.map((history) => (
                <div key={history.id} className="p-4 bg-teal-50/30 rounded-lg border border-teal-200/20 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-teal-900">{history.periode}</p>
                      <p className="text-sm text-teal-600 font-medium">{history.jmlPakai} m³</p>
                    </div>
                    {getStatusBadge(history.statusBayar)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-teal-600">Meter:</span>{" "}
                      <span className="text-teal-800">
                        {history.meterAwal} → {history.meterAkhir}
                      </span>
                    </div>
                    <div>
                      <span className="text-teal-600">Tarif:</span>{" "}
                      <span className="text-teal-800">Rp {history.tarifPerM3.toLocaleString("id-ID")}/m³</span>
                    </div>
                    <div>
                      <span className="text-teal-600">Abonemen:</span>{" "}
                      <span className="text-teal-800">Rp {history.abonemen.toLocaleString("id-ID")}</span>
                    </div>
                    <div>
                      <span className="text-teal-600">Denda:</span>{" "}
                      <span className="text-teal-800">
                        {" "}
                        {history.denda > 0 ? `Rp ${history.denda.toLocaleString("id-ID")}` : "-"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-teal-200/30">
                    <p className="font-bold text-teal-900">Total: Rp {history.total.toLocaleString("id-ID")}</p>
                    {history.tanggalBayar && (
                      <p className="text-sm text-teal-600">
                        Dibayar: {new Date(history.tanggalBayar).toLocaleDateString("id-ID")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end mt-6 pt-4 border-t border-teal-200/30">
            <Button onClick={onClose} className="px-8 bg-teal-600 hover:bg-teal-700 text-white">
              Tutup
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

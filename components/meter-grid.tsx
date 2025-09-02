"use client"

import { useState } from "react"
import { GlassCard } from "./glass-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useConfigStore } from "@/lib/config-store"
import { useWaterIssuesStore } from "@/lib/water-issues-store"
import { Calculator, Save, Search, Send, CheckCircle } from "lucide-react"

interface MeterReading {
  id: string
  kodeCustomer: string
  nama: string
  alamat: string
  phone: string
  meterAwal: number
  meterAkhir: number | null
  pemakaian: number
  tarifPerM3: number
  abonemen: number
  totalTagihan: number
  jatuhTempo: string
  kendala: string
  status: "pending" | "completed"
  tagihanSent: boolean
}

// Mock data - in real app, this would come from API based on selected period
const mockMeterReadings: MeterReading[] = [
  {
    id: "1",
    kodeCustomer: "TB240001",
    nama: "Budi Santoso",
    alamat: "Jl. Merdeka No. 12",
    phone: "081234567890",
    meterAwal: 1075,
    meterAkhir: null,
    pemakaian: 0,
    tarifPerM3: 2500,
    abonemen: 10000,
    totalTagihan: 10000,
    jatuhTempo: "2024-09-09",
    kendala: "",
    status: "pending",
    tagihanSent: false,
  },
  {
    id: "2",
    kodeCustomer: "TB240002",
    nama: "Siti Aminah",
    alamat: "Jl. Sudirman No. 8",
    phone: "081234567891",
    meterAwal: 890,
    meterAkhir: 915,
    pemakaian: 25,
    tarifPerM3: 2500,
    abonemen: 10000,
    totalTagihan: 72500,
    jatuhTempo: "2024-09-09",
    kendala: "",
    status: "completed",
    tagihanSent: true,
  },
  {
    id: "3",
    kodeCustomer: "TB240003",
    nama: "Ahmad Rahman",
    alamat: "Jl. Diponegoro No. 15",
    phone: "081234567892",
    meterAwal: 1205,
    meterAkhir: null,
    pemakaian: 0,
    tarifPerM3: 2500,
    abonemen: 10000,
    totalTagihan: 10000,
    jatuhTempo: "2024-09-09",
    kendala: "",
    status: "pending",
    tagihanSent: false,
  },
  {
    id: "4",
    kodeCustomer: "TB240004",
    nama: "Dewi Sartika",
    alamat: "Jl. Kartini No. 22",
    phone: "081234567893",
    meterAwal: 1050,
    meterAkhir: 1078,
    pemakaian: 28,
    tarifPerM3: 2500,
    abonemen: 10000,
    totalTagihan: 80000,
    jatuhTempo: "2024-09-09",
    kendala: "",
    status: "completed",
    tagihanSent: false,
  },
  {
    id: "5",
    kodeCustomer: "TB240005",
    nama: "Joko Widodo",
    alamat: "Jl. Pahlawan No. 5",
    phone: "081234567894",
    meterAwal: 1180,
    meterAkhir: null,
    pemakaian: 0,
    tarifPerM3: 2500,
    abonemen: 10000,
    totalTagihan: 10000,
    jatuhTempo: "2024-09-09",
    kendala: "",
    status: "pending",
    tagihanSent: false,
  },
]

export function MeterGrid() {
  const [readings, setReadings] = useState<MeterReading[]>(mockMeterReadings)
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const { toast } = useToast()
  const { tarif } = useConfigStore()
  const { addIssue } = useWaterIssuesStore()

  const filteredReadings = readings.filter(
    (reading) =>
      reading.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reading.kodeCustomer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reading.alamat.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleMeterChange = (id: string, meterAkhir: number) => {
    setReadings((prev) =>
      prev.map((reading) => {
        if (reading.id === id) {
          const pemakaian = Math.max(0, meterAkhir - reading.meterAwal)
          const biayaPemakaian = pemakaian * tarif.tarifPerM3
          const totalTagihan = biayaPemakaian + tarif.abonemen

          return {
            ...reading,
            meterAkhir,
            pemakaian,
            tarifPerM3: tarif.tarifPerM3,
            abonemen: tarif.abonemen,
            totalTagihan,
            status: "completed" as const,
          }
        }
        return reading
      }),
    )
  }

  const handleKendalaChange = (id: string, kendala: string) => {
    setReadings((prev) => prev.map((reading) => (reading.id === id ? { ...reading, kendala } : reading)))
  }

  const handleSaveReading = (id: string) => {
    const reading = readings.find((r) => r.id === id)
    if (reading && reading.meterAkhir !== null) {
      if (reading.kendala.trim()) {
        addIssue({
          issue: `Kendala meter - ${reading.nama}`,
          description: reading.kendala,
          status: "unresolved",
          reporter: reading.nama,
          phone: reading.phone,
          address: reading.alamat,
          priority: "medium",
          customerId: reading.kodeCustomer,
          source: "meter_reading",
        })
      }

      toast({
        title: "Pencatatan Tersimpan",
        description: `Meter ${reading.nama} berhasil dicatat${reading.kendala.trim() ? " dan kendala telah dilaporkan" : ""}`,
      })
    }
  }

  const handleSendTagihan = (id: string) => {
    const reading = readings.find((r) => r.id === id)
    if (reading && reading.status === "completed") {
      const message = `Halo ${reading.nama}, tagihan air Agustus 2025:
      
Meter Awal: ${reading.meterAwal}
Meter Akhir: ${reading.meterAkhir}
Pemakaian: ${reading.pemakaian} m³
Tarif: Rp ${reading.tarifPerM3.toLocaleString("id-ID")}/m³
Abonemen: Rp ${reading.abonemen.toLocaleString("id-ID")}
Total: Rp ${reading.totalTagihan.toLocaleString("id-ID")}

Jatuh tempo: ${reading.jatuhTempo}
Mohon segera melakukan pembayaran.`

      window.open(`https://wa.me/${reading.phone.replace(/^0/, "62")}?text=${encodeURIComponent(message)}`)

      setReadings((prev) => prev.map((r) => (r.id === id ? { ...r, tagihanSent: true } : r)))

      toast({
        title: "Tagihan Terkirim",
        description: `Tagihan ${reading.nama} berhasil dikirim via WhatsApp`,
      })
    }
  }

  const getStatusBadge = (status: string) => {
    return status === "completed" ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Selesai</Badge>
    ) : (
      <Badge variant="secondary">Pending</Badge>
    )
  }

  const completedCount = readings.filter((r) => r.status === "completed").length
  const totalCount = readings.length

  return (
    <GlassCard className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-semibold text-foreground">Daftar Pencatatan Meter</h3>
          <p className="text-sm text-muted-foreground">
            Progress: {completedCount}/{totalCount} pelanggan ({Math.round((completedCount / totalCount) * 100)}%)
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Periode: Agustus 2025 | Tarif: Rp {tarif.tarifPerM3.toLocaleString("id-ID")}/m³ | Abonemen: Rp{" "}
            {tarif.abonemen.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari pelanggan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64 bg-card/50"
            />
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">Progress Pencatatan</span>
          <span className="font-medium text-foreground">{Math.round((completedCount / totalCount) * 100)}%</span>
        </div>
        <div className="w-full bg-muted/30 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/20">
              <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Kode</th>
              <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Nama</th>
              <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Meter Awal</th>
              <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Meter Akhir</th>
              <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Pemakaian</th>
              <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Total</th>
              <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredReadings.map((reading) => (
              <tr key={reading.id} className="border-b border-border/10 hover:bg-muted/20">
                <td className="py-3 px-2 text-sm font-medium text-primary">{reading.kodeCustomer}</td>
                <td className="py-3 px-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{reading.nama}</p>
                    <p className="text-xs text-muted-foreground">{reading.alamat}</p>
                  </div>
                </td>
                <td className="py-3 px-2 text-sm text-center text-foreground">{reading.meterAwal}</td>
                <td className="py-3 px-2 text-center">
                  <Input
                    type="number"
                    value={reading.meterAkhir || ""}
                    onChange={(e) => {
                      const value = Number.parseInt(e.target.value) || 0
                      if (value >= reading.meterAwal) {
                        handleMeterChange(reading.id, value)
                      }
                    }}
                    className="w-20 h-8 text-center text-sm"
                    placeholder="0"
                    min={reading.meterAwal}
                  />
                </td>
                <td className="py-3 px-2 text-sm text-center font-medium text-primary">{reading.pemakaian} m³</td>
                <td className="py-3 px-2 text-sm text-right font-bold text-foreground">
                  Rp {reading.totalTagihan.toLocaleString("id-ID")}
                </td>
                <td className="py-3 px-2 text-center">{getStatusBadge(reading.status)}</td>
                <td className="py-3 px-2 text-center">
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSaveReading(reading.id)}
                      disabled={reading.meterAkhir === null}
                      className="h-8 w-8 p-0 bg-transparent"
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                    {reading.status === "completed" && (
                      <Button
                        size="sm"
                        variant={reading.tagihanSent ? "default" : "outline"}
                        onClick={() => handleSendTagihan(reading.id)}
                        className="h-8 w-8 p-0 bg-transparent"
                        disabled={reading.tagihanSent}
                      >
                        {reading.tagihanSent ? <CheckCircle className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {filteredReadings.map((reading) => (
          <div key={reading.id} className="p-4 bg-muted/20 rounded-lg space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-foreground">{reading.nama}</p>
                <p className="text-sm text-primary font-medium">{reading.kodeCustomer}</p>
                <p className="text-xs text-muted-foreground">{reading.alamat}</p>
              </div>
              {getStatusBadge(reading.status)}
            </div>

            <div className="bg-card/50 p-3 rounded-lg space-y-2">
              <h4 className="text-sm font-medium text-foreground mb-2">Informasi Pencatatan Meter</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Meter Awal (Bulan Sebelumnya)</p>
                  <p className="font-medium text-foreground">{reading.meterAwal}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Meter Akhir (Input Manual)</p>
                  <Input
                    type="number"
                    value={reading.meterAkhir || ""}
                    onChange={(e) => {
                      const value = Number.parseInt(e.target.value) || 0
                      if (value >= reading.meterAwal) {
                        handleMeterChange(reading.id, value)
                      }
                    }}
                    className="h-8 text-sm mt-1"
                    placeholder="Masukkan meter akhir"
                    min={reading.meterAwal}
                  />
                </div>
                <div>
                  <p className="text-muted-foreground">Pemakaian (Otomatis)</p>
                  <p className="font-bold text-primary">{reading.pemakaian} m³</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tarif Per Meter</p>
                  <p className="font-medium">Rp {reading.tarifPerM3.toLocaleString("id-ID")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Abonemen</p>
                  <p className="font-medium">Rp {reading.abonemen.toLocaleString("id-ID")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Tagihan</p>
                  <p className="font-bold text-lg text-foreground">Rp {reading.totalTagihan.toLocaleString("id-ID")}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Kendala (Opsional)</label>
              <Textarea
                value={reading.kendala}
                onChange={(e) => handleKendalaChange(reading.id, e.target.value)}
                placeholder="Catat kendala jika ada (pipa bocor, meter rusak, tekanan rendah, air keruh, dll.)"
                className="h-20 text-sm"
              />
              {reading.kendala.trim() && (
                <p className="text-xs text-yellow-600 mt-1">
                  💡 Kendala akan otomatis masuk ke sistem tracking kendala saat disimpan
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => handleSaveReading(reading.id)}
                disabled={reading.meterAkhir === null}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                Simpan
              </Button>
              {reading.status === "completed" && (
                <Button
                  size="sm"
                  variant={reading.tagihanSent ? "default" : "outline"}
                  onClick={() => handleSendTagihan(reading.id)}
                  disabled={reading.tagihanSent}
                  className="flex-1 bg-transparent"
                >
                  {reading.tagihanSent ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Sudah Kirim Tagihan Air
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Kirim Tagihan Air
                    </>
                  )}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="bg-transparent"
                onClick={() => setExpandedCard(expandedCard === reading.id ? null : reading.id)}
              >
                <Calculator className="w-4 h-4" />
              </Button>
            </div>

            {expandedCard === reading.id && (
              <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <h5 className="text-sm font-medium text-foreground mb-2">Detail Perhitungan</h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pemakaian:</span>
                    <span>
                      {reading.pemakaian} m³ × Rp {reading.tarifPerM3.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Biaya Pemakaian:</span>
                    <span>Rp {(reading.pemakaian * reading.tarifPerM3).toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Abonemen:</span>
                    <span>Rp {reading.abonemen.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="border-t border-border/20 pt-1 mt-2">
                    <div className="flex justify-between font-bold">
                      <span>Total Tagihan:</span>
                      <span>Rp {reading.totalTagihan.toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-border/20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <p className="text-2xl font-bold text-primary">{completedCount}</p>
            <p className="text-sm text-muted-foreground">Selesai</p>
          </div>
          <div className="text-center p-4 bg-yellow-100/50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">{totalCount - completedCount}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </div>
          <div className="text-center p-4 bg-green-100/50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{Math.round((completedCount / totalCount) * 100)}%</p>
            <p className="text-sm text-muted-foreground">Progress</p>
          </div>
        </div>
      </div>
    </GlassCard>
  )
}

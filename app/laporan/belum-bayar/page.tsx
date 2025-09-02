"use client"

import { AuthGuard } from "@/components/auth-guard"
import { AppShell } from "@/components/app-shell"
import { AppHeader } from "@/components/app-header"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"

const allUnpaidBills = [
  {
    id: 1,
    name: "Andi Wijaya",
    amount: 150000,
    period: "Jan 2024",
    address: "Jl. Mawar No. 5",
    phone: "081234567801",
    dueDate: "2024-02-10",
    daysOverdue: 45,
  },
  {
    id: 2,
    name: "Maya Sari",
    amount: 200000,
    period: "Feb 2024",
    address: "Jl. Melati No. 12",
    phone: "081234567802",
    dueDate: "2024-03-10",
    daysOverdue: 15,
  },
  {
    id: 3,
    name: "Rudi Hartono",
    amount: 175000,
    period: "Jan 2024",
    address: "Jl. Anggrek No. 8",
    phone: "081234567803",
    dueDate: "2024-02-10",
    daysOverdue: 45,
  },
  {
    id: 4,
    name: "Linda Kusuma",
    amount: 225000,
    period: "Mar 2024",
    address: "Jl. Dahlia No. 15",
    phone: "081234567804",
    dueDate: "2024-04-10",
    daysOverdue: 5,
  },
  {
    id: 5,
    name: "Agus Setiawan",
    amount: 180000,
    period: "Feb 2024",
    address: "Jl. Kenanga No. 22",
    phone: "081234567805",
    dueDate: "2024-03-10",
    daysOverdue: 15,
  },
  {
    id: 6,
    name: "Sari Indah",
    amount: 195000,
    period: "Jan 2024",
    address: "Jl. Cempaka No. 7",
    phone: "081234567806",
    dueDate: "2024-02-10",
    daysOverdue: 45,
  },
  {
    id: 7,
    name: "Budi Raharjo",
    amount: 165000,
    period: "Mar 2024",
    address: "Jl. Tulip No. 18",
    phone: "081234567807",
    dueDate: "2024-04-10",
    daysOverdue: 5,
  },
  {
    id: 8,
    name: "Dewi Lestari",
    amount: 210000,
    period: "Feb 2024",
    address: "Jl. Sakura No. 11",
    phone: "081234567808",
    dueDate: "2024-03-10",
    daysOverdue: 15,
  },
]

export default function BelumBayarPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredBills = allUnpaidBills.filter(
    (bill) =>
      bill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.period.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getOverdueStatus = (days: number) => {
    if (days <= 7) return { label: "Baru Jatuh Tempo", variant: "secondary" as const }
    if (days <= 30) return { label: "Terlambat", variant: "destructive" as const }
    return { label: "Sangat Terlambat", variant: "destructive" as const }
  }

  return (
    <AuthGuard>
      <AppShell>
        <div className="max-w-7xl mx-auto space-y-6">
          <AppHeader
            title="Daftar Belum Bayar"
            breadcrumbs={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Laporan", href: "/dashboard" },
              { label: "Belum Bayar" },
            ]}
          />

          <GlassCard className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Daftar Lengkap Tagihan Belum Bayar</h2>
                <p className="text-muted-foreground">Total: {filteredBills.length} pelanggan</p>
              </div>
              <div className="w-full sm:w-auto">
                <Input
                  placeholder="Cari nama, alamat, atau periode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64"
                />
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Nama Pelanggan</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Alamat</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Periode</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Jumlah Tagihan</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Jatuh Tempo</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.map((bill) => {
                    const status = getOverdueStatus(bill.daysOverdue)
                    return (
                      <tr key={bill.id} className="border-b border-border/30 hover:bg-muted/20">
                        <td className="py-4 px-2">
                          <div>
                            <p className="font-medium text-foreground">{bill.name}</p>
                            <p className="text-sm text-muted-foreground">{bill.phone}</p>
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <p className="text-muted-foreground">{bill.address}</p>
                        </td>
                        <td className="py-4 px-2">
                          <p className="font-medium">{bill.period}</p>
                        </td>
                        <td className="py-4 px-2">
                          <p className="font-bold text-red-600">Rp {bill.amount.toLocaleString("id-ID")}</p>
                        </td>
                        <td className="py-4 px-2">
                          <p className="text-muted-foreground">{bill.dueDate}</p>
                          <p className="text-sm text-red-500">{bill.daysOverdue} hari</p>
                        </td>
                        <td className="py-4 px-2">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td className="py-4 px-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              window.open(
                                `https://wa.me/${bill.phone.replace(/^0/, "62")}?text=Halo ${bill.name}, tagihan air periode ${bill.period} sebesar Rp ${bill.amount.toLocaleString("id-ID")} belum dibayar. Mohon segera melakukan pembayaran.`,
                              )
                            }
                          >
                            WhatsApp
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {filteredBills.map((bill) => {
                const status = getOverdueStatus(bill.daysOverdue)
                return (
                  <div key={bill.id} className="p-4 bg-red-50/50 rounded-lg border border-red-100/50">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-foreground">{bill.name}</p>
                        <p className="text-sm text-muted-foreground">{bill.address}</p>
                        <p className="text-sm text-muted-foreground">{bill.phone}</p>
                      </div>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <p className="text-muted-foreground">Periode:</p>
                        <p className="font-medium">{bill.period}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tagihan:</p>
                        <p className="font-bold text-red-600">Rp {bill.amount.toLocaleString("id-ID")}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Jatuh Tempo:</p>
                        <p className="font-medium">{bill.dueDate}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Terlambat:</p>
                        <p className="font-medium text-red-500">{bill.daysOverdue} hari</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full bg-transparent"
                      onClick={() =>
                        window.open(
                          `https://wa.me/${bill.phone.replace(/^0/, "62")}?text=Halo ${bill.name}, tagihan air periode ${bill.period} sebesar Rp ${bill.amount.toLocaleString("id-ID")} belum dibayar. Mohon segera melakukan pembayaran.`,
                        )
                      }
                    >
                      Kirim WhatsApp
                    </Button>
                  </div>
                )
              })}
            </div>

            {filteredBills.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Tidak ada data yang ditemukan</p>
              </div>
            )}
          </GlassCard>
        </div>
      </AppShell>
    </AuthGuard>
  )
}

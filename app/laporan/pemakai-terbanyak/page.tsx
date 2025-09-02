"use client"

import { AuthGuard } from "@/components/auth-guard"
import { AppShell } from "@/components/app-shell"
import { AppHeader } from "@/components/app-header"
import { GlassCard } from "@/components/glass-card"
import { Input } from "@/components/ui/input"
import { useState } from "react"

const allTopUsers = [
  {
    id: 1,
    name: "Budi Santoso",
    usage: 45,
    address: "Jl. Merdeka No. 12",
    phone: "081234567890",
    period: "Agustus 2024",
    lastReading: "2024-08-30",
  },
  {
    id: 2,
    name: "Siti Aminah",
    usage: 42,
    address: "Jl. Sudirman No. 8",
    phone: "081234567891",
    period: "Agustus 2024",
    lastReading: "2024-08-29",
  },
  {
    id: 3,
    name: "Ahmad Rahman",
    usage: 38,
    address: "Jl. Diponegoro No. 15",
    phone: "081234567892",
    period: "Agustus 2024",
    lastReading: "2024-08-28",
  },
  {
    id: 4,
    name: "Dewi Sartika",
    usage: 35,
    address: "Jl. Kartini No. 22",
    phone: "081234567893",
    period: "Agustus 2024",
    lastReading: "2024-08-27",
  },
  {
    id: 5,
    name: "Joko Widodo",
    usage: 33,
    address: "Jl. Pahlawan No. 5",
    phone: "081234567894",
    period: "Agustus 2024",
    lastReading: "2024-08-26",
  },
  {
    id: 6,
    name: "Rina Susanti",
    usage: 31,
    address: "Jl. Veteran No. 18",
    phone: "081234567895",
    period: "Agustus 2024",
    lastReading: "2024-08-25",
  },
  {
    id: 7,
    name: "Bambang Wijaya",
    usage: 29,
    address: "Jl. Gatot Subroto No. 7",
    phone: "081234567896",
    period: "Agustus 2024",
    lastReading: "2024-08-24",
  },
  {
    id: 8,
    name: "Indira Sari",
    usage: 28,
    address: "Jl. Ahmad Yani No. 33",
    phone: "081234567897",
    period: "Agustus 2024",
    lastReading: "2024-08-23",
  },
  {
    id: 9,
    name: "Hendra Gunawan",
    usage: 26,
    address: "Jl. Pemuda No. 11",
    phone: "081234567898",
    period: "Agustus 2024",
    lastReading: "2024-08-22",
  },
  {
    id: 10,
    name: "Maya Putri",
    usage: 25,
    address: "Jl. Proklamasi No. 9",
    phone: "081234567899",
    period: "Agustus 2024",
    lastReading: "2024-08-21",
  },
]

export default function PemakaiTerbanyakPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredUsers = allTopUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.address.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <AuthGuard>
      <AppShell>
        <div className="max-w-7xl mx-auto space-y-6">
          <AppHeader
            title="Pemakai Terbanyak"
            breadcrumbs={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Laporan", href: "/dashboard" },
              { label: "Pemakai Terbanyak" },
            ]}
          />

          <GlassCard className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Daftar Lengkap Pemakai Terbanyak</h2>
                <p className="text-muted-foreground">Periode: Agustus 2024</p>
              </div>
              <div className="w-full sm:w-auto">
                <Input
                  placeholder="Cari nama atau alamat..."
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
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Ranking</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Nama Pelanggan</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Alamat</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Pemakaian</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Telepon</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Terakhir Baca</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => (
                    <tr key={user.id} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="py-4 px-2">
                        <div className="flex items-center">
                          <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                            {index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <p className="font-medium text-foreground">{user.name}</p>
                      </td>
                      <td className="py-4 px-2">
                        <p className="text-muted-foreground">{user.address}</p>
                      </td>
                      <td className="py-4 px-2">
                        <p className="font-bold text-primary text-lg">{user.usage} m³</p>
                      </td>
                      <td className="py-4 px-2">
                        <p className="text-muted-foreground">{user.phone}</p>
                      </td>
                      <td className="py-4 px-2">
                        <p className="text-muted-foreground">{user.lastReading}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {filteredUsers.map((user, index) => (
                <div key={user.id} className="p-4 bg-muted/20 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.address}</p>
                      </div>
                    </div>
                    <p className="font-bold text-primary text-lg">{user.usage} m³</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Telepon:</p>
                      <p className="font-medium">{user.phone}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Terakhir Baca:</p>
                      <p className="font-medium">{user.lastReading}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredUsers.length === 0 && (
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

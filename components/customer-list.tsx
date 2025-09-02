"use client"

import { useState } from "react"
import { GlassCard } from "./glass-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CustomerHistoryModal } from "./customer-history-modal"
import { Edit, Eye, Trash2 } from "lucide-react"

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

// Mock data
const mockCustomers: Customer[] = [
  {
    id: "1",
    nama: "Budi Santoso",
    kodeCustomer: "TB240001",
    noWA: "081234567890",
    alamat: "Jl. Merdeka No. 12, RT 02/RW 05",
    meterAwal: 1000,
    status: "aktif",
    tanggalDaftar: "2024-01-15",
  },
  {
    id: "2",
    nama: "Siti Aminah",
    kodeCustomer: "TB240002",
    noWA: "082345678901",
    alamat: "Jl. Sudirman No. 8, RT 01/RW 03",
    meterAwal: 850,
    status: "aktif",
    tanggalDaftar: "2024-01-18",
  },
  {
    id: "3",
    nama: "Ahmad Rahman",
    kodeCustomer: "TB240003",
    noWA: "083456789012",
    alamat: "Jl. Diponegoro No. 15, RT 03/RW 02",
    meterAwal: 1200,
    status: "aktif",
    tanggalDaftar: "2024-01-20",
  },
  {
    id: "4",
    nama: "Dewi Sartika",
    kodeCustomer: "TB240004",
    noWA: "084567890123",
    alamat: "Jl. Kartini No. 22, RT 04/RW 01",
    meterAwal: 950,
    status: "nonaktif",
    tanggalDaftar: "2024-01-25",
  },
  {
    id: "5",
    nama: "Joko Widodo",
    kodeCustomer: "TB240005",
    noWA: "085678901234",
    alamat: "Jl. Pahlawan No. 5, RT 01/RW 04",
    meterAwal: 1100,
    status: "aktif",
    tanggalDaftar: "2024-02-01",
  },
]

export function CustomerList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const itemsPerPage = 5

  const filteredCustomers = mockCustomers.filter(
    (customer) =>
      customer.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.kodeCustomer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.alamat.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage)

  const getStatusBadge = (status: string) => {
    return status === "aktif" ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Aktif</Badge>
    ) : (
      <Badge variant="secondary">Non-aktif</Badge>
    )
  }

  const handleViewHistory = (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowHistory(true)
  }

  return (
    <>
      <GlassCard className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-xl font-semibold text-foreground">Daftar Pelanggan</h3>
          <Input
            placeholder="Cari nama, kode, atau alamat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 bg-card/50"
          />
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/20">
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Kode</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Nama</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">No. WA</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Alamat</th>
                <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Meter Awal</th>
                <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCustomers.map((customer) => (
                <tr key={customer.id} className="border-b border-border/10 hover:bg-muted/20">
                  <td className="py-3 px-2 text-sm font-medium text-primary">{customer.kodeCustomer}</td>
                  <td className="py-3 px-2 text-sm font-medium text-foreground">{customer.nama}</td>
                  <td className="py-3 px-2 text-sm text-foreground">{customer.noWA}</td>
                  <td className="py-3 px-2 text-sm text-foreground max-w-xs truncate">{customer.alamat}</td>
                  <td className="py-3 px-2 text-sm text-center text-foreground">{customer.meterAwal}</td>
                  <td className="py-3 px-2 text-center">{getStatusBadge(customer.status)}</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewHistory(customer)}
                        className="h-8 w-8 p-0 bg-transparent"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0 bg-transparent">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0 bg-transparent text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-4">
          {paginatedCustomers.map((customer) => (
            <div key={customer.id} className="p-4 bg-muted/20 rounded-lg space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-foreground">{customer.nama}</p>
                  <p className="text-sm text-primary font-medium">{customer.kodeCustomer}</p>
                </div>
                {getStatusBadge(customer.status)}
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">WA:</span> {customer.noWA}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Alamat:</span> {customer.alamat}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Meter Awal:</span> {customer.meterAwal}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewHistory(customer)}
                  className="flex-1 bg-transparent"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Histori
                </Button>
                <Button size="sm" variant="outline" className="bg-transparent">
                  <Edit className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" className="bg-transparent text-red-600">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-muted-foreground">
              Menampilkan {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredCustomers.length)} dari{" "}
              {filteredCustomers.length} pelanggan
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

      {/* History Modal */}
      {showHistory && selectedCustomer && (
        <CustomerHistoryModal
          customer={selectedCustomer}
          onClose={() => {
            setShowHistory(false)
            setSelectedCustomer(null)
          }}
        />
      )}
    </>
  )
}

"use client" // Komponen ini berjalan di client (boleh pakai state, event handler, SWR, dll)

import { useState } from "react"                     // State lokal React
import useSWR, { useSWRConfig } from "swr"           // SWR untuk fetch data + mutate global
import { GlassCard } from "./glass-card"             // Kartu UI berbayang/kaca
import { Input } from "@/components/ui/input"        // Komponen input teks
import { Button } from "@/components/ui/button"      // Komponen tombol
import { Badge } from "@/components/ui/badge"        // Komponen badge/status
import { CustomerHistoryModal } from "./customer-history-modal" // Modal histori pelanggan
import { CustomerEditModal } from "./customer-edit-modal"       // Modal edit pelanggan
import { ConfirmDialog } from "./confirm-dialog"                // Dialog konfirmasi hapus
import { useToast } from "@/hooks/use-toast"         // Hook toast/notification
import { Edit, Eye, Trash2 } from "lucide-react"     // Icon

// Bentuk data dari server (sesuai select di API)
type ServerPelanggan = {
  id: string
  kode: string
  nama: string
  wa: string | null
  alamat: string
  meterAwal: number
  statusAktif: boolean
  createdAt?: string
}

// Bentuk data untuk UI (sudah diubah nama fieldnya agar nyaman dipakai komponen)
interface Customer {
  id: string
  nama: string
  kodeCustomer: string
  noWA: string
  alamat: string
  meterAwal: number
  status: "aktif" | "nonaktif"
  tanggalDaftar?: string
}

// Fetcher standar untuk SWR: GET dan parse JSON
const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function CustomerList() {
  const { toast } = useToast()        // Untuk menampilkan notifikasi
  const { mutate } = useSWRConfig()   // mutate global: pakai untuk revalidate cache kunci tertentu

  // State UI dasar
  const [searchTerm, setSearchTerm] = useState("")                      // kata kunci pencarian
  const [currentPage, setCurrentPage] = useState(1)                     // halaman pager
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null) // item terpilih
  const [showHistory, setShowHistory] = useState(false)                 // buka modal histori?
  const [showEditModal, setShowEditModal] = useState(false)             // buka modal edit?
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)     // buka dialog hapus?
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null) // target hapus

  const itemsPerPage = 5 // jumlah baris per halaman

  // Ambil data dari API dengan SWR
  const { data, error, isLoading } = useSWR("/api/pelanggan", fetcher, {
    revalidateOnFocus: false, // jangan auto-revalidate ketika tab fokus lagi
  })

  // Ubah bentuk data server → bentuk yang dipakai UI
  const rows: Customer[] =
    data?.ok && Array.isArray(data.items)
      ? (data.items as ServerPelanggan[]).map((p) => ({
          id: p.id,
          nama: p.nama,
          kodeCustomer: p.kode,
          noWA: p.wa ?? "-",
          alamat: p.alamat,
          meterAwal: p.meterAwal,
          status: p.statusAktif ? "aktif" : "nonaktif",
          tanggalDaftar: p.createdAt,
        }))
      : []

  // Filter berdasarkan kata kunci (nama/kode/wa/alamat)
  const filteredCustomers = rows.filter((c) => {
    const q = searchTerm.toLowerCase()
    return (
      c.nama.toLowerCase().includes(q) ||
      c.kodeCustomer.toLowerCase().includes(q) ||
      c.noWA.toLowerCase().includes(q) ||
      c.alamat.toLowerCase().includes(q)
    )
  })

  // Paging sederhana di sisi client
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage)

  // Helper render badge status
  const getStatusBadge = (status: Customer["status"]) =>
    status === "aktif" ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Aktif</Badge>
    ) : (
      <Badge variant="secondary">Non-aktif</Badge>
    )

  // Buka modal histori
  const handleViewHistory = (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowHistory(true)
  }

  // Buka modal edit
  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowEditModal(true)
  }

  // Buka dialog konfirmasi hapus
  const handleDeleteCustomer = (customer: Customer) => {
    setCustomerToDelete(customer)
    setShowDeleteConfirm(true)
  }

  // Konfirmasi hapus → (opsional) panggil API DELETE, lalu revalidate list
  const confirmDelete = async () => {
    if (!customerToDelete) return
    try {
      const res = await fetch(`/api/pelanggan?id=${customerToDelete.id}`, { method: "DELETE" })
      const data = await res.json()
  
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "Gagal menghapus pelanggan")
      }
  
      toast({
        title: "Pelanggan Dihapus",
        description: `Data ${customerToDelete.nama} berhasil dihapus.`,
      })
  
      await mutate("/api/pelanggan") // refresh tabel
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Terjadi kesalahan."
      toast({ title: "Gagal Menghapus", description: msg, variant: "destructive" })
    } finally {
      setShowDeleteConfirm(false)
      setCustomerToDelete(null)
    }
  }

  // Callback setelah edit disimpan (modal anak dapat memanggil ini)
  const handleSaveCustomer = async (_updated: Customer) => {
    // (opsional) bisa panggil PUT di sini juga, tapi saat ini modal yang melakukan PUT
    toast({ title: "Data Diperbarui", description: `Data pelanggan berhasil diperbarui.` })
    setShowEditModal(false)
    setSelectedCustomer(null)
    await mutate("/api/pelanggan") // revalidate list agar data terbaru tampil
  }

  return (
    <>
      <GlassCard className="p-6">{/* Bungkus daftar dalam kartu */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-xl font-semibold text-foreground">Daftar Pelanggan</h3>
          <Input
            placeholder="Cari nama, kode, atau alamat..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value) // update kata kunci
              setCurrentPage(1)             // reset ke halaman pertama setiap ganti keyword
            }}
            className="w-full sm:w-64 bg-card/50"
          />
        </div>

        {/* State saat loading & error */}
        {isLoading && <div className="p-4 text-sm text-muted-foreground">Memuat data…</div>}
        {error && <div className="p-4 text-sm text-destructive">Gagal memuat data.</div>}

        {/* Render tabel hanya ketika tidak loading dan tidak error */}
        {!isLoading && !error && (
          <>
            {/* Tabel desktop */}
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
                          {/* Tombol histori */}
                          <Button size="sm" variant="outline" onClick={() => handleViewHistory(customer)} className="h-8 w-8 p-0 bg-transparent">
                            <Eye className="w-4 h-4" />
                          </Button>
                          {/* Tombol edit */}
                          <Button size="sm" variant="outline" onClick={() => handleEditCustomer(customer)} className="h-8 w-8 p-0 bg-transparent">
                            <Edit className="w-4 h-4" />
                          </Button>
                          {/* Tombol hapus */}
                          <Button size="sm" variant="outline" onClick={() => handleDeleteCustomer(customer)} className="h-8 w-8 p-0 bg-transparent text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {/* Jika hasil kosong */}
                  {paginatedCustomers.length === 0 && (
                    <tr>
                      <td className="py-6 px-2 text-center text-sm text-muted-foreground" colSpan={7}>
                        Tidak ada data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Kartu mobile */}
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
                    <Button size="sm" variant="outline" onClick={() => handleViewHistory(customer)} className="flex-1 bg-transparent">
                      <Eye className="w-4 h-4 mr-2" />
                      Histori
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEditCustomer(customer)} className="bg-transparent">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDeleteCustomer(customer)} className="bg-transparent text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {/* Jika hasil kosong di mobile */}
              {paginatedCustomers.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground bg-muted/20 rounded-lg">Tidak ada data.</div>
              )}
            </div>

            {/* Pagination ditampilkan hanya jika jumlah data > itemsPerPage */}
            {filteredCustomers.length > itemsPerPage && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">
                  Menampilkan {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredCustomers.length)} dari {filteredCustomers.length} pelanggan
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} // halaman sebelumnya
                    disabled={currentPage === 1}
                    className="bg-transparent"
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} // halaman berikutnya
                    disabled={currentPage === totalPages}
                    className="bg-transparent"
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </GlassCard>

      {/* Modal histori: ditampilkan jika flag true dan ada customer terpilih */}
      {showHistory && selectedCustomer && (
        <CustomerHistoryModal
          customer={selectedCustomer}
          onClose={() => {
            setShowHistory(false)
            setSelectedCustomer(null)
          }}
        />
      )}

      {/* Modal edit */}
      {showEditModal && selectedCustomer && (
        <CustomerEditModal
          customer={selectedCustomer}
          onClose={() => {
            setShowEditModal(false)
            setSelectedCustomer(null)
          }}
          onSave={handleSaveCustomer} // callback setelah simpan
        />
      )}

      {/* Dialog konfirmasi hapus */}
      {showDeleteConfirm && customerToDelete && (
        <ConfirmDialog
          title="Hapus Pelanggan"
          message={`Apakah Anda yakin ingin menghapus data pelanggan "${customerToDelete.nama}"? Tindakan ini tidak dapat dibatalkan.`}
          onConfirm={confirmDelete} // eksekusi hapus
          onCancel={() => {
            setShowDeleteConfirm(false)
            setCustomerToDelete(null)
          }}
        />
      )}
    </>
  )
}
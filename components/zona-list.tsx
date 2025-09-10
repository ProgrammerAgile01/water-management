"use client"

import { useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import { GlassCard } from "./glass-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog } from "./confirm-dialog"
import { useToast } from "@/hooks/use-toast"
import { Edit, Trash2, Users } from "lucide-react"
import { ZonaEditModal } from "./zona-edit-modal"

// ====== Bentuk data dari server (raw) ======
type ServerZona = {
    id: string
    kode: string
    nama: string
    deskripsi: string
    petugasId: string | null
    petugas: { id: string; name: string; username?: string } | null
    pelangganCount: number
    createdAt?: string
  }
  
  // ====== Bentuk data untuk UI ======
  type ZonaRow = {
    id: string
    kode: string
    nama: string
    deskripsi: string
    petugasId: string | null
    petugasNama: string
    petugasUsername?: string
    jmlWarga: number
    createdAt?: string
  }

// ====== Response API pagination (server-side) ======
type ApiResp = {
  ok: boolean
  items: ServerZona[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function ZonaList() {
  const { toast } = useToast()
  const { mutate } = useSWRConfig()

  // --- state UI
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [zonaToDelete, setZonaToDelete] = useState<ZonaRow | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [zonaToEdit, setZonaToEdit] = useState<ZonaRow | null>(null)

  const itemsPerPage = 10

  // SWR key dengan page, pageSize & q → pagination & search di server
  const listKey = `/api/zona?page=${currentPage}&pageSize=${itemsPerPage}&q=${encodeURIComponent(
    searchTerm.trim(),
  )}`

  const { data, error, isLoading } = useSWR<ApiResp>(listKey, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  })

  // di dalam komponen setelah useSWR:
if (process.env.NODE_ENV !== "production") {
    // hanya log saat dev
    // eslint-disable-next-line no-console
    console.log("SWR /api/zona data:", data)
  }

  // map server → UI
  const rows: ZonaRow[] =
  data?.ok && Array.isArray(data.items)
    ? data.items.map((z) => ({
        id: z.id,
        kode: z.kode,
        nama: z.nama,
        deskripsi: z.deskripsi ?? "-",
        petugasId: z.petugasId,                               // ⬅️ SIMPAN utk edit
        petugasNama: z.petugas?.name ?? "-",                  // ⬅️ TAMPILKAN di tabel
        petugasUsername: z.petugas?.username ?? undefined,
        jmlWarga: z.pelangganCount ?? 0,                      // ⬅️ pakai pelangganCount
        createdAt: z.createdAt,
      }))
    : []

  // info pagination
  const total = data?.pagination?.total ?? 0
  const totalPages = data?.pagination?.totalPages ?? 1
  const page = data?.pagination?.page ?? currentPage
  const pageSize = data?.pagination?.pageSize ?? itemsPerPage

  const getBadge = (count: number) => (
    <Badge variant={count > 0 ? "default" : "secondary"} className="gap-1">
      <Users className="w-3.5 h-3.5" />
      {count}
    </Badge>
  )

  const handleDelete = (row: ZonaRow) => {
    setZonaToDelete(row)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!zonaToDelete) return
    try {
      const res = await fetch(`/api/zona?id=${zonaToDelete.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Gagal menghapus zona")

      toast({ title: "Zona Dihapus", description: `Data zona "${zonaToDelete.nama}" berhasil dihapus.` })
      await mutate(listKey)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Terjadi kesalahan."
      toast({ title: "Gagal Menghapus", description: msg, variant: "destructive" })
    } finally {
      setShowDeleteConfirm(false)
      setZonaToDelete(null)
    }
  }

  return (
    <>
      <GlassCard className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-xl font-semibold text-foreground">Daftar Zona</h3>
          <Input
            placeholder="Cari nama atau kode zona..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full sm:w-64 bg-card/50"
          />
        </div>

        {isLoading && <div className="p-4 text-sm text-muted-foreground">Memuat data…</div>}
        {error && <div className="p-4 text-sm text-destructive">Gagal memuat data.</div>}

        {!isLoading && !error && (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/20">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Kode</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Nama</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Petugas</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Deskripsi</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Jml Warga</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-border/10 hover:bg-muted/20">
                      <td className="py-3 px-2 text-sm font-medium text-primary">{row.kode}</td>
                      <td className="py-3 px-2 text-sm font-medium text-foreground">{row.nama}</td>
                      <td className="py-3 px-2 text-sm text-foreground">
                        {row.petugasNama}
                        {row.petugasUsername ? (
                          <span className="text-muted-foreground"> (@{row.petugasUsername})</span>
                        ) : null}
                      </td>
                      <td className="py-3 px-2 text-sm text-foreground max-w-sm truncate">{row.deskripsi}</td>
                      <td className="py-3 px-2 text-sm text-center">{getBadge(row.jmlWarga)}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setZonaToEdit(row)
                              setShowEditModal(true)
                            }}
                            className="h-8 w-8 p-0 bg-transparent"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(row)}
                            className="h-8 w-8 p-0 bg-transparent text-red-600"
                            title="Hapus zona"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td className="py-6 px-2 text-center text-sm text-muted-foreground" colSpan={6}>
                        Tidak ada data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden space-y-4">
              {rows.map((row) => (
                <div key={row.id} className="p-4 bg-muted/20 rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-foreground">{row.nama}</p>
                      <p className="text-sm text-primary font-medium">{row.kode}</p>
                    </div>
                    {getBadge(row.jmlWarga)}
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Petugas:</span> {row.petugasNama}
                      {row.petugasUsername ? ` (@${row.petugasUsername})` : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Deskripsi:</span> {row.deskripsi}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setZonaToEdit(row)
                        setShowEditModal(true)
                      }}
                      className="bg-transparent"
                      title="Edit zona"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(row)}
                      className="bg-transparent text-red-600"
                      title="Hapus zona"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {rows.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground bg-muted/20 rounded-lg">
                  Tidak ada data.
                </div>
              )}
            </div>

            {/* Pagination footer */}
            {total > 0 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">
                  Menampilkan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} dari {total} zona
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={page <= 1}
                    className="bg-transparent"
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page >= totalPages}
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

      {/* Dialog konfirmasi hapus */}
      {showDeleteConfirm && zonaToDelete && (
        <ConfirmDialog
          title="Hapus Zona"
          message={`Apakah Anda yakin ingin menghapus zona "${zonaToDelete.nama}"? Tindakan ini tidak dapat dibatalkan.`}
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowDeleteConfirm(false)
            setZonaToDelete(null)
          }}
        />
      )}

      {/* Modal edit */}
      {showEditModal && zonaToEdit && (
        <ZonaEditModal
          zona={zonaToEdit}
          onClose={() => {
            setShowEditModal(false)
            setZonaToEdit(null)
          }}
          onSave={async () => {
            setShowEditModal(false)
            setZonaToEdit(null)
            await mutate(listKey)
          }}
        />
      )}
    </>
  )
}
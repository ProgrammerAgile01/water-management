"use client"

import { useEffect, useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import { GlassCard } from "./glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type Zona = {
  id: string
  kode: string
  nama: string
  deskripsi?: string | null
  petugasId?: string | null
  petugasNama?: string | null
}

type UserLite = {
  id: string
  name: string
  username?: string | null
}

type Props = {
  zona: Zona
  onClose: () => void
  onSave?: (z: Zona) => void
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function ZonaEditModal({ zona, onClose, onSave }: Props) {
  const { toast } = useToast()
  const { mutate } = useSWRConfig()
  const [saving, setSaving] = useState(false)

  // form state
  const [nama, setNama] = useState(zona.nama)
  const [deskripsi, setDeskripsi] = useState(zona.deskripsi ?? "")
  const [petugasId, setPetugasId] = useState<string>(zona.petugasId ?? "")

  // --- load daftar petugas (role = PETUGAS)
  const { data: userResp, isLoading: loadingUsers, error: usersError } = useSWR<{ ok: boolean; items: UserLite[] }>(
    "/api/users?role=PETUGAS",
    fetcher,
    { revalidateOnFocus: false }
  )

  // --- state opsi petugas yang bener2 dimiliki dropdown
  const [petugasOptions, setPetugasOptions] = useState<UserLite[]>([])

  // isi options dari API saat datang
  useEffect(() => {
    if (!userResp?.ok || !Array.isArray(userResp.items)) return
    setPetugasOptions(userResp.items)
  }, [userResp?.ok, Array.isArray(userResp?.items) ? userResp!.items.length : 0]) // depend ke length agar re-run saat data berubah

  // inject current petugas kalau tidak ada di list (misal nonaktif)
  useEffect(() => {
    if (!petugasId) return
    setPetugasOptions((prev) => {
      const exists = prev.some((u) => u.id === petugasId)
      if (exists) return prev
      const injected: UserLite = { id: petugasId, name: zona.petugasNama || "(Petugas tidak aktif)", username: null }
      return [injected, ...prev]
    })
  }, [petugasId, zona.petugasNama])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!nama.trim()) {
      toast({ title: "Validasi", description: "Nama zona wajib diisi.", variant: "destructive" })
      return
    }
    if (!petugasId) {
      toast({ title: "Validasi", description: "Petugas wajib dipilih.", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const payload = {
        nama: nama.trim(),
        deskripsi: deskripsi.trim() || null,
        petugasId: petugasId || null, // "" → null
      }

      // TRACE
      console.log("PUT /api/zona payload:", payload)

      const res = await fetch(`/api/zona?id=${zona.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Gagal memperbarui zona")

      // refresh list (kunci yang broad aman karena list pakai querystring;
      // parent juga sudah memanggil mutate(listKey) via onSave)
      await mutate("/api/zona")

      // callback ke parent agar bisa langsung update UI
      onSave?.({
        ...zona,
        nama: payload.nama,
        deskripsi: payload.deskripsi,
        petugasId: payload.petugasId ?? null,
        petugasNama: petugasOptions.find((u) => u.id === (payload.petugasId ?? ""))?.name ?? zona.petugasNama ?? "",
      })

      toast({ title: "Berhasil", description: "Zona berhasil diperbarui." })
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan"
      toast({ title: "Gagal", description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-teal-900/40 via-cyan-800/30 to-blue-900/40 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        <GlassCard className="p-6 bg-card/80 backdrop-blur-xl border border-primary/20 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-primary">Edit Zona</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="bg-card/50 border-primary/30 hover:bg-primary/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nama" className="text-primary font-medium">Nama Zona</Label>
                <Input
                  id="nama"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="bg-card/60 border-primary/30 focus:border-primary focus:ring-primary/20"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="kode" className="text-primary font-medium">Kode Zona</Label>
                <Input
                  id="kode"
                  value={zona.kode}
                  className="bg-muted/50 border-primary/20 text-muted-foreground"
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="petugas" className="text-primary font-medium">Petugas</Label>
                <select
                  id="petugas"
                  value={petugasId}
                  onChange={(e) => setPetugasId(e.target.value)}
                  className="w-full px-3 py-2 bg-card/60 border border-primary/30 rounded-md text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  disabled={loadingUsers || !!usersError}
                  required
                >
                  <option value="">{loadingUsers ? "Memuat petugas…" : "Pilih petugas…"}</option>
                  {petugasOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}{u.username ? ` (@${u.username})` : ""}
                    </option>
                  ))}
                </select>
                {usersError ? (
                  <p className="text-xs text-destructive mt-1">Gagal memuat daftar petugas.</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deskripsi" className="text-primary font-medium">Deskripsi</Label>
              <Textarea
                id="deskripsi"
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                className="bg-card/60 border-primary/30 focus:border-primary focus:ring-primary/20 min-h-[80px]"
                placeholder="Keterangan tambahan"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-primary/20">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-primary/30 hover:bg-primary/10 bg-transparent"
                disabled={saving}
              >
                Batal
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </GlassCard>
      </div>
    </div>
  )
}
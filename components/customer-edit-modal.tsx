"use client"

import { useMemo, useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import { GlassCard } from "./glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type ZonaLite = { id: string; nama: string; deskripsi?: string }

interface Customer {
  id: string
  nama: string
  kodeCustomer: string
  noWA: string
  alamat: string
  meterAwal: number
  status: "aktif" | "nonaktif"
  tanggalDaftar: string
  zonaId?: string | null
  zonaNama?: string | null
}

interface CustomerEditModalProps {
  customer: Customer
  onClose: () => void
  onSave?: (customer: Customer) => void
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function normalizeWA(v: string) {
  const digits = v.replace(/\D/g, "")
  if (digits.startsWith("0")) return `62${digits.slice(1)}`
  if (digits.startsWith("62")) return digits
  return digits
}

export function CustomerEditModal({ customer, onClose, onSave }: CustomerEditModalProps) {
  const [formData, setFormData] = useState<Customer>(customer)
  // "" = tanpa zona; string = id zona
  const [zonaId, setZonaId] = useState<string>(customer.zonaId ?? "")
  const [saving, setSaving] = useState(false)
  const { mutate } = useSWRConfig()
  const { toast } = useToast()

  // Ambil daftar zona
  const { data: zonaResp, isLoading: loadingZona, error: zonaErr } = useSWR<{ ok: boolean; items: ZonaLite[] }>(
    "/api/zona?page=1&pageSize=1000",
    fetcher,
    { revalidateOnFocus: false }
  )

  const baseZonaOptions: ZonaLite[] = Array.isArray(zonaResp?.items) ? zonaResp!.items : []

  // Jika zona existing tidak ada di list (mis. dihapus), tetap tampilkan sebagai opsi “bayangan”
  const zonaOptions = useMemo(() => {
    if (customer.zonaId && customer.zonaNama && !baseZonaOptions.some(z => z.id === customer.zonaId)) {
      return [{ id: customer.zonaId, nama: customer.zonaNama, deskripsi: "" }, ...baseZonaOptions]
    }
    return baseZonaOptions
  }, [baseZonaOptions, customer.zonaId, customer.zonaNama])

  const handleChange = (field: keyof Customer, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      const noZona = zonaId === ""

      // ⬇️ KUNCI: kalau “Tanpa Zona” kirim explicit null dan reset noUrutRumah
      const payload: Record<string, any> = {
        nama: formData.nama.trim(),
        wa: normalizeWA(formData.noWA),
        alamat: formData.alamat.trim(),
        meterAwal: Number.isFinite(formData.meterAwal) ? Number(formData.meterAwal) : 0,
        status: formData.status,
        zonaId: noZona ? null : zonaId,
      }
      if (noZona) payload.noUrutRumah = null

      const res = await fetch(`/api/pelanggan?id=${formData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.message || "Gagal memperbarui pelanggan")

      // sinkronkan cache list
      await mutate("/api/pelanggan")

      const zonaNamaBaru =
        (payload.zonaId ? zonaOptions.find(z => z.id === payload.zonaId)?.nama ?? null : null)

      onSave?.({
        ...formData,
        noWA: payload.wa,
        meterAwal: payload.meterAwal,
        zonaId: payload.zonaId ?? undefined,
        zonaNama: zonaNamaBaru ?? undefined,
      })

      toast({
        title: "Berhasil",
        description: data?.message ?? (noZona ? "Zona dikosongkan." : "Data pelanggan diperbarui."),
      })
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
            <h2 className="text-2xl font-bold text-primary">Edit Pelanggan</h2>
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
                <Label htmlFor="nama" className="text-primary font-medium">Nama Lengkap</Label>
                <Input
                  id="nama"
                  value={formData.nama}
                  onChange={(e) => handleChange("nama", e.target.value)}
                  className="h-12 bg-card/60 border-primary/30 focus:border-primary focus:ring-primary/20"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="kodeCustomer" className="text-primary font-medium">Kode Customer</Label>
                <Input
                  id="kodeCustomer"
                  value={formData.kodeCustomer}
                  className="h-12 bg-muted/50 border-primary/20 text-muted-foreground"
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="noWA" className="text-primary font-medium">No. WhatsApp</Label>
                <Input
                  id="noWA"
                  value={formData.noWA}
                  onChange={(e) => handleChange("noWA", e.target.value)}
                  className="h-12 bg-card/60 border-primary/30 focus:border-primary focus:ring-primary/20"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meterAwal" className="text-primary font-medium">Meter Awal</Label>
                <Input
                  id="meterAwal"
                  type="number"
                  value={formData.meterAwal}
                  onChange={(e) => handleChange("meterAwal", Number(e.target.value || 0))}
                  className="h-12 bg-card/60 border-primary/30 focus:border-primary focus:ring-primary/20"
                  required
                />
              </div>

              {/* Dropdown Zona */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="zonaId" className="text-primary font-medium">Zona</Label>
               {/* "" => tanpa zona */}
                <select
                  id="zonaId"
                  value={zonaId}
                  onChange={(e) => setZonaId(e.target.value)}  
                  className="w-full h-12 px-3 bg-card/60 border border-primary/30 rounded-md text-base text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  disabled={loadingZona || !!zonaErr}
                >
                  <option value="">{loadingZona ? "Memuat zona…" : "— Tanpa Zona —"}</option>
                  {zonaOptions.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.nama}{z.deskripsi ? ` — ${z.deskripsi}` : ""}
                    </option>
                  ))}
                </select>
                {zonaErr ? <p className="text-xs text-destructive mt-1">Gagal memuat daftar zona.</p> : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alamat" className="text-primary font-medium">Alamat Lengkap</Label>
              <Textarea
                id="alamat"
                value={formData.alamat}
                onChange={(e) => handleChange("alamat", e.target.value)}
                className="bg-card/60 border-primary/30 focus:border-primary focus:ring-primary/20 min-h-[80px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-primary font-medium">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleChange("status", e.target.value as "aktif" | "nonaktif")}
                className="w-full h-12 px-3 bg-card/60 border border-primary/30 rounded-md text-base text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              >
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Non-aktif</option>
              </select>
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
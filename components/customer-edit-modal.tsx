"use client"

import { useState } from "react"
import { useSWRConfig } from "swr"
import { GlassCard } from "./glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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

interface CustomerEditModalProps {
  customer: Customer
  onClose: () => void
  onSave?: (customer: Customer) => void // optional, biar gak wajib
}

function normalizeWA(v: string) {
  const digits = v.replace(/\D/g, "")
  if (digits.startsWith("0")) return `62${digits.slice(1)}`
  if (digits.startsWith("62")) return digits
  return digits
}

export function CustomerEditModal({ customer, onClose, onSave }: CustomerEditModalProps) {
  const [formData, setFormData] = useState<Customer>(customer)
  const [saving, setSaving] = useState(false)
  const { mutate } = useSWRConfig()
  const { toast } = useToast()

  const handleChange = (field: keyof Customer, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    try {
      // payload untuk API
      const payload = {
        nama: formData.nama.trim(),
        wa: normalizeWA(formData.noWA),
        alamat: formData.alamat.trim(),
        meterAwal: Number.isFinite(formData.meterAwal) ? Number(formData.meterAwal) : 0,
        status: formData.status, // "aktif" | "nonaktif"
      }

      const res = await fetch(`/api/pelanggan?id=${formData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "Gagal memperbarui pelanggan")
      }

      // refresh tabel
      await mutate("/api/pelanggan")

      // callback opsional utk parent state (kalau dipakai)
      onSave?.({
        ...formData,
        noWA: payload.wa,
        meterAwal: payload.meterAwal,
      })

      toast({ title: "Berhasil", description: "Data pelanggan telah diperbarui." })
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

          {/* PENTING: tombol submit harus berada DI DALAM form */}
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nama" className="text-primary font-medium">Nama Lengkap</Label>
                <Input
                  id="nama"
                  value={formData.nama}
                  onChange={(e) => handleChange("nama", e.target.value)}
                  className="bg-card/60 border-primary/30 focus:border-primary focus:ring-primary/20"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="kodeCustomer" className="text-primary font-medium">Kode Customer</Label>
                <Input
                  id="kodeCustomer"
                  value={formData.kodeCustomer}
                  className="bg-muted/50 border-primary/20 text-muted-foreground"
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="noWA" className="text-primary font-medium">No. WhatsApp</Label>
                <Input
                  id="noWA"
                  value={formData.noWA}
                  onChange={(e) => handleChange("noWA", e.target.value)}
                  className="bg-card/60 border-primary/30 focus:border-primary focus:ring-primary/20"
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
                  className="bg-card/60 border-primary/30 focus:border-primary focus:ring-primary/20"
                  required
                />
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
                className="w-full px-3 py-2 bg-card/60 border border-primary/30 rounded-md text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
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
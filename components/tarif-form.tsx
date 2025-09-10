"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Save, Droplets } from "lucide-react"

type SettingDTO = {
  tarifPerM3: number
  abonemen: number
  biayaAdmin: number
  tglJatuhTempo: number
  dendaTelatBulanSama: number
  dendaTelatBulanBerbeda: number
}

export function TarifForm() {
  const { toast } = useToast()
  // pakai string agar input bisa benar-benar kosong (bukan auto 0)
  const [form, setForm] = useState({
    tarifPerM3: "",
    abonemen: "",
    biayaAdmin: "",
    tglJatuhTempo: "",
    dendaTelatBulanSama: "",
    dendaTelatBulanBerbeda: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/setting", { cache: "no-store" })
        const data: SettingDTO = await res.json()
        setForm({
          tarifPerM3: String(data.tarifPerM3 ?? ""),
          abonemen: String(data.abonemen ?? ""),
          biayaAdmin: String(data.biayaAdmin ?? ""),
          tglJatuhTempo: String(data.tglJatuhTempo ?? ""),
          dendaTelatBulanSama: String(data.dendaTelatBulanSama ?? ""),
          dendaTelatBulanBerbeda: String(data.dendaTelatBulanBerbeda ?? ""),
        })
      } catch {
        toast({ title: "Gagal memuat tarif", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    })()
  }, [toast])

  const onChange = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    // izinkan '' (kosong) agar user bisa menghapus
    setForm((s) => ({ ...s, [key]: e.target.value }))
  }

  const toInt = (s: string) => (s.trim() === "" ? 0 : parseInt(s, 10) || 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: SettingDTO = {
        tarifPerM3: toInt(form.tarifPerM3),
        abonemen: toInt(form.abonemen),
        biayaAdmin: toInt(form.biayaAdmin),
        tglJatuhTempo: toInt(form.tglJatuhTempo),
        dendaTelatBulanSama: toInt(form.dendaTelatBulanSama),
        dendaTelatBulanBerbeda: toInt(form.dendaTelatBulanBerbeda),
      }

      const res = await fetch("/api/setting", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.message || "Gagal menyimpan")
      }

      toast({ title: "Berhasil", description: "Tarif air berhasil disimpan" })
    } catch (err: any) {
      toast({ title: "Gagal", description: err?.message ?? "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-8 text-sm text-muted-foreground">
        Memuat tarif...
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Droplets className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">Tarif Air</h2>
      </div>

      <div>
        <Label htmlFor="tarif-perm3">Tarif per m³</Label>
        <Input
          id="tarif-perm3"
          type="number"
          inputMode="numeric"
          value={form.tarifPerM3}
          onChange={onChange("tarifPerM3")}
          placeholder="3000"
        />
      </div>

      <div>
        <Label htmlFor="abonemen">Abonemen</Label>
        <Input
          id="abonemen"
          type="number"
          inputMode="numeric"
          value={form.abonemen}
          onChange={onChange("abonemen")}
          placeholder="10000"
        />
      </div>

      <div>
        <Label htmlFor="biaya-admin">Biaya Admin</Label>
        <Input
          id="biaya-admin"
          type="number"
          inputMode="numeric"
          value={form.biayaAdmin}
          onChange={onChange("biayaAdmin")}
          placeholder="2500"
        />
      </div>

      <div>
        <Label htmlFor="tgl-jt">Tgl Jatuh Tempo (tanggal)</Label>
        <Input
          id="tgl-jt"
          type="number"
          inputMode="numeric"
          value={form.tglJatuhTempo}
          onChange={onChange("tglJatuhTempo")}
          placeholder="15"
        />
      </div>

      <div>
        <Label htmlFor="denda-sama">Denda Terlambat (bulan sama)</Label>
        <Input
          id="denda-sama"
          type="number"
          inputMode="numeric"
          value={form.dendaTelatBulanSama}
          onChange={onChange("dendaTelatBulanSama")}
          placeholder="5000"
        />
      </div>

      <div>
        <Label htmlFor="denda-beda">Denda Terlambat (bulan beda)</Label>
        <Input
          id="denda-beda"
          type="number"
          inputMode="numeric"
          value={form.dendaTelatBulanBerbeda}
          onChange={onChange("dendaTelatBulanBerbeda")}
          placeholder="10000"
        />
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? (
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Menyimpan...
          </span>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Simpan Tarif
          </>
        )}
      </Button>
    </form>
  )
}
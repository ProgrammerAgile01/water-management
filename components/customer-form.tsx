"use client"

import { useState } from "react"
import useSWR from "swr"
import { useSWRConfig } from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

// ---------- Types ----------
type CustomerData = {
  nama: string
  noWA: string
  kodeCustomer: string
  alamat: string
  meterAwal: string
  zonaId: string // "" = tidak dipilih
}

type ZonaLite = { id: string; nama: string; kode: string; deskripsi: string }

const fetcher = (url: string) => fetch(url).then(r => r.json())

// ---------- Helpers ----------
function normalizeWA(v: string) {
  const digits = v.replace(/\D/g, "")
  if (digits.startsWith("0")) return `62${digits.slice(1)}`
  if (digits.startsWith("62")) return digits
  return digits
}
function genCustomerCode() {
  const ts = Date.now().toString().slice(-6)
  const rnd = Math.floor(Math.random() * 100).toString().padStart(2, "0")
  return `TB${ts}${rnd}`
}

export function CustomerForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<CustomerData>({
    nama: "",
    noWA: "",
    kodeCustomer: "",
    alamat: "",
    meterAwal: "",
    zonaId: "",
  })

  const { toast } = useToast()
  const { mutate } = useSWRConfig()

  // ---------- Load daftar zona (compact) ----------
  // Ambil 500 item pertama; kalau perlu bisa ganti ke endpoint compact
  const { data: zonaResp, isLoading: loadingZona, error: zonaError } = useSWR<{
    ok: boolean
    items: { id: string; nama: string; kode: string }[]
  }>(`/api/zona?page=1&pageSize=500&q=`, fetcher, { revalidateOnFocus: false })

  const zonaList: ZonaLite[] = Array.isArray(zonaResp?.items) ? zonaResp!.items : []

  // ---------- Submit ----------
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isLoading) return
    setIsLoading(true)

    try {
      const payload: Record<string, unknown> = {
        nama: formData.nama.trim(),
        wa: normalizeWA(formData.noWA),
        alamat: formData.alamat.trim(),
        meterAwal: Number(formData.meterAwal || 0),
        kode: formData.kodeCustomer?.trim() || undefined,
      }
      if (formData.zonaId) payload.zonaId = formData.zonaId // kirim hanya jika dipilih

      const res = await fetch("/api/pelanggan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "Gagal menyimpan pelanggan")
      }

      await mutate("/api/pelanggan")

      const kodeFix = data?.data?.pelanggan?.kode ?? payload.kode
      const username = data?.data?.user?.username
      const tempPass = data?.data?.tempPassword

      toast({
        title: "Pelanggan berhasil ditambahkan",
        description:
          `Kode: ${kodeFix}` +
          (username ? ` • User: ${username}` : "") +
          (tempPass ? ` • Password: ${tempPass}` : ""),
      })

      setFormData({
        nama: "",
        noWA: "",
        kodeCustomer: "",
        alamat: "",
        meterAwal: "",
        zonaId: "",
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan, silakan coba lagi"
      toast({ title: "Gagal Menambahkan Pelanggan", description: msg, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  // ---------- Helper set state ----------
  const set =
    (field: keyof CustomerData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setFormData((p) => ({ ...p, [field]: e.target.value }))

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Grid 2 kolom */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nama */}
        <div className="space-y-2">
          <Label htmlFor="nama" className="text-base font-medium">Nama Lengkap *</Label>
          <Input id="nama" value={formData.nama} onChange={set("nama")} required className="h-12 text-base" />
        </div>

        {/* No WA */}
        <div className="space-y-2">
          <Label htmlFor="noWA" className="text-base font-medium">No. WhatsApp *</Label>
          <Input
            id="noWA"
            type="tel"
            placeholder="08xxxxxxxxxx"
            value={formData.noWA}
            onChange={set("noWA")}
            required
            className="h-12 text-base"
          />
        </div>

        {/* Kode Customer + Generate */}
        <div className="space-y-2">
          <Label htmlFor="kodeCustomer" className="text-base font-medium">Kode Customer</Label>
          <div className="flex gap-2">
            <Input
              id="kodeCustomer"
              placeholder="Auto generate jika kosong"
              value={formData.kodeCustomer}
              onChange={set("kodeCustomer")}
              className="h-12 text-base"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormData((p) => ({ ...p, kodeCustomer: genCustomerCode() }))}
            >
              Generate
            </Button>
          </div>
        </div>

        {/* Meter Awal */}
        <div className="space-y-2">
          <Label htmlFor="meterAwal" className="text-base font-medium">Meter Awal *</Label>
          <Input
            id="meterAwal"
            type="number"
            min={0}
            placeholder="0"
            value={formData.meterAwal}
            onChange={set("meterAwal")}
            required
            className="h-12 text-base"
          />
        </div>

        {/* Zona (dropdown) */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="zona" className="text-base font-medium">Zona</Label>
          <select
            id="zona"
            value={formData.zonaId}
            onChange={set("zonaId")}
            className="w-full h-12 px-3 py-2 text-base bg-card/60 border border-primary/30 rounded-md text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            disabled={loadingZona}
          >
            <option value="">{loadingZona ? "Memuat zona…" : "— Pilih zona (opsional) —"}</option>
            {zonaList.map((z) => (
              <option key={z.id} value={z.id}>
              {z.nama} {z.deskripsi ? `– ${z.deskripsi}` : ""}
            </option>
            ))}
          </select>
          {zonaError ? (
            <p className="text-xs text-destructive mt-1">Gagal memuat daftar zona.</p>
          ) : null}
        </div>
      </div>

      {/* Alamat */}
      <div className="space-y-2">
        <Label htmlFor="alamat" className="text-base font-medium">Alamat Lengkap *</Label>
        <Textarea
          id="alamat"
          value={formData.alamat}
          onChange={set("alamat")}
          placeholder="Masukkan alamat lengkap"
          required
          className="min-h-[100px] text-base resize-none"
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" className="px-8 h-12 text-base" disabled={isLoading}>
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Menyimpan...
            </span>
          ) : (
            "Simpan Pelanggan"
          )}
        </Button>
      </div>
    </form>
  )
}
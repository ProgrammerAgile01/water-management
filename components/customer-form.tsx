"use client" // Menandakan file ini adalah komponen client di Next.js (punya state, event handler, dll)

import { useState } from "react"                 // Hook untuk state lokal
import { useSWRConfig } from "swr"               // Hook SWR untuk global mutate (revalidate cache)
import { Button } from "@/components/ui/button"  // Komponen tombol
import { Input } from "@/components/ui/input"    // Komponen input teks
import { Label } from "@/components/ui/label"    // Komponen label input
import { Textarea } from "@/components/ui/textarea" // Komponen textarea
import { useToast } from "@/hooks/use-toast"     // Hook custom untuk notifikasi/toast

// Tipe data form pelanggan
type CustomerData = {
  nama: string
  noWA: string
  kodeCustomer: string
  alamat: string
  meterAwal: string
}

// Fungsi untuk normalisasi nomor WA → 08xxx jadi 62xxx
function normalizeWA(v: string) {
  const digits = v.replace(/\D/g, "")      // ambil hanya digit
  if (digits.startsWith("0")) return `62${digits.slice(1)}`
  if (digits.startsWith("62")) return digits
  return digits
}

// Fungsi untuk generate kode customer otomatis
function genCustomerCode() {
  const ts = Date.now().toString().slice(-6) // ambil 6 digit terakhir timestamp
  const rnd = Math.floor(Math.random() * 100).toString().padStart(2, "0") // angka random 2 digit
  return `TB${ts}${rnd}` // contoh hasil: TB12345678
}

export function CustomerForm() {
  // State loading untuk tombol submit
  const [isLoading, setIsLoading] = useState(false)

  // State data form
  const [formData, setFormData] = useState<CustomerData>({
    nama: "",
    noWA: "",
    kodeCustomer: "",
    alamat: "",
    meterAwal: "",
  })

  const { toast } = useToast()       // Hook untuk menampilkan toast
  const { mutate } = useSWRConfig()  // SWR mutate global → bisa refresh cache

  // Handler saat form di-submit
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()      // cegah reload halaman
    if (isLoading) return   // cegah double-submit
    setIsLoading(true)

    try {
      // Payload untuk API
      const payload = {
        nama: formData.nama.trim(),
        wa: normalizeWA(formData.noWA),
        alamat: formData.alamat.trim(),
        meterAwal: Number(formData.meterAwal || 0),
        kode: formData.kodeCustomer?.trim() || undefined,
      }

      // Panggil API POST /api/pelanggan
      const res = await fetch("/api/pelanggan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      // Jika gagal, lempar error
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "Gagal menyimpan pelanggan")
      }

      // Refresh data daftar pelanggan dengan SWR
      await mutate("/api/pelanggan")

      // Ambil informasi tambahan dari API response
      const kodeFix = data?.data?.pelanggan?.kode ?? payload.kode
      const username = data?.data?.user?.username
      const tempPass = data?.data?.tempPassword

      // Tampilkan toast sukses
      toast({
        title: "Pelanggan berhasil ditambahkan",
        description:
          `Kode: ${kodeFix}` +
          (username ? ` • User: ${username}` : "") +
          (tempPass ? ` • Password: ${tempPass}` : ""),
      })

      // Reset form setelah sukses
      setFormData({ nama: "", noWA: "", kodeCustomer: "", alamat: "", meterAwal: "" })
    } catch (err) {
      // Tampilkan toast error jika gagal
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan, silakan coba lagi"
      toast({ title: "Gagal Menambahkan Pelanggan", description: msg, variant: "destructive" })
    } finally {
      setIsLoading(false) // Matikan loading button
    }
  }

  // Helper function untuk update state form secara dinamis
  const set =
    (field: keyof CustomerData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFormData((p) => ({ ...p, [field]: e.target.value }))

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Grid 2 kolom untuk input utama */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Nama */}
        <div className="space-y-2">
          <Label htmlFor="nama" className="text-base font-medium">Nama Lengkap *</Label>
          <Input id="nama" value={formData.nama} onChange={set("nama")} required className="h-12 text-base" />
        </div>

        {/* Input No WA */}
        <div className="space-y-2">
          <Label htmlFor="noWA" className="text-base font-medium">No. WhatsApp *</Label>
          <Input id="noWA" type="tel" placeholder="08xxxxxxxxxx"
                 value={formData.noWA} onChange={set("noWA")} required className="h-12 text-base" />
        </div>

        {/* Input Kode Customer + tombol Generate */}
        <div className="space-y-2">
          <Label htmlFor="kodeCustomer" className="text-base font-medium">Kode Customer</Label>
          <div className="flex gap-2">
            <Input id="kodeCustomer" placeholder="Auto generate jika kosong"
                   value={formData.kodeCustomer} onChange={set("kodeCustomer")} className="h-12 text-base" />
            <Button type="button" variant="outline"
                    onClick={() => setFormData((p) => ({ ...p, kodeCustomer: genCustomerCode() }))}>
              Generate
            </Button>
          </div>
        </div>

        {/* Input Meter Awal */}
        <div className="space-y-2">
          <Label htmlFor="meterAwal" className="text-base font-medium">Meter Awal *</Label>
          <Input id="meterAwal" type="number" min={0} placeholder="0"
                 value={formData.meterAwal} onChange={set("meterAwal")} required className="h-12 text-base" />
        </div>
      </div>

      {/* Input Alamat */}
      <div className="space-y-2">
        <Label htmlFor="alamat" className="text-base font-medium">Alamat Lengkap *</Label>
        <Textarea id="alamat" value={formData.alamat} onChange={set("alamat")}
                  placeholder="Masukkan alamat lengkap" required className="min-h-[100px] text-base resize-none" />
      </div>

      {/* Tombol Submit */}
      <div className="flex justify-end">
        <Button type="submit" className="px-8 h-12 text-base" disabled={isLoading}>
          {isLoading ? (
            // Jika sedang loading, tampilkan animasi spinner
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Menyimpan...
            </span>
          ) : ("Simpan Pelanggan")}
        </Button>
      </div>
    </form>
  )
}                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          
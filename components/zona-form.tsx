
"use client"

import { useEffect, useState } from "react"
import { useSWRConfig } from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select"

// Bentuk data form
type ZonaData = {
    nama: string
    kode: string
    deskripsi: string
    petugasId: string
}

type PetugasOption = { id: string; name: string; username?: string }

// Helper generate kode otomatis (Z + timestamp)
function genZonaCode() {
    const ts = Date.now().toString().slice(-5)
    return `Z${ts}`
}

export function ZonaForm() {
    const [formData, setFormData] = useState<ZonaData>({
        nama: "",
        kode: "",
        deskripsi: "",
        petugasId: "",
    })
    const [isLoading, setIsLoading] = useState(false)
    const [petugasList, setPetugasList] = useState<PetugasOption[]>([])
    const [loadingPetugas, setLoadingPetugas] = useState(false)

    const { toast } = useToast()
    const { mutate } = useSWRConfig()

    // Ambil daftar petugas (role=PETUGAS). 
    // Sesuaikan endpoint jika kamu pakai route lain.
    useEffect(() => {
        let cancelled = false
        const run = async () => {
            try {
                setLoadingPetugas(true)
                const res = await fetch("/api/users?role=PETUGAS", { cache: "no-store" })
                const data = await res.json()
                if (!res.ok || !data?.items) throw new Error(data?.message || "Gagal memuat petugas")
                if (!cancelled) setPetugasList(data.items as PetugasOption[])
            } catch {
                // fallback diam2 — biar form tetap tampil
            } finally {
                if (!cancelled) setLoadingPetugas(false)
            }
        }
        run()
        return () => { cancelled = true }
    }, [])

    const set =
        (field: keyof ZonaData) =>
            (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
                setFormData((p) => ({ ...p, [field]: e.target.value }))

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (isLoading) return
        setIsLoading(true)

        try {
            if (!formData.petugasId) {
                throw new Error("Petugas wajib dipilih")
            }

            const payload = {
                nama: formData.nama.trim(),
                kode: (formData.kode.trim() || genZonaCode()).toUpperCase(),
                deskripsi: formData.deskripsi.trim() || null,
                petugasId: formData.petugasId ? String(formData.petugasId) : null,
            }

            const res = await fetch("/api/zona", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            const data = await res.json()
            if (!res.ok || !data?.ok) throw new Error(data?.message || "Gagal menyimpan zona")

            toast({
                title: "Zona berhasil ditambahkan",
                description: `Kode: ${payload.kode} • Petugas: ${petugasList.find(p => p.id === payload.petugasId)?.name ?? "-"}`,
            })
            // ZonaForm.tsx
            await mutate((key) => typeof key === "string" && key.startsWith("/api/zona"))
            setFormData({ nama: "", kode: "", deskripsi: "", petugasId: "" })
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Terjadi kesalahan"
            toast({ title: "Gagal Menambahkan Zona", description: msg, variant: "destructive" })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} id="zona-form" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="nama">Nama Zona *</Label>
                    <Input id="nama" value={formData.nama} onChange={set("nama")} required />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="kode">Kode Zona</Label>
                    <div className="flex gap-2">
                        <Input
                            id="kode"
                            value={formData.kode}
                            onChange={set("kode")}
                            placeholder="Auto generate jika kosong"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setFormData((p) => ({ ...p, kode: genZonaCode() }))}
                        >
                            Generate
                        </Button>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="deskripsi">Deskripsi</Label>
                <Textarea
                    id="deskripsi"
                    value={formData.deskripsi}
                    onChange={set("deskripsi")}
                    placeholder="Keterangan tambahan"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="petugasId" className="text-base font-medium">Petugas Penanggung Jawab *</Label>

                <Select
                    value={formData.petugasId || ""}
                    onValueChange={(val) => setFormData((p) => ({ ...p, petugasId: val }))}
                    disabled={loadingPetugas}
                >
                    <SelectTrigger
                        id="petugasId"
                        className="
        h-12 text-base
        bg-card/60 border-primary/30
        focus-visible:ring-primary/20 focus-visible:ring-2
        focus:border-primary
      "
                    >
                        <SelectValue placeholder={loadingPetugas ? "Memuat petugas..." : "-- Pilih Petugas --"} />
                    </SelectTrigger>
                    <SelectContent className="bg-card/95 backdrop-blur-md border-primary/20">
                        {petugasList.length === 0 && !loadingPetugas ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">Belum ada data petugas</div>
                        ) : (
                            petugasList.map((u) => (
                                <SelectItem key={u.id} value={u.id} className="text-sm">
                                    {u.name} <span className="text-muted-foreground">({u.username})</span>
                                </SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Menyimpan..." : "Simpan Zona"}
                </Button>
            </div>
        </form>

    )
}
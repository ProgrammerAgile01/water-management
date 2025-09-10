"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import { GlassCard } from "./glass-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useConfigStore } from "@/lib/config-store"
import { useWaterIssuesStore } from "@/lib/water-issues-store"
import { usePeriodStore } from "@/lib/period-store"
import { Calculator, Save, Search, Send, CheckCircle, FileText, Download, ChevronDown, Trash2 } from "lucide-react"
import React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type ApiRow = {
  id: string
  kodeCustomer: string
  nama: string
  alamat: string
  phone: string
  meterAwal: number
  meterAkhir: number | null
  pemakaian: number
  status: "pending" | "completed"
  total?: number
  kendala?: string
  tarifPerM3?: number
  abonemen?: number
}

type ApiResp = {
  ok: true
  period: string
  locked?: boolean
  progress: { total: number; selesai: number; pending: number; percent: number }
  tarifPerM3: number | null
  abonemen: number | null
  items: ApiRow[]
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function MeterGrid() {
  const { toast } = useToast()
  const { mutate } = useSWRConfig()
  const { tarif } = useConfigStore()
  const { addIssue } = useWaterIssuesStore()
  const { currentPeriod, isFinalPeriod } = usePeriodStore()

  const [searchTerm, setSearchTerm] = useState("")
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState("")
  const [editEnd, setEditEnd] = useState<Record<string, string>>({})
  const [editNote, setEditNote] = useState<Record<string, string>>({})
  const [sending, setSending] = useState<string | null>(null)
  const [autoSaving, setAutoSaving] = useState<Record<string, boolean>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ApiRow | null>(null)

  const period = currentPeriod || ""

  const { data, isLoading, error } = useSWR<ApiResp>(
    period ? `/api/catat-meter?periode=${period}` : null,
    fetcher,
    { revalidateOnFocus: false },
  )

  const rows = (data?.ok ? data.items : []) as ApiRow[]
  const isPeriodLocked = !!data?.locked || (period ? isFinalPeriod(period) : false)

  // snapshot tarif/abonemen untuk header
  const headerTarif =
    (data?.tarifPerM3 ?? undefined) ??
    rows.find((r) => typeof r.tarifPerM3 === "number")?.tarifPerM3 ??
    tarif.tarifPerM3
  const headerAbon =
    (data?.abonemen ?? undefined) ??
    rows.find((r) => typeof r.abonemen === "number")?.abonemen ??
    tarif.abonemen

  // === Formatter periode (tampilan saja) ===
  const renderPeriodeLabel = (p: string) => {
    if (!p) return ""
    const [py, pm] = p.split("-").map(Number)
    const catat = new Date(py, (pm ?? 1) - 1, 1) // bulan pencatatan
    const tagih = new Date(py, (pm ?? 1), 1)     // +1 bulan untuk tagihan
    const catatLabel = catat.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
    const tagihLabel = tagih.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
    return `Catat ${catatLabel} - Tagihan ${tagihLabel}`
  }

  // label hanya untuk bulan tagihan (dipakai di pesan WA)
  const getTagihanLabel = (p: string) => {
    if (!p) return ""
    const [py, pm] = p.split("-").map(Number)
    const tagih = new Date(py, (pm ?? 1), 1)
    return tagih.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
  }

  const calcTotal = (pemakaian: number, rowTarif?: number, rowAbon?: number) => {
    const t = (typeof rowTarif === "number" ? rowTarif : headerTarif) ?? 0
    const a = (typeof rowAbon === "number" ? rowAbon : headerAbon) ?? 0
    return pemakaian * t + a
  }

  const completedCount = useMemo(() => rows.filter((r) => r.status === "completed").length, [rows])
  const totalCount = rows.length
  const percentRaw = data?.ok ? data.progress?.percent ?? 0 : 0
  const percent = Math.min(100, Math.max(0, Math.round(Number(percentRaw) || 0)))

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.kodeCustomer.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.alamat.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [rows, searchTerm],
  )

  useEffect(() => {
    setEditEnd({})
    setEditNote({})
    setSelectedCustomer("")
    setExpandedCard(null)
    setAutoSaving({})
  }, [period])

  useEffect(() => {
    if (data?.ok) {
      const map: Record<string, string> = {}
      for (const r of data.items) map[r.id] = r.kendala ?? ""
      setEditNote(map)
    }
  }, [data])

  // ===== helpers autosave =====
  const digits = (n: number) => String(Math.max(0, n)).length
  const canValidate = (end: number, start: number) => digits(end) >= digits(start)
  const shouldAutoSave = (end: number, start: number) => digits(end) === digits(start) && end >= start

  // ===== SAVE (manual/auto) – gunakan override agar tidak balapan dengan state =====
  const saveReading = async (row: ApiRow, endOverride?: number) => {
    const raw = endOverride != null ? String(endOverride) : editEnd[row.id]
    const parsed = raw === "" || raw == null ? null : Number(raw)
    if (parsed == null || !Number.isFinite(parsed)) {
      toast({ title: "Input belum diisi", description: "Masukkan meter akhir terlebih dahulu", variant: "destructive" })
      return
    }
    if (parsed < row.meterAwal) {
      toast({ title: "Nilai tidak valid", description: "Meter akhir tidak boleh < meter awal", variant: "destructive" })
      return
    }

    try {
      setAutoSaving((p) => ({ ...p, [row.id]: true }))
      const res = await fetch("/api/catat-meter", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, meterAkhir: parsed, kendala: editNote[row.id] || "" }),
      })
      const json = await res.json()
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Gagal menyimpan")

      const note = (editNote[row.id] || "").trim()
      if (note) {
        addIssue({
          issue: `Kendala meter - ${row.nama}`,
          description: note,
          status: "unresolved",
          reporter: row.nama,
          phone: row.phone,
          address: row.alamat,
          priority: "medium",
          customerId: row.kodeCustomer,
          source: "meter_reading",
        })
      }

      await mutate(`/api/catat-meter?periode=${period}`)

      // hapus buffer supaya input menampilkan nilai server terbaru (tidak jadi kosong)
      setEditEnd((p) => {
        const { [row.id]: _, ...rest } = p
        return rest
      })
      setEditNote((p) => ({ ...p, [row.id]: note }))

      toast({ title: "Tersimpan", description: `Pencatatan meter ${row.nama} berhasil disimpan` })
    } catch (e: any) {
      toast({ title: "Gagal menyimpan", description: e.message ?? "Error", variant: "destructive" })
    } finally {
      setAutoSaving((p) => {
        const { [row.id]: _, ...rest } = p
        return rest
      })
    }
  }

  const deleteRow = async (row: ApiRow) => {
    if (!row || !row.id) return
  
    // hanya boleh hapus kalau periode belum dikunci
    if (isPeriodLocked) {
      toast({
        title: "Tidak bisa hapus",
        description: "Periode sudah dikunci.",
        variant: "destructive",
      })
      return
    }
  
    try {
      setDeletingId(row.id)
      const res = await fetch(`/api/catat-meter?id=${row.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Gagal menghapus")
  
      // refresh data periode
      await mutate(`/api/catat-meter?periode=${period}`)
  
      toast({
        title: "Terhapus",
        description: `Inputan ${row.nama} berhasil dihapus.`,
      })
    } catch (e: any) {
      toast({
        title: "Gagal menghapus",
        description: e?.message ?? "Error",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  // ===== Kirim WA =====
  const sendWA = async (row: ApiRow) => {
    setSending(row.id)
    try {
      // end: pakai buffer kalau ada & valid, else pakai nilai server
      const endFromBuf = Number(editEnd[row.id])
      const hasBuf = Number.isFinite(endFromBuf)
      const end = hasBuf ? endFromBuf : (row.meterAkhir ?? row.meterAwal)

      const pem = Math.max(0, end - row.meterAwal)
      const rowTarif = (typeof row.tarifPerM3 === "number" ? row.tarifPerM3 : headerTarif) ?? 0
      const rowAbon = (typeof row.abonemen === "number" ? row.abonemen : headerAbon) ?? 0
      const total = calcTotal(pem, rowTarif, rowAbon)

      const msg =
        `Halo ${row.nama}, Tagihan Air ${getTagihanLabel(period)}:\n\n` +
        `Meter Awal (Bulan Sebelumnya): ${row.meterAwal}\n` +
        `Meter Akhir (Bulan Ini): ${end}\n` +               // ⬅️ pakai end terbaru
        `Pemakaian: ${pem} m³\n` +
        `Tarif Per M3: Rp ${Number(rowTarif).toLocaleString("id-ID")}\n` +
        `Abonemen: Rp ${Number(rowAbon).toLocaleString("id-ID")}\n` +
        `Total: Rp ${Number(total).toLocaleString("id-ID")}\n\n` +
        `Terima kasih.`

      if (row.phone) {
        window.open(`https://wa.me/${row.phone.replace(/^0/, "62")}?text=${encodeURIComponent(msg)}`)
      } else {
        toast({ title: "Nomor WA kosong", description: "Nomor tidak tersedia", variant: "destructive" })
      }
    } finally {
      setSending(null)
    }
  }

  const handlePreviewAllPDF = () => {
    if (!period) {
      toast({ title: "Periode belum dipilih", description: "Silakan pilih periode dahulu", variant: "destructive" })
      return
    }
    window.open(`/api/tagihan/preview?periode=${period}`, "_blank")
    toast({ title: "Preview PDF dibuka", description: "Semua tagihan sedang dimuat" })
  }

  const handleDownloadCustomerPDF = () => {
    if (!selectedCustomer) {
      toast({ title: "Pilih pelanggan", description: "Silakan pilih pelanggan dulu", variant: "destructive" })
      return
    }
    window.open(`/api/tagihan/preview/${selectedCustomer}`, "_blank")
    const cust = rows.find((r) => r.id === selectedCustomer)
    toast({ title: "PDF Diunduh", description: `Tagihan ${cust?.nama} sedang diunduh` })
  }

  const getStatusBadge = (status: ApiRow["status"]) =>
    status === "completed" ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Selesai</Badge>
    ) : (
      <Badge variant="secondary">Pending</Badge>
    )

  return (
    <GlassCard className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-semibold text-foreground">Daftar Pencatatan Meter</h3>
          {!period && <p className="text-sm text-muted-foreground">Pilih periode terlebih dahulu.</p>}
          {period && (
            <>
              <p className="text-sm text-muted-foreground">
                Progress: {completedCount}/{totalCount} pelanggan ({percent}%)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Periode: {renderPeriodeLabel(period)} | <b>Tarif Per M3</b>: Rp {Number(headerTarif).toLocaleString("id-ID")} |{" "}
                <b>Abonemen</b>: Rp {Number(headerAbon).toLocaleString("id-ID")}
                {isPeriodLocked && <span className="ml-2 text-green-600 font-medium">• DIKUNCI</span>}
              </p>
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari pelanggan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64 bg-card/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handlePreviewAllPDF} variant="outline" size="sm" className="bg-card/50">
              <FileText className="w-4 h-4 mr-2" />
              Preview Semua (PDF)
            </Button>
            <div className="flex items-center gap-2">
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger className="w-48 h-9 bg-card/50">
                  <SelectValue placeholder="Pilih pelanggan..." />
                </SelectTrigger>
                <SelectContent>
                  {rows.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nama} ({r.kodeCustomer})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleDownloadCustomerPDF}
                variant="outline"
                size="sm"
                className="bg-card/50"
                disabled={!selectedCustomer}
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {!period && <div className="p-4 text-sm text-muted-foreground bg-muted/20 rounded">Silakan pilih periode dulu.</div>}
      {period && isLoading && <div className="p-4 text-sm text-muted-foreground">Memuat data…</div>}
      {period && error && <div className="p-4 text-sm text-destructive">Gagal memuat data.</div>}

      {period && data?.ok && (
        <>
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress Pencatatan</span>
              <span className="font-medium text-foreground">{percent}%</span>
            </div>
            <div className="w-full bg-muted/30 rounded-full h-2">
              <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${percent}%` }} />
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/20">
                  <th className="text-left  py-3 px-2 text-sm font-medium text-muted-foreground">Kode</th>
                  <th className="text-left  py-3 px-2 text-sm font-medium text-muted-foreground">Nama</th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Meter Awal (Bulan Sebelumnya)</th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Meter Akhir (Bulan Ini)</th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Pemakaian</th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Tarif Per M3</th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Abonemen</th>
                  <th className="text-right  py-3 px-2 text-sm font-medium text-muted-foreground">Total</th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const buf = editEnd[r.id]
                  const endVal = buf === undefined ? (r.meterAkhir ?? "") : buf
                  const parsed = endVal === "" ? NaN : Number(endVal)
                  const pem = Number.isFinite(parsed) ? Math.max(0, parsed - r.meterAwal) : Math.max(0, (r.meterAkhir ?? 0) - r.meterAwal)
                  const rowTarif = (typeof r.tarifPerM3 === "number" ? r.tarifPerM3 : headerTarif) ?? 0
                  const rowAbon = (typeof r.abonemen === "number" ? r.abonemen : headerAbon) ?? 0
                  const total = calcTotal(pem, rowTarif, rowAbon)

                  return (
                    <React.Fragment key={r.id}>
                      <tr className="border-b border-border/10 hover:bg-muted/20">
                        <td className="py-3 px-2 text-sm font-medium text-primary">{r.kodeCustomer}</td>
                        <td className="py-3 px-2">
                          <p className="text-sm font-medium text-foreground">{r.nama}</p>
                          <p className="text-xs text-muted-foreground">{r.alamat}</p>
                        </td>
                        <td className="py-3 px-2 text-sm text-center">{r.meterAwal}</td>
                        <td className="py-3 px-2 text-center">
                          <Input
                            type="number"
                            value={endVal}
                            onChange={(e) => {
                              if (isPeriodLocked) return
                              const str = e.target.value
                              const v = Number(str || 0)
                              setEditEnd((p) => ({ ...p, [r.id]: str }))

                              // autosave jika digit sama & valid
                              if (!autoSaving[r.id] && shouldAutoSave(v, r.meterAwal)) {
                                setAutoSaving((p) => ({ ...p, [r.id]: true }))
                                Promise.resolve(saveReading(r, v)).finally(() =>
                                  setAutoSaving((p) => {
                                    const { [r.id]: _, ...rest } = p
                                    return rest
                                  }),
                                )
                              } else if (canValidate(v, r.meterAwal) && v < r.meterAwal) {
                                toast({ title: "Perhatikan nilai", description: "Meter akhir lebih kecil dari meter awal", variant: "destructive" })
                              }
                            }}
                            className="w-28 h-8 text-center text-sm"
                            placeholder="0"
                            min={r.meterAwal}
                            readOnly={isPeriodLocked}
                            disabled={isPeriodLocked || !!autoSaving[r.id]}
                          />
                        </td>
                        <td className="py-3 px-2 text-sm text-center font-medium text-primary">{pem} m³</td>
                        <td className="py-3 px-2 text-sm text-center">Rp {Number(rowTarif).toLocaleString("id-ID")}</td>
                        <td className="py-3 px-2 text-sm text-center">Rp {Number(rowAbon).toLocaleString("id-ID")}</td>
                        <td className="py-3 px-2 text-sm text-right font-bold">Rp {Number(total).toLocaleString("id-ID")}</td>
                        <td className="py-3 px-2 text-center">
                          <div className="flex items-center gap-1 justify-center">
                            {!isPeriodLocked && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    return saveReading(r, Number.isFinite(parsed) ? Number(parsed) : undefined)
                                  }}
                                  className="h-8 px-2 bg-transparent"
                                  disabled={!Number.isFinite(parsed) || !!autoSaving[r.id]}
                                  title="Simpan"
                                >
                                  <Save className="w-4 h-4" />
                                </Button>

                                {/* Tambahan tombol Hapus */}
                                
                                  <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDeleteTarget(r)}
                                  className="h-8 px-2 bg-transparent text-red-600"
                                  title="Hapus inputan"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                
                              </>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 bg-transparent"
                              onClick={() => setExpandedCard(expandedCard === r.id ? null : r.id)}
                              title="Kendala & Rincian"
                            >
                              <ChevronDown className={`w-4 h-4 transition-transform ${expandedCard === r.id ? "rotate-180" : ""}`} />
                            </Button>

                            {r.status === "completed" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 bg-transparent"
                                onClick={() => sendWA(r)}
                                disabled={sending === r.id}
                                title="Kirim WA"
                              >
                                {sending === r.id ? <CheckCircle className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {expandedCard === r.id && (
                        <tr className="bg-primary/5">
                          <td colSpan={9} className="p-4">
                            {/* 4 kolom × 2 baris */}
                            <div className="grid grid-cols-4 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground">Meter Awal (Bulan Sebelumnya)</p>
                                <p className="font-medium">{r.meterAwal}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Meter Akhir (Bulan Ini)</p>
                                <p className="font-medium">{endVal || r.meterAkhir || 0}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Pemakaian</p>
                                <p className="font-bold text-primary">{pem} m³</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Tarif Per M3</p>
                                <p className="font-medium">Rp {Number(rowTarif).toLocaleString("id-ID")}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Abonemen</p>
                                <p className="font-medium">Rp {Number(rowAbon).toLocaleString("id-ID")}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Total</p>
                                <p className="font-bold">Rp {Number(total).toLocaleString("id-ID")}</p>
                              </div>
                              <div className="col-span-2">
                                <label className="text-xs text-muted-foreground">Kendala (Opsional)</label>
                                <Textarea
                                  value={editNote[r.id] ?? ""}
                                  onChange={(e) => !isPeriodLocked && setEditNote((p) => ({ ...p, [r.id]: e.target.value }))}
                                  placeholder={isPeriodLocked ? "Periode dikunci - tidak dapat diubah" : "Catat kendala (bocor, meter rusak, tekanan rendah, dsb.)"}
                                  className="h-20 text-sm mt-1"
                                  readOnly={isPeriodLocked}
                                  disabled={isPeriodLocked}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-sm text-muted-foreground">Tidak ada data.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards (2 kolom × 3 baris) */}
          <div className="lg:hidden space-y-4">
            {filtered.map((r) => {
              const buf = editEnd[r.id]
              const endVal = buf === undefined ? (r.meterAkhir ?? "") : buf
              const parsed = endVal === "" ? NaN : Number(endVal)
              const pem = Number.isFinite(parsed) ? Math.max(0, parsed - r.meterAwal) : Math.max(0, (r.meterAkhir ?? 0) - r.meterAwal)
              const rowTarif = (typeof r.tarifPerM3 === "number" ? r.tarifPerM3 : headerTarif) ?? 0
              const rowAbon = (typeof r.abonemen === "number" ? r.abonemen : headerAbon) ?? 0
              const total = calcTotal(pem, rowTarif, rowAbon)

              return (
                <div key={r.id} className="p-4 bg-muted/20 rounded-lg space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-foreground">{r.nama}</p>
                      <p className="text-sm text-primary font-medium">{r.kodeCustomer}</p>
                      <p className="text-xs text-muted-foreground">{r.alamat}</p>
                    </div>
                    {getStatusBadge(r.status)}
                  </div>

                  <div className="bg-card/50 p-3 rounded-lg space-y-2">
                    <h4 className="text-sm font-medium text-foreground mb-2">Informasi Pencatatan Meter</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Meter Awal (Bulan Sebelumnya)</p>
                        <p className="font-medium">{r.meterAwal}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Meter Akhir (Bulan Ini)</p>
                        <Input
                          type="number"
                          value={endVal}
                          onChange={(e) => {
                            if (isPeriodLocked) return
                            const str = e.target.value
                            const v = Number(str || 0)
                            setEditEnd((p) => ({ ...p, [r.id]: str }))
                            if (!autoSaving[r.id] && shouldAutoSave(v, r.meterAwal)) {
                              setAutoSaving((p) => ({ ...p, [r.id]: true }))
                              Promise.resolve(saveReading(r, v)).finally(() =>
                                setAutoSaving((p) => {
                                  const { [r.id]: _, ...rest } = p
                                  return rest
                                }),
                              )
                            } else if (canValidate(v, r.meterAwal) && v < r.meterAwal) {
                              toast({ title: "Perhatikan nilai", description: "Meter akhir lebih kecil dari meter awal", variant: "destructive" })
                            }
                          }}
                          className="h-8 text-sm mt-1"
                          placeholder={isPeriodLocked ? "Periode dikunci" : "Masukkan meter akhir"}
                          min={r.meterAwal}
                          readOnly={isPeriodLocked}
                          disabled={isPeriodLocked || !!autoSaving[r.id]}
                        />
                      </div>
                      <div>
                        <p className="text-muted-foreground">Pemakaian</p>
                        <p className="font-bold text-primary">{pem} m³</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tarif Per M3</p>
                        <p className="font-medium">Rp {Number(rowTarif).toLocaleString("id-ID")}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Abonemen</p>
                        <p className="font-medium">Rp {Number(rowAbon).toLocaleString("id-ID")}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total</p>
                        <p className="font-bold text-lg">Rp {Number(total).toLocaleString("id-ID")}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Kendala (Opsional)</label>
                    <Textarea
                      value={editNote[r.id] ?? ""}
                      onChange={(e) => !isPeriodLocked && setEditNote((p) => ({ ...p, [r.id]: e.target.value }))}
                      placeholder={isPeriodLocked ? "Periode dikunci - tidak dapat diubah" : "Catat kendala (bocor, meter rusak, tekanan rendah, dsb.)"}
                      className="h-20 text-sm"
                      readOnly={isPeriodLocked}
                      disabled={isPeriodLocked}
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    {!isPeriodLocked && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            return saveReading(r, Number.isFinite(parsed) ? Number(parsed) : undefined)
                          }}
                          className="h-8 px-2 bg-transparent"
                          disabled={!Number.isFinite(parsed) || !!autoSaving[r.id]}
                          title="Simpan"
                        >
                          <Save className="w-4 h-4" />
                        </Button>

                        {/* Tambahan tombol Hapus (mobile) */}
                         <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteTarget(r)}
                          className="h-8 px-2 bg-transparent text-red-600"
                          title="Hapus inputan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        
                      </>
                    )}

                    {r.status === "completed" && (
                      <Button size="sm" variant="outline" onClick={() => sendWA(r)} className="flex-1 bg-transparent" disabled={sending === r.id}>
                        {sending === r.id ? (<><CheckCircle className="w-4 h-4 mr-2" /> Mengirim…</>) : (<><Send className="w-4 h-4 mr-2" /> Kirim Tagihan Air</>)}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="bg-transparent" onClick={() => setExpandedCard(expandedCard === r.id ? null : r.id)}>
                      <Calculator className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Ringkas */}
          <div className="mt-6 pt-4 border-t border-border/20 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <p className="text-2xl font-bold text-primary">{completedCount}</p>
              <p className="text-sm text-muted-foreground">Selesai</p>
            </div>
            <div className="text-center p-4 bg-yellow-100/50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{totalCount - completedCount}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
            <div className="text-center p-4 bg-green-100/50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{percent}%</p>
              <p className="text-sm text-muted-foreground">Progress</p>
            </div>
          </div>
        </>
      )}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Hapus Inputan?</AlertDialogTitle>
      <AlertDialogDescription>
        Kamu akan menghapus inputan meter untuk{" "}
        <b>{deleteTarget?.nama}</b>. Tindakan ini hanya berlaku di periode
        <br /> <b>{renderPeriodeLabel(period)}</b>.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
        Batal
      </AlertDialogCancel>
      <AlertDialogAction
        onClick={() => {
          if (deleteTarget) deleteRow(deleteTarget)
          setDeleteTarget(null)
        }}
        className="bg-red-600 hover:bg-red-700 text-white"
      >
        Hapus
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
    </GlassCard>
  )
}
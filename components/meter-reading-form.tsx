// components/meter-reading-form.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { FinalizePeriodModal } from "./finalize-period-modal"
import { User, Lock, AlertCircle, Calendar } from "lucide-react"
import { useSWRConfig } from "swr"
import { usePeriodStore } from "@/lib/period-store"

type PeriodOpt = {
  value: string        // "YYYY-MM"
  catatLabel: string   // "September 2025"
  tagihanLabel: string // "Oktober 2025"
}

export function MeterReadingForm() {
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showFinalizeModal, setShowFinalizeModal] = useState(false)
  const [isFinalizingPeriod, setIsFinalizingPeriod] = useState(false)
  const [serverLocked, setServerLocked] = useState(false)
  const [checking, setChecking] = useState(false)

  const [officerName, setOfficerName] = useState<string>("")
  const [readingDate, setReadingDate] = useState<string>(() => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}`
  })

  const [finalizeTotal, setFinalizeTotal] = useState(0)
  const [finalizeSelesai, setFinalizeSelesai] = useState(0)

  const { toast } = useToast()
  const { mutate } = useSWRConfig()

  const {
    currentPeriod,
    setCurrentPeriod,
    isFinalPeriod,
    finalizePeriod: finalizePeriodLocally,
  } = usePeriodStore()

  // ambil nama petugas dari localStorage (set waktu login)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tb_user")
      if (raw) {
        const u = JSON.parse(raw) as { name?: string }
        if (u?.name) setOfficerName(u.name)
      }
    } catch { }
  }, [])

  useEffect(() => {
    if (!selectedPeriod && currentPeriod) setSelectedPeriod(currentPeriod)
  }, [currentPeriod, selectedPeriod])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!selectedPeriod) return setServerLocked(false)
      setChecking(true)
      try {
        const res = await fetch(`/api/catat-meter?periode=${selectedPeriod}`, { cache: "no-store" })
        const data = await res.json()
        if (!cancelled && data?.ok) {
          const locked = !!data.locked
          setServerLocked(locked)
          if (locked) finalizePeriodLocally(selectedPeriod, "server")
          setCurrentPeriod(selectedPeriod)
        }
      } finally {
        if (!cancelled) setChecking(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [selectedPeriod, finalizePeriodLocally, setCurrentPeriod])

  // ====== PERIODE OPTIONS ======
  const generatePeriods = (): PeriodOpt[] => {
    const opts: PeriodOpt[] = []
    const now = new Date()
    const y = now.getFullYear()
    const startMonth = y === 2025 ? 6 : now.getMonth() // khusus 2025 mulai Juli (index 6)

    for (let i = 0; i < 6; i++) {
      const catat = new Date(y, startMonth + i, 1)
      const tagih = new Date(catat.getFullYear(), catat.getMonth() + 1, 1)
      const value = `${catat.getFullYear()}-${String(catat.getMonth() + 1).padStart(2, "0")}`
      const catatLabel = catat.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
      const tagihanLabel = tagih.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
      opts.push({ value, catatLabel, tagihanLabel })
    }
    return opts
  }

  // opsi disiapkan sekali
  const periodOptions = useMemo(generatePeriods, [])
  const selectedOption = useMemo(
    () => periodOptions.find((o) => o.value === selectedPeriod),
    [periodOptions, selectedPeriod],
  )

  // helper untuk label tagihan kalau user pilih periode
  const tagihanText = selectedOption ? `Untuk Penagihan ${selectedOption.tagihanLabel}` : ""

  const handleStartReading = async () => {
    if (!selectedPeriod) {
      toast({ title: "Periode belum dipilih", description: "Silakan pilih periode dulu", variant: "destructive" })
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch(`/api/catat-meter?periode=${selectedPeriod}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ officerName, readingDate }),
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.message || "Gagal memuat data")
      setCurrentPeriod(selectedPeriod)
      await mutate(`/api/catat-meter?periode=${selectedPeriod}`)
      toast({
        title: "Siap dicatat",
        description: `Periode ${selectedPeriod} berhasil dimuat • Petugas: ${officerName || "-"} • Tgl: ${readingDate}`,
      })
    } catch (e: any) {
      toast({ title: "Gagal memuat data", description: e.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const openFinalizeModal = async () => {
    if (!selectedPeriod) return
    try {
      const res = await fetch(`/api/catat-meter?periode=${selectedPeriod}`)
      const data = await res.json()
      if (res.ok && data?.ok) {
        setFinalizeTotal(data.progress?.total ?? 0)
        setFinalizeSelesai(data.progress?.selesai ?? 0)
      } else {
        setFinalizeTotal(0); setFinalizeSelesai(0)
      }
    } finally {
      setShowFinalizeModal(true)
    }
  }

  const handleFinalizePeriod = async () => {
    if (!selectedPeriod) return
    setIsFinalizingPeriod(true)
    try {
      const res = await fetch(`/api/catat-periode/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periode: selectedPeriod }),
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.message || "Gagal finalize")
      await mutate(`/api/catat-meter?periode=${selectedPeriod}`)
      finalizePeriodLocally(selectedPeriod, "system")
      setServerLocked(true)
      toast({ title: "Periode dikunci", description: `Periode ${selectedPeriod} tidak bisa diubah lagi` })
      setShowFinalizeModal(false)
    } catch (e: any) {
      toast({ title: "Gagal finalize", description: e.message, variant: "destructive" })
    } finally {
      setIsFinalizingPeriod(false)
    }
  }

  const isCurrentPeriodFinal = !!selectedPeriod && (isFinalPeriod(selectedPeriod) || serverLocked)

  return (
    <div className="space-y-4">
      {/* Status */}
      {selectedPeriod && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Status Periode:</span>
          <Badge
            variant={isCurrentPeriodFinal ? "default" : "secondary"}
            className={isCurrentPeriodFinal
              ? "bg-green-100 text-green-800 hover:bg-green-100"
              : "bg-gray-100 text-gray-800 hover:bg-gray-100"}
          >
            {isCurrentPeriodFinal ? (<><Lock className="w-3 h-3 mr-1" /> FINAL</>) : "DRAFT"}
          </Badge>
          {officerName && (
            <span className="inline-flex items-center text-sm text-muted-foreground ml-2">
              <User className="w-4 h-4 mr-1" /> Petugas: <span className="ml-1 font-medium text-foreground">{officerName}</span>
            </span>
          )}
        </div>
      )}

      {/* Form baris atas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
        {/* Periode */}
        <div className="space-y-2">
          <Label htmlFor="period" className="text-base font-medium">Periode Pencatatan</Label>
          <Select
            value={selectedPeriod}
            onValueChange={setSelectedPeriod}
            disabled={isFinalizingPeriod || isLoading}
          >
            <SelectTrigger className="h-12 bg-card/50">
              <SelectValue placeholder="Pilih periode..." />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.catatLabel} {/* ⬅️ hanya bulan catat */}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* ⬅️ teks bantu penagihan */}
          {selectedOption && (
            <p className="text-xs text-muted-foreground">{tagihanText}</p>
          )}
          {checking && <p className="text-xs text-muted-foreground">Mengecek status periode…</p>}
        </div>

        {/* Tanggal catat */}
        <div className="space-y-2">
          <Label htmlFor="readingDate" className="text-base font-medium">Tanggal Catat</Label>
          <Input
            id="readingDate"
            type="date"
            value={readingDate}
            onChange={(e) => setReadingDate(e.target.value)}
            className="h-12 bg-card/50"
            disabled={isFinalizingPeriod || isLoading}
          />
          <p className="text-xs text-muted-foreground">Tanggal rencana pencatatan bulan ini.</p>
        </div>

        {/* Petugas */}
        <div className="space-y-2">
          <Label className="text-base font-medium">Petugas</Label>
          <div className="h-12 px-3 rounded-md bg-muted/40 border flex items-center">
            <User className="w-4 h-4 mr-2 text-muted-foreground" />
            <span className="text-sm">{officerName || "-"}</span>
          </div>
          <p className="text-xs text-muted-foreground">Diambil otomatis dari akun yang login.</p>
        </div>
      </div>

      {/* Tombol */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={handleStartReading}
          className="h-12 w-full sm:flex-1"
          disabled={isLoading || isCurrentPeriodFinal || checking || !selectedPeriod}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Memuat...
            </div>
          ) : ("Mulai Pencatatan")}
        </Button>

        {selectedPeriod && !isCurrentPeriodFinal && (
          <Button
            onClick={openFinalizeModal}
            variant="outline"
            className="h-12 w-full sm:w-auto bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
            disabled={checking}
          >
            <Lock className="w-4 h-4 mr-2" /> Finalize & Kunci
          </Button>
        )}
      </div>

      {isCurrentPeriodFinal && (
        <div className="p-4 bg-green-50/50 border border-green-200/50 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-800">Periode telah dikunci</p>
            <p className="text-xs text-green-700">Input meter tidak dapat diubah. Data siap untuk laporan & audit.</p>
          </div>
        </div>
      )}

      <FinalizePeriodModal
        isOpen={showFinalizeModal}
        onClose={() => setShowFinalizeModal(false)}
        onConfirm={handleFinalizePeriod}
        period={selectedPeriod}
        isLoading={isFinalizingPeriod}
        total={finalizeTotal}
        selesai={finalizeSelesai}
      />
    </div>
  )
}
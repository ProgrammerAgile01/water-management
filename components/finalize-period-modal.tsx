"use client"

import { useMemo } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { GlassCard } from "./glass-card"
import { AlertTriangle, Lock } from "lucide-react"

interface FinalizePeriodModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  period: string
  isLoading?: boolean
  total?: number
  selesai?: number
}

export function FinalizePeriodModal({
  isOpen,
  onClose,
  onConfirm,
  period,
  isLoading,
  total = 0,
  selesai = 0,
}: FinalizePeriodModalProps) {
  // hook harus selalu dipanggil (jangan dibalik sama conditional)
  const progress = useMemo(() => {
    if (total > 0) return Math.round((selesai / total) * 100)
    return 0
  }, [total, selesai])

  if (!isOpen) return null

  const formatPeriod = (p: string) => {
    const [y, m] = p.split("-").map(Number)
    const d = new Date(y, (m ?? 1) - 1)
    return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <GlassCard className="w-full max-w-md p-6 space-y-6 pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Kunci Periode</h3>
              <p className="text-sm text-muted-foreground">Konfirmasi finalisasi periode</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-yellow-50/60 border border-yellow-200/60 rounded-lg">
              <p className="text-sm text-yellow-800 font-medium mb-2">
                Periode: {formatPeriod(period)}
              </p>
              <p className="text-sm text-yellow-700">
                Setelah dikunci, data pencatatan meter tidak dapat diubah lagi. Pastikan semua data sudah benar.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Progress: {progress}% selesai</p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Input meter akhir akan dikunci (read-only)</li>
                <li>• Tombol simpan disembunyikan</li>
                <li>• Status periode menjadi FINAL</li>
                <li>• Data siap untuk laporan & audit</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={isLoading} className="flex-1 bg-transparent">
              Batal
            </Button>
            <Button onClick={onConfirm} disabled={isLoading} className="flex-1 bg-yellow-600 hover:bg-yellow-700">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Memproses...
                </div>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Kunci Periode
                </>
              )}
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>,
    document.body
  )
}
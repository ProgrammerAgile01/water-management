"use client"

import { GlassCard } from "./glass-card"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface ConfirmDialogProps {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-teal-900/40 via-cyan-900/30 to-blue-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <GlassCard className="p-6 bg-gradient-to-br from-teal-50/90 via-cyan-50/80 to-blue-50/90 backdrop-blur-md border-2 border-teal-200/30 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center border border-red-200">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-teal-900">{title}</h3>
            </div>
          </div>

          <p className="text-teal-700 mb-6 leading-relaxed">{message}</p>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="border-teal-200 text-teal-700 hover:bg-teal-50 bg-transparent"
            >
              Batal
            </Button>
            <Button variant="destructive" onClick={onConfirm} className="bg-red-600 hover:bg-red-700">
              Hapus
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

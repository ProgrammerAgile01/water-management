// lib/period-store.ts
"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface PeriodStatus {
  period: string
  status: "draft" | "final"
  finalizedAt?: string
  finalizedBy?: string
}

interface PeriodStore {
  // periode aktif untuk Catat Meter
  currentPeriod: string | null
  setCurrentPeriod: (period: string | null) => void
  clearCurrentPeriod: () => void

  // status tiap-periode (persisted)
  periodStatuses: PeriodStatus[]

  // helpers status
  getPeriodStatus: (period: string) => "draft" | "final"
  isDraftPeriod: (period: string) => boolean
  isFinalPeriod: (period: string) => boolean

  // set ke FINAL (local persisted; backend tetap via API finalize)
  finalizePeriod: (period: string, finalizedBy: string) => void
}

export const usePeriodStore = create<PeriodStore>()(
  persist(
    (set, get) => ({
      currentPeriod: null,
      setCurrentPeriod: (period) => set({ currentPeriod: period }),
      clearCurrentPeriod: () => set({ currentPeriod: null }),

      periodStatuses: [],

      getPeriodStatus: (period: string) => {
        const s = get().periodStatuses.find((p) => p.period === period)
        return s?.status ?? "draft"
      },

      isDraftPeriod: (period: string) => get().getPeriodStatus(period) === "draft",
      isFinalPeriod: (period: string) => get().getPeriodStatus(period) === "final",

      finalizePeriod: (period: string, finalizedBy: string) => {
        set((state) => ({
          periodStatuses: [
            // buang entri lama utk periode tsb
            ...state.periodStatuses.filter((p) => p.period !== period),
            {
              period,
              status: "final",
              finalizedAt: new Date().toISOString(),
              finalizedBy,
            },
          ],
        }))
        // kalau period yang difinalkan adalah currentPeriod:
        // biarkan tetap (biar grid masih bisa dilihat), atau panggil clearCurrentPeriod()
        // dari komponen kalau mau menutup grid otomatis.
      },
    }),
    { name: "period-store" },
  ),
)
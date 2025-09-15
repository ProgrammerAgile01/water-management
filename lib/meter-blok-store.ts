// lib/meter-blok-store.ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PeriodBlokStatus {
  period: string; // "YYYY-MM"
  status: "draft" | "final";
  finalizedAt?: string;
  finalizedBy?: string;
}

interface MeterBlokStore {
  /** Periode aktif untuk halaman Catat Meter Blok */
  currentPeriodBlok: string | null;
  setCurrentPeriodBlok: (period: string | null) => void;
  clearCurrentPeriodBlok: () => void;

  /** Status tiap-periode (lokal, hanya untuk tampilan) */
  periodStatusesBlok: PeriodBlokStatus[];

  /** Helpers status */
  getPeriodStatusBlok: (period: string) => "draft" | "final";
  isDraftPeriodBlok: (period: string) => boolean;
  isFinalPeriodBlok: (period: string) => boolean;

  /** Set ke FINAL (lokal/persisted). Kunci sesungguhnya tetap di-backend. */
  finalizePeriodBlok: (period: string, finalizedBy: string) => void;
}

export const usePeriodBlokStore = create<MeterBlokStore>()(
  persist(
    (set, get) => ({
      currentPeriodBlok: null,
      setCurrentPeriodBlok: (period) => set({ currentPeriodBlok: period }),
      clearCurrentPeriodBlok: () => set({ currentPeriodBlok: null }),

      periodStatusesBlok: [],

      getPeriodStatusBlok: (period: string) => {
        const s = get().periodStatusesBlok.find((p) => p.period === period);
        return s?.status ?? "draft";
      },
      isDraftPeriodBlok: (period: string) =>
        get().getPeriodStatusBlok(period) === "draft",
      isFinalPeriodBlok: (period: string) =>
        get().getPeriodStatusBlok(period) === "final",

      finalizePeriodBlok: (period: string, finalizedBy: string) => {
        set((state) => ({
          periodStatusesBlok: [
            ...state.periodStatusesBlok.filter((p) => p.period !== period),
            {
              period,
              status: "final",
              finalizedAt: new Date().toISOString(),
              finalizedBy,
            },
          ],
        }));
      },
    }),
    { name: "meter-blok-store" }
  )
);

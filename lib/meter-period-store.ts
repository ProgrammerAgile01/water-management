"use client"
import { create } from "zustand"

type MeterPeriodState = {
  period: string | null
  setPeriod: (p: string) => void
}

export const useMeterPeriodStore = create<MeterPeriodState>((set) => ({
  period: null,
  setPeriod: (p) => set({ period: p }),
}))
// lib/schedule-settings-store.ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type Settings = {
  // dipakai UI form
  periode: string; // "YYYY-MM"
  tanggalCatatDefault: string; // "YYYY-MM-DD"
  // field lain dari Setting boleh ditambah jika perlu
};

interface ScheduleSettingsStore {
  settings: Settings;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
}

export const useScheduleSettingsStore = create<ScheduleSettingsStore>()(
  persist(
    (set, get) => ({
      settings: {
        // default UI jika belum ada di DB
        periode: new Date().toISOString().slice(0, 7),
        tanggalCatatDefault: new Date().toISOString().slice(0, 10),
      },
      isLoading: false,

      loadSettings: async () => {
        set({ isLoading: true });
        try {
          const r = await fetch("/api/setting", { cache: "no-store" });
          const j = await r.json();
          if (!r.ok) throw new Error(j?.message ?? "Gagal memuat setting");

          set({
            settings: {
              periode:
                j.periodeJadwalAktif ?? new Date().toISOString().slice(0, 7),
              tanggalCatatDefault:
                j.tanggalCatatDefault ?? new Date().toISOString().slice(0, 10),
            },
          });
        } finally {
          set({ isLoading: false });
        }
      },

      updateSettings: async (partial) => {
        // simpan ke DB (pakai field yang API butuhkan)
        const payload: any = {};
        if (partial.periode !== undefined)
          payload.periodeJadwalAktif = partial.periode;
        if (partial.tanggalCatatDefault !== undefined)
          payload.tanggalCatatDefault = partial.tanggalCatatDefault;

        const r = await fetch("/api/setting", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.message ?? "Gagal menyimpan setting");

        // update state lokal agar UI langsung sinkron
        set((state) => ({
          settings: {
            ...state.settings,
            ...(partial.periode !== undefined
              ? { periode: partial.periode }
              : {}),
            ...(partial.tanggalCatatDefault !== undefined
              ? { tanggalCatatDefault: partial.tanggalCatatDefault }
              : {}),
          },
        }));
      },
    }),
    { name: "schedule-settings" }
  )
);

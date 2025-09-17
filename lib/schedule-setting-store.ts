// lib/schedule-settings-store.ts
"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type Settings = {
  tanggalCatatDefault: number | null; // 1..31
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
        tanggalCatatDefault: new Date().getDate(), // default
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
              tanggalCatatDefault:
                typeof j.tanggalCatatDefault === "number"
                  ? j.tanggalCatatDefault
                  : new Date().getDate(),
            },
          });
        } finally {
          set({ isLoading: false });
        }
      },

      updateSettings: async (partial) => {
        const payload: any = {};
        if (partial.tanggalCatatDefault !== undefined)
          payload.tanggalCatatDefault = partial.tanggalCatatDefault;

        const r = await fetch("/api/setting", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.message ?? "Gagal menyimpan setting");

        set((state) => ({
          settings: {
            ...state.settings,
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

// lib/schedule-store.ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ScheduleItem {
  id: string;
  // zona bisa masih string di data lama, atau objek { id, nama } dari API baru
  zona: string | { id: string; nama: string };
  zonaId?: string; // relasi zona (dipakai filter)
  alamat: string;
  petugas: { id: string; nama: string; avatar?: string };
  target: number;
  progress: number;
  status: "waiting" | "in-progress" | "non-progress" | "finished" | "overdue";
  tanggalRencana: string; // "YYYY-MM-DD"
  bulan: string; // "YYYY-MM"
}

interface ScheduleStore {
  schedules: ScheduleItem[];
  isLoading: boolean;
  filters: {
    month: string; // "YYYY-MM"
    zonaId: string;
    petugasId: string;
    search: string;
    status: string; // "all" | "waiting" | ...
  };
  setSchedules: (schedules: ScheduleItem[]) => void;
  setLoading: (loading: boolean) => void;
  setFilters: (filters: Partial<ScheduleStore["filters"]>) => void;
  getFilteredSchedules: () => ScheduleItem[];
  refreshSchedules: () => Promise<void>;
  startRecording: (scheduleId: string) => Promise<void>;
  generateSchedules: (opts?: {
    bulan?: string;
    tanggalRencana?: string;
    zonaIds?: string[];
    petugasId?: string;
    overwrite?: boolean;
  }) => Promise<void>;
}

export const useScheduleStore = create<ScheduleStore>()(
  persist(
    (set, get) => ({
      schedules: [],
      isLoading: false,
      filters: {
        month: new Date().toISOString().slice(0, 7),
        zonaId: "",
        petugasId: "",
        search: "",
        status: "all",
      },

      setSchedules: (schedules) => set({ schedules }),
      setLoading: (isLoading) => set({ isLoading }),
      setFilters: (newFilters) =>
        set((state) => ({ filters: { ...state.filters, ...newFilters } })),

      getFilteredSchedules: () => {
        const { schedules, filters } = get();
        const q = filters.search.trim().toLowerCase();
        return schedules.filter((s) => {
          const matchMonth = !filters.month || s.bulan === filters.month;
          const matchZona = !filters.zonaId || s.zonaId === filters.zonaId;
          const matchPetugas =
            !filters.petugasId || s.petugas.id === filters.petugasId;
          const zonaNama =
            typeof s.zona === "string" ? s.zona : s.zona?.nama ?? "";
          const matchSearch =
            !q ||
            zonaNama.toLowerCase().includes(q) ||
            s.alamat.toLowerCase().includes(q) ||
            s.petugas.nama.toLowerCase().includes(q);
          const matchStatus =
            filters.status === "all" || s.status === filters.status;
          return (
            matchMonth &&
            matchZona &&
            matchPetugas &&
            matchSearch &&
            matchStatus
          );
        });
      },

      // ✅ Perbaikan utama ada di sini
      refreshSchedules: async () => {
        const { filters } = get();
        set({ isLoading: true });
        try {
          const params = new URLSearchParams();

          if (filters.month) {
            const [y, m] = filters.month.split("-");
            if (y) params.set("year", y);
            if (m) params.set("month", String(Number(m))); // kirim "9" untuk Sep
          }
          if (filters.zonaId) params.set("zonaId", filters.zonaId);
          if (filters.petugasId) params.set("petugasId", filters.petugasId);
          if (filters.search) params.set("q", filters.search);
          if (filters.status && filters.status !== "all")
            params.set("status", filters.status);

          const url = `/api/jadwal?${params.toString()}`; // ⬅️ pastikan path benar
          const res = await fetch(url, { cache: "no-store" });

          // Baca raw text supaya kalau bukan JSON kita tetap dapat pesan
          const text = await res.text();
          let j: any = {};
          try {
            j = JSON.parse(text);
          } catch {}

          if (!res.ok || !j?.ok) {
            throw new Error(
              j?.message ?? `HTTP ${res.status} ${res.statusText} - ${text}`
            );
          }

          set({ schedules: j.data ?? [] });
        } finally {
          set({ isLoading: false });
        }
      },

      startRecording: async (scheduleId: string) => {
        const res = await fetch(`/api/jadwal/${scheduleId}/start`, {
          method: "POST",
        });
        const text = await res.text();
        let j: any = {};
        try {
          j = JSON.parse(text);
        } catch {}
        if (!res.ok || !j?.ok)
          throw new Error(
            j?.message ?? `HTTP ${res.status} ${res.statusText} - ${text}`
          );

        // Optimistik: ubah status lokal lalu arahkan ke catat-meter
        // helper normalisasi
        function toPeriodYYYYMM(input: string | Date): string | null {
          const d = new Date(input);
          if (isNaN(d.getTime())) return null;
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          return `${y}-${m}`;
        }
        function toDateYYYYMMDD(input: string | Date): string | null {
          const d = new Date(input);
          if (isNaN(d.getTime())) return null;
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          return `${y}-${m}-${dd}`;
        }

        // update status jadwal di store
        set((state) => ({
          schedules: state.schedules.map((s) =>
            s.id === scheduleId ? { ...s, status: "in-progress" } : s
          ),
        }));

        // cari data jadwal sesuai id
        const sch = get().schedules.find((s) => s.id === scheduleId);
        if (!sch) {
          console.error("Schedule tidak ditemukan");
          return;
        }

        // derive periode & tanggal
        const periode = toPeriodYYYYMM(sch.tanggalRencana);
        const tanggal = toDateYYYYMMDD(sch.tanggalRencana);
        const petugas = sch.petugas?.nama ?? "";
        const zona = sch.zona ?? "";

        // redirect dengan query lengkap
        window.location.href =
          `/catat-meter?periode=${encodeURIComponent(periode ?? "")}` +
          `&tanggal=${encodeURIComponent(tanggal ?? "")}` +
          `&petugas=${encodeURIComponent(petugas)}` +
          `&zona=${encodeURIComponent(zona)}` +
          `&jadwalId=${encodeURIComponent(scheduleId)}`;
      },

      generateSchedules: async (opts) => {
        set({ isLoading: true });
        try {
          const res = await fetch(`/api/jadwal`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(opts ?? {}),
          });
          const text = await res.text();
          let j: any = {};
          try {
            j = JSON.parse(text);
          } catch {}
          if (!res.ok || !j?.ok)
            throw new Error(
              j?.message ?? `HTTP ${res.status} ${res.statusText} - ${text}`
            );

          // Ambil ulang data supaya tabel ter-update
          await get().refreshSchedules();
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    { name: "schedule-storage" }
  )
);

// lib/schedule-store.ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ScheduleItem {
  id: string;
  // zona bisa string (legacy) atau objek baru { id, nama }
  zona: string | { id: string; nama: string };
  zonaId?: string; // relasi zona (untuk filter & query)
  alamat: string;
  petugas: { id: string; nama: string; avatar?: string };
  target: number;
  progress: number;
  status: "waiting" | "in-progress" | "non-progress" | "finished" | "overdue";
  tanggalRencana: string; // "YYYY-MM-DD"
  bulan: string; // "YYYY-MM"
}

type GenerateOpts = {
  bulan?: string; // "YYYY-MM"
  tanggalRencana?: string; // "YYYY-MM-DD"
  zonaIds?: string[];
  petugasId?: string;
  overwrite?: boolean;
};

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
  generateSchedules: (opts?: GenerateOpts) => Promise<void>;
}

// ===== Helpers =====
const toYYYYMM = (x: string | Date): string | null => {
  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const toYYYYMMDD = (x: string | Date): string | null => {
  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
};
const zonaToName = (z: ScheduleItem["zona"]) =>
  typeof z === "string" ? z : z?.nama ?? "";
const safeJson = async (res: Response) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
};

// map enum API → status UI
function mapApiStatusToUi(
  s: string | null | undefined
): ScheduleItem["status"] {
  switch ((s ?? "").toUpperCase()) {
    case "WAITING":
      return "waiting";
    case "IN_PROGRESS":
    case "IN-PROGRESS":
      return "in-progress";
    case "NON_PROGRESS":
    case "NON-PROGRESS":
      return "non-progress";
    case "DONE":
    case "FINISHED":
      return "finished";
    case "OVERDUE":
      return "overdue";
    default:
      return "waiting";
  }
}

// normalisasi 1 row dari API -> ScheduleItem UI
function mapApiRow(row: any): ScheduleItem {
  return {
    id: row.id,
    zona:
      row.zona?.id && row.zona?.nama
        ? { id: row.zona.id, nama: row.zona.nama }
        : (row.zona?.nama as string) || (row.zonaNama as string) || "",
    zonaId: row.zona?.id ?? row.zonaId ?? undefined,
    alamat: row.alamat ?? "",
    petugas: {
      id: row.petugas?.id ?? row.petugasId ?? "",
      nama: row.petugas?.name ?? row.petugasNama ?? "Petugas",
    },
    target: Number(row.target ?? 0),
    progress: Number(row.progress ?? 0),
    status: mapApiStatusToUi(row.status),
    tanggalRencana: (row.tanggalRencana ?? "").toString().slice(0, 10),
    bulan: row.bulan ?? toYYYYMM(row.tanggalRencana) ?? "",
  };
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
          const zonaNama = zonaToName(s.zona);
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

      // Ambil jadwal sesuai filter (API minta month=YYYY-MM; keys: zona, petugas, status, q)
      refreshSchedules: async () => {
        const { filters } = get();
        set({ isLoading: true });
        try {
          const params = new URLSearchParams();
          if (filters.month) params.set("month", filters.month); // "YYYY-MM"
          if (filters.zonaId) params.set("zona", filters.zonaId);
          if (filters.petugasId) params.set("petugas", filters.petugasId);
          if (filters.search) params.set("q", filters.search);
          if (filters.status && filters.status !== "all")
            params.set("status", filters.status);

          const res = await fetch(`/api/jadwal?${params.toString()}`, {
            cache: "no-store",
          });
          const j = await safeJson(res);

          if (!res.ok || !j?.ok) {
            throw new Error(
              j?.message ?? `HTTP ${res.status} ${res.statusText}`
            );
          }

          const mapped: ScheduleItem[] = Array.isArray(j.data)
            ? j.data.map(mapApiRow)
            : [];
          set({ schedules: mapped });
        } finally {
          set({ isLoading: false });
        }
      },

      // Mulai pencatatan satu jadwal → redirect ke /catat-meter dengan query lengkap
      // ... (file Anda yang sekarang, ganti fungsi startRecording saja)

      startRecording: async (scheduleId: string) => {
        // cari schedule-nya
        const sch = get().schedules.find((s) => s.id === scheduleId);
        if (!sch) throw new Error("Jadwal tidak ditemukan");

        // 1) pastikan periode & entri catat-meter siap untuk zona ini
        const periode = sch.bulan; // "YYYY-MM"
        const tanggal = toYYYYMMDD(sch.tanggalRencana) ?? sch.tanggalRencana; // "YYYY-MM-DD"
        const officerName = sch.petugas?.nama ?? "";
        const zonaId =
          sch.zonaId ??
          (typeof sch.zona !== "string" ? sch.zona?.id : undefined);

        const initRes = await fetch(
          `/api/catat-meter?periode=${encodeURIComponent(periode)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              readingDate: tanggal,
              officerName,
              zonaId, // hanya generate untuk zona ini agar cepat
            }),
          }
        );
        const initJson = await safeJson(initRes);
        if (!initRes.ok || !initJson?.ok) {
          throw new Error(
            initJson?.message ?? `HTTP ${initRes.status} ${initRes.statusText}`
          );
        }

        // 2) Optimistic — tandai in-progress
        set((state) => ({
          schedules: state.schedules.map((s) =>
            s.id === scheduleId ? { ...s, status: "in-progress" } : s
          ),
        }));

        // 3) Redirect ke halaman pencatatan dgn query lengkap
        const tanggalQuery = toYYYYMMDD(sch.tanggalRencana) ?? "";
        const petugas = officerName;
        const zonaName = zonaToName(sch.zona);
        const url =
          `/catat-meter?periode=${encodeURIComponent(periode)}` +
          `&tanggal=${encodeURIComponent(tanggalQuery)}` +
          `&petugas=${encodeURIComponent(petugas)}` +
          (zonaName ? `&zona=${encodeURIComponent(zonaName)}` : "") +
          (zonaId ? `&zonaId=${encodeURIComponent(zonaId)}` : "") +
          `&jadwalId=${encodeURIComponent(scheduleId)}`;

        window.location.href = url;
      },

      // Generate jadwal: POST /api/jadwal?month=YYYY-MM → refresh tabel
      generateSchedules: async (opts) => {
        set({ isLoading: true });
        try {
          const monthFromFilter = get().filters?.month; // "YYYY-MM"
          const bulan =
            opts?.bulan ??
            monthFromFilter ??
            new Date().toISOString().slice(0, 7);

          // POST: kirim month lewat query (server akan ambil hari dari Setting & normalisasi)
          const res = await fetch(
            `/api/jadwal?month=${encodeURIComponent(bulan)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              // body opsional; kirimkan opsi jika memang dipakai server
              body: JSON.stringify({
                zonaIds: opts?.zonaIds,
                petugasId: opts?.petugasId,
                overwrite: opts?.overwrite ?? true,
              } as Partial<GenerateOpts>),
            }
          );

          const j = await safeJson(res);
          if (!res.ok || !j?.ok) {
            throw new Error(
              j?.message ?? `HTTP ${res.status} ${res.statusText}`
            );
          }

          await get().refreshSchedules();
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    { name: "schedule-storage" }
  )
);

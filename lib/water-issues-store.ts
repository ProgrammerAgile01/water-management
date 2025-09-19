import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WaterIssue {
  id: string;
  issue: string;
  description: string;
  status: "unresolved" | "solved";
  date: string; // YYYY-MM-DD
  reporter: string;
  phone: string;
  address: string;
  priority: "high" | "medium" | "low";
  solvedDate?: string | null;
  solution?: string | null;
  customerId?: string | null;
  // ⬇️ tambahkan blok agar kompatibel dengan data API
  source: "meter_reading" | "meter_reading_blok" | "manual_report";
}

interface WaterIssuesStore {
  issues: WaterIssue[];

  /** Replace/merge data dari API */
  setIssues: (items: WaterIssue[], keepManual?: boolean) => void;

  /** Tambah 1 issue (dipakai form manual); id & date auto jika tidak disediakan */
  addIssue: (
    issue: Omit<WaterIssue, "id" | "date"> &
      Partial<Pick<WaterIssue, "id" | "date">>
  ) => void;

  /** Upsert satu atau banyak issue (id sama → update, id baru → insert) */
  upsertIssue: (item: WaterIssue) => void;
  upsertMany: (items: WaterIssue[]) => void;

  updateIssue: (id: string, updates: Partial<WaterIssue>) => void;
  solveIssue: (id: string, solution: string) => void;
  deleteIssue: (id: string) => void;

  getIssuesByStatus: (status: "unresolved" | "solved") => WaterIssue[];
  getIssuesByCustomer: (customerId: string) => WaterIssue[];
  clear: () => void;
}

export const useWaterIssuesStore = create<WaterIssuesStore>()(
  persist(
    (set, get) => ({
      // ⛔️ mulai TANPA mock
      issues: [],

      setIssues: (items, keepManual = true) =>
        set((state) => {
          if (!keepManual) return { issues: items };
          const manual = state.issues.filter(
            (i) => i.source === "manual_report"
          );
          const map = new Map<string, WaterIssue>();
          for (const it of items) map.set(it.id, it);
          for (const m of manual) map.set(m.id, m);
          return { issues: Array.from(map.values()) };
        }),

      addIssue: (issueData) =>
        set((state) => {
          const id = issueData.id ?? `manual-${Date.now()}`;
          const date = issueData.date ?? new Date().toISOString().slice(0, 10);
          const item: WaterIssue = {
            id,
            date,
            issue: issueData.issue,
            description: issueData.description ?? "",
            status: "unresolved",
            reporter: issueData.reporter,
            phone: issueData.phone,
            address: issueData.address,
            priority: issueData.priority,
            customerId: issueData.customerId ?? null,
            source: issueData.source ?? "manual_report",
            solution: null,
            solvedDate: null,
          };
          // jika sudah ada id yg sama → replace
          const others = state.issues.filter((i) => i.id !== id);
          return { issues: [item, ...others] };
        }),

      upsertIssue: (item) =>
        set((state) => {
          const idx = state.issues.findIndex((i) => i.id === item.id);
          if (idx === -1) return { issues: [item, ...state.issues] };
          const next = state.issues.slice();
          next[idx] = { ...next[idx], ...item };
          return { issues: next };
        }),

      upsertMany: (items) =>
        set((state) => {
          const map = new Map<string, WaterIssue>();
          // seed dengan existing
          for (const i of state.issues) map.set(i.id, i);
          // overwrite/insert dari batch
          for (const it of items)
            map.set(it.id, { ...(map.get(it.id) ?? ({} as any)), ...it });
          return { issues: Array.from(map.values()) };
        }),

      updateIssue: (id, updates) =>
        set((state) => ({
          issues: state.issues.map((issue) =>
            issue.id === id ? { ...issue, ...updates } : issue
          ),
        })),

      solveIssue: (id, solution) =>
        set((state) => ({
          issues: state.issues.map((issue) =>
            issue.id === id
              ? {
                  ...issue,
                  status: "solved",
                  solution,
                  solvedDate: new Date().toISOString().slice(0, 10),
                }
              : issue
          ),
        })),

      deleteIssue: (id) =>
        set((state) => ({
          issues: state.issues.filter((issue) => issue.id !== id),
        })),

      getIssuesByStatus: (status) =>
        get().issues.filter((issue) => issue.status === status),

      getIssuesByCustomer: (customerId) =>
        get().issues.filter((issue) => issue.customerId === customerId),

      clear: () => set({ issues: [] }),
    }),
    {
      name: "tirta-bening-water-issues",
      // Bump versi supaya data mock lama (jika ada) dibersihkan saat upgrade
      version: 2,
      migrate: (persisted: any, fromVersion) => {
        if (!persisted) return { issues: [] };
        if (fromVersion < 2) {
          // reset penuh dari versi lama (yang seeded mock)
          return { issues: [] };
        }
        return persisted;
      },
    }
  )
);

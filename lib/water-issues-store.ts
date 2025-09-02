import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface WaterIssue {
  id: string
  issue: string
  description: string
  status: "unresolved" | "solved"
  date: string
  reporter: string
  phone: string
  address: string
  priority: "high" | "medium" | "low"
  solvedDate?: string
  solution?: string
  customerId?: string
  source: "meter_reading" | "manual_report"
}

interface WaterIssuesStore {
  issues: WaterIssue[]

  // Actions
  addIssue: (issue: Omit<WaterIssue, "id" | "date">) => void
  updateIssue: (id: string, updates: Partial<WaterIssue>) => void
  solveIssue: (id: string, solution: string) => void
  deleteIssue: (id: string) => void
  getIssuesByStatus: (status: "unresolved" | "solved") => WaterIssue[]
  getIssuesByCustomer: (customerId: string) => WaterIssue[]
}

export const useWaterIssuesStore = create<WaterIssuesStore>()(
  persist(
    (set, get) => ({
      issues: [
        {
          id: "1",
          issue: "Pipa bocor di Jl. Merdeka",
          description: "Pipa utama bocor di depan rumah, air menggenang di jalan",
          status: "unresolved",
          date: "2024-01-15",
          reporter: "Budi Santoso",
          phone: "081234567890",
          address: "Jl. Merdeka No. 12",
          priority: "high",
          customerId: "TB240001",
          source: "meter_reading",
        },
        {
          id: "2",
          issue: "Tekanan air rendah di RT 05",
          description: "Tekanan air sangat rendah sejak 3 hari yang lalu, mempengaruhi 15 rumah",
          status: "unresolved",
          date: "2024-01-18",
          reporter: "Ketua RT 05",
          phone: "081234567891",
          address: "RT 05 RW 02",
          priority: "medium",
          source: "manual_report",
        },
        {
          id: "3",
          issue: "Meter rusak - Budi Santoso",
          description: "Meter air tidak berputar, kemungkinan rusak atau tersumbat",
          status: "unresolved",
          date: "2024-01-20",
          reporter: "Budi Santoso",
          phone: "081234567890",
          address: "Jl. Merdeka No. 12",
          priority: "low",
          customerId: "TB240001",
          source: "meter_reading",
        },
        {
          id: "4",
          issue: "Air keruh di Jl. Sudirman",
          description: "Air yang keluar keruh dan berbau, sudah 2 hari",
          status: "solved",
          date: "2024-01-10",
          reporter: "Siti Aminah",
          phone: "081234567892",
          address: "Jl. Sudirman No. 8",
          priority: "high",
          customerId: "TB240002",
          source: "manual_report",
          solvedDate: "2024-01-12",
          solution: "Dilakukan pembersihan pipa distribusi dan penggantian filter",
        },
      ],

      addIssue: (issueData) =>
        set((state) => ({
          issues: [
            ...state.issues,
            {
              ...issueData,
              id: Date.now().toString(),
              date: new Date().toISOString().split("T")[0],
            },
          ],
        })),

      updateIssue: (id, updates) =>
        set((state) => ({
          issues: state.issues.map((issue) => (issue.id === id ? { ...issue, ...updates } : issue)),
        })),

      solveIssue: (id, solution) =>
        set((state) => ({
          issues: state.issues.map((issue) =>
            issue.id === id
              ? {
                  ...issue,
                  status: "solved" as const,
                  solution,
                  solvedDate: new Date().toISOString().split("T")[0],
                }
              : issue,
          ),
        })),

      deleteIssue: (id) =>
        set((state) => ({
          issues: state.issues.filter((issue) => issue.id !== id),
        })),

      getIssuesByStatus: (status) => {
        return get().issues.filter((issue) => issue.status === status)
      },

      getIssuesByCustomer: (customerId) => {
        return get().issues.filter((issue) => issue.customerId === customerId)
      },
    }),
    {
      name: "tirta-bening-water-issues",
    },
  ),
)

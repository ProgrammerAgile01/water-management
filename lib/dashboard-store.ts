// lib/dashboard-store.ts
import { create } from "zustand";

export interface WaterUsageData {
  month: string;
  total: number;
  blokA: number;
  blokB: number;
  blokC: number;
  blokD: number;
  blokE: number;
  blokF: number;
}
export interface RevenueData {
  month: string;
  amount: number;
}
export interface ExpenseData {
  month: string;
  operasional: number;
  lainnya: number;
}
export interface ProfitLossData {
  month: string;
  profit: number;
}

export interface UnpaidBill {
  id: string;
  nama: string;
  blok: string;
  periode: string;
  nominal: number;
  sisaKurang: number;
  status: "BELUM_LUNAS" | "BELUM_BAYAR"; // ← diperbarui
}
export interface OutstandingPoint {
  month: string;
  amount: number;
}

interface DashboardStore {
  selectedYear: number;
  zoneNames: string[];
  waterUsageData: WaterUsageData[];
  revenueData: RevenueData[];
  expenseData: ExpenseData[];
  profitLossData: ProfitLossData[];
  unpaidBills: UnpaidBill[];
  outstandingData: OutstandingPoint[];
  outstandingTotal: number;
  setSelectedYear: (y: number) => void;
  getDataByYear: (y?: number) => Promise<void>;
  _loading?: boolean;
  _error?: string | null;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const emptyWater = (): WaterUsageData[] =>
  MONTHS.map((m) => ({
    month: m,
    total: 0,
    blokA: 0,
    blokB: 0,
    blokC: 0,
    blokD: 0,
    blokE: 0,
    blokF: 0,
  }));
const emptyRevenue = (): RevenueData[] =>
  MONTHS.map((m) => ({ month: m, amount: 0 }));
const emptyExpenses = (): ExpenseData[] =>
  MONTHS.map((m) => ({ month: m, operasional: 0, lainnya: 0 }));
const defaultZoneNames = [
  "Blok A",
  "Blok B",
  "Blok C",
  "Blok D",
  "Blok E",
  "Blok F",
];

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  selectedYear: new Date().getFullYear(),
  zoneNames: defaultZoneNames,
  waterUsageData: emptyWater(),
  revenueData: emptyRevenue(),
  expenseData: emptyExpenses(),
  profitLossData: MONTHS.map((m) => ({ month: m, profit: 0 })),
  unpaidBills: [],
  outstandingData: MONTHS.map((m) => ({ month: m, amount: 0 })),
  outstandingTotal: 0,
  _loading: false,
  _error: null,

  setSelectedYear: (year) => {
    set({ selectedYear: year });
    void get().getDataByYear(year);
  },

  getDataByYear: async (yearParam) => {
    const year = yearParam ?? get().selectedYear;
    try {
      set({ _loading: true, _error: null });
      const res = await fetch(`/api/laporan-summary?year=${year}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      set({
        zoneNames:
          Array.isArray(data.zoneNames) && data.zoneNames.length
            ? data.zoneNames.slice(0, 6)
            : defaultZoneNames,
        waterUsageData: data.waterUsageData ?? emptyWater(),
        revenueData: data.revenueData ?? emptyRevenue(),
        expenseData: data.expenseData ?? emptyExpenses(),
        profitLossData:
          data.profitLossData ??
          MONTHS.map((m: string, i: number) => ({
            month: m,
            profit:
              (data.revenueData?.[i]?.amount ?? 0) -
              ((data.expenseData?.[i]?.operasional ?? 0) +
                (data.expenseData?.[i]?.lainnya ?? 0)),
          })),
        unpaidBills: data.unpaidBills ?? [],
        outstandingData:
          data.outstandingData ??
          MONTHS.map((m: string) => ({ month: m, amount: 0 })),
        outstandingTotal: data.outstandingTotal ?? 0,
        _loading: false,
      });
    } catch (err: any) {
      console.error(err);
      set({
        _loading: false,
        _error:
          typeof err?.message === "string" ? err.message : "Gagal memuat data",
        zoneNames: defaultZoneNames,
        waterUsageData: emptyWater(),
        revenueData: emptyRevenue(),
        expenseData: emptyExpenses(),
        profitLossData: MONTHS.map((m) => ({ month: m, profit: 0 })),
        unpaidBills: [],
        outstandingData: MONTHS.map((m) => ({ month: m, amount: 0 })),
        outstandingTotal: 0,
      });
    }
  },
}));

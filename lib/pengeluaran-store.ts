import { create } from "zustand";

export interface ExpenseDetail {
  id: string;
  keterangan: string;
  biaya: string;
  nominal: number;
}

export interface Expense {
  id: string;
  noBulan: string;
  tanggalInput: string; // "YYYY-MM-DD"
  tanggalPengeluaran: string; // "YYYY-MM-DD"
  details: ExpenseDetail[];
  total: number;
  status: "Draft" | "Close";
}

interface ExpenseStore {
  expenses: Expense[];
  selectedMonth: string;
  isLoading: boolean;

  init: () => Promise<void>;
  reload: () => Promise<void>;

  setSelectedMonth: (month: string) => void;
  addExpense: (expense: Omit<Expense, "id">) => Promise<Expense>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  addExpenseDetail: (
    expenseId: string,
    detail: Omit<ExpenseDetail, "id">
  ) => Promise<void>;
  updateExpenseDetail: (
    expenseId: string,
    detailId: string,
    detail: Partial<ExpenseDetail>
  ) => Promise<void>;
  deleteExpenseDetail: (expenseId: string, detailId: string) => Promise<void>;

  postExpense: (id: string) => Promise<void>;
}

// dropdown Biaya – akan diisi dari API saat init(), tapi diberi fallback
export let biayaOptions: string[] = [
  "Material",
  "Operasional",
  "Maintenance",
  "Gaji",
  "Utilitas",
  "Transport",
  "Administrasi",
  "Lainnya",
];

async function fetchJSON<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const usePengeluaranStore = create<ExpenseStore>((set, get) => ({
  expenses: [],
  selectedMonth: new Date().toISOString().slice(0, 7),
  isLoading: false,

  init: async () => {
    try {
      const opt = await fetchJSON<{
        items: { id: string; nama: string; kode?: string }[];
      }>("/api/biaya/options");
      if (Array.isArray(opt?.items)) {
        biayaOptions.length = 0;
        for (const it of opt.items) biayaOptions.push(it.nama);
      }
    } catch (e) {
      console.warn("Gagal load biaya options:", e);
    }
    await get().reload();
  },

  reload: async () => {
    set({ isLoading: true });
    try {
      const { selectedMonth } = get();
      const data = await fetchJSON<{ items: Expense[] }>(
        `/api/pengeluaran?month=${encodeURIComponent(selectedMonth)}`,
        { cache: "no-store" }
      );
      set({ expenses: Array.isArray(data?.items) ? data.items : [] });
    } catch (e) {
      console.error(e);
      set({ expenses: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  setSelectedMonth: (month) => set({ selectedMonth: month }),

  // ⬇️ sekarang mengembalikan expense yang dibuat (untuk redirect dan tambah detail)
  addExpense: async (expense) => {
    const body: any = {
      tanggalPengeluaran: expense.tanggalPengeluaran,
      noBulan: expense.noBulan,
    };
    const created = await fetchJSON<Expense>(`/api/pengeluaran`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    set((state) => ({ expenses: [...state.expenses, created] }));
    return created;
  },

  updateExpense: async (id, expense) => {
    const body: any = {};
    if (typeof expense.noBulan === "string") body.noBulan = expense.noBulan;
    if (typeof expense.tanggalPengeluaran === "string")
      body.tanggalPengeluaran = expense.tanggalPengeluaran;
    const updated = await fetchJSON<Expense>(`/api/pengeluaran/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    set((state) => ({
      expenses: state.expenses.map((e) => (e.id === id ? updated : e)),
    }));
  },

  deleteExpense: async (id) => {
    await fetchJSON(`/api/pengeluaran/${id}`, { method: "DELETE" });
    set((state) => ({
      expenses: state.expenses.filter((e) => e.id !== id),
    }));
  },

  addExpenseDetail: async (expenseId, detail) => {
    // map nama biaya -> masterBiayaId via API options
    let mbId: string | undefined;
    try {
      const opt = await fetchJSON<{ items: { id: string; nama: string }[] }>(
        `/api/biaya/options`
      );
      mbId = opt.items.find((x) => x.nama === detail.biaya)?.id;
    } catch {}
    if (!mbId) throw new Error("Jenis biaya tidak ditemukan di Master Biaya");

    const updated = await fetchJSON<Expense>(
      `/api/pengeluaran/${expenseId}/detail`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterBiayaId: mbId,
          keterangan: detail.keterangan,
          nominal: detail.nominal,
        }),
      }
    );
    set((state) => ({
      expenses: state.expenses.map((e) => (e.id === expenseId ? updated : e)),
    }));
  },

  updateExpenseDetail: async (expenseId, detailId, detail) => {
    const body: any = {};
    if (typeof detail.keterangan === "string")
      body.keterangan = detail.keterangan;
    if (typeof detail.nominal === "number") body.nominal = detail.nominal;

    if (typeof detail.biaya === "string" && detail.biaya) {
      const opt = await fetchJSON<{ items: { id: string; nama: string }[] }>(
        `/api/biaya/options`
      );
      const found = opt.items.find((x) => x.nama === detail.biaya);
      if (!found) throw new Error("Jenis biaya tidak ditemukan");
      body.masterBiayaId = found.id;
    }

    const updated = await fetchJSON<Expense>(
      `/api/pengeluaran/${expenseId}/detail/${detailId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    set((state) => ({
      expenses: state.expenses.map((e) => (e.id === expenseId ? updated : e)),
    }));
  },

  deleteExpenseDetail: async (expenseId, detailId) => {
    await fetchJSON(`/api/pengeluaran/${expenseId}/detail/${detailId}`, {
      method: "DELETE",
    });
    const updated = await fetchJSON<Expense>(`/api/pengeluaran/${expenseId}`);
    set((state) => ({
      expenses: state.expenses.map((e) => (e.id === expenseId ? updated : e)),
    }));
  },

  postExpense: async (id) => {
    const updated = await fetchJSON<Expense>(`/api/pengeluaran/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "post" }),
    });
    set((state) => ({
      expenses: state.expenses.map((e) => (e.id === id ? updated : e)),
    }));
  },
}));

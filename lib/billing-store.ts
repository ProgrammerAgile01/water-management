// lib/billing-store.ts
import { create } from "zustand";

export interface BillingItem {
  id: string;
  periode: string; // "YYYY-MM"
  namaWarga: string;
  zona: string;
  meterAwal: number;
  meterAkhir: number;
  pemakaian: number;
  tarifPerM3: number;
  totalPemakaian: number;
  abonemen: number;
  totalTagihan: number;
  status: "belum-lunas" | "lunas";
  buktiPembayaran?: string;
  tanggalBayar?: string;
  verifiedBy?: string;
  statusVerif?: "UNVERIFIED" | "VERIFIED";
  canApprove?: boolean;
}

interface BillingStore {
  billings: BillingItem[];
  filteredBillings: BillingItem[];
  selectedPeriode: string; // "semua" | "YYYY-MM"
  selectedStatus: string; // "semua" | "belum-lunas" | "lunas"
  searchQuery: string;
  isLoading: boolean;

  setBillings: (billings: BillingItem[]) => void;
  setSelectedPeriode: (periode: string) => void;
  setSelectedStatus: (status: string) => void;
  setSearchQuery: (query: string) => void;
  setIsLoading: (loading: boolean) => void;
  filterBillings: () => void;

  // API actions
  refreshData: () => Promise<void>;
  approveBilling: (id: string) => Promise<void>;
}

export const useBillingStore = create<BillingStore>((set, get) => ({
  billings: [],
  filteredBillings: [],
  selectedPeriode: "semua",
  selectedStatus: "semua",
  searchQuery: "",
  isLoading: false,

  setBillings: (billings) => {
    set({ billings, filteredBillings: billings });
    get().filterBillings();
  },

  setSelectedPeriode: (periode) => {
    set({ selectedPeriode: periode });
    get().filterBillings();
  },

  setSelectedStatus: (status) => {
    set({ selectedStatus: status });
    get().filterBillings();
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().filterBillings();
  },

  setIsLoading: (loading) => set({ isLoading: loading }),

  filterBillings: () => {
    const { billings, selectedPeriode, selectedStatus, searchQuery } = get();
    let out = billings;

    if (selectedPeriode !== "semua" && selectedPeriode) {
      out = out.filter((b) => b.periode === selectedPeriode);
    }
    if (selectedStatus !== "semua" && selectedStatus) {
      out = out.filter((b) => b.status === selectedStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      out = out.filter(
        (b) =>
          b.namaWarga.toLowerCase().includes(q) ||
          b.zona.toLowerCase().includes(q)
      );
    }

    set({ filteredBillings: out });
  },

  refreshData: async () => {
    const { selectedPeriode, selectedStatus, searchQuery } = get();
    set({ isLoading: true });

    try {
      const params = new URLSearchParams();
      if (selectedPeriode && selectedPeriode !== "semua") {
        params.set("periode", selectedPeriode); // "YYYY-MM"
      }
      if (selectedStatus && selectedStatus !== "semua") {
        params.set("status", selectedStatus); // "lunas" | "belum-lunas"
      }
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }

      const url = `/api/billing${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      const res = await fetch(url, { cache: "no-store" });
      const text = await res.text();

      let json: any = {};
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(text || "Invalid JSON");
      }

      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || `HTTP ${res.status}`);
      }

      const data: BillingItem[] = json.data ?? [];
      set({ billings: data, filteredBillings: data });
      get().filterBillings();
    } finally {
      set({ isLoading: false });
    }
  },

  approveBilling: async (id: string) => {
    // panggil endpoint approve; update store berdasar respons
    const res = await fetch(`/api/billing/${encodeURIComponent(id)}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });

    const text = await res.text();
    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(text || "Invalid JSON");
    }

    if (!res.ok || !json?.ok) {
      throw new Error(json?.message || `HTTP ${res.status}`);
    }

    const updated: BillingItem | undefined = json.data;
    if (updated?.id) {
      set((state) => ({
        billings: state.billings.map((b) =>
          b.id === updated.id ? { ...b, ...updated } : b
        ),
      }));
      get().filterBillings();
    } else {
      // fallback: minimal tandai lunas lokal
      set((state) => ({
        billings: state.billings.map((b) =>
          b.id === id
            ? {
                ...b,
                status: "lunas",
                statusVerif: "VERIFIED",
                canApprove: false,
                tanggalBayar: new Date().toISOString().slice(0, 10),
                verifiedBy: "Admin Keuangan",
              }
            : b
        ),
      }));
      get().filterBillings();
    }
  },
}));

import { create } from "zustand";

export type ResetStatusUI = "Draft" | "Selesai";
export type ResetStatusAPI = "DRAFT" | "SELESAI";

export interface ResetMeterUI {
  id: string;
  pelanggan: {
    nama: string;
    alamat: string;
    blok: string;
  };
  alasan: string;
  tanggalReset: string; // "YYYY-MM-DD"
  meterAwalBaru: number;
  status: ResetStatusUI;
}

export interface Customer {
  id: string | number;
  nama: string;
  alamat: string;
  blok?: string;
  zona?: { id?: string; kode?: string; nama?: string };
  zonaId?: string; // untuk auto-select dropdown zona
}

function toUIStatus(
  s: ResetStatusAPI | string | null | undefined
): ResetStatusUI {
  return s === "SELESAI" ? "Selesai" : "Draft";
}

const fallbackCustomers: Customer[] = [
  {
    id: 1,
    nama: "Anton Suwandi",
    alamat: "Jl. Merdeka No.123 Yogyakarta",
    blok: "A01",
  },
  { id: 2, nama: "Dewi Putri", alamat: "Jl. Kenanga 7", blok: "A010" },
  { id: 3, nama: "Budi Santoso", alamat: "Jl. Mawar 15 RT 02/03", blok: "B05" },
  { id: 4, nama: "Siti Nurhaliza", alamat: "Jl. Melati 8A", blok: "C12" },
];

interface Filters {
  periode: string; // "YYYY-MM"
  zona: string;
  search: string;
}

interface ResetMeterStore {
  resets: ResetMeterUI[];
  filteredResets: ResetMeterUI[];
  customers: Customer[];
  filters: Filters;
  loading: boolean;

  loadInitial: () => Promise<void>;
  setFilters: (filters: Partial<Filters>) => void;
  fetchList: () => Promise<void>;
  addReset: (payload: {
    pelangganId: string | number;
    tanggalReset: string;
    alasan?: string | null;
    meterAwalBaru: number;
    status?: ResetStatusAPI | "DRAFT" | "SELESAI";
  }) => Promise<void>;
  updateReset: (
    id: string,
    payload: Partial<{
      tanggalReset: string;
      alasan: string | null;
      meterAwalBaru: number;
      status: ResetStatusAPI | "DRAFT" | "SELESAI";
    }>
  ) => Promise<void>;
  deleteReset: (id: string) => Promise<void>;
}

export const useResetMeterStore = create<ResetMeterStore>((set, get) => ({
  resets: [],
  filteredResets: [],
  customers: [],
  filters: {
    periode: "",
    zona: "",
    search: "",
  },
  loading: false,

  // === LOAD INITIAL (customers + list reset) ===
  loadInitial: async () => {
    // --- ambil semua pelanggan (paginate page/pageSize) ---
    async function fetchAllCustomers(): Promise<Customer[]> {
      const pageSize = 200; // gedein biar cepat; sesuaikan jika perlu
      let page = 1;
      let all: Customer[] = [];

      while (true) {
        const res = await fetch(
          `/api/pelanggan?page=${page}&pageSize=${pageSize}`,
          {
            cache: "no-store",
          }
        );
        if (!res.ok) break;

        const data = await res.json();

        // dukung 2 bentuk response: {items, pagination} ATAU array langsung
        const items = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : [];
        const batch: Customer[] = items.map((p: any) => ({
          id: p.id,
          nama: p.nama,
          alamat: p.alamat,
          blok: p.blok ?? p.zona?.kode,
          zona: p.zona,
          zonaId: p.zonaId ?? p.zona?.id ?? undefined,
        }));
        all = all.concat(batch);

        const totalPages = data?.pagination?.totalPages ?? 1;
        if (page >= totalPages) break;
        page += 1;
      }
      return all;
    }

    // try fetch; fallback dummy kalau error
    try {
      const customers = await fetchAllCustomers();
      set({ customers: customers.length ? customers : fallbackCustomers });
    } catch {
      set({ customers: fallbackCustomers });
    }

    // Ambil list reset-meters
    await get().fetchList();
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    get().fetchList();
  },

  fetchList: async () => {
    const { filters } = get();
    const sp = new URLSearchParams();
    if (filters.periode) sp.set("periode", filters.periode);
    if (filters.zona) sp.set("zona", filters.zona);
    if (filters.search) sp.set("search", filters.search);
    sp.set("page", "1");
    sp.set("pageSize", "100");

    set({ loading: true });
    try {
      const res = await fetch(`/api/reset-meter?${sp.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      const items: ResetMeterUI[] = (data?.items ?? []).map((it: any) => ({
        id: String(it.id),
        pelanggan: {
          nama: it.pelanggan?.nama ?? "",
          alamat: it.pelanggan?.alamat ?? "",
          blok: it.pelanggan?.blok ?? "-",
        },
        alasan: it.alasan ?? "",
        tanggalReset: it.tanggalReset,
        meterAwalBaru: Number(it.meterAwalBaru) || 0,
        status: toUIStatus(it.status),
      }));

      set({ resets: items, filteredResets: items });
    } catch {
      set({ resets: [], filteredResets: [] });
    } finally {
      set({ loading: false });
    }
  },

  addReset: async (payload) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/reset-meter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pelangganId: payload.pelangganId,
          tanggalReset: payload.tanggalReset,
          alasan: payload.alasan ?? null,
          meterAwalBaru: Number(payload.meterAwalBaru),
          status: (payload.status ?? "DRAFT") as ResetStatusAPI,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await get().fetchList();
    } finally {
      set({ loading: false });
    }
  },

  updateReset: async (id, payload) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/reset-meter/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(payload.tanggalReset
            ? { tanggalReset: payload.tanggalReset }
            : {}),
          ...(typeof payload.alasan !== "undefined"
            ? { alasan: payload.alasan }
            : {}),
          ...(typeof payload.meterAwalBaru !== "undefined"
            ? { meterAwalBaru: Number(payload.meterAwalBaru) }
            : {}),
          ...(payload.status
            ? { status: payload.status as ResetStatusAPI }
            : {}),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await get().fetchList();
    } finally {
      set({ loading: false });
    }
  },

  deleteReset: async (id) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/reset-meter/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      await get().fetchList();
    } finally {
      set({ loading: false });
    }
  },
}));

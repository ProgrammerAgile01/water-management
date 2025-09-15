// lib/master-biaya-store.ts
import { create } from "zustand";

export interface MasterBiaya {
  id: string;
  nama: string;
  kode?: string;
  deskripsi?: string;
  status: "Aktif" | "Nonaktif";
  createdAt: Date;
  updatedAt: Date;
}

interface MasterBiayaStore {
  biayaList: MasterBiaya[];
  searchTerm: string;
  selectedYear: string;
  isLoading: boolean;

  // Actions
  init: () => Promise<void>;
  reload: () => Promise<void>;
  setBiayaList: (list: MasterBiaya[]) => void;
  addBiaya: (
    biaya: Omit<MasterBiaya, "id" | "createdAt" | "updatedAt">
  ) => Promise<void>;
  updateBiaya: (id: string, biaya: Partial<MasterBiaya>) => Promise<void>;
  deleteBiaya: (id: string) => Promise<void>;
  toggleStatus: (id: string) => Promise<void>;
  setSearchTerm: (term: string) => void;
  setSelectedYear: (year: string) => void;
  setIsLoading: (loading: boolean) => void;

  // Computed
  getFilteredBiaya: () => MasterBiaya[];
  getBiayaByCode: (kode: string) => MasterBiaya | undefined;
}

function toBiaya(obj: any): MasterBiaya {
  return {
    id: obj.id,
    nama: obj.nama,
    kode: obj.kode ?? undefined,
    deskripsi: obj.deskripsi ?? undefined,
    status: obj.status === "Nonaktif" ? "Nonaktif" : "Aktif",
    createdAt: new Date(obj.createdAt),
    updatedAt: new Date(obj.updatedAt),
  };
}

export const useMasterBiayaStore = create<MasterBiayaStore>((set, get) => ({
  biayaList: [],
  searchTerm: "",
  selectedYear: new Date().getFullYear().toString(),
  isLoading: false,

  init: async () => {
    await get().reload();
  },

  reload: async () => {
    const { searchTerm, selectedYear } = get();
    set({ isLoading: true });
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set("q", searchTerm);
      if (selectedYear) params.set("year", selectedYear);

      const res = await fetch(`/api/biaya?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const items = Array.isArray(json?.items) ? json.items.map(toBiaya) : [];
      set({ biayaList: items });
    } catch (e) {
      console.error(e);
      // optional: biarkan kosong saat error
      set({ biayaList: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  setBiayaList: (list) => set({ biayaList: list }),

  addBiaya: async (biayaData) => {
    set({ isLoading: true });
    try {
      const res = await fetch("/api/biaya", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: biayaData.nama,
          kode: biayaData.kode,
          deskripsi: biayaData.deskripsi,
          status: biayaData.status,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = toBiaya(await res.json());
      set((state) => ({ biayaList: [created, ...state.biayaList] }));
    } finally {
      set({ isLoading: false });
    }
  },

  updateBiaya: async (id, updates) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`/api/biaya/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: updates.nama,
          deskripsi: updates.deskripsi,
          status: updates.status,
          // kode: updates.kode, // default dikunci; buka jika suatu saat perlu
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = toBiaya(await res.json());
      set((state) => ({
        biayaList: state.biayaList.map((x) => (x.id === id ? updated : x)),
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  deleteBiaya: async (id) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`/api/biaya/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      set((state) => ({
        biayaList: state.biayaList.filter((x) => x.id !== id),
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  toggleStatus: async (id) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`/api/biaya/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = toBiaya(await res.json());
      set((state) => ({
        biayaList: state.biayaList.map((x) => (x.id === id ? updated : x)),
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  setSearchTerm: (term) => set({ searchTerm: term }),
  setSelectedYear: (year) => set({ selectedYear: year }),
  setIsLoading: (loading) => set({ isLoading: loading }),

  getFilteredBiaya: () => {
    const { biayaList, searchTerm, selectedYear } = get();
    return biayaList.filter((biaya) => {
      const matchesSearch =
        !searchTerm ||
        biaya.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        biaya.kode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        biaya.deskripsi?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesYear =
        biaya.createdAt.getFullYear().toString() === selectedYear;
      return matchesSearch && matchesYear;
    });
  },

  getBiayaByCode: (kode) => {
    const { biayaList } = get();
    return biayaList.find((biaya) => biaya.kode === kode);
  },
}));

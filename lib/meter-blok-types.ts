// lib/meter-blok-types.ts
export type BlokRow = {
  id: string;
  kodeCustomer: string;
  nama: string;
  alamat: string;
  phone: string;
  meterAwal: number;
  meterAkhir: number | null;
  pemakaian: number;
  status: "pending" | "completed";
  locked?: boolean;
};

export type BlokListResp = {
  ok: true;
  period: string;
  locked?: boolean; // lock level periode (jika di-backend dipakai)
  progress: {
    total: number;
    selesai: number;
    pending: number;
    percent: number;
  };
  items: BlokRow[];
};

export type BlokPutBody = {
  id: string;
  meterAkhir: number;
  kendala?: string | null;
};

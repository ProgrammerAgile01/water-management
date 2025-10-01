import { prisma } from "@/lib/prisma";

export type BalanceStatus = "OK" | "WARNING" | "ALERT";

export type TandonBalance = {
  tandonId: string;
  tandonNama: string;
  inputM3: number;
  outputBlokM3: number;
  lossM3: number;
  lossPct: number;
  status: BalanceStatus;
};

export type BlokBalance = {
  zonaId: string;
  zonaNama: string;
  tandonId: string;
  tandonNama: string;
  inputBlokM3: number;
  outputRumahM3: number;
  lossM3: number;
  lossPct: number;
  status: BalanceStatus;
};

export type PelangganUsage = {
  pelangganId: string;
  pelangganNama: string;
  pelangganKode: string;
  m3Now: number;
};

type Tol = { ABS: number; PCT: number; MIN_INPUT_FOR_PCT: number };

// Ambil toleransi dari Setting bila nanti sudah ada field; sementara default aman
async function loadToleransi(): Promise<{ tandon: Tol; blok: Tol }> {
  // const s = await prisma.setting.findFirst();
  return {
    tandon: { ABS: 50, PCT: 5, MIN_INPUT_FOR_PCT: 30 },
    blok:   { ABS: 20, PCT: 8, MIN_INPUT_FOR_PCT: 20 },
  };
}

function pickStatus(input: number, out: number, tol: Tol): BalanceStatus {
  const loss = input - out;
  const abs = Math.abs(loss);
  const pct = input > 0 ? Math.abs((loss / input) * 100) : (out > 0 ? 100 : 0);

  const okByAbs = abs <= tol.ABS;
  const okByPct = input >= tol.MIN_INPUT_FOR_PCT ? pct <= tol.PCT : true;
  let status: BalanceStatus = (okByAbs || okByPct) ? "OK" : "WARNING";

  if ((!okByAbs && abs > 2 * tol.ABS) || (!okByPct && input >= tol.MIN_INPUT_FOR_PCT && pct > 2 * tol.PCT)) {
    status = "ALERT";
  }
  if (input === 0 && out > 0) status = "ALERT";
  return status;
}

export async function getPeriodeIdByKode(kodePeriode: string): Promise<string | null> {
  const p = await prisma.catatPeriode.findUnique({ where: { kodePeriode }, select: { id: true } });
  return p?.id ?? null;
}

/** Rekon: Tandon → Σ Blok */
export async function getTandonBalances(periodeId: string): Promise<TandonBalance[]> {
  const tol = (await loadToleransi()).tandon;

  const tandons = await prisma.tandonReading.findMany({
    where: { periodeId, status: "DONE", deletedAt: null },
    select: { tandonId: true, pemakaianM3: true, tandon: { select: { nama: true } } },
  });
  if (!tandons.length) return [];

  const tandonIds = tandons.map(t => t.tandonId);
  const group = await prisma.blokReading.groupBy({
    by: ["tandonId"],
    where: { periodeId, status: "DONE", deletedAt: null, tandonId: { in: tandonIds } },
    _sum: { pemakaianM3: true },
  });
  const outMap = new Map(group.map(g => [g.tandonId, g._sum.pemakaianM3 || 0]));

  const rows = tandons.map(tr => {
    const input = tr.pemakaianM3 || 0;
    const out = outMap.get(tr.tandonId) || 0;
    const loss = input - out;
    const pct = input > 0 ? (loss / input) * 100 : (out > 0 ? -100 : 0);
    return {
      tandonId: tr.tandonId,
      tandonNama: tr.tandon?.nama || "-",
      inputM3: Math.round(input),
      outputBlokM3: Math.round(out),
      lossM3: Math.round(loss),
      lossPct: Math.round(pct * 10) / 10,
      status: pickStatus(input, out, tol),
    };
  });

  return rows.sort((a, b) => {
    const rank = (s: BalanceStatus) => (s === "ALERT" ? 2 : s === "WARNING" ? 1 : 0);
    const r = rank(b.status) - rank(a.status);
    if (r) return r;
    return Math.abs(b.lossM3) - Math.abs(a.lossM3);
  });
}

/** Rekon: Blok → Σ Rumah */
export async function getBlokBalances(periodeId: string, filterTandonId?: string): Promise<BlokBalance[]> {
  const tol = (await loadToleransi()).blok;

  const blokReads = await prisma.blokReading.findMany({
    where: { periodeId, status: "DONE", deletedAt: null, ...(filterTandonId ? { tandonId: filterTandonId } : {}) },
    select: {
      zonaId: true, tandonId: true, pemakaianM3: true,
      zona: { select: { nama: true } },
      tandon: { select: { nama: true } },
    },
  });
  if (!blokReads.length) return [];

  const zonaIds = blokReads.map(b => b.zonaId);
  const rumah = await prisma.catatMeter.findMany({
    where: {
      periodeId, status: "DONE", deletedAt: null,
      OR: [
        { zonaIdSnapshot: { in: zonaIds } },
        { AND: [{ zonaIdSnapshot: null }, { pelanggan: { zonaId: { in: zonaIds } } }] },
      ],
    },
    select: { pemakaianM3: true, zonaIdSnapshot: true, pelanggan: { select: { zonaId: true } } },
  });

  const sumRumah = new Map<string, number>();
  for (const r of rumah) {
    const zId = r.zonaIdSnapshot || r.pelanggan?.zonaId || "";
    if (!zId) continue;
    sumRumah.set(zId, (sumRumah.get(zId) || 0) + (r.pemakaianM3 || 0));
  }

  const rows = blokReads.map(b => {
    const input = b.pemakaianM3 || 0;
    const out = sumRumah.get(b.zonaId) || 0;
    const loss = input - out;
    const pct = input > 0 ? (loss / input) * 100 : (out > 0 ? -100 : 0);
    return {
      zonaId: b.zonaId,
      zonaNama: b.zona?.nama || "-",
      tandonId: b.tandonId,
      tandonNama: b.tandon?.nama || "-",
      inputBlokM3: Math.round(input),
      outputRumahM3: Math.round(out),
      lossM3: Math.round(loss),
      lossPct: Math.round(pct * 10) / 10,
      status: pickStatus(input, out, tol),
    };
  });

  return rows.sort((a, b) => {
    const rank = (s: BalanceStatus) => (s === "ALERT" ? 2 : s === "WARNING" ? 1 : 0);
    const r = rank(b.status) - rank(a.status);
    if (r) return r;
    return Math.abs(b.lossM3) - Math.abs(a.lossM3);
  });
}

/** Rekon: Per Pelanggan */
export async function getPelangganPemakaianByBlok(periodeId: string, zonaId: string): Promise<PelangganUsage[]> {
  // ambil catat meter status DONE utk periode & zona tsb
  const rows = await prisma.catatMeter.findMany({
    where: {
      periodeId,
      status: "DONE",
      deletedAt: null,
      OR: [
        { zonaIdSnapshot: zonaId },
        { AND: [{ zonaIdSnapshot: null }, { pelanggan: { zonaId } }] },
      ],
    },
    select: {
      pemakaianM3: true,
      pelanggan: { select: { id: true, nama: true, kode: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  return rows.map(r => ({
    pelangganId: r.pelanggan?.id || "",
    pelangganNama: r.pelanggan?.nama || "-",
    pelangganKode: r.pelanggan?.kode || "-",
    m3Now: r.pemakaianM3 || 0,
  })).sort((a,b) => b.m3Now - a.m3Now);
}
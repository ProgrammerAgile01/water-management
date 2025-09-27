import { prisma } from "@/lib/prisma";

/** helper: kembalikan array N periode ke belakang termasuk periode sekarang (YYYY-MM) */
export function lastNPeriods(kodePeriode: string, n: number) {
  const [y, m] = kodePeriode.split("-").map(Number);
  const out: string[] = [];
  let Y = y, M = m;
  for (let i = 0; i < n; i++) {
    const MM = String(M).padStart(2, "0");
    out.push(`${Y}-${MM}`);
    M -= 1;
    if (M === 0) { M = 12; Y -= 1; }
  }
  return out; // urutan: sekarang, -1, -2, ...
}

type RowHist = {
  pelangganId: string;
  pelangganNama: string;
  pelangganKode: string;
  zonaId: string | null;
  zonaNama: string | null;
  periode: string;
  pemakaianM3: number;
};

export type AnomaliRow = {
  pelangganId: string;
  pelangganNama: string;
  pelangganKode: string;
  m3Now: number;
  avg3: number;
  avg6: number;
  deltaPctVs3: number; // (now - avg3)/avg3 * 100
  zScore: number;      // (now - mean)/std
  zeroStreak: number;  // 0 m3 beruntun hingga sekarang
  flags: Array<"ZERO"|"DROP"|"SPIKE">;
  history: Array<{ periode: string; m3: number }>;
};

export type ZoneSummary = {
  zonaId: string;
  zonaNama: string;
  totalNow: number;
  avg3: number;
  deltaPctVs3: number;
  zeroCount: number;
  outlierCount: number; // DROP + SPIKE
};

export type AnomaliResponse = {
  periode: string;
  zona?: { id: string; nama: string } | null;
  summary?: ZoneSummary;
  rows: AnomaliRow[];
};

/** ambil histori pemakaian m3 pelanggan di sebuah zona untuk daftar periode */
async function fetchHistoryForZone(zonaId: string | null, periods: string[]): Promise<RowHist[]> {
  // CatatMeter join CatatPeriode; pakai snapshot zona di CatatMeter agar historis aman
  const data = await prisma.catatMeter.findMany({
    where: {
      status: "DONE",
      deletedAt: null,
      periode: { kodePeriode: { in: periods } },
      ...(zonaId ? { zonaIdSnapshot: zonaId } : {}), // kalau zonaId null → semua zona (tidak dipakai di page ini)
    },
    select: {
      pelangganId: true,
      pelanggan: { select: { nama: true, kode: true } },
      zonaIdSnapshot: true,
      zonaNamaSnapshot: true,
      pemakaianM3: true,
      periode: { select: { kodePeriode: true } },
    },
  });

  return data.map(d => ({
    pelangganId: d.pelangganId,
    pelangganNama: d.pelanggan?.nama ?? "-",
    pelangganKode: d.pelanggan?.kode ?? "-",
    zonaId: d.zonaIdSnapshot,
    zonaNama: d.zonaNamaSnapshot,
    pemakaianM3: d.pemakaianM3 ?? 0,
    periode: d.periode.kodePeriode,
  }));
}

/** hitung AVG dari array angka (abaikan NaN) */
function avg(nums: number[]) {
  const valid = nums.filter(n => Number.isFinite(n));
  if (!valid.length) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

/** standar deviasi sampel */
function stddev(nums: number[]) {
  const valid = nums.filter(n => Number.isFinite(n));
  const n = valid.length;
  if (n <= 1) return 0;
  const mean = avg(valid);
  const variance = valid.reduce((acc, x) => acc + Math.pow(x - mean, 2), 0) / (n - 1);
  return Math.sqrt(variance);
}

/** hitung streak 0 berturut dari periode sekarang mundur */
function zeroStreak(historyDesc: Array<{ periode: string; m3: number }>) {
  let s = 0;
  for (const h of historyDesc) {
    if ((h.m3 ?? 0) === 0) s += 1; else break;
  }
  return s;
}

/** thresholds default */
const DROP_PCT = -50;       // turun >50% vs avg3 -> DROP
const SPIKE_PCT = 100;      // naik >100% vs avg3 -> SPIKE
const Z_ABS = 2.0;          // |z| >= 2 → outlier statistik
const ZERO_MIN_STREAK = 3;  // 3 bulan 0 m3 beruntun → ZERO

export async function computeAnomaliPerZonaPerPeriode(kodePeriode: string, zonaId: string) : Promise<AnomaliResponse> {
  // ambil 6 periode terakhir (sekarang + 5)
  const periods = lastNPeriods(kodePeriode, 6);
  const hist = await fetchHistoryForZone(zonaId, periods);

  // group by pelanggan
  const byPelanggan: Record<string, RowHist[]> = {};
  for (const r of hist) {
    (byPelanggan[r.pelangganId] ||= []).push(r);
  }
  // normalize: isi m3 = 0 untuk periode yang tidak ada data supaya streak terbaca
  for (const pid in byPelanggan) {
    const set = new Map(byPelanggan[pid].map(h => [h.periode, h]));
    const sample = byPelanggan[pid][0];
    const filled: RowHist[] = periods.map(p => {
      const ex = set.get(p);
      return ex ?? {
        pelangganId: pid,
        pelangganNama: sample.pelangganNama,
        pelangganKode: sample.pelangganKode,
        zonaId: sample.zonaId,
        zonaNama: sample.zonaNama,
        periode: p,
        pemakaianM3: 0,
      };
    });
    // urut: sekarang, -1, -2 ... (sudah)
    byPelanggan[pid] = filled;
  }

  const rows: AnomaliRow[] = [];
  let totalNow = 0;
  let outlierCount = 0;
  let zeroCount = 0;
  let zonaNama = "-";

  for (const pid in byPelanggan) {
    const arr = byPelanggan[pid];
    zonaNama = arr[0].zonaNama ?? zonaNama;

    const now = arr[0].pemakaianM3 ?? 0;
    const last3 = arr.slice(1, 4).map(x => x.pemakaianM3 ?? 0); // 3 bulan sebelum
    const last6 = arr.slice(1, 7).map(x => x.pemakaianM3 ?? 0); // 6 bulan sebelum

    const a3 = avg(last3);
    const a6 = avg(last6);
    const sd6 = stddev(last6.length ? last6 : [0,0,0]); // hindari 0 div
    const mean6 = avg(last6.length ? last6 : [0]);

    const deltaPctVs3 = a3 > 0 ? ((now - a3) / a3) * 100 : (now > 0 ? 100 : 0);
    const z = sd6 > 0 ? (now - mean6) / sd6 : 0;

    const hist6 = arr.slice(0, 6).map(h => ({ periode: h.periode, m3: h.pemakaianM3 ?? 0 }));
    const zs = zeroStreak(hist6); // dari sekarang mundur

    const flags: AnomaliRow["flags"] = [];
    if (zs >= ZERO_MIN_STREAK) flags.push("ZERO");
    if (deltaPctVs3 <= DROP_PCT || z <= -Z_ABS) flags.push("DROP");
    if (deltaPctVs3 >= SPIKE_PCT || z >= Z_ABS) flags.push("SPIKE");

    if (flags.includes("DROP") || flags.includes("SPIKE")) outlierCount += 1;
    if (flags.includes("ZERO")) zeroCount += 1;

    totalNow += now;

    rows.push({
      pelangganId: pid,
      pelangganNama: arr[0].pelangganNama,
      pelangganKode: arr[0].pelangganKode,
      m3Now: now,
      avg3: Math.round(a3 * 100) / 100,
      avg6: Math.round(a6 * 100) / 100,
      deltaPctVs3: Math.round(deltaPctVs3 * 10) / 10,
      zScore: Math.round(z * 100) / 100,
      zeroStreak: zs,
      flags,
      history: hist6, // urut: sekarang, -1, -2...
    });
  }

  // ringkasan zona vs avg3 total
  // hitung total avg3 = jumlah rata2 pelanggan (mendekati billed rata2)
  const avg3Total = rows.reduce((acc, r) => acc + (r.avg3 || 0), 0);
  const deltaPctZone = avg3Total > 0 ? ((totalNow - avg3Total) / avg3Total) * 100 : (totalNow > 0 ? 100 : 0);

  const summary: ZoneSummary = {
    zonaId,
    zonaNama: zonaNama ?? "-",
    totalNow: Math.round(totalNow * 100) / 100,
    avg3: Math.round(avg3Total * 100) / 100,
    deltaPctVs3: Math.round(deltaPctZone * 10) / 10,
    zeroCount,
    outlierCount,
  };

  // sort default: ZERO > DROP > SPIKE > lainnya, lalu m3Now asc
  rows.sort((a, b) => {
    const score = (r: AnomaliRow) => (r.flags.includes("ZERO") ? 3 : 0) + (r.flags.includes("DROP") ? 2 : 0) + (r.flags.includes("SPIKE") ? 1 : 0);
    const s = score(b) - score(a);
    if (s !== 0) return s;
    return a.m3Now - b.m3Now;
  });

  return {
    periode: kodePeriode,
    zona: { id: zonaId, nama: zonaNama ?? "-" },
    summary,
    rows,
  };
}
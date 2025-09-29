import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Utility: dari kode periode "YYYY-MM" kembalikan list mundur n bulan
 * (TIDAK termasuk periode targetnya).
 *
 * Contoh:
 *   prevPeriods("2025-09", 6)
 *   -> ["2025-08","2025-07","2025-06","2025-05","2025-04","2025-03"]
 */
function prevPeriods(kode: string, n = 6) {
  const [yy, mm] = kode.split("-").map(Number);
  const out: string[] = [];
  let y = yy,
    m = mm;
  for (let i = 0; i < n; i++) {
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    out.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return out;
}
// Klasifikasi status per pelanggan
type Status = "NORMAL" | "ANOMALY" | "ZERO";

/**
 * Business rule status:
 * - 0 m³  -> ZERO
 * - baseline kosong/<=0 -> NORMAL (karena belum cukup riwayat)
 * - |selisih| > threshold -> ANOMALY
 * - lainnya -> NORMAL
 *
 * curr: pemakaian bulan aktif
 * baselineAvg: rata-rata dari riwayat n bulan sebelumnya (jika ada)
 * thresholdPct: ambang deteksi (0.5 = 50%)
 */
function deriveStatus(
  curr: number,
  baselineAvg: number | null,
  thresholdPct = 0.5
): Status {
  if (!curr) return "ZERO";
  if (!baselineAvg || baselineAvg <= 0) return "NORMAL";
  const pct = (curr - baselineAvg) / baselineAvg;
  return Math.abs(pct) > thresholdPct ? "ANOMALY" : "NORMAL";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // ====== BACA PARAM FILTER DARI QUERY ======
    // periode   : "YYYY-MM" (jika kosong -> otomatis periode terbaru)
    // zonaId    : filter by zona snapshot pada saat catat
    // threshold : ambang anomali (0.3/0.5/0.7)
    // nBaseline : jumlah bulan pembanding (3/6/12)
    const periodeQ = (searchParams.get("periode") || "").trim(); // "YYYY-MM"
    const zonaId = searchParams.get("zonaId") || undefined;
    const thresholdPct = Number(searchParams.get("thresholdPct") || "0.5"); // ±50%
    const nBaseline = Number(searchParams.get("n") || "6"); // 3/6/12, default 6

    // ====== DROPDOWN DATA (PERIODE & ZONA) ======
    // Ambil semua periode untuk diisi ke dropdown (urut terbaru dulu)
    const periodeList = await prisma.catatPeriode.findMany({
      where: { deletedAt: null },
      select: { kodePeriode: true, tahun: true, bulan: true },
      orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
    });
    const periods = periodeList.map((p) => p.kodePeriode);

    // Pilih periode aktif: query ?periode=... kalau kosong ambil paling baru
    let periode = periodeQ || periods[0] || null;

    // Ambil semua zona untuk dropdown (supaya muncul meskipun tabel kosong)
    const zonaList = await prisma.zona.findMany({
      select: { id: true, nama: true },
      orderBy: { nama: "asc" },
    });
    const zones = zonaList.map((z) => ({ id: z.id, nama: z.nama }));

    // Jika belum ada satupun periode di DB, kembalikan meta saja
    if (!periode) {
      return NextResponse.json({
        ok: true,
        periode: null,
        periods,
        zones,
        legend: [
          { color: "#22c55e", label: "Normal" },
          { color: "#ef4444", label: "Tidak seperti biasanya" },
          { color: "#9ca3af", label: "0 m³" },
        ],
        missingCoords: 0, // tidak dipakai di versi tabel
        data: [],
      });
    }

    // Validasi periode yang dipilih
    const periodeRec = await prisma.catatPeriode.findUnique({
      where: { kodePeriode: periode },
      select: { id: true, kodePeriode: true },
    });
    if (!periodeRec) {
      // Periode yang diminta tidak ditemukan -> kembalikan meta supaya UI tetap hidup
      return NextResponse.json({
        ok: true,
        periode,
        periods,
        zones,
        legend: [
          { color: "#22c55e", label: "Normal" },
          { color: "#ef4444", label: "Tidak seperti biasanya" },
          { color: "#9ca3af", label: "0 m³" },
        ],
        missingCoords: 0, // tidak dipakai di versi tabel
        data: [],
      });
    }

    // ====== DATA BULAN PERIODE CATAT METER AKTIF ======
    // Ambil pemakaian bulan ini per pelanggan dari CatatMeter
    // (pakai zonaIdSnapshot untuk filter zona jika ada)
    const entries = await prisma.catatMeter.findMany({
      where: {
        periodeId: periodeRec.id,
        deletedAt: null,
        ...(zonaId ? { zonaIdSnapshot: zonaId } : {}),
      },
      select: {
        pelangganId: true,
        pemakaianM3: true,
        zonaNamaSnapshot: true, // fallback jika relasi zona tidak ada
        pelanggan: {
          select: {
            id: true,
            kode: true,
            nama: true,
            // NB: lat/lng tidak di-select karena belum ada di schema
            zona: { select: { id: true, nama: true } },
          },
        },
      },
    });

    // Kumpulkan ID pelanggan terkait bulan aktif
    const pelangganIds = Array.from(new Set(entries.map((e) => e.pelangganId)));

    // ====== DATA RIWAYAT (BASELINE) ======
    // Buat daftar kode periode target mundur n bulan (mis. 3/6/12)
    const prevList = prevPeriods(periode, nBaseline);

    // Ambil catat meter riwayat untuk pelanggan-pelanggan terpilih
    // Catatan: kalau prevIds kosong, bagian ini dilewati (histori tidak ada)
    let histByPelanggan: Record<string, number[]> = {};
    if (pelangganIds.length && prevList.length) {
      // Ambil ID periode yang BENAR-BENAR ada di DB dari daftar prevList
      const prevPeriodes = await prisma.catatPeriode.findMany({
        where: { kodePeriode: { in: prevList }, deletedAt: null },
        select: { id: true },
      });
      const prevIds = prevPeriodes.map((p) => p.id);

      if (prevIds.length) {
        const history = await prisma.catatMeter.findMany({
          where: {
            deletedAt: null,
            periodeId: { in: prevIds },
            pelangganId: { in: pelangganIds },
          },
          select: { pelangganId: true, pemakaianM3: true },
        });

        // Grouping: { pelangganId -> [pemakaianM3, ...] }
        histByPelanggan = history.reduce<Record<string, number[]>>((acc, h) => {
          (acc[h.pelangganId] ||= []).push(h.pemakaianM3 || 0);
          return acc;
        }, {});
      }
    }

    // ====== RAKIT RESPONSE PER PELANGGAN ======
    const data = entries.map((e) => {
      // Ambil list riwayat untuk pelanggan ini (yang tersedia saja)
      const hist = histByPelanggan[e.pelangganId] || [];
      const baselineCount = hist.length; // <— berapa bulan histori yang dipakai

      // avg = rata-rata dari histori tersedia (jika ada)
      const avg = baselineCount
        ? hist.reduce((a, b) => a + b, 0) / baselineCount
        : null;

      // status = ZERO / ANOMALY / NORMAL (lihat deriveStatus)
      const status = deriveStatus(e.pemakaianM3 || 0, avg, thresholdPct);

      // pctChange = (bulanIni - avg) / avg, jika baseline ada & >0
      const pctChange = avg && avg > 0 ? (e.pemakaianM3 - avg) / avg : null;

      // Warna untuk legenda/peta (future proof)
      const color =
        status === "NORMAL"
          ? "#22c55e"
          : status === "ANOMALY"
          ? "#ef4444"
          : "#9ca3af";

      return {
        pelangganId: e.pelangganId,
        kode: e.pelanggan.kode,
        nama: e.pelanggan.nama,
        zonaId: e.pelanggan.zona?.id || null,
        zonaNama: e.pelanggan.zona?.nama || e.zonaNamaSnapshot || null,
        lat: null,
        lng: null,
        pemakaianM3: e.pemakaianM3,
        baselineAvg: avg,
        baselineCount, // <— dikirim ke UI
        pctChange,
        status,
        color,
      };
    });

    // ====== KIRIM KE FRONTEND ======
    return NextResponse.json({
      ok: true,
      periode, // periode aktif (tetap format "YYYY-MM")
      periods, // list untuk dropdown
      zones, // list untuk dropdown
      legend: [
        { color: "#22c55e", label: "Normal" },
        { color: "#ef4444", label: "Tidak seperti biasanya" },
        { color: "#9ca3af", label: "0 m³" },
      ],
      missingCoords: 0, // tidak relevan untuk versi tabel
      data, // dataset yang ditampilkan di UI
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

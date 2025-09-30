import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ======================= Utilities =======================

/**
 * Buat daftar periode mundur n bulan dari "YYYY-MM".
 * Tidak termasuk periode asalnya.
 * Contoh: prevPeriods("2025-09", 3) -> ["2025-08","2025-07","2025-06"]
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

type Status = "NORMAL" | "ANOMALY" | "ZERO";

/**
 * Aturan status:
 * - 0 m³                -> ZERO
 * - baseline kosong/<=0 -> NORMAL (karena belum ada pembanding)
 * - |(curr-baseline)/baseline| > threshold -> ANOMALY
 * - selain itu -> NORMAL
 */
function deriveStatus(
  curr: number,
  baselineAvg: number | null,
  thresholdPct = 0.75
): Status {
  if (!curr) return "ZERO";
  if (!baselineAvg || baselineAvg <= 0) return "NORMAL";
  const pct = (curr - baselineAvg) / baselineAvg;
  return Math.abs(pct) > thresholdPct ? "ANOMALY" : "NORMAL";
}

// ======================= Handler =======================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // -------- Query filter dari UI --------
    const periodeQ = (searchParams.get("periode") || "").trim(); // "YYYY-MM"
    const zonaId = searchParams.get("zonaId") || undefined; // filter zona snapshot
    const thresholdPct = Number(searchParams.get("thresholdPct") || "0.75"); // 0.3/0.5/0.75
    const nBaseline = Number(searchParams.get("n") || "3"); // 3/6/12

    // -------- Dropdown data: periode dan zona --------
    const periodeList = await prisma.catatPeriode.findMany({
      where: { deletedAt: null },
      select: { kodePeriode: true, tahun: true, bulan: true },
      orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
    });
    const periods = periodeList.map((p) => p.kodePeriode);

    // periode aktif = ?periode atau default terbaru
    let periode = periodeQ || periods[0] || null;

    const zonaList = await prisma.zona.findMany({
      select: { id: true, nama: true },
      orderBy: { nama: "asc" },
    });
    const zones = zonaList.map((z) => ({ id: z.id, nama: z.nama }));

    // jika belum ada periode sama sekali
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
        missingCoords: 0,
        data: [],
      });
    }

    // validasi periode aktif
    const periodeRec = await prisma.catatPeriode.findUnique({
      where: { kodePeriode: periode },
      select: { id: true, kodePeriode: true },
    });
    if (!periodeRec) {
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
        missingCoords: 0,
        data: [],
      });
    }

    // -------- Data bulan aktif: pemakaian per pelanggan --------
    const entries = await prisma.catatMeter.findMany({
      where: {
        periodeId: periodeRec.id,
        deletedAt: null,
        ...(zonaId ? { zonaIdSnapshot: zonaId } : {}),
      },
      select: {
        pelangganId: true,
        pemakaianM3: true,
        zonaNamaSnapshot: true,
        pelanggan: {
          select: {
            id: true,
            kode: true,
            nama: true,
            lat: true, // <— koordinat dari master pelanggan (nullable)
            lng: true,
            zona: { select: { id: true, nama: true } },
          },
        },
      },
    });

    const pelangganIds = Array.from(new Set(entries.map((e) => e.pelangganId)));

    // -------- Data riwayat (baseline) --------
    // target periode pembanding = n bulan ke belakang dari periode aktif
    const prevList = prevPeriods(periode, nBaseline);

    // ambil ID periode yang benar-benar ada di DB
    const prevPeriodes = await prisma.catatPeriode.findMany({
      where: { kodePeriode: { in: prevList }, deletedAt: null },
      select: { id: true },
    });
    const prevIds = prevPeriodes.map((p) => p.id);

    // ambil catatMeter untuk pelanggan pada periode-periode pembanding yang tersedia
    let histByPelanggan: Record<string, number[]> = {};
    if (pelangganIds.length && prevIds.length) {
      const history = await prisma.catatMeter.findMany({
        where: {
          deletedAt: null,
          periodeId: { in: prevIds },
          pelangganId: { in: pelangganIds },
        },
        select: { pelangganId: true, pemakaianM3: true },
      });

      // kelompokkan: { pelangganId -> [pemakaianM3, ...] }
      histByPelanggan = history.reduce<Record<string, number[]>>((acc, h) => {
        (acc[h.pelangganId] ||= []).push(h.pemakaianM3 || 0);
        return acc;
      }, {});
    }

    // -------- Rakit response per pelanggan --------
    let missingCoords = 0;

    const data = entries.map((e) => {
      const hist = histByPelanggan[e.pelangganId] || [];
      const baselineCount = hist.length;
      const baselineAvg = baselineCount
        ? hist.reduce((a, b) => a + b, 0) / baselineCount
        : null;
      const pctChange =
        baselineAvg && baselineAvg > 0
          ? (e.pemakaianM3 - baselineAvg) / baselineAvg
          : null;
      const status = deriveStatus(
        e.pemakaianM3 || 0,
        baselineAvg,
        thresholdPct
      );
      const color =
        status === "NORMAL"
          ? "#22c55e"
          : status === "ANOMALY"
          ? "#ef4444"
          : "#9ca3af";

      const lat = e.pelanggan.lat != null ? Number(e.pelanggan.lat) : null;
      const lng = e.pelanggan.lng != null ? Number(e.pelanggan.lng) : null;
      if (lat == null || lng == null) missingCoords++;

      return {
        pelangganId: e.pelangganId,
        kode: e.pelanggan.kode,
        nama: e.pelanggan.nama,
        zonaId: e.pelanggan.zona?.id || null,
        zonaNama: e.pelanggan.zona?.nama || e.zonaNamaSnapshot || null,
        lat,
        lng,
        pemakaianM3: e.pemakaianM3,
        baselineAvg,
        baselineCount,
        pctChange,
        status,
        color,
      };
    });

    // -------- Kirim ke FE --------
    return NextResponse.json({
      ok: true,
      periode, // tetap "YYYY-MM" (UI kamu memformat "Juli 2025")
      periods, // dropdown periode
      zones, // dropdown zona
      legend: [
        { color: "#22c55e", label: "Normal" },
        { color: "#ef4444", label: "Tidak seperti biasanya" },
        { color: "#9ca3af", label: "0 m³" },
      ],
      missingCoords,
      data,
    });
  } catch (err: any) {
    console.error("❌ GET /api/distribusi/peta:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

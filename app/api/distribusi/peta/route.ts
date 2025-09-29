import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Dapatkan daftar "YYYY-MM" mundur n bulan dari target (tidak termasuk targetnya)
function prevPeriods(kode: string, n = 6) {
  const [yy, mm] = kode.split("-").map(Number);
  const out: string[] = [];
  let y = yy, m = mm;
  for (let i = 0; i < n; i++) {
    m -= 1;
    if (m < 1) { m = 12; y -= 1; }
    out.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return out;
}

type Status = "NORMAL" | "ANOMALY" | "ZERO";
function deriveStatus(curr: number, baselineAvg: number | null, thresholdPct = 0.5): Status {
  if (!curr) return "ZERO";
  if (!baselineAvg || baselineAvg <= 0) return "NORMAL";
  const pct = (curr - baselineAvg) / baselineAvg;
  return Math.abs(pct) > thresholdPct ? "ANOMALY" : "NORMAL";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const periodeQ = (searchParams.get("periode") || "").trim(); // "YYYY-MM"
    const zonaId = searchParams.get("zonaId") || undefined;
    const thresholdPct = Number(searchParams.get("thresholdPct") || "0.5"); // ±50%
    const nBaseline = Number(searchParams.get("n") || "6"); // 3/6/12, default 6

    // Dropdown periode
    const periodeList = await prisma.catatPeriode.findMany({
      where: { deletedAt: null },
      select: { kodePeriode: true, tahun: true, bulan: true },
      orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
    });
    const periods = periodeList.map(p => p.kodePeriode);
    let periode = periodeQ || periods[0] || null;

    // Dropdown zona
    const zonaList = await prisma.zona.findMany({
      select: { id: true, nama: true },
      orderBy: { nama: "asc" },
    });
    const zones = zonaList.map(z => ({ id: z.id, nama: z.nama }));

    if (!periode) {
      return NextResponse.json({
        ok: true, periode: null, periods, zones,
        legend: [
          { color: "#22c55e", label: "Normal" },
          { color: "#ef4444", label: "Tidak seperti biasanya" },
          { color: "#9ca3af", label: "0 m³" },
        ],
        missingCoords: 0,
        data: [],
      });
    }

    const periodeRec = await prisma.catatPeriode.findUnique({
      where: { kodePeriode: periode },
      select: { id: true, kodePeriode: true },
    });
    if (!periodeRec) {
      return NextResponse.json({
        ok: true, periode, periods, zones,
        legend: [
          { color: "#22c55e", label: "Normal" },
          { color: "#ef4444", label: "Tidak seperti biasanya" },
          { color: "#9ca3af", label: "0 m³" },
        ],
        missingCoords: 0,
        data: [],
      });
    }

    // Catatan meter periode aktif
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
            zona: { select: { id: true, nama: true } },
          },
        },
      },
    });

    const pelangganIds = Array.from(new Set(entries.map(e => e.pelangganId)));
    const prevList = prevPeriods(periode, nBaseline);

    // Ambil histori n bulan kebelakang (yang benar-benar tersedia di DB)
    let histByPelanggan: Record<string, number[]> = {};
    if (pelangganIds.length && prevList.length) {
      const prevPeriodes = await prisma.catatPeriode.findMany({
        where: { kodePeriode: { in: prevList }, deletedAt: null },
        select: { id: true },
      });
      const prevIds = prevPeriodes.map(p => p.id);

      if (prevIds.length) {
        const history = await prisma.catatMeter.findMany({
          where: {
            deletedAt: null,
            periodeId: { in: prevIds },
            pelangganId: { in: pelangganIds },
          },
          select: { pelangganId: true, pemakaianM3: true },
        });
        histByPelanggan = history.reduce<Record<string, number[]>>((acc, h) => {
          (acc[h.pelangganId] ||= []).push(h.pemakaianM3 || 0);
          return acc;
        }, {});
      }
    }

    const data = entries.map(e => {
      const hist = histByPelanggan[e.pelangganId] || [];
      const baselineCount = hist.length; // <— berapa bulan histori yang dipakai
      const avg = baselineCount ? hist.reduce((a, b) => a + b, 0) / baselineCount : null;
      const status = deriveStatus(e.pemakaianM3 || 0, avg, thresholdPct);
      const pctChange = avg && avg > 0 ? (e.pemakaianM3 - avg) / avg : null;
      const color = status === "NORMAL" ? "#22c55e" : status === "ANOMALY" ? "#ef4444" : "#9ca3af";

      return {
        pelangganId: e.pelangganId,
        kode: e.pelanggan.kode,
        nama: e.pelanggan.nama,
        zonaId: e.pelanggan.zona?.id || null,
        zonaNama: e.pelanggan.zona?.nama || e.zonaNamaSnapshot || null,
        lat: null, lng: null,
        pemakaianM3: e.pemakaianM3,
        baselineAvg: avg,
        baselineCount,        // <— dikirim ke UI
        pctChange,
        status,
        color,
      };
    });

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
      data,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}

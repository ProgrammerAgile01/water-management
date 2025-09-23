// app/api/warga/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

// ===== helper label bulan singkat (id-ID)
const BULAN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
function monthShort(m: number) {
  return BULAN[(m - 1 + 12) % 12];
}

// ===== helpers periode (catat M -> tagihan M+1)
function nextOfPeriode(tahun: number, bulan1to12: number) {
  const d = new Date(Date.UTC(tahun, bulan1to12 - 1, 1));
  d.setUTCMonth(d.getUTCMonth() + 1);
  const ny = d.getUTCFullYear();
  const nm = d.getUTCMonth() + 1;
  return {
    tahun: ny,
    bulan: nm,
    kode: `${ny}-${String(nm).padStart(2, "0")}`,
  };
}

function formatTanggalID(d: Date | string | null) {
  if (!d) return "-";
  const dt = typeof d === "string" ? new Date(d) : d;
  const day = String(dt.getUTCDate()).padStart(2, "0");
  const month = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const year = dt.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

// ===== helper jatuh tempo (pakai Setting.tglJatuhTempo jika tagihan tidak punya)
// otomatis clamp ke akhir bulan
function buildDueDate(tahun: number, bulan1to12: number, defaultDay: number) {
  const lastDay = new Date(Date.UTC(tahun, bulan1to12, 0)).getUTCDate(); // day 0 of next month = last day
  const day = Math.max(1, Math.min(defaultDay || 15, lastDay));
  const d = new Date(Date.UTC(tahun, bulan1to12 - 1, day));
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Ambil user (harus WARGA) + pelanggan
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        name: true,
        pelanggan: {
          select: { id: true, kode: true, nama: true, alamat: true, wa: true },
        },
      },
    });
    if (!user || user.role !== "WARGA" || !user.pelanggan) {
      return NextResponse.json(
        { ok: false, message: "Akun tidak memiliki data pelanggan." },
        { status: 403 }
      );
    }
    const pelanggan = user.pelanggan;

    // Setting untuk default jatuh tempo
    const setting = await prisma.setting.findUnique({ where: { id: 1 } });
    const defaultDueDay = setting?.tglJatuhTempo ?? 15;

    // Periode catat terbaru
    const latestPeriode = await prisma.catatPeriode.findFirst({
      where: { deletedAt: null },
      orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
      select: {
        id: true,
        kodePeriode: true,
        bulan: true,
        tahun: true,
        tarifPerM3: true,
        abonemen: true,
      },
    });

    // ===== CURRENT USAGE (catat terbaru â†’ tagihan bulan berikutnya)
    let currentUsage: {
      period: string;
      meterAwal: number;
      meterAkhir: number;
      pemakaian: number;
      totalTagihan: number;
      status: "lunas" | "belum_bayar";
      jatuhTempo: string | null;
    } | null = null;

    if (latestPeriode) {
      const cm = await prisma.catatMeter.findUnique({
        where: {
          periodeId_pelangganId: {
            periodeId: latestPeriode.id,
            pelangganId: pelanggan.id,
          },
        },
        select: {
          meterAwal: true,
          meterAkhir: true,
          pemakaianM3: true,
          total: true,
        },
      });

      // Tagihan bulan berikutnya
      const next = nextOfPeriode(latestPeriode.tahun, latestPeriode.bulan);
      const tagihanNext = await prisma.tagihan.findUnique({
        where: {
          pelangganId_periode: {
            pelangganId: pelanggan.id,
            periode: next.kode,
          },
        },
        select: { totalTagihan: true, statusBayar: true, tglJatuhTempo: true },
      });

      const jatuhTempo = tagihanNext?.tglJatuhTempo
        ? formatTanggalID(tagihanNext.tglJatuhTempo)
        : formatTanggalID(buildDueDate(next.tahun, next.bulan, defaultDueDay));
      currentUsage = {
        // tampilkan nama bulan periode CATAT
        period: `${BULAN[latestPeriode.bulan - 1]} ${latestPeriode.tahun}`,
        meterAwal: cm?.meterAwal ?? 0,
        meterAkhir: cm?.meterAkhir ?? 0,
        pemakaian:
          cm?.pemakaianM3 ??
          Math.max((cm?.meterAkhir ?? 0) - (cm?.meterAwal ?? 0), 0),
        totalTagihan:
          tagihanNext?.totalTagihan ?? (cm ? cm.total : latestPeriode.abonemen),
        status:
          tagihanNext &&
          ["paid", "lunas"].includes(
            (tagihanNext.statusBayar || "").toLowerCase()
          )
            ? "lunas"
            : "belum_bayar",
        jatuhTempo,
      };
    }

    // ===== YEARLY USAGE (catat M -> tampilkan TAGIHAN M+1)
    const now = new Date();
    const thisYear = now.getFullYear();

    const periodeTahunIni = await prisma.catatPeriode.findMany({
      where: { tahun: thisYear, deletedAt: null },
      orderBy: [{ bulan: "asc" }],
      select: { id: true, bulan: true, tahun: true },
    });

    const yearlyUsage: Array<{
      month: string;
      usage: number;
      bill: number;
      status: "paid" | "unpaid" | "pending";
    }> = [];

    for (const p of periodeTahunIni) {
      // bulan tagihan = M+1
      const next = nextOfPeriode(p.tahun, p.bulan);

      // Kalau mau hanya tagihan TAHUN INI, aktifkan guard ini:
      if (next.tahun !== thisYear) continue;

      const cm = await prisma.catatMeter.findUnique({
        where: {
          periodeId_pelangganId: { periodeId: p.id, pelangganId: pelanggan.id },
        },
        select: { pemakaianM3: true, total: true },
      });

      const tagihanNext = await prisma.tagihan.findUnique({
        where: {
          pelangganId_periode: {
            pelangganId: pelanggan.id,
            periode: next.kode,
          },
        },
        select: { totalTagihan: true, statusBayar: true },
      });

      yearlyUsage.push({
        month: monthShort(next.bulan), // âŸµ LABEL = BULAN TAGIHAN (M+1)
        usage: cm?.pemakaianM3 ?? 0, // pemakaian tetap dari catat M
        bill: tagihanNext?.totalTagihan ?? cm?.total ?? 0,
        status: tagihanNext
          ? ["paid", "lunas"].includes(
              (tagihanNext.statusBayar || "").toLowerCase()
            )
            ? "paid"
            : "unpaid"
          : cm
          ? "unpaid"
          : "pending",
      });
    }

    // ===== PAYMENT HISTORY (tetap)
    const pembayaran = await prisma.pembayaran.findMany({
      where: { deletedAt: null, tagihan: { pelangganId: pelanggan.id } },
      orderBy: [{ tanggalBayar: "desc" }],
      take: 12,
      select: {
        id: true,
        tanggalBayar: true,
        jumlahBayar: true,
        metode: true,
        tagihan: { select: { periode: true } },
      },
    });

    const paymentHistory = pembayaran.map((p) => ({
      id: p.id,
      period: p.tagihan.periode, // "YYYY-MM" (bulan tagihan)
      amount: p.jumlahBayar,
      paymentDate: p.tanggalBayar.toISOString().slice(0, 10),
      status: "lunas" as const,
      method: p.metode,
    }));

    return NextResponse.json({
      ok: true,
      data: {
        resident: {
          customerId: pelanggan.kode,
          name: pelanggan.nama,
          address: pelanggan.alamat,
          phone: pelanggan.wa ?? "",
        },
        currentUsage,
        yearlyUsage,
        paymentHistory,
      },
    });
  } catch (e: any) {
    console.error("GET /api/warga/dashboard error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

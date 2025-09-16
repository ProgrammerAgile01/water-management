// app/api/warga/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

// helper label bulan singkat (id-ID)
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

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Ambil user (harus WARGA) + pelanggan terkait
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        name: true,
        pelanggan: {
          select: {
            id: true,
            kode: true,
            nama: true,
            alamat: true,
            wa: true,
          },
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

    // Periode terbaru (apapun yg paling akhir)
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

    // Entry catatMeter utk periode terbaru
    let currentUsage: any = null;
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

      // tagihan utk periode terbaru (jika ada)
      const tagihanTerbaru = await prisma.tagihan.findUnique({
        where: {
          pelangganId_periode: {
            pelangganId: pelanggan.id,
            periode: latestPeriode.kodePeriode,
          },
        },
        select: { totalTagihan: true, statusBayar: true, tglJatuhTempo: true },
      });

      currentUsage = {
        period: `${BULAN[latestPeriode.bulan - 1]} ${latestPeriode.tahun}`,
        meterAwal: cm?.meterAwal ?? 0,
        meterAkhir: cm?.meterAkhir ?? 0,
        pemakaian:
          cm?.pemakaianM3 ??
          Math.max((cm?.meterAkhir ?? 0) - (cm?.meterAwal ?? 0), 0),
        totalTagihan:
          tagihanTerbaru?.totalTagihan ??
          (cm ? cm.total : latestPeriode.abonemen),
        status:
          tagihanTerbaru?.statusBayar?.toLowerCase() === "paid" ||
          tagihanTerbaru?.statusBayar?.toLowerCase() === "lunas"
            ? "lunas"
            : "belum_bayar",
        jatuhTempo: tagihanTerbaru?.tglJatuhTempo
          ? tagihanTerbaru.tglJatuhTempo.toISOString().slice(0, 10)
          : null,
      };
    }

    // Rekap 1 tahun berjalan (berdasarkan CatatPeriode & CatatMeter & Tagihan)
    const now = new Date();
    const thisYear = now.getFullYear();

    const periodeTahunIni = await prisma.catatPeriode.findMany({
      where: { tahun: thisYear, deletedAt: null },
      orderBy: [{ bulan: "asc" }],
      select: { id: true, bulan: true, kodePeriode: true },
    });

    const yearlyUsage: Array<{
      month: string;
      usage: number;
      bill: number;
      status: "paid" | "unpaid" | "pending";
    }> = [];

    for (const p of periodeTahunIni) {
      const cm = await prisma.catatMeter.findUnique({
        where: {
          periodeId_pelangganId: { periodeId: p.id, pelangganId: pelanggan.id },
        },
        select: { pemakaianM3: true, total: true, status: true },
      });

      const tag = await prisma.tagihan.findUnique({
        where: {
          pelangganId_periode: {
            pelangganId: pelanggan.id,
            periode: p.kodePeriode,
          },
        },
        select: { totalTagihan: true, statusBayar: true },
      });

      yearlyUsage.push({
        month: monthShort(p.bulan),
        usage: cm?.pemakaianM3 ?? 0,
        bill: tag?.totalTagihan ?? cm?.total ?? 0,
        status: tag
          ? ["paid", "lunas"].includes(tag.statusBayar.toLowerCase())
            ? "paid"
            : "unpaid"
          : cm
          ? "unpaid"
          : "pending",
      });
    }

    // Histori pembayaran (ambil 12 terakhir)
    const pembayaran = await prisma.pembayaran.findMany({
      where: {
        deletedAt: null,
        tagihan: { pelangganId: pelanggan.id },
      },
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
      period: p.tagihan.periode, // format "YYYY-MM"
      amount: p.jumlahBayar,
      paymentDate: p.tanggalBayar.toISOString().slice(0, 10),
      status: "lunas" as const,
      method: p.metode, // "TUNAI" | "TRANSFER" | ...
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

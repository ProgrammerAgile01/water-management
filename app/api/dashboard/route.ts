// app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const IMONTHS = [
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
const pad2 = (n: number) => n.toString().padStart(2, "0");

// safe percent change: bila prev = 0 → 0 (hindari Infinity)
function pctChange(curr: number, prev: number) {
  if (!prev) return 0;
  return ((curr - prev) / prev) * 100;
}

function prevYM(year: number, month1to12: number) {
  const d = new Date(Date.UTC(year, month1to12 - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = Number(searchParams.get("year") ?? now.getFullYear());

    // ==== CHART: Pemakaian (CatatMeter by tahun CatatPeriode) ====
    const catats = await prisma.catatMeter.findMany({
      where: { deletedAt: null, periode: { tahun: year } },
      select: { pemakaianM3: true, periode: { select: { bulan: true } } },
    });
    const usageByMonth: number[] = Array(12).fill(0);
    for (const r of catats) {
      const idx = Math.max(0, Math.min(11, (r.periode?.bulan ?? 1) - 1));
      usageByMonth[idx] += r.pemakaianM3 ?? 0;
    }
    const usageData = IMONTHS.map((m, i) => ({
      month: m,
      usage: usageByMonth[i],
    }));

    // ==== CHART: Tagihan per bulan (pakai Tagihan.periode 'YYYY-MM') ====
    const tagihanTahun = await prisma.tagihan.findMany({
      where: { deletedAt: null, periode: { startsWith: `${year}-` } },
      select: { periode: true, totalTagihan: true },
    });
    const billingByMonth: number[] = Array(12).fill(0);
    for (const t of tagihanTahun) {
      const [yStr, mStr] = (t.periode ?? "").split("-");
      if (Number(yStr) !== year) continue;
      const midx = Math.max(0, Math.min(11, Number(mStr) - 1));
      billingByMonth[midx] += t.totalTagihan ?? 0;
    }
    const billingData = IMONTHS.map((m, i) => ({
      month: m,
      amount: billingByMonth[i],
    }));

    // ==== TABLE: 5 periode terakhir tahun ini ====
    const periods = await prisma.catatPeriode.findMany({
      where: { deletedAt: null, tahun: year },
      orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
      take: 5,
      select: { kodePeriode: true, bulan: true, tahun: true },
    });
    const kode = (y: number, m: number) => `${y}-${pad2(m)}`;
    const tableData: any[] = [];
    for (const p of periods) {
      const kPeriode = p.kodePeriode || kode(p.tahun, p.bulan);

      const cmRows = await prisma.catatMeter.findMany({
        where: { deletedAt: null, periode: { tahun: p.tahun, bulan: p.bulan } },
        select: { pemakaianM3: true },
      });
      const totalM3 = cmRows.reduce((s, r) => s + (r.pemakaianM3 || 0), 0);

      const tg = await prisma.tagihan.findMany({
        where: { deletedAt: null, periode: kPeriode },
        select: { totalTagihan: true, statusBayar: true, id: true },
      });
      const tagihan = tg.reduce((s, r) => s + (r.totalTagihan || 0), 0);

      const paidRows = await prisma.pembayaran.findMany({
        where: {
          deletedAt: null,
          tagihan: { periode: kPeriode, deletedAt: null },
        },
        select: { jumlahBayar: true },
      });
      const sudahBayar = paidRows.reduce((s, r) => s + (r.jumlahBayar || 0), 0);
      const belumBayar = Math.max(0, tagihan - sudahBayar);

      const status =
        belumBayar <= 0
          ? ("paid" as const)
          : sudahBayar > 0
          ? ("partial" as const)
          : ("unpaid" as const);

      const periodeLabel = new Date(p.tahun, p.bulan - 1, 1).toLocaleDateString(
        "id-ID",
        {
          month: "long",
          year: "numeric",
        }
      );

      tableData.push({
        id: kPeriode,
        periode: periodeLabel,
        totalM3,
        tagihan,
        sudahBayar,
        belumBayar,
        status,
      });
    }

    // ==== LISTS ====
    // Top 5 pemakai (periode terbaru tahun ini)
    const latestPeriod = await prisma.catatPeriode.findFirst({
      where: { deletedAt: null, tahun: year },
      orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
      select: { id: true },
    });
    let topUsers: Array<{ name: string; usage: number; address: string }> = [];
    if (latestPeriod) {
      const tops = await prisma.catatMeter.findMany({
        where: { deletedAt: null, periodeId: latestPeriod.id },
        orderBy: { pemakaianM3: "desc" },
        take: 5,
        select: {
          pemakaianM3: true,
          pelanggan: { select: { nama: true, alamat: true } },
        },
      });
      topUsers = tops.map((r) => ({
        name: r.pelanggan?.nama ?? "-",
        address: r.pelanggan?.alamat ?? "-",
        usage: r.pemakaianM3 ?? 0,
      }));
    }

    // Unpaid list (10 terbaru)
    const unpaidTagihans = await prisma.tagihan.findMany({
      where: { deletedAt: null, statusBayar: { not: "PAID" } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        totalTagihan: true,
        periode: true,
        pelanggan: { select: { nama: true } },
      },
    });
    const unpaidList = unpaidTagihans.map((t) => ({
      name: t.pelanggan?.nama ?? "-",
      amount: t.totalTagihan ?? 0,
      period: t.periode ?? "-",
    }));

    // Water issues (CatatMeter.kendala terbaru)
    const issues = await prisma.catatMeter.findMany({
      where: { deletedAt: null, kendala: { not: null } },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        kendala: true,
        updatedAt: true,
        pelanggan: { select: { nama: true } },
      },
    });
    const waterIssues = issues.map((i) => ({
      issue: `${i.kendala} - ${i.pelanggan?.nama ?? "Pelanggan"}`,
      status: "unresolved",
      date: i.updatedAt.toISOString().slice(0, 10),
    }));

    // ==== STAT CARDS + TREND ====
    const currY = year;
    const currM = now.getMonth() + 1;
    const { y: prevY, m: prevM } = prevYM(currY, currM);

    const periodeNow = `${currY}-${pad2(currM)}`;
    const periodePrev = `${prevY}-${pad2(prevM)}`;

    // 1) Tagihan bulan ini & bulan lalu
    const tagihanCurr = await prisma.tagihan.aggregate({
      where: { deletedAt: null, periode: periodeNow },
      _sum: { totalTagihan: true },
      _count: true,
    });
    const tagihanPrev = await prisma.tagihan.aggregate({
      where: { deletedAt: null, periode: periodePrev },
      _sum: { totalTagihan: true },
      _count: true,
    });

    // 2) Belum bayar (hanya untuk masing-masing periode)
    const belumBayarCurr = await prisma.tagihan.aggregate({
      where: {
        deletedAt: null,
        periode: periodeNow,
        statusBayar: { not: "PAID" },
      },
      _sum: { totalTagihan: true },
      _count: true,
    });
    const belumBayarPrev = await prisma.tagihan.aggregate({
      where: {
        deletedAt: null,
        periode: periodePrev,
        statusBayar: { not: "PAID" },
      },
      _sum: { totalTagihan: true },
      _count: true,
    });

    // 3) Total pelanggan aktif (bandingkan MoM — nilai biasanya sama)
    const totalPelangganNow = await prisma.pelanggan.count({
      where: { deletedAt: null, statusAktif: true },
    });
    // heuristik: anggap sama dengan sekarang (atau kamu bisa hitung createdAt<=cutoff bila ada field itu)
    const totalPelangganPrev = totalPelangganNow;

    // 4) Paying rate per-periode (bulan ini vs bulan lalu)
    const paidCurr = await prisma.pembayaran.aggregate({
      where: {
        deletedAt: null,
        tagihan: { deletedAt: null, periode: periodeNow },
      },
      _sum: { jumlahBayar: true },
    });
    const totalTagCurr = tagihanCurr._sum.totalTagihan ?? 0;
    const payingRateCurr = totalTagCurr
      ? (paidCurr._sum.jumlahBayar ?? 0) / totalTagCurr
      : 0;

    const paidPrev = await prisma.pembayaran.aggregate({
      where: {
        deletedAt: null,
        tagihan: { deletedAt: null, periode: periodePrev },
      },
      _sum: { jumlahBayar: true },
    });
    const totalTagPrev = tagihanPrev._sum.totalTagihan ?? 0;
    const payingRatePrev = totalTagPrev
      ? (paidPrev._sum.jumlahBayar ?? 0) / totalTagPrev
      : 0;

    const trends = {
      totalTagihan: {
        value: Math.round(
          pctChange(
            tagihanCurr._sum.totalTagihan ?? 0,
            tagihanPrev._sum.totalTagihan ?? 0
          )
        ),
        isPositive:
          (tagihanCurr._sum.totalTagihan ?? 0) >=
          (tagihanPrev._sum.totalTagihan ?? 0),
      },
      totalBelumBayar: {
        value: Math.round(
          pctChange(
            belumBayarCurr._sum.totalTagihan ?? 0,
            belumBayarPrev._sum.totalTagihan ?? 0
          )
        ),
        isPositive:
          (belumBayarCurr._sum.totalTagihan ?? 0) <=
          (belumBayarPrev._sum.totalTagihan ?? 0), // turun = bagus
      },
      pelanggan: {
        value: Math.round(pctChange(totalPelangganNow, totalPelangganPrev)),
        isPositive: totalPelangganNow >= totalPelangganPrev,
      },
      payingRate: {
        value: Math.round(pctChange(payingRateCurr, payingRatePrev)),
        isPositive: payingRateCurr >= payingRatePrev,
      },
    };

    return NextResponse.json({
      usageData,
      billingData,
      tableData,
      topUsers,
      unpaidList,
      waterIssues,
      statCards: {
        totalTagihanBulanIni: tagihanCurr._sum.totalTagihan ?? 0,
        totalTagihanCount: tagihanCurr._count ?? 0,
        totalBelumBayarAmount: belumBayarCurr._sum.totalTagihan ?? 0,
        totalBelumBayarCount: belumBayarCurr._count ?? 0,
        totalPelanggan: totalPelangganNow,
        payingRate: payingRateCurr,
        trends,
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

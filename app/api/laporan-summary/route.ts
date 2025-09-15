// app/api/laporan-summary/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function emptyWater() {
  return MONTHS.map((m) => ({
    month: m,
    total: 0,
    blokA: 0,
    blokB: 0,
    blokC: 0,
  }));
}
function emptyRevenue() {
  return MONTHS.map((m) => ({ month: m, amount: 0 }));
}
function emptyExpenses() {
  return MONTHS.map((m) => ({ month: m, operasional: 0, lainnya: 0 }));
}

function toMonthIdx(d: Date) {
  const dt = new Date(d);
  return dt.getMonth(); // 0..11
}
function isOperasional(name?: string) {
  if (!name) return false;
  const n = name.toLowerCase();
  return [
    "operasional",
    "gaji",
    "utilitas",
    "listrik",
    "transport",
    "administrasi",
    "maintenance",
    "material",
  ].some((k) => n.includes(k));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year") ?? new Date().getFullYear());

    // ===== WATER USAGE dari CatatMeter (join CatatPeriode untuk filter tahun) =====
    // Ambil catat meter untuk periode di tahun tsb
    const cm = await prisma.catatMeter.findMany({
      where: {
        deletedAt: null,
        periode: { tahun: year },
      },
      select: {
        pemakaianM3: true,
        zonaNamaSnapshot: true,
        periode: { select: { bulan: true } }, // 1..12
      },
    });

    const water = emptyWater();
    // Petakan nama zona ke 3 bucket (blokA/B/C) agar grafik tetap konsisten
    // Urutkan berdasarkan kemunculan
    const zonaOrder: string[] = [];
    for (const row of cm) {
      const monthIdx = (row.periode.bulan ?? 1) - 1;
      const val = row.pemakaianM3 ?? 0;
      water[monthIdx].total += val;

      const z = (row.zonaNamaSnapshot ?? "").trim();
      if (z) {
        if (!zonaOrder.includes(z) && zonaOrder.length < 3) zonaOrder.push(z);
      }
    }
    // fallback default nama blok
    while (zonaOrder.length < 3)
      zonaOrder.push(`Blok ${String.fromCharCode(65 + zonaOrder.length)}`);

    // jumlahkan lagi per-zona ke 3 seri
    for (const row of cm) {
      const monthIdx = (row.periode.bulan ?? 1) - 1;
      const val = row.pemakaianM3 ?? 0;
      const z = (row.zonaNamaSnapshot ?? zonaOrder[2]).trim();
      const index = Math.max(0, zonaOrder.indexOf(z));
      if (index === 0) water[monthIdx].blokA += val;
      else if (index === 1) water[monthIdx].blokB += val;
      else water[monthIdx].blokC += val;
    }

    // ===== REVENUE dari Pembayaran LUNAS =====
    // Filter by tahun di tanggalBayar + hanya Tagihan PAID
    const pays = await prisma.pembayaran.findMany({
      where: {
        deletedAt: null,
        tanggalBayar: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        },
        tagihan: { statusBayar: "PAID", deletedAt: null },
      },
      select: { tanggalBayar: true, jumlahBayar: true },
    });

    const revenue = emptyRevenue();
    for (const p of pays) {
      const idx = toMonthIdx(p.tanggalBayar);
      revenue[idx].amount += p.jumlahBayar ?? 0;
    }

    // ===== EXPENSES dari Pengeluaran & Detail =====
    // Ambil detail + join masterBiaya + header (tanggalPengeluaran)
    const details = await prisma.pengeluaranDetail.findMany({
      where: {
        pengeluaran: {
          tanggalPengeluaran: {
            gte: new Date(Date.UTC(year, 0, 1)),
            lt: new Date(Date.UTC(year + 1, 0, 1)),
          },
        },
      },
      select: {
        nominal: true,
        pengeluaran: { select: { tanggalPengeluaran: true } },
        masterBiaya: { select: { nama: true } },
      },
    });

    const expenses = emptyExpenses();
    for (const d of details) {
      const idx = toMonthIdx(d.pengeluaran.tanggalPengeluaran);
      const amt = d.nominal ?? 0;
      if (isOperasional(d.masterBiaya?.nama)) expenses[idx].operasional += amt;
      else expenses[idx].lainnya += amt;
    }

    // ===== PROFIT/LOSS =====
    const profitLoss = MONTHS.map((m, i) => ({
      month: m,
      profit:
        revenue[i].amount - (expenses[i].operasional + expenses[i].lainnya),
    }));

    // ===== UNPAID BILLS =====
    const unpaid = await prisma.tagihan.findMany({
      where: { deletedAt: null, statusBayar: { not: "PAID" } },
      take: 50,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        periode: true,
        totalTagihan: true,
        pelanggan: {
          select: {
            nama: true,
            zona: { select: { nama: true } },
          },
        },
      },
    });

    const unpaidBills = unpaid.map((t) => ({
      id: t.id,
      nama: t.pelanggan?.nama ?? "-",
      blok: t.pelanggan?.zona?.nama ?? "-",
      periode: t.periode,
      nominal: t.totalTagihan,
      status: "unpaid" as const,
    }));

    return NextResponse.json({
      waterUsageData: water,
      revenueData: revenue,
      expenseData: expenses,
      profitLossData: profitLoss,
      unpaidBills,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

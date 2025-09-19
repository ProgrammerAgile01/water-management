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
    blokD: 0,
    blokE: 0,
    blokF: 0,
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
    // 1) Tambah join pelanggan.zona.nama
    const cm = await prisma.catatMeter.findMany({
      where: {
        deletedAt: null,
        periode: { tahun: year },
      },
      select: {
        pemakaianM3: true,
        zonaNamaSnapshot: true,
        periode: { select: { bulan: true } }, // 1..12
        // >>> tambahkan ini:
        pelanggan: { select: { zona: { select: { nama: true } } } },
      },
    });

    // 2) Saat bikin zonaOrder & akumulasi total, pakai fallback ke pelanggan.zona.nama
    const water = emptyWater();
    const zonaOrder: string[] = [];

    for (const row of cm) {
      const monthIdx = (row.periode.bulan ?? 1) - 1;
      const val = row.pemakaianM3 ?? 0;
      water[monthIdx].total += val;

      const z =
        row.zonaNamaSnapshot?.trim() || row.pelanggan?.zona?.nama?.trim() || "";
      if (z && !zonaOrder.includes(z) && zonaOrder.length < 6) {
        zonaOrder.push(z);
      }
    }

    // 3) Mapping ke blok A..F juga pakai fallback yang sama
    for (const row of cm) {
      const monthIdx = (row.periode.bulan ?? 1) - 1;
      const val = row.pemakaianM3 ?? 0;

      const z =
        row.zonaNamaSnapshot?.trim() ||
        row.pelanggan?.zona?.nama?.trim() ||
        zonaOrder[5]; // terakhir fallback

      let idx = zonaOrder.indexOf(z);
      if (idx < 0) idx = 5;

      switch (idx) {
        case 0:
          water[monthIdx].blokA += val;
          break;
        case 1:
          water[monthIdx].blokB += val;
          break;
        case 2:
          water[monthIdx].blokC += val;
          break;
        case 3:
          water[monthIdx].blokD += val;
          break;
        case 4:
          water[monthIdx].blokE += val;
          break;
        default:
          water[monthIdx].blokF += val;
          break;
      }
    }

    // ===== REVENUE dari Pembayaran LUNAS =====
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

    // Kirim juga label zona (maks 6) agar legend di frontend sesuai nama asli
    const zoneNames = zonaOrder;

    return NextResponse.json({
      waterUsageData: water,
      revenueData: revenue,
      expenseData: expenses,
      profitLossData: profitLoss,
      unpaidBills,
      zoneNames,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

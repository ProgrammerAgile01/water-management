// //app/api/laporan/keuangan/summary/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

// export const dynamic = "force-dynamic";
// export const runtime = "nodejs";

// const isYm = (x?: string | null) => !!x && /^\d{4}-\d{2}$/.test(x || "");

// function monthRange(ym: string) {
//   const [y, m] = ym.split("-").map(Number);
//   const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
//   const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
//   return { start, end };
// }

// export async function GET(req: NextRequest) {
//   try {
//     const sp = req.nextUrl.searchParams;
//     const periode = sp.get("periode") || "";
//     if (!isYm(periode)) {
//       return NextResponse.json(
//         { ok: false, message: "periode harus YYYY-MM" },
//         { status: 400 }
//       );
//     }

//     const { start, end } = monthRange(periode);

//     // ===== SALDO AWAL (s.d. sebelum awal bulan terpilih)
//     // IN: pembayaran dengan tanggalBayar < start
//     const prevPays = await prisma.pembayaran.findMany({
//       where: { deletedAt: null, tanggalBayar: { lt: start } },
//       select: { jumlahBayar: true },
//     });
//     const prevIn = prevPays.reduce((s, p) => s + (p.jumlahBayar || 0), 0);

//     // OUT: pengeluaran CLOSE < start (tanggalInput)
//     const prevOutPengeluaran = await prisma.pengeluaranDetail.findMany({
//       where: { pengeluaran: { status: "CLOSE", tanggalInput: { lt: start } } },
//       select: { nominal: true },
//     });
//     const prevOutPengeluaranSum = prevOutPengeluaran.reduce(
//       (s, d) => s + (d.nominal || 0),
//       0
//     );

//     // OUT: purchase CLOSE < start (tanggal)
//     const prevPurchases = await prisma.purchase.findMany({
//       where: { deletedAt: null, status: "CLOSE", tanggal: { lt: start } },
//       select: { total: true },
//     });
//     const prevPurchasesSum = prevPurchases.reduce(
//       (s, d) => s + (d.total || 0),
//       0
//     );

//     const saldoAwal = prevIn - (prevOutPengeluaranSum + prevPurchasesSum);

//     // ===== BULAN BERJALAN
//     // IN: pembayaran dengan tanggalBayar pada bulan ini
//     const pays = await prisma.pembayaran.findMany({
//       where: { deletedAt: null, tanggalBayar: { gte: start, lt: end } },
//       select: { jumlahBayar: true },
//     });
//     const totalMasuk = pays.reduce((s, p) => s + (p.jumlahBayar || 0), 0);

//     // OUT: pengeluaran CLOSE pada bulan ini
//     const outs = await prisma.pengeluaranDetail.findMany({
//       where: {
//         pengeluaran: { status: "CLOSE", tanggalInput: { gte: start, lt: end } },
//       },
//       select: { nominal: true },
//     });
//     const totalKeluarPengeluaran = outs.reduce(
//       (s, d) => s + (d.nominal || 0),
//       0
//     );

//     // OUT: purchase CLOSE pada bulan ini
//     const pcs = await prisma.purchase.findMany({
//       where: {
//         deletedAt: null,
//         status: "CLOSE",
//         tanggal: { gte: start, lt: end },
//       },
//       select: { total: true },
//     });
//     const totalKeluarPurchase = pcs.reduce((s, d) => s + (d.total || 0), 0);

//     const totalKeluar = totalKeluarPengeluaran + totalKeluarPurchase;
//     const saldoAkhir = saldoAwal + totalMasuk - totalKeluar;

//     return NextResponse.json({
//       ok: true,
//       data: { periode, saldoAwal, totalMasuk, totalKeluar, saldoAkhir },
//     });
//   } catch (e: any) {
//     console.error("summary error", e);
//     return NextResponse.json(
//       { ok: false, message: e?.message || "Gagal memuat summary" },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const isYm = (x?: string | null) => !!x && /^\d{4}-\d{2}$/.test(x || "");

function monthRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  return { start, end };
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const periode = sp.get("periode") || "";
    if (!isYm(periode)) {
      return NextResponse.json(
        { ok: false, message: "periode harus YYYY-MM" },
        { status: 400 }
      );
    }

    const { start, end } = monthRange(periode);

    // ===== SALDO AWAL (s.d. sebelum awal bulan terpilih)
    // IN: pembayaran tagihan < start
    const prevPays = await prisma.pembayaran.aggregate({
      where: { deletedAt: null, tanggalBayar: { lt: start } },
      _sum: { jumlahBayar: true },
    });
    const prevInTagihan = prevPays._sum.jumlahBayar || 0;

    // (BARU) IN: hutang (detail) < start (tanggalInput)
    const prevHutang = await prisma.hutangDetail.aggregate({
      where: { hutang: { tanggalInput: { lt: start } } },
      _sum: { nominal: true },
    });
    const prevInHutang = prevHutang._sum.nominal || 0;

    // OUT: pengeluaran CLOSE < start (tanggalInput)
    const prevOutPengeluaran = await prisma.pengeluaranDetail.aggregate({
      where: { pengeluaran: { status: "CLOSE", tanggalInput: { lt: start } } },
      _sum: { nominal: true },
    });
    const prevOutPengeluaranSum = prevOutPengeluaran._sum.nominal || 0;

    // OUT: purchase CLOSE < start (tanggal)
    const prevPurchases = await prisma.purchase.aggregate({
      where: { deletedAt: null, status: "CLOSE", tanggal: { lt: start } },
      _sum: { total: true },
    });
    const prevPurchasesSum = prevPurchases._sum.total || 0;

    // (BARU) OUT: pembayaran hutang (detail) < start (tanggalBayar)
    const prevHutangPay = await prisma.hutangPaymentDetail.aggregate({
      where: { payment: { tanggalBayar: { lt: start } } },
      _sum: { amount: true },
    });
    const prevOutHutangPay = prevHutangPay._sum.amount || 0;

    const saldoAwal =
      prevInTagihan +
      prevInHutang -
      (prevOutPengeluaranSum + prevPurchasesSum + prevOutHutangPay);

    // ===== BULAN BERJALAN
    // IN: pembayaran tagihan pada bulan ini
    const pays = await prisma.pembayaran.aggregate({
      where: { deletedAt: null, tanggalBayar: { gte: start, lt: end } },
      _sum: { jumlahBayar: true },
    });
    const inTagihan = pays._sum.jumlahBayar || 0;

    // (BARU) IN: hutang (detail) pada bulan ini
    const hutangAgg = await prisma.hutangDetail.aggregate({
      where: { hutang: { tanggalInput: { gte: start, lt: end } } },
      _sum: { nominal: true },
    });
    const inHutang = hutangAgg._sum.nominal || 0;

    // OUT: pengeluaran CLOSE pada bulan ini
    const outs = await prisma.pengeluaranDetail.aggregate({
      where: {
        pengeluaran: { status: "CLOSE", tanggalInput: { gte: start, lt: end } },
      },
      _sum: { nominal: true },
    });
    const outPengeluaran = outs._sum.nominal || 0;

    // OUT: purchase CLOSE pada bulan ini
    const pcs = await prisma.purchase.aggregate({
      where: {
        deletedAt: null,
        status: "CLOSE",
        tanggal: { gte: start, lt: end },
      },
      _sum: { total: true },
    });
    const outPurchase = pcs._sum.total || 0;

    // (BARU) OUT: pembayaran hutang (detail) pada bulan ini
    const hutangPayAgg = await prisma.hutangPaymentDetail.aggregate({
      where: { payment: { tanggalBayar: { gte: start, lt: end } } },
      _sum: { amount: true },
    });
    const outHutangPay = hutangPayAgg._sum.amount || 0;

    const totalMasuk = inTagihan + inHutang;
    const totalKeluar = outPengeluaran + outPurchase + outHutangPay;
    const saldoAkhir = saldoAwal + totalMasuk - totalKeluar;

    return NextResponse.json({
      ok: true,
      data: { periode, saldoAwal, totalMasuk, totalKeluar, saldoAkhir },
    });
  } catch (e: any) {
    console.error("summary error", e);
    return NextResponse.json(
      { ok: false, message: e?.message || "Gagal memuat summary" },
      { status: 500 }
    );
  }
}

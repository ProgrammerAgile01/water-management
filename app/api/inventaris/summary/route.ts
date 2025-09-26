import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // batas bulan ini (lokal)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const dayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0
    );

    const [
      items,
      pembelianBulan,
      pembelianHari,
      lastPurchase,
      recentPurchases,
    ] = await Promise.all([
      prisma.item.findMany({
        where: { deletedAt: null },
        select: { id: true, stok: true, hargaBeli: true },
      }),
      prisma.purchase.aggregate({
        _sum: { total: true },
        where: { deletedAt: null, tanggal: { gte: monthStart } },
      }),
      prisma.purchase.count({
        where: { deletedAt: null, tanggal: { gte: dayStart } },
      }),
      prisma.purchase.findFirst({
        where: { deletedAt: null },
        orderBy: { tanggal: "desc" },
        select: { tanggal: true },
      }),
      prisma.purchase.findMany({
        where: { deletedAt: null },
        orderBy: { tanggal: "desc" },
        take: 10,
        select: {
          id: true,
          tanggal: true,
          supplier: true,
          qty: true,
          harga: true,
          total: true,
          item: { select: { nama: true } },
        },
      }),
    ]);

    const totalItems = items.length;
    const totalStok = items.reduce((a, b) => a + (b.stok || 0), 0);
    const nilaiPersediaan = items.reduce(
      (a, b) => a + (b.stok || 0) * (b.hargaBeli || 0),
      0
    );

    const data = {
      totalItems,
      totalStok,
      nilaiPersediaan,
      pembelianBulanIni: pembelianBulan._sum.total || 0,
      pembelianHariIni: pembelianHari,
      lastPurchaseAt: lastPurchase?.tanggal?.toISOString() ?? null,
      recentPurchases: recentPurchases.map((p) => ({
        id: p.id,
        tanggal: p.tanggal.toISOString(),
        itemNama: p.item?.nama || "-",
        supplier: p.supplier,
        qty: p.qty,
        harga: p.harga,
        total: p.total,
      })),
    };

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message },
      { status: 500 }
    );
  }
}

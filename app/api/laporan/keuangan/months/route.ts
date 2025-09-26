import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// YYYY-MM (UTC-safe)
function ymUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function GET() {
  try {
    const [pays, outs, purchases] = await Promise.all([
      prisma.pembayaran.findMany({
        where: {
          /* deletedAt: null, */
        },
        select: { tanggalBayar: true },
      }),
      prisma.pengeluaran.findMany({
        where: {
          /* deletedAt: null, */
        },
        select: {
          tanggalInput: true,
          tanggalPengeluaran: true,
          createdAt: true,
        },
      }),
      prisma.purchase.findMany({
        where: { deletedAt: null },
        select: { tanggal: true },
      }),
    ]);

    const set = new Set<string>();

    // IN (pembayaran)
    for (const p of pays)
      if (p.tanggalBayar) set.add(ymUTC(new Date(p.tanggalBayar)));

    // OUT (pengeluaran header)
    for (const o of outs) {
      const src = o.tanggalInput ?? o.tanggalPengeluaran ?? o.createdAt;
      if (src) set.add(ymUTC(new Date(src)));
    }

    // OUT (purchases)
    for (const pu of purchases)
      if (pu.tanggal) set.add(ymUTC(new Date(pu.tanggal)));

    const periods = Array.from(set).sort((a, b) => (a < b ? 1 : -1));
    return NextResponse.json({ ok: true, periods });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

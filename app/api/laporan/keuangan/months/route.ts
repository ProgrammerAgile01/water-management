// app/api/laporan/keuangan/months/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ym(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function GET() {
  try {
    // Ambil seluruh bulan unik dari pembayaran.tanggalBayar & pengeluaran.tanggalInput
    const [pays, outs] = await Promise.all([
      prisma.pembayaran.findMany({
        where: { deletedAt: null },
        select: { tanggalBayar: true },
      }),
      prisma.pengeluaran.findMany({
        select: { tanggalInput: true },
      }),
    ]);

    const set = new Set<string>();
    for (const p of pays)
      if (p.tanggalBayar) set.add(ym(new Date(p.tanggalBayar)));
    for (const o of outs)
      if (o.tanggalInput) set.add(ym(new Date(o.tanggalInput)));

    // urut desc (terbaru dulu)
    const periods = Array.from(set).sort((a, b) => (a < b ? 1 : -1));

    return NextResponse.json({ ok: true, periods });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

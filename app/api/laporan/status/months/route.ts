import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // sumber utama dari CatatPeriode agar rapi (YYYY-MM)
  const periods = await prisma.catatPeriode.findMany({
    select: { kodePeriode: true },
    orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
  });

  // fallback kalau belum ada CatatPeriode: ambil distinct dari Tagihan
  if (!periods.length) {
    const g = await prisma.tagihan.groupBy({ by: ["periode"] });
    const sorted = g.map(x => x.periode).filter(Boolean).sort((a, b) => (a! < b! ? 1 : -1));
    return NextResponse.json({ ok: true, periods: sorted });
  }

  return NextResponse.json({ ok: true, periods: periods.map(p => p.kodePeriode) });
}
// app/api/pajak/months/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const periods = await prisma.catatPeriode.findMany({
      orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
      select: { id: true, kodePeriode: true, bulan: true, tahun: true },
      take: 200,
    });

    const mapped = periods.map((p) => ({
      id: p.id,
      kode: p.kodePeriode ?? `${p.tahun}-${String(p.bulan).padStart(2, "0")}`,
      bulan: p.bulan,
      tahun: p.tahun,
    }));

    return NextResponse.json({ ok: true, periods: mapped });
  } catch (err: any) {
    console.error("GET /api/pajak/months error", err);
    return NextResponse.json(
      { ok: false, message: err.message || String(err) },
      { status: 500 }
    );
  }
}

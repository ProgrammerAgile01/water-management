import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Ambil DISTINCT periode dari tabel Tagihan (DESC) untuk dropdown UI.
 * TIDAK ada pergeseran bulan di sini.
 */
export async function GET(req: NextRequest) {
  const tagihanPeriods = await prisma.tagihan.findMany({
    select: { periode: true },
    distinct: ["periode"],
    orderBy: { periode: "desc" },
  });

  const periods = tagihanPeriods.map((p) => p.periode);
  return NextResponse.json({ ok: true, periods });
}

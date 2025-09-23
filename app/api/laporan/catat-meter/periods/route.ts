import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserWithRole } from "@/lib/auth-user-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const me = await getAuthUserWithRole(req);
    if (!me) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (me.role !== "ADMIN" && me.role !== "PETUGAS") {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    // Ambil periode FINAL yang benar-benar punya catat meter DONE
    const periods = await prisma.catatPeriode.findMany({
      where: {
        status: "FINAL",
        entries: { some: { status: "DONE", deletedAt: null } },
      },
      select: { kodePeriode: true },
      orderBy: { kodePeriode: "desc" }, // "YYYY-MM" aman secara lexicographic
    });

    // unik + urut (jaga-jaga kalau ada duplikat)
    const uniq = Array.from(new Set(periods.map(p => p.kodePeriode))).filter(Boolean);

    return NextResponse.json({ ok: true, periods: uniq });
  } catch (e: any) {
    console.error("ERR /api/laporan/catat-meter/periods:", e);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

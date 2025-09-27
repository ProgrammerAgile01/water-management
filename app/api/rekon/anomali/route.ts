import { NextRequest, NextResponse } from "next/server";
import { computeAnomaliPerZonaPerPeriode } from "@/lib/rekon-anomali";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const periode = searchParams.get("periode") || "";
    const zonaId = searchParams.get("zonaId") || "";

    if (!periode || !/^\d{4}-\d{2}$/.test(periode)) {
      return NextResponse.json({ ok: false, error: "PERIODE_INVALID" }, { status: 400 });
    }
    if (!zonaId) {
      return NextResponse.json({ ok: false, error: "ZONA_ID_REQUIRED" }, { status: 400 });
    }

    // validasi zona
    const zona = await prisma.zona.findUnique({ where: { id: zonaId }, select: { id: true } });
    if (!zona) {
      return NextResponse.json({ ok: false, error: "ZONA_NOT_FOUND" }, { status: 404 });
    }

    const data = await computeAnomaliPerZonaPerPeriode(periode, zonaId);
    return NextResponse.json({ ok: true, ...data });
  } catch (err: any) {
    console.error("GET /api/rekon/anomali error:", err);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/** opsional: list periode FINAL + list zona untuk dropdown filter */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const type = body?.type || "filters";

    if (type === "filters") {
      const periods = await prisma.catatPeriode.findMany({
        where: { status: "FINAL", deletedAt: null },
        select: { kodePeriode: true },
        orderBy: { kodePeriode: "desc" },
        take: 18,
      });
      const zonas = await prisma.zona.findMany({
        select: { id: true, nama: true },
        orderBy: { nama: "asc" },
      });
      return NextResponse.json({
        ok: true,
        periods: periods.map(p => p.kodePeriode),
        zonas,
      });
    }

    return NextResponse.json({ ok: false, error: "UNKNOWN_POST_TYPE" }, { status: 400 });
  } catch (err) {
    console.error("POST /api/rekon/anomali error:", err);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
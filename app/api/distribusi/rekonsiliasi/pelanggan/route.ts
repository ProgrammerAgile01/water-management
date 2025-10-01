import { NextRequest, NextResponse } from "next/server";
import { getPeriodeIdByKode, getPelangganPemakaianByBlok } from "@/lib/rekon-balance";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const kodePeriode = searchParams.get("periode"); // YYYY-MM
    const zonaId = searchParams.get("zonaId");

    if (!kodePeriode || !zonaId) {
      return NextResponse.json(
        { ok: false, error: "periode (YYYY-MM) dan zonaId wajib diisi" },
        { status: 400 }
      );
    }

    const periodeId = await getPeriodeIdByKode(kodePeriode);
    if (!periodeId) {
      return NextResponse.json({ ok: false, error: "periode not found" }, { status: 404 });
    }

    const rows = await getPelangganPemakaianByBlok(periodeId, zonaId);
    return NextResponse.json({ ok: true, periode: kodePeriode, zonaId, rows });
  } catch (e) {
    console.error("GET /api/distribusi/rekonsiliasi/pelanggan", e);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server";
import { getPeriodeIdByKode, getTandonBalances } from "@/lib/rekon-balance";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const kodePeriode = searchParams.get("periode"); // "YYYY-MM"
    if (!kodePeriode) {
      return NextResponse.json({ ok: false, error: "periode is required (YYYY-MM)" }, { status: 400 });
    }
    const periodeId = await getPeriodeIdByKode(kodePeriode);
    if (!periodeId) {
      return NextResponse.json({ ok: false, error: "periode not found" }, { status: 404 });
    }
    const rows = await getTandonBalances(periodeId);
    return NextResponse.json({ ok: true, periode: kodePeriode, rows });
  } catch (e) {
    console.error("GET /api/distribusi/rekonsiliasi/tandon", e);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
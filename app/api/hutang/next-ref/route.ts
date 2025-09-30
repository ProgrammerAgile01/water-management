import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tanggal = (searchParams.get("tanggal") || "").trim(); // "YYYY-MM-DD"
    if (!tanggal)
      return NextResponse.json(
        { ok: false, error: "tanggal_required" },
        { status: 400 }
      );

    const y = tanggal.slice(0, 4);
    const m = tanggal.slice(5, 7);
    const d = tanggal.slice(8, 10);
    const ymd = `${y}${m}${d}`;

    const start = new Date(`${y}-${m}-${d}T00:00:00+07:00`);
    const end = new Date(`${y}-${m}-${d}T23:59:59.999+07:00`);

    // gunakan tanggalHutang (bukan field fiktif “tanggal”)
    const countToday = await prisma.hutang.count({
      where: { tanggalHutang: { gte: start, lte: end } },
    });

    const seq = String(countToday + 1).padStart(4, "0");
    const candidate = `HUT-${ymd}-${seq}`;

    return NextResponse.json({ ok: true, refNo: candidate });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "ERR_NEXT_REF" },
      { status: 500 }
    );
  }
}

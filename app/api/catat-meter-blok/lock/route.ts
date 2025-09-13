import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { id, lock } = await req.json();
    if (!id)
      return NextResponse.json(
        { ok: false, message: "id wajib" },
        { status: 400 }
      );

    const row = await prisma.catatMeterBlok.findUnique({
      where: { id },
      select: { id: true, periode: { select: { isLocked: true } } },
    });
    if (!row)
      return NextResponse.json(
        { ok: false, message: "Tidak ditemukan" },
        { status: 404 }
      );
    if (row.periode.isLocked)
      return NextResponse.json(
        { ok: false, message: "Periode terkunci" },
        { status: 423 }
      );

    await prisma.catatMeterBlok.update({
      where: { id },
      data: { isLocked: !!lock },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

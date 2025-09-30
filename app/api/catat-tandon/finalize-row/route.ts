// app/api/catat-tandon/finalize-row/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function nextYm(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() + 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

export async function POST(req: NextRequest) {
  try {
    const { id } = (await req.json()) as { id: string };
    if (!id)
      return NextResponse.json(
        { ok: false, message: "id wajib" },
        { status: 400 }
      );

    const row = await prisma.tandonReading.findUnique({
      where: { id },
      include: { periode: true, tandon: true },
    });
    if (!row)
      return NextResponse.json(
        { ok: false, message: "Tidak ditemukan" },
        { status: 404 }
      );
    if (row.isLocked)
      return NextResponse.json(
        { ok: false, message: "Sudah terkunci" },
        { status: 409 }
      );
    if (row.meterAkhir == null) {
      return NextResponse.json(
        { ok: false, message: "Isi meterAkhir dulu" },
        { status: 400 }
      );
    }

    // finalize current row
    await prisma.tandonReading.update({
      where: { id: row.id },
      data: {
        isLocked: true,
        lockedAt: new Date(),
        status: "DONE",
      },
    });

    // seed next period's meterAwal = current meterAkhir (if next period exists / create it)
    const currYm = row.periode.kodePeriode;
    const next = nextYm(currYm);

    let nextPeriode = await prisma.catatPeriode.findUnique({
      where: { kodePeriode: next },
    });
    if (nextPeriode) {
      // ensure next row exists/upsert
      await prisma.tandonReading.upsert({
        where: {
          uniq_periode_tandon: {
            periodeId: nextPeriode.id,
            tandonId: row.tandonId,
          },
        },
        update: { meterAwal: row.meterAkhir ?? 0 },
        create: {
          periodeId: nextPeriode.id,
          tandonId: row.tandonId,
          meterAwal: row.meterAkhir ?? 0,
          status: "PENDING",
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Error" },
      { status: 500 }
    );
  }
}

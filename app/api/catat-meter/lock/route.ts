// app/api/catat-meter/lock/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/catat-meter/lock
 * Body: { id: string; lock: boolean }
 * - Mengunci / membuka kunci entri catatMeter per pelanggan
 * - Menolak jika periode sudah dikunci (level periode menang)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id: string | undefined = body?.id;
    const lock: boolean = !!body?.lock;

    if (!id) {
      return NextResponse.json(
        { ok: false, message: "ID wajib disertakan" },
        { status: 400 }
      );
    }

    // Ambil entri & status lock periodenya
    const row = await prisma.catatMeter.findUnique({
      where: { id },
      select: {
        id: true,
        isLocked: true,
        deletedAt: true,
        periode: { select: { id: true, isLocked: true, kodePeriode: true } },
      },
    });

    if (!row || row.deletedAt) {
      return NextResponse.json(
        { ok: false, message: "Data tidak ditemukan" },
        { status: 404 }
      );
    }

    // Jika periode sudah dikunci → tidak boleh ubah apapun di level row
    if (row.periode.isLocked) {
      return NextResponse.json(
        { ok: false, message: "Periode sudah dikunci." },
        { status: 423 }
      );
    }

    // Idempotent: kalau statusnya sudah sesuai, langsung balas ok
    if (row.isLocked === lock) {
      return NextResponse.json({
        ok: true,
        locked: row.isLocked,
        periode: row.periode.kodePeriode,
        message: lock ? "Entri sudah terkunci." : "Entri sudah terbuka.",
      });
    }

    // Update lock per baris
    const updated = await prisma.catatMeter.update({
      where: { id },
      data: { isLocked: lock },
      select: { id: true, isLocked: true },
    });

    return NextResponse.json({
      ok: true,
      locked: updated.isLocked,
      message: updated.isLocked ? "Entri berhasil dikunci." : "Kunci dibuka.",
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

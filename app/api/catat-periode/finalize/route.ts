import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { CatatStatus } from "@prisma/client"

// --- helpers ---
function isPeriodStr(p: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(p)
}

async function calcProgress(periodeId: string) {
  const agg = await prisma.catatMeter.groupBy({
    by: ["status"],
    where: { periodeId, deletedAt: null },
    _count: { _all: true },
  })
  const selesai = agg.find(a => a.status === CatatStatus.DONE)?._count._all ?? 0
  const pending = agg.find(a => a.status === CatatStatus.PENDING)?._count._all ?? 0
  const total = selesai + pending
  const percent = total ? Math.round((selesai / total) * 100) : 0
  return { total, selesai, pending, percent }
}

// --- POST /api/catat-periode/finalize ---
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const kodePeriode: string = body?.periode ?? ""
    const finalizedBy: string | undefined = body?.finalizedBy // opsional

    if (!isPeriodStr(kodePeriode)) {
      return NextResponse.json(
        { ok: false, message: "Periode wajib format YYYY-MM" },
        { status: 400 },
      )
    }

    const periode = await prisma.catatPeriode.findUnique({ where: { kodePeriode } })
    if (!periode) {
      return NextResponse.json(
        { ok: false, message: "Periode tidak ditemukan. Jalankan 'Mulai Pencatatan' dahulu." },
        { status: 404 },
      )
    }

    // 1) Normalisasi baris: kalau sudah ada meterAkhir tapi status masih PENDING, set ke DONE dulu
    await prisma.catatMeter.updateMany({
      where: {
        periodeId: periode.id,
        deletedAt: null,
        status: CatatStatus.PENDING,
        meterAkhir: { not: null },
      },
      data: { status: CatatStatus.DONE },
    })

    // 2) Hitung progress terbaru & simpan ke tabel periode
    const progress = await calcProgress(periode.id)
    await prisma.catatPeriode.update({
      where: { id: periode.id },
      data: {
        totalPelanggan: progress.total,
        selesai: progress.selesai,
        pending: progress.pending,
      },
    })

    // 3) Cegah finalize jika masih ada pending
    if (progress.pending > 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "Masih ada pelanggan PENDING. Selesaikan semua pencatatan terlebih dahulu.",
          progress,
        },
        { status: 400 },
      )
    }

    // 4) Kunci periode
    // NOTE: Kalau schema kamu TIDAK punya kolom finalizedAt/finalizedBy, hapus dua field itu.
    await prisma.catatPeriode.update({
      where: { id: periode.id },
      data: {
        isLocked: true,
        // HAPUS dua baris berikut jika tidak ada kolomnya di schema:
        // @ts-ignore
        finalizedAt: new Date(),
        // @ts-ignore
        finalizedBy: finalizedBy || "system",
      },
    })

    // 5) Response kaya informasi supaya FE gampang
    return NextResponse.json({
      ok: true,
      locked: true,
      period: kodePeriode,
      progress: { ...progress, percent: 100 }, // sudah pasti 100%
      message: `Periode ${kodePeriode} berhasil dikunci.`,
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 },
    )
  }
}
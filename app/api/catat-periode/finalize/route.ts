// app/api/catat-periode/finalize/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { CatatStatus } from "@prisma/client"

// ---- helpers ----
function isPeriodStr(p: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(p)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const periode: string = body?.periode ?? ""

    if (!isPeriodStr(periode)) {
      return NextResponse.json(
        { ok: false, message: "periode harus YYYY-MM" },
        { status: 400 },
      )
    }

    // Ambil setting aktif (tarif, abonemen, biaya admin, jatuh tempo)
    const setting = await prisma.setting.findUnique({ where: { id: 1 } })
    if (!setting) {
      return NextResponse.json({ ok: false, message: "Setting tidak ditemukan" }, { status: 500 })
    }

    // Pastikan CatatPeriode ada (kalau belum, buat dari snapshot setting)
    const cp = await prisma.catatPeriode.upsert({
      where: { kodePeriode: periode },
      update: {},
      create: {
        kodePeriode: periode,
        bulan: Number(periode.slice(5, 7)),
        tahun: Number(periode.slice(0, 4)),
        tarifPerM3: setting.tarifPerM3,
        abonemen: setting.abonemen,
        totalPelanggan: 0,
        selesai: 0,
        pending: 0,
        isLocked: false,
        status: "DRAFT",
      },
      select: { id: true, kodePeriode: true },
    })

    // Ambil baris DONE yang BELUM TERKUNCI ⇒ hanya ini yang difinalkan
    const rowsToFinalize = await prisma.catatMeter.findMany({
      where: {
        periodeId: cp.id,
        deletedAt: null,
        status: CatatStatus.DONE,
        isLocked: false,
      },
      select: {
        id: true,
        pelangganId: true,
        pemakaianM3: true,
      },
    })

    // Kalau tidak ada baris yang perlu difinalkan, tetap hitung progres & balas
    if (rowsToFinalize.length === 0) {
      const after = await prisma.catatMeter.findMany({
        where: { periodeId: cp.id, deletedAt: null },
        select: { status: true, isLocked: true },
      })
      const total = after.length
      const selesai = after.filter(r => r.status === CatatStatus.DONE).length
      const pending = Math.max(0, total - selesai)
      const allLocked = after.length > 0 && after.every(r => r.isLocked)

      await prisma.catatPeriode.update({
        where: { id: cp.id },
        data: {
          totalPelanggan: total,
          selesai,
          pending,
          isLocked: allLocked,
          status: allLocked ? "FINAL" : "DRAFT",
          lockedAt: allLocked ? new Date() : null,
        },
      })

      return NextResponse.json({
        ok: true,
        finalizedRows: 0,
        totalRows: total,
        allLocked,
        progress: { total, selesai, pending, percent: total ? Math.round((selesai / total) * 100) : 0 },
        message: "Tidak ada baris baru untuk difinalkan.",
      })
    }

    // Buat/refresh Tagihan untuk baris yang difinalkan + kunci barisnya
    const today = new Date()
    const due = new Date(today.getFullYear(), today.getMonth(), setting.tglJatuhTempo)

    await prisma.$transaction(
      rowsToFinalize.flatMap((r) => {
        const pemakaian = r.pemakaianM3
        const totalTagihan =
          (setting.tarifPerM3 * pemakaian) + setting.abonemen + setting.biayaAdmin

        return [
          prisma.tagihan.upsert({
            where: { pelangganId_periode: { pelangganId: r.pelangganId, periode } },
            update: {
              tarifPerM3: setting.tarifPerM3,
              abonemen: setting.abonemen,
              totalTagihan,
              denda: 0,
              statusBayar: "UNPAID",
              statusVerif: "UNVERIFIED",
              tglJatuhTempo: due,
            },
            create: {
              pelangganId: r.pelangganId,
              periode,
              tarifPerM3: setting.tarifPerM3,
              abonemen: setting.abonemen,
              totalTagihan,
              denda: 0,
              statusBayar: "UNPAID",
              statusVerif: "UNVERIFIED",
              tglJatuhTempo: due,
            },
          }),
          prisma.catatMeter.update({
            where: { id: r.id },
            data: { isLocked: true }, // ← Kunci baris (row-level)
          }),
        ]
      })
    )

    // Hitung ulang progres & tentukan apakah periode ikut terkunci
    const after = await prisma.catatMeter.findMany({
      where: { periodeId: cp.id, deletedAt: null },
      select: { status: true, isLocked: true },
    })

    const total = after.length
    const selesai = after.filter(r => r.status === CatatStatus.DONE).length
    const pending = Math.max(0, total - selesai)
    const allLocked = after.length > 0 && after.every(r => r.isLocked)

    await prisma.catatPeriode.update({
      where: { id: cp.id },
      data: {
        totalPelanggan: total,
        selesai,
        pending,
        isLocked: allLocked,
        status: allLocked ? "FINAL" : "DRAFT",
        lockedAt: allLocked ? new Date() : null,
      },
    })

    return NextResponse.json({
      ok: true,
      finalizedRows: rowsToFinalize.length,
      totalRows: total,
      allLocked,
      progress: { total, selesai, pending, percent: total ? Math.round((selesai / total) * 100) : 0 },
      message: allLocked
        ? `Semua pelanggan sudah terkunci. Periode ${periode} → FINAL.`
        : `Berhasil mengunci ${rowsToFinalize.length} pelanggan. Periode belum final.`,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "Server error" }, { status: 500 })
  }
}

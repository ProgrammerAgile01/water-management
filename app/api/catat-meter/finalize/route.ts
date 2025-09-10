import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const periode = req.nextUrl.searchParams.get("periode") ?? ""
  if (!/^\d{4}-\d{2}$/.test(periode)) {
    return NextResponse.json({ ok: false, message: "periode harus YYYY-MM" }, { status: 400 })
  }

  try {
    // ambil setting aktif
    const setting = await prisma.setting.findUnique({ where: { id: 1 } })
    if (!setting) return NextResponse.json({ ok: false, message: "Setting tidak ditemukan" }, { status: 500 })

    // pastikan CatatPeriode ada
    const cp = await prisma.catatPeriode.upsert({
      where: { kodePeriode: periode },
      update: {}, // nanti di akhir kita update status & progress
      create: {
        kodePeriode: periode,
        bulan: Number(periode.slice(5, 7)),
        tahun: Number(periode.slice(0, 4)),
        tarifPerM3: setting.tarifPerM3,
        abonemen: setting.abonemen,
      },
    })

    // ambil semua catatan periode ini
    const items = await prisma.catatMeter.findMany({
      where: { periode, deletedAt: null },
      select: {
        id: true, pelangganId: true, standAwal: true, standAkhir: true, pemakaianM3: true,
        pelanggan: { select: { id: true } },
      },
    })

    if (items.length === 0) {
      return NextResponse.json({ ok: false, message: "Belum ada catatan untuk periode ini" }, { status: 400 })
    }

    // validasi: semua harus sudah diisi benar
    const invalid = items.filter(i => (i.standAkhir ?? 0) < i.standAwal)
    if (invalid.length > 0) {
      return NextResponse.json({ ok: false, message: "Masih ada catatan yang belum valid" }, { status: 400 })
    }

    // buat/refresh Tagihan per pelanggan
    const today = new Date()
    const due = new Date(today.getFullYear(), today.getMonth(), setting.tglJatuhTempo)

    const jobs = items.map((i) => {
      const pemakaian = i.pemakaianM3
      const total = (setting.tarifPerM3 * pemakaian) + setting.abonemen + setting.biayaAdmin

      return prisma.tagihan.upsert({
        where: { pelangganId_periode: { pelangganId: i.pelangganId, periode } },
        update: {
          tarifPerM3: setting.tarifPerM3,
          abonemen: setting.abonemen,
          totalTagihan: total,
          denda: 0,
          statusBayar: "UNPAID",
          statusVerif: "UNVERIFIED",
          tglJatuhTempo: due,
        },
        create: {
          pelangganId: i.pelangganId,
          periode,
          tarifPerM3: setting.tarifPerM3,
          abonemen: setting.abonemen,
          totalTagihan: total,
          denda: 0,
          statusBayar: "UNPAID",
          statusVerif: "UNVERIFIED",
          tglJatuhTempo: due,
        },
      })
    })

    await Promise.all(jobs)

    // update progres + FINAL
    const selesai = items.filter(i => (i.standAkhir ?? 0) >= i.standAwal).length
    await prisma.catatPeriode.update({
      where: { id: cp.id },
      data: {
        totalPelanggan: items.length,
        selesai,
        pending: Math.max(0, items.length - selesai),
        status: "FINAL",
        isLocked: true,
        lockedAt: new Date(),
      },
    })

    return NextResponse.json({ ok: true, finalized: items.length })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e.message ?? "Server error" }, { status: 500 })
  }
}
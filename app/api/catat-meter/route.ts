// app/api/catat-meter/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { CatatStatus } from "@prisma/client"
// ===== INIT (POST) — REPLACE handler POST kamu dengan ini =====
import { getAuthUserId } from "@/lib/auth"        // ⬅️ [BARU] ambil userId dari JWT/cookie




async function getOrCreatePeriode(kodePeriode: string) {
  let periode = await prisma.catatPeriode.findUnique({ where: { kodePeriode } })
  if (periode) return periode

  const setting = await prisma.setting.findUnique({ where: { id: 1 } })
  if (!setting) throw new Error("Setting (id=1) belum ada")

  const { tahun, bulan } = parsePeriod(kodePeriode)
  periode = await prisma.catatPeriode.create({
    data: {
      kodePeriode,
      bulan,
      tahun,
      tarifPerM3: setting.tarifPerM3,
      abonemen: setting.abonemen,
      totalPelanggan: 0,
      selesai: 0,
      pending: 0,
      isLocked: false,
    },
  })
  return periode
}

// ===== Helpers (ganti block helpers kamu dengan ini) =====
function isPeriodStr(p: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(p)
}
function parsePeriod(p: string) {
  const [y, m] = p.split("-").map(Number)
  return { tahun: y, bulan: m }
}
function toKodePeriode(y: number, m: number) {
  return `${y}-${String(m).padStart(2, "0")}`
}
function prevPeriodStr(p: string) {
  const { tahun, bulan } = parsePeriod(p)
  const d = new Date(tahun, bulan - 1, 1)
  d.setMonth(d.getMonth() - 1)
  return toKodePeriode(d.getFullYear(), d.getMonth() + 1)
}
function nextPeriodStr(p: string) {
  const { tahun, bulan } = parsePeriod(p)
  const d = new Date(tahun, bulan - 1, 1)
  d.setMonth(d.getMonth() + 1)
  return toKodePeriode(d.getFullYear(), d.getMonth() + 1)
}

// Ambil periode terakhir (maks: tahun desc, bulan desc)
async function getLatestPeriode() {
  return prisma.catatPeriode.findFirst({
    where: { deletedAt: null },
    orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
    select: { id: true, kodePeriode: true, tahun: true, bulan: true, isLocked: true, status: true },
  })
}

// Buat master periode (tanpa entri) dari snapshot Setting
async function createMasterPeriode(kodePeriode: string) {
  const setting = await prisma.setting.findUnique({ where: { id: 1 } })
  if (!setting) throw new Error("Setting (id=1) belum ada")

  const { tahun, bulan } = parsePeriod(kodePeriode)
  return prisma.catatPeriode.create({
    data: {
      kodePeriode,
      bulan,
      tahun,
      tarifPerM3: setting.tarifPerM3,
      abonemen: setting.abonemen,
      totalPelanggan: 0,
      selesai: 0,
      pending: 0,
      isLocked: false,
      // status default di schema = DRAFT
    },
  })
}


// ===== INIT (POST) — REPLACE handler POST kamu dengan ini =====
export async function POST(req: NextRequest) {
  const kodePeriode = req.nextUrl.searchParams.get("periode") ?? ""
  if (!isPeriodStr(kodePeriode)) {
    return NextResponse.json({ ok: false, message: "Periode wajib format YYYY-MM" }, { status: 400 })
  }

  try {
    // [BARU] identitas petugas (opsional kalau belum login)
    const userId = await getAuthUserId(req)
    let userName: string | null = null
    if (userId) {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
      userName = u?.name ?? null
    }

    // 1) Kalau sudah ada -> idempotent (tidak dobel)
    let periode = await prisma.catatPeriode.findUnique({ where: { kodePeriode } })
    if (!periode) {
      // 2) Validasi “tidak boleh lompat” & “harus final dulu”
      const latest = await getLatestPeriode()

      if (latest) {
        const hanyaBoleh = nextPeriodStr(latest.kodePeriode)
        if (kodePeriode !== hanyaBoleh) {
          return NextResponse.json(
            { ok: false, message: `Tidak boleh lompat bulan. Periode berikutnya yang valid: ${hanyaBoleh}` },
            { status: 400 },
          )
        }
        if (!latest.isLocked) {
          return NextResponse.json(
            { ok: false, message: `Periode ${latest.kodePeriode} belum difinalkan. Finalisasi dulu sebelum membuat periode berikutnya.` },
            { status: 409 },
          )
        }
      }

      // jika belum ada "latest" sama sekali → ini periode pertama; izinkan
      // snapshot Setting sekaligus isi tanggal & petugas
      const setting = await prisma.setting.findUnique({ where: { id: 1 } })
      if (!setting) throw new Error("Setting (id=1) belum ada")

      const { tahun, bulan } = parsePeriod(kodePeriode)
      periode = await prisma.catatPeriode.create({
        data: {
          kodePeriode,
          bulan,
          tahun,
          tarifPerM3: setting.tarifPerM3,
          abonemen: setting.abonemen,
          totalPelanggan: 0,
          selesai: 0,
          pending: 0,
          isLocked: false,
          // [BARU] jejak awal pencatatan
          tanggalCatat: new Date(),
          petugasId: userId ?? null,
          petugasNama: userName ?? null,
        },
      })
    } else {
      // [BARU] backfill kalau periode sudah ada tapi metadata kosong
      if (!periode.tanggalCatat || !periode.petugasId) {
        periode = await prisma.catatPeriode.update({
          where: { id: periode.id },
          data: {
            tanggalCatat: periode.tanggalCatat ?? new Date(),
            petugasId: periode.petugasId ?? userId ?? null,
            petugasNama: periode.petugasNama ?? userName ?? null,
          },
        })
      }
    }

 // 3) Generate entri pelanggan (idempotent & tahan banting)
const aktif = await prisma.pelanggan.findMany({
  where: { statusAktif: true, deletedAt: null },
  select: { id: true, meterAwal: true },
  orderBy: { createdAt: "asc" },
})

if (aktif.length === 0) {
  await recalcProgress(periode.id)
  return NextResponse.json({ ok: true, created: 0, skipped: 0 })
}

// bersihkan baris yang pernah di-soft-delete agar unique (periodeId,pelangganId) tidak bentrok
await prisma.catatMeter.deleteMany({
  where: { periodeId: periode.id, deletedAt: { not: null } },
})

// ambil yang sudah ada (aktif) → untuk skip
const existing = await prisma.catatMeter.findMany({
  where: { periodeId: periode.id, deletedAt: null },
  select: { pelangganId: true },
})
const existSet = new Set(existing.map((r) => r.pelangganId))

// ambil periode sebelumnya → untuk tentukan meterAwal
const prevKode = prevPeriodStr(kodePeriode)
const prevPeriode = await prisma.catatPeriode.findUnique({ where: { kodePeriode: prevKode } })

let lastMap = new Map<string, number>()
if (prevPeriode) {
  const hist = await prisma.catatMeter.findMany({
    where: { periodeId: prevPeriode.id, deletedAt: null },
    select: { pelangganId: true, meterAkhir: true },
  })
  lastMap = new Map(hist.map((h) => [h.pelangganId, h.meterAkhir]))
}

// siapkan payload: meterAwal dihitung DI DEPAN (tidak perlu updateMany lagi)
const payload = aktif
  .filter((p) => !existSet.has(p.id))
  .map((p) => ({
    periodeId:   periode.id,
    pelangganId: p.id,
    meterAwal:   (lastMap.get(p.id) ?? p.meterAwal ?? 0),
    meterAkhir:  0,
    pemakaianM3: 0,
    tarifPerM3:  periode.tarifPerM3,
    abonemen:    periode.abonemen,
    total:       0,
    status:      CatatStatus.PENDING,
  }))

let createdCount = 0
if (payload.length > 0) {
  const res = await prisma.catatMeter.createMany({
    data: payload,
    skipDuplicates: true, // tahan klik ulang / rerun POST
  })
  createdCount = res.count
}

await recalcProgress(periode.id)
return NextResponse.json({ ok: true, created: createdCount, skipped: existSet.size })} catch (e: any) {
    return NextResponse.json({ ok: false, message: e.message ?? "Server error" }, { status: 500 })
  }
}

// ===== LIST (GET)
export async function GET(req: NextRequest) {
  const kodePeriode = req.nextUrl.searchParams.get("periode") ?? ""
  if (!isPeriodStr(kodePeriode)) {
    return NextResponse.json({ ok: false, message: "Periode wajib format YYYY-MM" }, { status: 400 })
  }

  try {
    const periode = await prisma.catatPeriode.findUnique({ where: { kodePeriode } })
    if (!periode) {
      return NextResponse.json({
        ok: true,
        period: kodePeriode,
        tarifPerM3: null,
        abonemen: null,
        locked: false,
        progress: { total: 0, selesai: 0, pending: 0, percent: 0 },
        items: [],
      })
    }

    const rows = await prisma.catatMeter.findMany({
      where: { periodeId: periode.id, deletedAt: null },
      orderBy: [
        { pelanggan: { createdAt: "asc" } }, // ⬅️ URUT BERDASAR MASTER PELANGGAN
        { id: "asc" },                       // ⬅️ tie-breaker biar stabil
      ],
      select: {
        id: true,
        meterAwal: true,
        meterAkhir: true,
        pemakaianM3: true,
        tarifPerM3: true,
        abonemen: true,
        total: true,
        status: true,
        kendala: true,
        pelanggan: { select: { kode: true, nama: true, alamat: true, wa: true } },
      },
    })

    const total = rows.length
    const selesai = rows.filter((r) => r.status === CatatStatus.DONE).length
    const pending = Math.max(0, total - selesai)
    const percent = total ? Math.round((selesai / total) * 100) : 0

    return NextResponse.json({
      ok: true,
      period: kodePeriode,
      tarifPerM3: periode.tarifPerM3, // ⬅️ snapshot periode untuk header
      abonemen: periode.abonemen,     // ⬅️ snapshot periode untuk header
      locked: periode.isLocked,
      progress: { total, selesai, pending, percent },
      items: rows.map((r) => ({
        id: r.id,
        kodeCustomer: r.pelanggan.kode,
        nama: r.pelanggan.nama,
        alamat: r.pelanggan.alamat,
        phone: r.pelanggan.wa ?? "",
        meterAwal: r.meterAwal,
        meterAkhir: r.meterAkhir ?? null,
        pemakaian: r.pemakaianM3,
        total: r.total,
        kendala: r.kendala ?? "",
        tarifPerM3: r.tarifPerM3,
        abonemen: r.abonemen,
        status: r.status === CatatStatus.DONE ? "completed" : "pending",
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e.message ?? "Server error" }, { status: 500 })
  }
}

async function recalcProgress(periodeId: string) {
  const agg = await prisma.catatMeter.groupBy({
    by: ["status"],
    where: { periodeId, deletedAt: null },
    _count: { _all: true },
  })

  const selesai = agg.find((a) => a.status === CatatStatus.DONE)?._count._all ?? 0
  const pending = agg.find((a) => a.status === CatatStatus.PENDING)?._count._all ?? 0
  const total = selesai + pending

  await prisma.catatPeriode.update({
    where: { id: periodeId },
    data: { totalPelanggan: total, selesai, pending },
  })
}

// ===== UPDATE (PUT) tetap sama seperti sebelumnya =====
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const id: string | undefined = body?.id
    const endRaw = body?.meterAkhir
    const end: number = typeof endRaw === "number" ? endRaw : Number(endRaw)
    const note: string | null = (body?.kendala ?? "").toString().trim() || null

    if (!id || !Number.isFinite(end)) {
      return NextResponse.json({ ok: false, message: "id & meterAkhir wajib ada" }, { status: 400 })
    }

    const row = await prisma.catatMeter.findUnique({
      where: { id },
      select: {
        meterAwal: true, tarifPerM3: true, abonemen: true,
        periodeId: true, deletedAt: true,
        periode: { select: { isLocked: true } },
      },
    })
    if (!row || row.deletedAt) return NextResponse.json({ ok: false, message: "Data tidak ditemukan" }, { status: 404 })
    if (row.periode.isLocked) return NextResponse.json({ ok: false, message: "Periode sudah difinalkan. Data tidak bisa diedit." }, { status: 423 })
    if (end < row.meterAwal) return NextResponse.json({ ok: false, message: "Meter akhir tidak boleh < meter awal" }, { status: 400 })

    const pemakaian = Math.max(0, end - row.meterAwal)
    const total = row.tarifPerM3 * pemakaian + row.abonemen

    await prisma.catatMeter.update({
      where: { id },
      data: { meterAkhir: end, pemakaianM3: pemakaian, total, status: CatatStatus.DONE, kendala: note },
    })

    await recalcProgress(row.periodeId)
    return NextResponse.json({ ok: true, data: { pemakaianM3: pemakaian, total, status: CatatStatus.DONE, kendala: note } })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e.message ?? "Server error" }, { status: 500 })
  }
}

// ===== DELETE (soft delete baris catat meter) =====
export async function DELETE(req: NextRequest) {
  try {
    const urlId = req.nextUrl.searchParams.get("id") ?? undefined
    const body = await req.json().catch(() => ({} as unknown))
    const id = (body as { id?: string })?.id ?? urlId
    if (!id) {
      return NextResponse.json({ ok: false, message: "ID wajib disertakan" }, { status: 400 })
    }

    const row = await prisma.catatMeter.findUnique({
      where: { id },
      select: {
        id: true,
        periodeId: true,
        deletedAt: true,
        periode: { select: { isLocked: true } },
      },
    })
    if (!row || row.deletedAt) {
      return NextResponse.json({ ok: false, message: "Data tidak ditemukan atau sudah dihapus" }, { status: 404 })
    }
    if (row.periode.isLocked) {
      return NextResponse.json({ ok: false, message: "Periode sudah difinalkan. Tidak bisa dihapus." }, { status: 423 })
    }

    // HARD DELETE supaya bisa dibuat ulang tanpa bentrok unique
    await prisma.catatMeter.delete({ where: { id } })

    await recalcProgress(row.periodeId)
    return NextResponse.json({ ok: true, message: "Inputan berhasil dihapus" })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "Server error" }, { status: 500 })
  }
}
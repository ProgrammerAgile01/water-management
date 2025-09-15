// app/api/catat-meter-blok/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CatatStatus } from "@prisma/client";

// ===== Helpers yang sama dengan catat-meter =====
function isPeriodStr(p: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(p);
}
function parsePeriod(p: string) {
  const [y, m] = p.split("-").map(Number);
  return { tahun: y, bulan: m };
}
function toKodePeriode(y: number, m: number) {
  return `${y}-${String(m).padStart(2, "0")}`;
}
function prevPeriodStr(p: string) {
  const { tahun, bulan } = parsePeriod(p);
  const d = new Date(tahun, bulan - 1, 1);
  d.setMonth(d.getMonth() - 1);
  return toKodePeriode(d.getFullYear(), d.getMonth() + 1);
}
async function getLatestPeriode() {
  return prisma.catatPeriode.findFirst({
    where: { deletedAt: null },
    orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
    select: {
      id: true,
      kodePeriode: true,
      tahun: true,
      bulan: true,
      isLocked: true,
    },
  });
}

// ===== INIT untuk satu ZONA (POST) =====
// POST /api/catat-meter-blok?periode=YYYY-MM&zona=Kode/Nama Zona
export async function POST(req: NextRequest) {
  const kodePeriode = req.nextUrl.searchParams.get("periode") ?? "";
  const zonaParam = (req.nextUrl.searchParams.get("zona") ?? "").trim(); // WAJIB

  if (!isPeriodStr(kodePeriode))
    return NextResponse.json(
      { ok: false, message: "periode wajib YYYY-MM" },
      { status: 400 }
    );
  if (!zonaParam)
    return NextResponse.json(
      { ok: false, message: "zona wajib diisi" },
      { status: 400 }
    );

  try {
    // pastikan periode ada, tidak lompat & sebelumnya final
    let periode = await prisma.catatPeriode.findUnique({
      where: { kodePeriode },
    });
    if (!periode) {
      const latest = await getLatestPeriode();
      if (latest) {
        const harus = toKodePeriode(
          latest.tahun + (latest.bulan === 12 ? 1 : 0),
          latest.bulan === 12 ? 1 : latest.bulan + 1
        );
        if (kodePeriode !== harus) {
          return NextResponse.json(
            {
              ok: false,
              message: `Tidak boleh lompat bulan. Periode berikutnya: ${harus}`,
            },
            { status: 400 }
          );
        }
        if (!latest.isLocked) {
          return NextResponse.json(
            {
              ok: false,
              message: `Periode ${latest.kodePeriode} belum difinalkan.`,
            },
            { status: 409 }
          );
        }
      }
      const { tahun, bulan } = parsePeriod(kodePeriode);
      // snapshot tarif/abonemen tidak diperlukan di versi blok
      periode = await prisma.catatPeriode.create({
        data: {
          kodePeriode,
          tahun,
          bulan,
          tarifPerM3: 0,
          abonemen: 0,
          totalPelanggan: 0,
          selesai: 0,
          pending: 0,
          isLocked: false,
        },
      });
    } else if (periode.isLocked) {
      return NextResponse.json(
        { ok: false, message: "Periode sudah dikunci." },
        { status: 423 }
      );
    }

    // Ambil pelanggan di zona yang diminta
    const pelangganZona = await prisma.pelanggan.findMany({
      where: {
        statusAktif: true,
        deletedAt: null,
        zona: {
          OR: [
            { kode: { equals: zonaParam } },
            { nama: { equals: zonaParam } },
            // fleksibel: kalau UI mengirim "A" dan kode "Blok A"
            { kode: { contains: zonaParam } },
            { nama: { contains: zonaParam } },
          ],
        },
      },
      select: {
        id: true,
        meterAwal: true,
        zonaId: true,
        zona: { select: { id: true, nama: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    if (pelangganZona.length === 0) {
      return NextResponse.json({
        ok: true,
        created: 0,
        skipped: 0,
        message: "Tidak ada pelanggan di zona.",
      });
    }

    // Cari prev meter awal (ambil dari CatatMeterBlok prevPeriod kalau ada; fallback dari CatatMeter biasa)
    const prevKode = prevPeriodStr(kodePeriode);
    const prevPeriode = await prisma.catatPeriode.findUnique({
      where: { kodePeriode: prevKode },
    });

    // map pelanggan -> meter akhir periode sebelumnya
    const lastMap = new Map<string, number>();
    if (prevPeriode) {
      const prevRows = await prisma.catatMeterBlok.findMany({
        where: { periodeId: prevPeriode.id, deletedAt: null },
        select: { pelangganId: true, meterAkhir: true },
      });
      prevRows.forEach((r) => lastMap.set(r.pelangganId, r.meterAkhir ?? 0));
      if (lastMap.size === 0) {
        // fallback dari catatMeter umum
        const prevRowsGeneral = await prisma.catatMeter.findMany({
          where: { periodeId: prevPeriode.id, deletedAt: null },
          select: { pelangganId: true, meterAkhir: true },
        });
        prevRowsGeneral.forEach((r) =>
          lastMap.set(r.pelangganId, r.meterAkhir ?? 0)
        );
      }
    }

    // skip yang sudah ada
    const existing = await prisma.catatMeterBlok.findMany({
      where: { periodeId: periode.id, deletedAt: null },
      select: { pelangganId: true },
    });
    const existSet = new Set(existing.map((e) => e.pelangganId));

    const payload = pelangganZona
      .filter((p) => !existSet.has(p.id))
      .map((p) => {
        const awal = lastMap.get(p.id) ?? p.meterAwal ?? 0;
        const zId = p.zonaId ?? p.zona?.id ?? null;
        const zNm = p.zona?.nama ?? null;
        return {
          periodeId: periode!.id,
          pelangganId: p.id,
          meterAwal: awal,
          meterAkhir: 0,
          pemakaianM3: 0,
          status: CatatStatus.PENDING,
          isLocked: false,
          zonaIdSnapshot: zId,
          zonaNamaSnapshot: zNm,
        };
      });

    let created = 0;
    if (payload.length) {
      const res = await prisma.catatMeterBlok.createMany({
        data: payload,
        skipDuplicates: true,
      });
      created = res.count;
    }

    return NextResponse.json({ ok: true, created, skipped: existSet.size });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

// ===== LIST (GET) =====
// GET /api/catat-meter-blok?periode=YYYY-MM&zona=...&search=...
export async function GET(req: NextRequest) {
  const kodePeriode = req.nextUrl.searchParams.get("periode") ?? "";
  const zonaParam = (req.nextUrl.searchParams.get("zona") ?? "").trim();
  const q = (req.nextUrl.searchParams.get("search") ?? "").trim();

  if (!isPeriodStr(kodePeriode)) {
    return NextResponse.json(
      { ok: false, message: "periode wajib YYYY-MM" },
      { status: 400 }
    );
  }

  try {
    const periode = await prisma.catatPeriode.findUnique({
      where: { kodePeriode },
      select: { id: true, isLocked: true },
    });

    if (!periode) {
      return NextResponse.json({
        ok: true,
        period: kodePeriode,
        locked: false,
        progress: { total: 0, selesai: 0, pending: 0, percent: 0 },
        items: [],
      });
    }

    const zonaWhere = zonaParam
      ? {
          OR: [
            { zonaNamaSnapshot: { equals: zonaParam } as any },
            {
              pelanggan: {
                zona: { is: { nama: { equals: zonaParam } as any } },
              },
            },
            {
              pelanggan: {
                zona: { is: { kode: { equals: zonaParam } as any } },
              },
            },
          ],
        }
      : {};

    const qWhere = q
      ? {
          OR: [
            { pelanggan: { is: { nama: { contains: q } } } },
            { pelanggan: { is: { alamat: { contains: q } } } },
            { pelanggan: { is: { kode: { contains: q } } } },
            { kendala: { contains: q } },
          ],
        }
      : {};

    const rows = await prisma.catatMeterBlok.findMany({
      where: {
        periodeId: periode.id,
        deletedAt: null,
        ...(zonaWhere as any),
        ...(qWhere as any),
      },
      orderBy: [{ pelanggan: { createdAt: "asc" } }, { id: "asc" }],
      select: {
        id: true,
        meterAwal: true,
        meterAkhir: true,
        pemakaianM3: true,
        status: true,
        kendala: true,
        isLocked: true,
        pelanggan: {
          select: { kode: true, nama: true, alamat: true, wa: true },
        },
      },
    });

    const total = rows.length;
    const selesai = rows.filter((r) => r.status === CatatStatus.DONE).length;
    const pending = Math.max(0, total - selesai);
    const percent = total ? Math.round((selesai / total) * 100) : 0;

    return NextResponse.json({
      ok: true,
      period: kodePeriode,
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
        status: r.status === CatatStatus.DONE ? "completed" : "pending",
        locked: !!r.isLocked,
      })),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

// ===== UPDATE (PUT) =====
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const id: string | undefined = body?.id;
    const end: number = Number(body?.meterAkhir);

    if (!id || !Number.isFinite(end)) {
      return NextResponse.json(
        { ok: false, message: "id & meterAkhir wajib" },
        { status: 400 }
      );
    }

    const row = await prisma.catatMeterBlok.findUnique({
      where: { id },
      select: {
        meterAwal: true,
        periodeId: true,
        isLocked: true,
        deletedAt: true,
        periode: { select: { isLocked: true } },
      },
    });
    if (!row || row.deletedAt)
      return NextResponse.json(
        { ok: false, message: "Data tidak ditemukan" },
        { status: 404 }
      );
    if (row.periode.isLocked || row.isLocked) {
      return NextResponse.json(
        { ok: false, message: "Periode/baris sudah dikunci." },
        { status: 423 }
      );
    }
    if (end < row.meterAwal) {
      return NextResponse.json(
        { ok: false, message: "Meter akhir < meter awal" },
        { status: 400 }
      );
    }

    const pakai = Math.max(0, end - row.meterAwal);
    await prisma.catatMeterBlok.update({
      where: { id },
      data: {
        meterAkhir: end,
        pemakaianM3: pakai,
        status: CatatStatus.DONE,
        kendala: (body?.kendala ?? null) || null,
      },
    });

    return NextResponse.json({ ok: true, data: { pemakaianM3: pakai } });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

// ===== DELETE (baris) =====
export async function DELETE(req: NextRequest) {
  try {
    const urlId = req.nextUrl.searchParams.get("id") ?? undefined;
    const body = await req.json().catch(() => ({}));
    const id = (body?.id as string | undefined) ?? urlId;
    if (!id)
      return NextResponse.json(
        { ok: false, message: "ID wajib" },
        { status: 400 }
      );

    const row = await prisma.catatMeterBlok.findUnique({
      where: { id },
      select: {
        id: true,
        periodeId: true,
        isLocked: true,
        deletedAt: true,
        periode: { select: { isLocked: true } },
      },
    });
    if (!row || row.deletedAt)
      return NextResponse.json(
        { ok: false, message: "Tidak ditemukan" },
        { status: 404 }
      );
    if (row.periode.isLocked || row.isLocked) {
      return NextResponse.json(
        { ok: false, message: "Periode/baris terkunci" },
        { status: 423 }
      );
    }

    // hard delete
    await prisma.catatMeterBlok.delete({ where: { id } });
    return NextResponse.json({ ok: true, message: "Terhapus" });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

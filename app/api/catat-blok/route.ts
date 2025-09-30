// app/api/catat-blok/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addMonths } from "date-fns";

const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const isYm = (x?: string | null) => !!x && /^\d{4}-(0[1-9]|1[0-2])$/.test(x!);
const ymParts = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return { y, m };
};
const prevYm = (ym: string) => {
  const { y, m } = ymParts(ym);
  const d = addMonths(new Date(y, m - 1, 1), -1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const tanggalCatatFromSetting = async (ym: string) => {
  const { y, m } = ymParts(ym);
  const setting = await prisma.setting
    .findFirst({ where: { id: 1 } })
    .catch(() => null);
  const defaultDay = Math.max(
    1,
    Math.min(28, Number(setting?.tanggalCatatDefault ?? 1))
  );
  return new Date(Date.UTC(y, m - 1, defaultDay, 0, 0, 0));
};

// Buat/ambil periode + seed BlokReading utk semua zona di tandon tsb
async function ensureBlokReadings(periodeYm: string, tandonId: string) {
  let periode = await prisma.catatPeriode.findUnique({
    where: { kodePeriode: periodeYm },
  });
  if (!periode) {
    const { y, m } = ymParts(periodeYm);
    periode = await prisma.catatPeriode.create({
      data: {
        kodePeriode: periodeYm,
        tahun: y,
        bulan: m,
        tanggalCatat: await tanggalCatatFromSetting(periodeYm),
      },
    });
  }

  // semua zona di bawah tandon (Wajib: skema Zona punya tandonId dan initialMeter)
  const zonas = await prisma.zona.findMany({
    where: { tandonId },
    orderBy: { nama: "asc" },
    select: { id: true, initialMeter: true },
  });

  // Map meterAkhir bulan sebelumnya
  const prev = await prisma.catatPeriode.findUnique({
    where: { kodePeriode: prevYm(periodeYm) },
    select: { id: true },
  });
  const prevMap = new Map<string, number>();
  if (prev) {
    const prevRows = await prisma.blokReading.findMany({
      where: { periodeId: prev.id, tandonId },
      select: { zonaId: true, meterAkhir: true },
    });
    prevRows.forEach((r) => {
      if (typeof r.meterAkhir === "number") prevMap.set(r.zonaId, r.meterAkhir);
    });
  }

  // upsert semua zona
  for (const z of zonas) {
    await prisma.blokReading.upsert({
      where: { uniq_periode_zona: { periodeId: periode.id, zonaId: z.id } },
      update: {},
      create: {
        periodeId: periode.id,
        tandonId,
        zonaId: z.id,
        meterAwal: prevMap.get(z.id) ?? z.initialMeter ?? 0,
        pemakaianM3: 0,
        status: "PENDING",
      },
    });
  }

  return periode;
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const action = sp.get("action");

    // Dropdown bulan dari CatatPeriode
    if (action === "months") {
      const rows = await prisma.catatPeriode.findMany({
        orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
        select: { kodePeriode: true, bulan: true, tahun: true },
      });
      const items = rows.map((r) => ({
        value: r.kodePeriode,
        label: `${NAMA_BULAN[r.bulan - 1]} ${r.tahun}`,
      }));
      return NextResponse.json({ ok: true, items });
    }

    // Tanggal catat default (dari Setting) untuk satu periode
    if (action === "default-date") {
      const period = sp.get("period") || "";
      if (!isYm(period))
        return NextResponse.json(
          { ok: false, message: "period harus YYYY-MM" },
          { status: 400 }
        );
      const date = await tanggalCatatFromSetting(period);
      return NextResponse.json({ ok: true, date: date.toISOString() });
    }

    // Listing data
    const periode = sp.get("periode") || "";
    const tandonId = sp.get("tandonId") || "";
    if (!isYm(periode))
      return NextResponse.json(
        { ok: false, message: "periode harus YYYY-MM" },
        { status: 400 }
      );
    if (!tandonId)
      return NextResponse.json(
        { ok: false, message: "tandonId wajib" },
        { status: 400 }
      );

    const cp = await ensureBlokReadings(periode, tandonId);

    const rows = await prisma.blokReading.findMany({
      where: { periodeId: cp.id, tandonId, deletedAt: null },
      include: {
        zona: { select: { kode: true, nama: true } },
        tandon: { select: { nama: true, kode: true } },
      },
      orderBy: [{ isLocked: "asc" }, { updatedAt: "desc" }],
    });

    const items = rows.map((r) => ({
      id: r.id,
      kodeBlok: r.zona.kode,
      nama: r.zona.nama,
      meterAwal: r.meterAwal,
      meterAkhir: r.meterAkhir,
      pemakaian: Math.max(0, (r.meterAkhir ?? 0) - r.meterAwal),
      status: r.status === "DONE" ? "completed" : "pending",
      kendala: r.kendala ?? undefined,
      locked: !!r.isLocked,
      tandon: r.tandon.nama,
    }));

    const total = items.length;
    const selesai = items.filter((x) => x.status === "completed").length;

    return NextResponse.json({
      ok: true,
      period: periode,
      progress: {
        total,
        selesai,
        pending: total - selesai,
        percent: total ? (selesai / total) * 100 : 0,
      },
      items,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, meterAkhir, kendala } = body as {
      id: string;
      meterAkhir?: number;
      kendala?: string;
    };

    if (!id || meterAkhir == null || Number.isNaN(Number(meterAkhir))) {
      return NextResponse.json(
        { ok: false, message: "id & meterAkhir wajib" },
        { status: 400 }
      );
    }

    const row = await prisma.blokReading.findUnique({ where: { id } });
    if (!row)
      return NextResponse.json(
        { ok: false, message: "Tidak ditemukan" },
        { status: 404 }
      );
    if (row.isLocked)
      return NextResponse.json(
        { ok: false, message: "Baris sudah terkunci" },
        { status: 409 }
      );
    if (Number(meterAkhir) < row.meterAwal) {
      return NextResponse.json(
        { ok: false, message: "meterAkhir tidak boleh < meterAwal" },
        { status: 400 }
      );
    }

    const pemakaianM3 = Math.max(0, Number(meterAkhir) - row.meterAwal);
    await prisma.blokReading.update({
      where: { id },
      data: {
        meterAkhir: Number(meterAkhir),
        pemakaianM3,
        kendala: kendala ?? null,
        status: "DONE",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Error" },
      { status: 500 }
    );
  }
}

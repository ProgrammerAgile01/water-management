// app/api/catat-tandon/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addMonths } from "date-fns";

// ===== helpers =====
function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function ensurePeriodStr(s?: string | null) {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (y < 2000 || mo < 1 || mo > 12) return null;
  return { year: y, month: mo, kode: `${m[1]}-${m[2]}` };
}

function prevPeriod(kode: string) {
  const [y, m] = kode.split("-").map(Number);
  const d = addMonths(new Date(y, m - 1, 1), -1);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

async function getOrThrowPeriodeByKode(kode: string) {
  const periode = await prisma.catatPeriode.findUnique({
    where: { kodePeriode: kode },
  });
  if (!periode)
    throw new Error("Periode tidak ditemukan. Buat dulu di Catat Periode.");
  return periode;
}

async function getDefaultCatatDateForPeriod(kode: string) {
  // Setting.tanggalCatatDefault (Int 1..31) – fallback: tanggal 1
  const setting = await prisma.setting
    .findFirst({ where: { id: 1 } })
    .catch(() => null);
  const day = Math.max(
    1,
    Math.min(28, Number(setting?.tanggalCatatDefault || 1))
  );
  const [y, m] = kode.split("-").map(Number);
  const dt = new Date(y, m - 1, day);
  return dt.toISOString();
}

// label bulan Indo untuk dropdown periode
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

// ====== ACTIONS (GET) ======
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // 1) dropdown bulan (ambil dari CatatPeriode)
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

    // 2) tanggal catat default untuk periode
    if (action === "default-date") {
      const pStr = searchParams.get("period");
      const p = ensurePeriodStr(pStr);
      if (!p) return bad("Parameter period invalid (YYYY-MM).");
      await getOrThrowPeriodeByKode(p.kode); // sekalian validasi ada
      const date = await getDefaultCatatDateForPeriod(p.kode);
      return NextResponse.json({ ok: true, date });
    }

    // 3) data listing catat tandon
    const pStr = searchParams.get("periode");
    const p = ensurePeriodStr(pStr);
    if (!p) return bad("Parameter periode invalid (YYYY-MM).");

    const periode = await getOrThrowPeriodeByKode(p.kode);

    // Seed TandonReading yang belum ada untuk periode ini
    const tandons = await prisma.tandon.findMany({
      select: { id: true, kode: true, nama: true, initialMeter: true },
      orderBy: [{ kode: "asc" }],
    });

    const existing = await prisma.tandonReading.findMany({
      where: { periodeId: periode.id },
      select: { id: true, tandonId: true },
    });
    const existingSet = new Set(existing.map((e) => e.tandonId));

    // ambil map meter akhir periode sebelumnya untuk semua tandon
    const prevKode = prevPeriod(p.kode);
    const prevPeriode = await prisma.catatPeriode.findUnique({
      where: { kodePeriode: prevKode },
      select: { id: true },
    });
    let prevMap = new Map<string, number>();
    if (prevPeriode) {
      const prevReadings = await prisma.tandonReading.findMany({
        where: { periodeId: prevPeriode.id },
        select: { tandonId: true, meterAkhir: true },
      });
      prevReadings.forEach((r) => {
        if (typeof r.meterAkhir === "number")
          prevMap.set(r.tandonId, r.meterAkhir);
      });
    }

    // buat yang belum ada
    const toCreate = tandons
      .filter((t) => !existingSet.has(t.id))
      .map((t) => ({
        periodeId: periode.id,
        tandonId: t.id,
        meterAwal: prevMap.get(t.id) ?? t.initialMeter ?? 0,
        pemakaianM3: 0,
        status: "PENDING" as const,
      }));

    if (toCreate.length) {
      await prisma.tandonReading.createMany({
        data: toCreate,
        skipDuplicates: true,
      });
    }

    // Ambil daftar untuk UI
    const readings = await prisma.tandonReading.findMany({
      where: { periodeId: periode.id },
      include: { tandon: { select: { kode: true, nama: true } } },
      orderBy: [{ tandon: { kode: "asc" } }],
    });

    const selesai = readings.filter((r) => r.meterAkhir != null).length;
    const total = readings.length;
    const pending = Math.max(0, total - selesai);
    const percent = total ? (selesai / total) * 100 : 0;

    const items = readings.map((r) => ({
      id: r.id,
      kodeTandon: r.tandon.kode,
      nama: r.tandon.nama,
      meterAwal: r.meterAwal,
      meterAkhir: r.meterAkhir,
      pemakaian: Math.max(0, (r.meterAkhir ?? 0) - r.meterAwal),
      status: r.meterAkhir != null ? "completed" : "pending",
      kendala: r.kendala ?? undefined,
      locked: r.isLocked,
    }));

    return NextResponse.json({
      ok: true,
      period: p.kode,
      locked: periode.isLocked ?? false,
      progress: { total, selesai, pending, percent },
      items,
    });
  } catch (e: any) {
    console.error("GET /api/catat-tandon error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message || "Internal error" },
      { status: 500 }
    );
  }
}

// ====== UPDATE (PUT) ======
export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const id: string | undefined = body?.id;
    const meterAkhir: number | undefined = body?.meterAkhir;
    const kendala: string | undefined = body?.kendala;

    if (!id) return bad("id wajib.");
    if (typeof meterAkhir !== "number" || !Number.isFinite(meterAkhir))
      return bad("meterAkhir wajib angka.");

    const current = await prisma.tandonReading.findUnique({ where: { id } });
    if (!current) return bad("Data tidak ditemukan.", 404);
    if (current.isLocked) return bad("Baris sudah dikunci.", 409);
    if (meterAkhir < current.meterAwal) return bad("Meter akhir < meter awal.");

    const pemakaianM3 = Math.max(0, meterAkhir - current.meterAwal);

    await prisma.tandonReading.update({
      where: { id },
      data: {
        meterAkhir,
        pemakaianM3,
        status: "DONE",
        kendala: kendala ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("PUT /api/catat-tandon error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message || "Internal error" },
      { status: 500 }
    );
  }
}

// ====== FINALIZE ROW (POST /finalize-row) ======
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    if (url.pathname.endsWith("/finalize-row")) {
      const body = await req.json().catch(() => ({}));
      const id: string | undefined = body?.id;
      if (!id) return bad("id wajib.");

      const row = await prisma.tandonReading.findUnique({
        where: { id },
        include: { periode: true },
      });
      if (!row) return bad("Data tidak ditemukan.", 404);
      if (row.isLocked) return NextResponse.json({ ok: true });

      await prisma.tandonReading.update({
        where: { id },
        data: { isLocked: true, lockedAt: new Date() },
      });

      return NextResponse.json({ ok: true });
    }

    // fallback kalau orang POST ke /api/catat-tandon tanpa subpath
    return bad("Unknown POST endpoint.", 404);
  } catch (e: any) {
    console.error("POST /api/catat-tandon error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message || "Internal error" },
      { status: 500 }
    );
  }
}

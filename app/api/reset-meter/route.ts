// app/api/reset-meter/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { startOfMonth, endOfMonth, parseISO, isValid } from "date-fns";

function monthRange(ym?: string) {
  if (!ym) return {};
  const d = parseISO(`${ym}-01`);
  if (!isValid(d)) return {};
  return { gte: startOfMonth(d), lte: endOfMonth(d) };
}

const postSchema = z.object({
  pelangganId: z.string().min(1),
  tanggalReset: z.string().min(8), // "yyyy-MM-dd"
  alasan: z.string().nullable().optional(),
  meterAwalBaru: z.number().int().nonnegative(),
  status: z.enum(["DRAFT", "SELESAI"]).default("DRAFT"),
});

/** Upsert & hitung ulang jadwal satu zona untuk satu periode (dalam transaksi) */
async function upsertJadwalPerZona(
  trx: typeof prisma,
  periodeId: string,
  kodePeriode: string,
  zonaId: string
) {
  // target = jumlah pelanggan aktif di zona
  const [target, progress] = await Promise.all([
    trx.pelanggan.count({
      where: { statusAktif: true, deletedAt: null, zonaId },
    }),
    // progress = jumlah entri DONE pada periode tsb untuk zona tsb
    trx.catatMeter.count({
      where: {
        periodeId,
        deletedAt: null,
        zonaIdSnapshot: zonaId,
        status: "DONE",
      },
    }),
  ]);

  // status UI jadwal
  const uiStatus =
    target > 0 && progress >= target
      ? "DONE"
      : progress > 0
      ? "IN_PROGRESS"
      : "WAITING";

  const existing = await trx.jadwalPencatatan.findFirst({
    where: { bulan: kodePeriode, zonaId },
    select: { id: true },
  });

  if (existing) {
    await trx.jadwalPencatatan.update({
      where: { id: existing.id },
      data: { target, progress, status: uiStatus as any },
    });
  } else {
    const zona = await trx.zona.findUnique({
      where: { id: zonaId },
      select: { petugasId: true, deskripsi: true },
    });
    const periode = await trx.catatPeriode.findUnique({
      where: { id: periodeId },
      select: { tanggalCatat: true },
    });
    await trx.jadwalPencatatan.create({
      data: {
        bulan: kodePeriode,
        zonaId,
        petugasId: zona?.petugasId ?? null,
        alamat: zona?.deskripsi ?? null,
        tanggalRencana: periode?.tanggalCatat ?? new Date(),
        target,
        progress,
        status: uiStatus as any,
      },
    });
  }
}

/** Sinkronkan CatatMeter, CatatMeterBlok, dan rekap Jadwal untuk SEMUA periode DRAFT */
async function syncAfterReset(pelangganId: string, tanggalResetYMD: string) {
  const d = new Date(`${tanggalResetYMD}T00:00:00`);
  if (Number.isNaN(d.getTime())) return;

  const ymReset = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}`;

  await prisma.$transaction(async (trx) => {
    // Pastikan periode untuk bulan tanggal reset ada
    const setting = await trx.setting.findUnique({ where: { id: 1 } });
    const ensurePeriode = async (kodePeriode: string, dt: Date) => {
      const existed = await trx.catatPeriode.findUnique({
        where: { kodePeriode },
      });
      if (existed) return existed;
      return trx.catatPeriode.create({
        data: {
          kodePeriode,
          bulan: dt.getMonth() + 1,
          tahun: dt.getFullYear(),
          tarifPerM3: setting?.tarifPerM3 ?? 0,
          abonemen: setting?.abonemen ?? 0,
          status: "DRAFT",
        },
      });
    };
    await ensurePeriode(ymReset, d);

    // Ambil SEMUA periode DRAFT
    const periods = await trx.catatPeriode.findMany({
      where: { isLocked: false }, // ⬅️ ganti di sini
      orderBy: { kodePeriode: "asc" },
      select: { id: true, kodePeriode: true, tarifPerM3: true, abonemen: true },
    });

    // data pelanggan (zona & meterAwal terbaru)
    const pel = await trx.pelanggan.findUnique({
      where: { id: pelangganId },
      select: { meterAwal: true, zonaId: true },
    });
    const latestAwal = pel?.meterAwal ?? 0;
    const zonaId = pel?.zonaId ?? null;

    for (const per of periods) {
      const tarif = per.tarifPerM3 ?? 0;
      const abon = per.abonemen ?? 0;

      // CatatMeter → updateMany; create jika belum ada
      const updCM = await trx.catatMeter.updateMany({
        where: { periodeId: per.id, pelangganId },
        data: {
          meterAwal: latestAwal,
          meterAkhir: 0,
          pemakaianM3: 0,
          tarifPerM3: tarif,
          abonemen: abon,
          total: abon,
          status: "PENDING",
        },
      });
      if (updCM.count === 0) {
        await trx.catatMeter.create({
          data: {
            periodeId: per.id,
            pelangganId,
            meterAwal: latestAwal,
            meterAkhir: 0,
            pemakaianM3: 0,
            tarifPerM3: tarif,
            abonemen: abon,
            total: abon,
            status: "PENDING",
            // simpan snapshot zona bila ada
            zonaIdSnapshot: zonaId ?? undefined,
          },
        });
      }

      // CatatMeterBlok → updateMany; create jika belum ada
      const updCMB = await trx.catatMeterBlok.updateMany({
        where: { periodeId: per.id, pelangganId },
        data: {
          meterAwal: latestAwal,
          meterAkhir: 0,
          pemakaianM3: 0,
          status: "PENDING",
        },
      });
      if (updCMB.count === 0) {
        await trx.catatMeterBlok.create({
          data: {
            periodeId: per.id,
            pelangganId,
            meterAwal: latestAwal,
            meterAkhir: 0,
            pemakaianM3: 0,
            status: "PENDING",
          },
        });
      }

      // 🔁 Recalc jadwal untuk zona pelanggan pada periode ini
      if (zonaId) {
        await upsertJadwalPerZona(trx, per.id, per.kodePeriode, zonaId);
      }
    }
  });
}

// ========= GET =========
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;

    const page = Math.max(parseInt(sp.get("page") ?? "1", 10) || 1, 1);
    const pageSize = Math.min(
      parseInt(sp.get("pageSize") ?? "20", 10) || 20,
      200
    );

    const periode = sp.get("periode") ?? "";
    const zona = (sp.get("zona") ?? "").trim();
    const search = (sp.get("search") ?? "").trim();

    const dateRange = monthRange(periode);

    const where: any = {
      ...(periode ? { tanggalReset: { ...dateRange } } : {}),
      ...(search
        ? {
            OR: [
              { alasan: { contains: search } },
              { pelanggan: { nama: { contains: search } } },
              { pelanggan: { alamat: { contains: search } } },
              { pelanggan: { kode: { contains: search } } },
              { pelanggan: { zona: { kode: { contains: search } } } },
            ],
          }
        : {}),
      ...(zona
        ? {
            pelanggan: { zona: { kode: { equals: zona } } },
          }
        : {}),
    };

    const total = await prisma.resetMeter.count({ where });

    const rows = await prisma.resetMeter.findMany({
      where,
      orderBy: [{ tanggalReset: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        pelangganId: true,
        tanggalReset: true,
        alasan: true,
        meterAwalBaru: true,
        status: true,
        pelanggan: {
          select: {
            id: true,
            nama: true,
            alamat: true,
            zona: { select: { id: true, kode: true, nama: true } },
          },
        },
      },
    });

    // ... di dalam GET /api/reset-meter, setelah const rows = await prisma.resetMeter.findMany(...)

    function pickBlokLetter(z?: {
      kode?: string | null;
      nama?: string | null;
    }) {
      const fromNama = (z?.nama ?? "").match(/Blok\s+([A-Z])/i)?.[1];
      if (fromNama) return fromNama.toUpperCase();
      const k = (z?.kode ?? "").trim();
      if (k && /^[A-Z]/i.test(k)) return k[0].toUpperCase();
      return ""; // fallback
    }

    const items = rows.map((r) => {
      const blokLetter = pickBlokLetter(r.pelanggan?.zona || undefined);
      return {
        id: r.id,
        pelangganId: r.pelangganId,
        tanggalReset: r.tanggalReset.toISOString().slice(0, 10),
        alasan: r.alasan ?? "",
        meterAwalBaru: r.meterAwalBaru,
        status: r.status,
        pelanggan: {
          nama: r.pelanggan?.nama ?? "",
          alamat: r.pelanggan?.alamat ?? "",
          // ⬇️ kirim HANYA huruf blok ke UI (A/B/C/…)
          blok: blokLetter || "-",
        },
      };
    });

    return NextResponse.json({
      ok: true,
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (e: any) {
    console.error("GET /api/reset-meter error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

// ========= POST =========
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = postSchema.parse(body);

    // Update master pelanggan (meterAwal + flag)
    await prisma.pelanggan.update({
      where: { id: data.pelangganId },
      data: { meterAwal: data.meterAwalBaru, isResetMeter: true },
    });

    // Simpan histori reset (paksa selesai)
    const created = await prisma.resetMeter.create({
      data: {
        pelangganId: data.pelangganId,
        tanggalReset: new Date(data.tanggalReset),
        alasan: data.alasan ?? null,
        meterAwalBaru: data.meterAwalBaru,
        status: "SELESAI",
      },
    });

    // Sinkron bacaan + jadwal
    await syncAfterReset(data.pelangganId, data.tanggalReset);

    return NextResponse.json({ ok: true, item: created }, { status: 201 });
  } catch (e: any) {
    console.error("POST /api/reset-meter error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

// ========= PUT =========
const putSchema = postSchema.extend({ id: z.string().min(1) });

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const data = putSchema.parse(body);

    // Update master pelanggan
    await prisma.pelanggan.update({
      where: { id: data.pelangganId },
      data: { meterAwal: data.meterAwalBaru, isResetMeter: true },
    });

    // Update histori reset (paksa selesai)
    const updated = await prisma.resetMeter.update({
      where: { id: data.id },
      data: {
        pelangganId: data.pelangganId,
        tanggalReset: new Date(data.tanggalReset),
        alasan: data.alasan ?? null,
        meterAwalBaru: data.meterAwalBaru,
        status: "SELESAI",
      },
    });

    // Sinkron bacaan + jadwal
    await syncAfterReset(data.pelangganId, data.tanggalReset);

    return NextResponse.json({ ok: true, item: updated });
  } catch (e: any) {
    console.error("PUT /api/reset-meter error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

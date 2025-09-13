// app/api/reset-meter/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { startOfMonth, endOfMonth, parseISO, isValid } from "date-fns";

// ===== util =====
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

// ========= GET (unchanged) =========
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;

    const page = Math.max(parseInt(sp.get("page") ?? "1", 10) || 1, 1);
    const pageSize = Math.min(
      parseInt(sp.get("pageSize") ?? "20", 10) || 20,
      200
    );

    const periode = sp.get("periode") ?? ""; // "YYYY-MM"
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
            pelanggan: {
              zona: {
                kode: { contains: zona },
              },
            },
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

    const items = rows.map((r) => ({
      id: r.id,
      pelangganId: r.pelangganId,
      tanggalReset: r.tanggalReset.toISOString().slice(0, 10),
      alasan: r.alasan ?? "",
      meterAwalBaru: r.meterAwalBaru,
      status: r.status,
      pelanggan: {
        nama: r.pelanggan?.nama ?? "",
        alamat: r.pelanggan?.alamat ?? "",
        blok: r.pelanggan?.zona?.kode ?? "-",
      },
    }));

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

// ========= POST (unchanged) =========
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = postSchema.parse(body);

    // 1) update master pelanggan
    await prisma.pelanggan.update({
      where: { id: data.pelangganId },
      data: { meterAwal: data.meterAwalBaru },
    });

    // 2) simpan histori reset
    const created = await prisma.resetMeter.create({
      data: {
        pelangganId: data.pelangganId,
        tanggalReset: new Date(data.tanggalReset),
        alasan: data.alasan ?? null,
        meterAwalBaru: data.meterAwalBaru,
        status: data.status,
      },
    });

    // 3) sinkron ke periode berjalan → meterAkhir = 0
    try {
      const d = new Date(data.tanggalReset);
      const kodePeriode = `${d.getFullYear()}-${String(
        d.getMonth() + 1
      ).padStart(2, "0")}`;
      const periode = await prisma.catatPeriode.findUnique({
        where: { kodePeriode },
        select: { id: true, tarifPerM3: true, abonemen: true },
      });

      if (periode) {
        const existing = await prisma.catatMeter.findUnique({
          where: {
            periodeId_pelangganId: {
              periodeId: periode.id,
              pelangganId: data.pelangganId,
            },
          },
          select: { id: true },
        });

        const tarif = periode.tarifPerM3 ?? 0;
        const abon = periode.abonemen ?? 0;

        if (!existing) {
          await prisma.catatMeter.create({
            data: {
              periodeId: periode.id,
              pelangganId: data.pelangganId,
              meterAwal: data.meterAwalBaru,
              meterAkhir: 0,
              pemakaianM3: 0,
              tarifPerM3: tarif,
              abonemen: abon,
              total: abon,
              status: "PENDING",
            },
          });
        } else {
          await prisma.catatMeter.update({
            where: { id: existing.id },
            data: {
              meterAwal: data.meterAwalBaru,
              meterAkhir: 0, // ⬅️ kosongkan saat POST juga
              pemakaianM3: 0,
              total: abon,
              status: "PENDING",
            },
          });
        }
      }
    } catch (syncErr) {
      console.warn("Sync CatatMeter (POST) diabaikan:", syncErr);
    }

    return NextResponse.json({ ok: true, item: created }, { status: 201 });
  } catch (e: any) {
    console.error("POST /api/reset-meter error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

// ========= PUT (baru) =========
const putSchema = postSchema.extend({
  id: z.string().min(1),
});

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const data = putSchema.parse(body);

    // Update master pelanggan (meterAwal)
    await prisma.pelanggan.update({
      where: { id: data.pelangganId },
      data: { meterAwal: data.meterAwalBaru },
    });

    // Update histori reset
    const updated = await prisma.resetMeter.update({
      where: { id: data.id },
      data: {
        pelangganId: data.pelangganId,
        tanggalReset: new Date(data.tanggalReset),
        alasan: data.alasan ?? null,
        meterAwalBaru: data.meterAwalBaru,
        status: data.status,
      },
    });

    // Sinkron ke catatMeter periode berjalan: meterAkhir = 0 juga saat EDIT
    try {
      const d = new Date(data.tanggalReset);
      const kodePeriode = `${d.getFullYear()}-${String(
        d.getMonth() + 1
      ).padStart(2, "0")}`;
      const periode = await prisma.catatPeriode.findUnique({
        where: { kodePeriode },
        select: { id: true, tarifPerM3: true, abonemen: true },
      });

      if (periode) {
        const existing = await prisma.catatMeter.findUnique({
          where: {
            periodeId_pelangganId: {
              periodeId: periode.id,
              pelangganId: data.pelangganId,
            },
          },
          select: { id: true },
        });

        const tarif = periode.tarifPerM3 ?? 0;
        const abon = periode.abonemen ?? 0;

        if (!existing) {
          await prisma.catatMeter.create({
            data: {
              periodeId: periode.id,
              pelangganId: data.pelangganId,
              meterAwal: data.meterAwalBaru,
              meterAkhir: 0,
              pemakaianM3: 0,
              tarifPerM3: tarif,
              abonemen: abon,
              total: abon,
              status: "PENDING",
            },
          });
        } else {
          await prisma.catatMeter.update({
            where: { id: existing.id },
            data: {
              meterAwal: data.meterAwalBaru,
              meterAkhir: 0, // ⬅️ PERBAIKAN INTI: nol-kan saat edit
              pemakaianM3: 0,
              total: abon,
              status: "PENDING",
            },
          });
        }
      }
    } catch (syncErr) {
      console.warn("Sync CatatMeter (PUT) diabaikan:", syncErr);
    }

    return NextResponse.json({ ok: true, item: updated });
  } catch (e: any) {
    console.error("PUT /api/reset-meter error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

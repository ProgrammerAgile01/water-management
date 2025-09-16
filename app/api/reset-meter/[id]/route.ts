// app/api/reset-meter/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// helper re-use
async function syncAfterReset(pelangganId: string, tanggalResetYMD: string) {
  const d = new Date(`${tanggalResetYMD}T00:00:00`);
  const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  let periode = await prisma.catatPeriode.findUnique({
    where: { kodePeriode: ym },
  });
  if (!periode) {
    const setting = await prisma.setting.findUnique({ where: { id: 1 } });
    periode = await prisma.catatPeriode.create({
      data: {
        kodePeriode: ym,
        bulan: d.getMonth() + 1,
        tahun: d.getFullYear(),
        tarifPerM3: setting?.tarifPerM3 ?? 0,
        abonemen: setting?.abonemen ?? 0,
        status: "DRAFT",
      },
    });
  }
  const tarif = periode.tarifPerM3 ?? 0;
  const abon = periode.abonemen ?? 0;

  const existing = await prisma.catatMeter.findUnique({
    where: { periodeId_pelangganId: { periodeId: periode.id, pelangganId } },
    select: { id: true },
  });

  if (!existing) {
    await prisma.catatMeter.create({
      data: {
        periodeId: periode.id,
        pelangganId,
        meterAwal: 0,
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
        meterAkhir: 0,
        pemakaianM3: 0,
        total: abon,
        status: "PENDING",
      },
    });
  }

  const p = await prisma.pelanggan.findUnique({
    where: { id: pelangganId },
    select: { meterAwal: true },
  });
  if (p) {
    await prisma.catatMeter.update({
      where: { periodeId_pelangganId: { periodeId: periode.id, pelangganId } },
      data: { meterAwal: p.meterAwal },
    });
  }
}

const putSchema = z.object({
  tanggalReset: z.string().optional(),
  alasan: z.string().nullable().optional(),
  meterAwalBaru: z.number().int().nonnegative().optional(),
  status: z.enum(["DRAFT", "SELESAI"]).optional(),
});

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const r = await prisma.resetMeter.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        pelangganId: true,
        tanggalReset: true,
        alasan: true,
        meterAwalBaru: true,
        status: true,
        pelanggan: {
          select: {
            nama: true,
            alamat: true,
            zona: { select: { kode: true } },
          },
        },
      },
    });
    if (!r)
      return NextResponse.json(
        { ok: false, message: "Not found" },
        { status: 404 }
      );
    // ... di GET /api/reset-meter/[id]

    function pickBlokLetter(z?: {
      kode?: string | null;
      nama?: string | null;
    }) {
      const fromNama = (z?.nama ?? "").match(/Blok\s+([A-Z])/i)?.[1];
      if (fromNama) return fromNama.toUpperCase();
      const k = (z?.kode ?? "").trim();
      if (k && /^[A-Z]/i.test(k)) return k[0].toUpperCase();
      return "";
    }

    return NextResponse.json({
      ok: true,
      item: {
        ...r,
        tanggalReset: r.tanggalReset.toISOString().slice(0, 10),
        pelanggan: {
          nama: r.pelanggan?.nama ?? "",
          alamat: r.pelanggan?.alamat ?? "",
          blok: pickBlokLetter(r.pelanggan?.zona || undefined) || "-",
        },
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    const data = putSchema.parse(body);

    const old = await prisma.resetMeter.findUnique({
      where: { id: params.id },
      select: { id: true, pelangganId: true, tanggalReset: true },
    });
    if (!old)
      return NextResponse.json(
        { ok: false, message: "Not found" },
        { status: 404 }
      );

    // jika meterAwalBaru diganti → update master pelanggan (set flag reset)
    if (typeof data.meterAwalBaru === "number") {
      await prisma.pelanggan.update({
        where: { id: old.pelangganId },
        data: { meterAwal: data.meterAwalBaru, isResetMeter: true },
      });
    }

    const tanggalFinal =
      data.tanggalReset ?? old.tanggalReset.toISOString().slice(0, 10);

    const updated = await prisma.resetMeter.update({
      where: { id: params.id },
      data: {
        ...(data.tanggalReset
          ? { tanggalReset: new Date(data.tanggalReset) }
          : {}),
        ...(data.alasan !== undefined ? { alasan: data.alasan } : {}),
        ...(data.meterAwalBaru !== undefined
          ? { meterAwalBaru: data.meterAwalBaru }
          : {}),
        status: "SELESAI", // ⬅️ paksa selesai
      },
    });

    await syncAfterReset(old.pelangganId, tanggalFinal);

    return NextResponse.json({ ok: true, item: updated });
  } catch (e: any) {
    console.error("PUT /api/reset-meter/[id] error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.resetMeter.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json(
        { ok: false, message: "Not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

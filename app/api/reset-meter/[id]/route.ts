// app/api/reset-meter/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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
    return NextResponse.json({
      ok: true,
      item: {
        ...r,
        tanggalReset: r.tanggalReset.toISOString().slice(0, 10),
        pelanggan: {
          nama: r.pelanggan?.nama ?? "",
          alamat: r.pelanggan?.alamat ?? "",
          blok: r.pelanggan?.zona?.kode ?? "-",
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

    // jika meterAwalBaru diganti → update master pelanggan juga
    if (typeof data.meterAwalBaru === "number") {
      await prisma.pelanggan.update({
        where: { id: old.pelangganId },
        data: {
          meterAwal: data.meterAwalBaru,
          // isResetMeter: true,
        },
      });
    }

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
        ...(data.status ? { status: data.status } : {}),
      },
    });

    // (opsional) sinkron ke CatatMeter seperti di POST — bisa dipakai ulang helpernya

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

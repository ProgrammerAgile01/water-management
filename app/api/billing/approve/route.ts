// app/api/billing/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json(
        { ok: false, message: "id diperlukan" },
        { status: 400 }
      );
    }

    const t = await prisma.tagihan.findUnique({
      where: { id, deletedAt: null },
      include: { pembayarans: { orderBy: { tanggalBayar: "desc" }, take: 1 } },
    });
    if (!t) {
      return NextResponse.json(
        { ok: false, message: "Tagihan tidak ditemukan" },
        { status: 404 }
      );
    }

    // pastikan ada pembayaran
    let payId = t.pembayarans[0]?.id;
    if (!payId) {
      const created = await prisma.pembayaran.create({
        data: {
          tagihanId: t.id,
          jumlahBayar: t.totalTagihan,
          buktiUrl: t.info ?? null, // opsional: taruh URL bukti jika kamu simpan di Tagihan.info
          adminBayar: "System",
        },
      });
      payId = created.id;
    }

    await prisma.tagihan.update({
      where: { id: t.id },
      data: { statusBayar: "PAID", statusVerif: "VERIFIED" },
    });

    return NextResponse.json({ ok: true, payId });
  } catch (e: any) {
    console.error("POST /api/billing/approve error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const tagihanId = req.nextUrl.searchParams.get("tagihanId") || "";
    if (!tagihanId) {
      return NextResponse.json({ ok: false, message: "tagihanId wajib" }, { status: 400 });
    }

    const t = await prisma.tagihan.findUnique({
      where: { id: tagihanId },
      select: {
        id: true,
        periode: true,
        totalTagihan: true,
        denda: true,
        statusBayar: true,
        statusVerif: true,
        tglJatuhTempo: true,
        pelangganId: true,
        info: true,
        createdAt: true,
        updatedAt: true,
        // ambil pembayaran terbaru (kalau ada)
        pembayaran: {
          where: { deletedAt: null },
          orderBy: { tanggalBayar: "desc" },
          take: 1,
          select: {
            id: true,
            tanggalBayar: true,
            jumlahBayar: true,
            buktiUrl: true,
            adminBayar: true,
            metode: true,
            keterangan: true,
          },
        },
      },
    });

    if (!t) {
      return NextResponse.json({ ok: false, message: "Tagihan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      tagihan: {
        id: t.id,
        periode: t.periode,
        totalTagihan: t.totalTagihan,
        denda: t.denda,
        statusBayar: t.statusBayar,
        statusVerif: t.statusVerif,
        tglJatuhTempo: t.tglJatuhTempo,
      },
      pembayaran: t.pembayaran?.[0] ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "Server error" }, { status: 500 });
  }
}
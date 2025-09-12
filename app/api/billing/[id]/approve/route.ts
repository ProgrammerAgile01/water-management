import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Next.js App Router params signature
export async function POST(
  _req: NextRequest,
  ctx: { params: { id?: string } }
) {
  try {
    const id = ctx?.params?.id;
    if (!id) {
      return NextResponse.json(
        { ok: false, message: "Missing id" },
        { status: 400 }
      );
    }

    // Ambil tagihan + total untuk dibuatkan pembayaran
    const tagihan = await prisma.tagihan.findUnique({
      where: { id },
      select: {
        id: true,
        totalTagihan: true,
        statusBayar: true,
        statusVerif: true,
      },
    });

    if (!tagihan) {
      return NextResponse.json(
        { ok: false, message: "Tagihan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Transaksi: buat Pembayaran + update status Tagihan
    const result = await prisma.$transaction(async (tx) => {
      const pay = await tx.pembayaran.create({
        data: {
          tagihanId: id,
          jumlahBayar: tagihan.totalTagihan,
          // kalau punya bukti dari UI, bisa dikirim di body dan dipakai di sini
          buktiUrl: null,
          adminBayar: "APPROVE_BUTTON",
        },
      });

      const updated = await tx.tagihan.update({
        where: { id },
        data: {
          statusBayar: "PAID",
          statusVerif: "VERIFIED",
        },
      });

      return { pay, updated };
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

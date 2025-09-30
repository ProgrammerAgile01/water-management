import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id =
      String(body?.paymentId || "").trim() || String(body?.id || "").trim();
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "paymentId wajib diisi" },
        { status: 400 }
      );
    }

    // Ambil payment dulu
    const pay = await prisma.hutangPayment.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!pay) {
      return NextResponse.json(
        { ok: false, error: "Pembayaran tidak ditemukan" },
        { status: 404 }
      );
    }

    // Jika sudah CLOSE, tolak
    if ((pay as any).status === "CLOSE") {
      return NextResponse.json(
        { ok: false, error: "Sudah diposting (terkunci)" },
        { status: 409 }
      );
    }

    // Update → status CLOSE + postedAt (kolom opsional; jika schema belum ada, Prisma akan abaikan field yg tak dikenal)
    const data: any = { status: "CLOSE" };
    try {
      data.postedAt = new Date();
    } catch {
      /* abaikan jika kolom tidak ada */
    }

    await prisma.hutangPayment.update({ where: { id }, data });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Gagal memposting pembayaran" },
      { status: 500 }
    );
  }
}

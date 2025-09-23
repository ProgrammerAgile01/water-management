import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderKwitansiToJPG } from "@/lib/render-kwitansi"; // util yang sudah Anda punya

export const runtime = "nodejs";

function getAppOrigin(req: NextRequest) {
  const h = req.headers;
  return (
    process.env.APP_ORIGIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    h.get("origin") ||
    `${h.get("x-forwarded-proto") || "http"}://${
      h.get("x-forwarded-host") || h.get("host") || ""
    }`
  )?.replace(/\/$/, "");
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const tagihanId = url.searchParams.get("tagihanId") || "";
    const payId = url.searchParams.get("payId") || undefined;
    if (!tagihanId) {
      return NextResponse.json(
        { ok: false, message: "tagihanId wajib" },
        { status: 400 }
      );
    }

    // Ambil komponen total due & sum pembayaran
    const t = await prisma.tagihan.findUnique({
      where: { id: tagihanId, deletedAt: null },
      select: {
        id: true,
        periode: true,
        totalTagihan: true,
        tagihanLalu: true,
        pelanggan: { select: { kode: true } },
      },
    });
    if (!t)
      return NextResponse.json(
        { ok: false, message: "Tagihan tidak ditemukan" },
        { status: 404 }
      );

    const agg = await prisma.pembayaran.aggregate({
      where: { tagihanId, deletedAt: null },
      _sum: { jumlahBayar: true },
    });
    const totalPaid = agg._sum.jumlahBayar || 0;
    const totalDue = (t.totalTagihan || 0) + (t.tagihanLalu || 0);
    const sisaKurang = totalDue - totalPaid;

    if (sisaKurang > 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "Belum lunas. Kwitansi bisa diunduh setelah lunas.",
        },
        { status: 400 }
      );
    }

    const origin = getAppOrigin(req);
    // Sesuaikan path halaman kwitansi Anda (sesuai file yang Anda kirim):
    // misal /kwitansi/[tagihanId]
    const tplUrl = `${origin}/print/kwitansi/${encodeURIComponent(tagihanId)}${
      payId ? `?payId=${encodeURIComponent(payId)}` : ""
    }`;

    const safeKode = (t.pelanggan?.kode || "CUST").replace(
      /[^A-Za-z0-9_-]/g,
      ""
    );
    const outName = `kwitansi-${t.periode}-${safeKode}.jpg`;

    const jpgUrl = await renderKwitansiToJPG({ tplUrl, outName }); // simpan ke /uploads/payment/kwitansi/img/...

    return NextResponse.json({ ok: true, url: jpgUrl });
  } catch (e: any) {
    console.error("[unduh-kwitansi]", e);
    return NextResponse.json(
      { ok: false, message: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

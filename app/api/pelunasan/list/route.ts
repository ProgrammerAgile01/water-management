import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth"; // sudah kamu punya

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ ok: false, message: "Unauthenticated" }, { status: 401 });
    }

    // role user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user) {
      return NextResponse.json({ ok: false, message: "User tidak ditemukan" }, { status: 401 });
    }

    // query params
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 50)));
    const q = (url.searchParams.get("q") || "").trim();
    const statusFilter = (url.searchParams.get("status") || "all").toLowerCase(); // all|lunas|belum_lunas
    const metode = (url.searchParams.get("metode") || "").toUpperCase(); // TUNAI|TRANSFER|EWALLET|QRIS
    const periode = (url.searchParams.get("periode") || "").trim(); // opsional: YYYY-MM
    const explicitPelangganId = url.searchParams.get("pelangganId") || "";

    // scope berdasarkan role
    let restrictPelangganId: string | undefined;
    if (user.role === "WARGA") {
      const pel = await prisma.pelanggan.findFirst({
        where: { userId: user.id, deletedAt: null },
        select: { id: true },
      });
      if (!pel) {
        return NextResponse.json({ ok: true, page, limit, total: 0, items: [] });
      }
      restrictPelangganId = pel.id;
    } else {
      // ADMIN / PETUGAS: boleh pilih pelanggan tertentu via query
      if (explicitPelangganId) restrictPelangganId = explicitPelangganId;
    }

    // where dasar pembayaran (exclude soft-deleted)
    const whereBase: any = {
      deletedAt: null,
      tagihan: {
        deletedAt: null,
        ...(restrictPelangganId ? { pelangganId: restrictPelangganId } : {}),
        ...(periode ? { periode: { equals: periode } } : {}),
        ...(q
          ? {
              OR: [
                { pelanggan: { nama: { contains: q, mode: "insensitive" } } },
                { pelanggan: { kode: { contains: q, mode: "insensitive" } } },
                { periode: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      ...(metode && metode !== "ALL" ? { metode: metode as any } : {}),
    };

    // ambil semua pembayaran (tanpa paging dulu) untuk hitung status per tagihan
    const all = await prisma.pembayaran.findMany({
      where: whereBase,
      orderBy: { tanggalBayar: "desc" },
      include: {
        tagihan: {
          select: {
            id: true,
            periode: true,
            totalTagihan: true,
            denda: true,
            pelangganId: true,
            pelanggan: { select: { id: true, kode: true, nama: true, wa: true } },
          },
        },
      },
    });

    if (all.length === 0) {
      return NextResponse.json({ ok: true, page, limit, total: 0, items: [] });
    }

    // agregasi total bayar per tagihan
    const tagihanIds = Array.from(new Set(all.map((p) => p.tagihanId)));
    const sumByTagihan = await prisma.pembayaran.groupBy({
      by: ["tagihanId"],
      where: { tagihanId: { in: tagihanIds }, deletedAt: null },
      _sum: { jumlahBayar: true },
    });
    const paidMap = new Map<string, number>();
    for (const g of sumByTagihan) {
      paidMap.set(g.tagihanId, g._sum.jumlahBayar || 0);
    }

    type Item = {
      id: string;
      tagihanId: string;
      pelangganId: string;
      pelangganKode: string;
      pelangganNama: string;
      periode: string;
      totalTagihan: number;
      denda: number;
      totalDenganDenda: number;
      nominalBayar: number;       // nilai pembayaran transaksi ini
      metodeBayar: string;
      tanggalBayar: string;       // ISO
      buktiUrl?: string | null;
      keterangan?: string | null;
      status: "lunas" | "belum_lunas"; // status tagihan (akumulasi)
    };

    const rows: Item[] = all.map((p) => {
      const t = p.tagihan;
      const totalPlusDenda = (t.totalTagihan || 0) + (t.denda || 0);
      const paid = paidMap.get(t.id) || 0;
      const status: "lunas" | "belum_lunas" = paid >= totalPlusDenda ? "lunas" : "belum_lunas";
      return {
        id: p.id,
        tagihanId: p.tagihanId,
        pelangganId: t.pelangganId,
        pelangganKode: t.pelanggan?.kode || "-",
        pelangganNama: t.pelanggan?.nama || "-",
        periode: t.periode,
        totalTagihan: t.totalTagihan || 0,
        denda: t.denda || 0,
        totalDenganDenda: totalPlusDenda,
        nominalBayar: p.jumlahBayar || 0,
        metodeBayar: p.metode,
        tanggalBayar: p.tanggalBayar.toISOString(),
        buktiUrl: p.buktiUrl,
        keterangan: p.keterangan || null,
        status,
      };
    });

    // filter status bila diminta
    const filtered =
      statusFilter === "all"
        ? rows
        : rows.filter((r) => r.status === (statusFilter as "lunas" | "belum_lunas"));

    const total = filtered.length;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return NextResponse.json({ ok: true, page, limit, total, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "Server error" }, { status: 500 });
  }
}
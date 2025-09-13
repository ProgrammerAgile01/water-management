import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

function toInt(v: string | null, def: number) {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

export async function GET(req: NextRequest) {
  try {
    // ── auth ───────────────────────────────────────────────────────────────────
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!me) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    // ── query params ───────────────────────────────────────────────────────────
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const periode = url.searchParams.get("periode") || undefined; // "YYYY-MM"
    let pelangganId = url.searchParams.get("pelangganId") || undefined;
    const page = Math.max(1, toInt(url.searchParams.get("page"), 1));
    const limit = Math.min(100, toInt(url.searchParams.get("limit"), 50));
    const skip = (page - 1) * limit;

    // ── constraint untuk WARGA: kunci ke pelanggan miliknya ───────────────────
    if (me.role === "WARGA") {
      const pel = await prisma.pelanggan.findFirst({
        where: { userId: me.id, deletedAt: null },
        select: { id: true },
      });
      if (!pel) {
        return NextResponse.json({ ok: true, page, limit, total: 0, items: [] });
      }
      pelangganId = pel.id;
    }

    // ── where clause ──────────────────────────────────────────────────────────
    const where: Prisma.TagihanWhereInput = {
      deletedAt: null,
      statusBayar: "UNPAID",
      ...(periode ? { periode } : {}),
      ...(pelangganId ? { pelangganId } : {}),
      ...(q
        ? {
            OR: [
              { pelanggan: { nama: { contains: q, mode: "insensitive" } } },
              { pelanggan: { kode: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    // ── query + count (parallel) ──────────────────────────────────────────────
    const [total, rows] = await Promise.all([
      prisma.tagihan.count({ where }),
      prisma.tagihan.findMany({
        where,
        orderBy: [{ tglJatuhTempo: "asc" }, { createdAt: "desc" }],
        include: { pelanggan: { select: { id: true, nama: true, kode: true, wa: true } } },
        skip,
        take: limit,
      }),
    ]);

    // ── shape response yang dipakai PaymentForm ───────────────────────────────
    const items = rows.map((t) => ({
      id: t.id,
      pelangganId: t.pelangganId,
      pelangganKode: t.pelanggan?.kode ?? null,
      pelangganNama: t.pelanggan?.nama ?? "-",
      periode: t.periode, // "YYYY-MM"
      totalTagihan: Number(t.totalTagihan || 0),
      tglJatuhTempo: t.tglJatuhTempo ? t.tglJatuhTempo.toISOString() : null,
      phone: t.pelanggan?.wa ?? null,
    }));

    return NextResponse.json({ ok: true, page, limit, total, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
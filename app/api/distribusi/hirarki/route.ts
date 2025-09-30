// app/api/distribusi/hirarki/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Qs = {
  keyword?: string;
  tandonId?: string;
  zonaId?: string;
  limitPelanggan?: string; // default 50 untuk tiap node, bisa "all"
};

function parseQs(req: NextRequest): Qs {
  const sp = req.nextUrl.searchParams;
  const q: Qs = {};
  const g = (k: string) => sp.get(k) ?? undefined;
  q.keyword = g("keyword")?.trim();
  q.tandonId = g("tandonId")?.trim();
  q.zonaId = g("zonaId")?.trim();
  q.limitPelanggan = g("limitPelanggan")?.trim();
  return q;
}

export async function GET(req: NextRequest) {
  try {
    const { keyword, tandonId, zonaId, limitPelanggan } = parseQs(req);
    const limit =
      limitPelanggan?.toLowerCase() === "all"
        ? undefined
        : Math.max(1, Number(limitPelanggan ?? 50) || 50);

    // ---- Filter keyword dipakai di level Tandon/Zona/Pelanggan (nama/kode/alamat) ----
    // Untuk efisiensi, kita batasi eager-load & pakai select terarah + _count
    const tandons = await prisma.tandon.findMany({
      where: {
        ...(tandonId ? { id: tandonId } : {}),
        ...(keyword
          ? {
              OR: [
                { nama: { contains: keyword, mode: "insensitive" } },
                { kode: { contains: keyword, mode: "insensitive" } },
                { deskripsi: { contains: keyword, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        kode: true,
        nama: true,
        deskripsi: true,
        initialMeter: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { zonas: true },
        },
        zonas: {
          where: {
            ...(zonaId ? { id: zonaId } : {}),
            ...(keyword
              ? {
                  OR: [{ nama: { contains: keyword, mode: "insensitive" } }],
                }
              : {}),
          },
          select: {
            id: true,
            nama: true,
            kode: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { pelanggan: true } },
            pelanggan: {
              where: {
                statusAktif: true,
                deletedAt: null,
                ...(keyword
                  ? {
                      OR: [
                        { nama: { contains: keyword, mode: "insensitive" } },
                        { kode: { contains: keyword, mode: "insensitive" } },
                        { alamat: { contains: keyword, mode: "insensitive" } },
                      ],
                    }
                  : {}),
              },
              orderBy: [{ noUrutRumah: "asc" }, { nama: "asc" }],
              select: {
                id: true,
                kode: true,
                nama: true,
                alamat: true,
                noUrutRumah: true,
                statusAktif: true,
              },
              ...(limit ? { take: limit } : {}),
            },
          },
          orderBy: [{ nama: "asc" }],
        },
      },
      orderBy: [{ nama: "asc" }],
    });

    // Hitung total pelanggan per tandon (akurat via _count di zona)
    const items = tandons.map((t) => {
      const totalPelanggan = t.zonas.reduce(
        (acc, z) => acc + z._count.pelanggan,
        0
      );
      return {
        id: t.id,
        kode: t.kode,
        nama: t.nama,
        deskripsi: t.deskripsi,
        initialMeter: t.initialMeter,
        totalZona: t._count.zonas,
        totalPelanggan,
        zonas: t.zonas.map((z) => ({
          id: z.id,
          kode: z.kode,
          nama: z.nama,
          totalPelanggan: z._count.pelanggan,
          pelanggan: z.pelanggan.map((p) => ({
            id: p.id,
            kode: p.kode,
            nama: p.nama,
            alamat: p.alamat,
            noUrut: p.noUrutRumah,
          })),
        })),
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Gagal memuat hierarki" },
      { status: 500 }
    );
  }
}

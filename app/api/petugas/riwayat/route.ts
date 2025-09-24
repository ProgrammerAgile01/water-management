// app/api/petugas/riwayat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isYm(v?: string | null) {
  return !!v && /^\d{4}-\d{2}$/.test(v);
}

export async function GET(req: NextRequest) {
  try {
    const meId = await getAuthUserId(req);
    if (!meId) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const sp = req.nextUrl.searchParams;
    const periode = sp.get("periode") || ""; // "YYYY-MM"
    const q = (sp.get("q") || "").trim().toLowerCase();

    // 1) ambil daftar zona yang dipegang petugas login
    const myZones = await prisma.zona.findMany({
      where: { petugasId: meId },
      select: { id: true },
    });
    const myZoneIds = new Set(myZones.map((z) => z.id));
    if (myZoneIds.size === 0) {
      return NextResponse.json({ ok: true, items: [] }); // tidak pegang zona = tidak ada riwayat
    }

    // 2) ambil entri catat sesuai bulan (opsional) dan JEJAK zona (zonaIdSnapshot)
    //    gunakan snapshot agar historisnya benar walau penugasan zona berubah
    const wherePeriode = isYm(periode)
      ? { periode: { kodePeriode: periode } }
      : {};
    const rows = await prisma.catatMeter.findMany({
      where: {
        deletedAt: null,
        status: "DONE",
        zonaIdSnapshot: { in: Array.from(myZoneIds) }, // ⬅️ kunci per petugas
        ...wherePeriode,
      },
      select: {
        id: true,
        meterAwal: true,
        meterAkhir: true,
        pemakaianM3: true,
        total: true,
        kendala: true,
        createdAt: true,
        periode: { select: { kodePeriode: true } },
        pelanggan: { select: { nama: true, zona: { select: { nama: true } } } },
        zonaNamaSnapshot: true,
      },
      orderBy: [{ createdAt: "desc" }],
    });

    // 3) mapping + filter q
    const items = rows
      .map((r) => ({
        id: r.id,
        tanggal: r.createdAt.toISOString(),
        periode: r.periode?.kodePeriode ?? "-",
        zona: r.zonaNamaSnapshot ?? r.pelanggan?.zona?.nama ?? "-",
        pelanggan: r.pelanggan?.nama ?? "-",
        meterAwal: r.meterAwal,
        meterAkhir: r.meterAkhir,
        pakai: r.pemakaianM3,
        total: r.total,
        status: "DONE",
        kendala: r.kendala ?? null,
      }))
      .filter((it) => {
        if (!q) return true;
        const s = `${it.periode} ${it.zona} ${it.pelanggan} ${
          it.kendala ?? ""
        }`.toLowerCase();
        return s.includes(q);
      });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    console.error("riwayat petugas error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message || "Gagal memuat riwayat" },
      { status: 500 }
    );
  }
}

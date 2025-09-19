import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Pilih periode:
 * - kalau ada ?periode=YYYY-MM → pakai itu
 * - kalau tidak ada → ambil periode TERBARU yang MEMILIKI data di CatatMeter
 */
async function resolvePeriodeFromCatatMeter(periodeParam?: string) {
  if (periodeParam) {
    const [yStr, mStr] = periodeParam.split("-");
    const cp = await prisma.catatPeriode.findFirst({
      where: { deletedAt: null, tahun: Number(yStr), bulan: Number(mStr) },
      select: { id: true, tahun: true, bulan: true },
    });
    if (cp) {
      return {
        id: cp.id,
        label: new Date(cp.tahun, cp.bulan - 1, 1).toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        }),
      };
    }
  }

  // periode terbaru yang PUNYA baris di CatatMeter
  const latest = await prisma.catatMeter.findFirst({
    where: { deletedAt: null },
    orderBy: [
      { periode: { tahun: "desc" } },
      { periode: { bulan: "desc" } },
      { updatedAt: "desc" },
    ],
    select: { periode: { select: { id: true, tahun: true, bulan: true } } },
  });

  if (!latest?.periode) return { id: null as string | null, label: "-" };

  const p = latest.periode;
  return {
    id: p.id,
    label: new Date(p.tahun, p.bulan - 1, 1).toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    }),
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const periodeParam = searchParams.get("periode") ?? undefined;

    // 1) tentukan periode berbasis CatatMeter
    const { id: periodeId, label: periodeLabel } =
      await resolvePeriodeFromCatatMeter(periodeParam);
    if (!periodeId) return NextResponse.json({ items: [], periode: "-" });

    // 2) ambil data DARI CatatMeter SAJA
    //    Catatan: kalau mau khusus yang sudah berstatus selesai, aktifkan filter status: "DONE"
    const rows = await prisma.catatMeter.findMany({
      where: {
        deletedAt: null,
        periodeId,
        // status: "DONE", // <-- uncomment jika hanya yang selesai
      },
      orderBy: { pemakaianM3: "desc" },
      select: {
        pemakaianM3: true,
        updatedAt: true,
        pelanggan: { select: { nama: true, alamat: true, wa: true } },
      },
      take: 300,
    });

    const items = rows.map((r) => ({
      name: r.pelanggan?.nama ?? "-",
      address: r.pelanggan?.alamat ?? "-",
      phone: r.pelanggan?.wa ?? "",
      usage: r.pemakaianM3 ?? 0,
      period: periodeLabel,
      lastReading: r.updatedAt.toISOString().slice(0, 10),
    }));

    return NextResponse.json({ items, periode: periodeLabel });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

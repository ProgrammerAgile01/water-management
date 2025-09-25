import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const periode = searchParams.get("periode");
  if (!periode) {
    return NextResponse.json(
      { ok: false, message: "periode wajib" },
      { status: 400 }
    );
  }

  // Periode yang diterima dari UI = periode Tagihan apa adanya (tanpa shift)
  const tagihans = await prisma.tagihan.findMany({
    where: { periode },
    include: {
      pelanggan: { select: { nama: true } },
      pembayarans: { select: { jumlahBayar: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const rows = tagihans.map((t, i) => {
    const dibayar = t.pembayarans.reduce((a, p) => a + (p.jumlahBayar || 0), 0);
    const tagihanBulanIni = t.totalTagihan || 0;
    const tagihanAwal = tagihanBulanIni - (t.abonemen || 0);
    const totalDue = (t.tagihanLalu || 0) + tagihanBulanIni;
    const sisaKurang = totalDue - dibayar;

    return {
      no: i + 1,
      nama: t.pelanggan?.nama ?? "-",
      pemakaianM3:
        tagihanAwal > 0 && t.tarifPerM3
          ? Math.round(tagihanAwal / t.tarifPerM3)
          : 0,
      tagihanAwal,
      abonemen: t.abonemen || 0,
      tagihanLalu: t.tagihanLalu || 0,
      totalTagihan: totalDue,
      sudahBayar: dibayar,
      sisaKurang,
      tglPengecekan: null,
      meterSaatPengecekan: 0,
      tglBayar: null,
      belumBayar: Math.max(totalDue - dibayar, 0),
      kembalian: Math.max(dibayar - totalDue, 0),

      pelangganId: t.pelangganId,
      tagihanId: t.id,

      info: t.info ?? null,
    };
  });

  const summary = rows.reduce(
    (a, r) => ({
      tagihanAwal: a.tagihanAwal + r.tagihanAwal,
      abonemen: a.abonemen + r.abonemen,
      tagihanLalu: a.tagihanLalu + r.tagihanLalu,
      totalTagihan: a.totalTagihan + r.totalTagihan,
      sudahBayar: a.sudahBayar + r.sudahBayar,
      sisaKurang: a.sisaKurang + r.sisaKurang,
      belumBayar: a.belumBayar + Math.max(r.totalTagihan - r.sudahBayar, 0),
    }),
    {
      tagihanAwal: 0,
      abonemen: 0,
      tagihanLalu: 0,
      totalTagihan: 0,
      sudahBayar: 0,
      sisaKurang: 0,
      belumBayar: 0,
    }
  );

  return NextResponse.json({ ok: true, periode, rows, summary });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const periode = searchParams.get("periode");
  const pelangganId = searchParams.get("pelangganId");
  const tagihanId = searchParams.get("tagihanId");

  if (!periode) return NextResponse.json({ ok:false, message:"periode wajib" }, { status:400 });
  if (!pelangganId && !tagihanId) {
    return NextResponse.json({ ok:false, message:"pelangganId atau tagihanId wajib" }, { status:400 });
  }

  const periodeRow = await prisma.catatPeriode.findUnique({
    where: { kodePeriode: periode },
    select: { id: true },
  });

  const tagihan = await prisma.tagihan.findFirst({
    where: {
      periode,
      ...(tagihanId ? { id: tagihanId } : {}),
      ...(pelangganId ? { pelangganId } : {}),
    },
    include: {
      pelanggan: { select: { id: true, nama: true, alamat: true } },
      pembayarans: {
        select: { id: true, tanggalBayar: true, jumlahBayar: true, metode: true, keterangan: true },
        orderBy: { tanggalBayar: "asc" },
      },
    },
  });
  if (!tagihan) return NextResponse.json({ ok:false, message:"Tagihan tidak ditemukan" }, { status:404 });

  // ambil CatatMeter bulan ini (untuk meter awal/akhir/pemakaian)
  let meterAwal = 0, meterAkhir = 0, pemakaianM3 = 0, tglPengecekan: Date|null = null;
  if (periodeRow?.id) {
    const cm = await prisma.catatMeter.findUnique({
      where: { periodeId_pelangganId: { periodeId: periodeRow.id, pelangganId: tagihan.pelangganId } },
      select: { meterAwal: true, meterAkhir: true, pemakaianM3: true, createdAt: true },
    });
    if (cm) {
      meterAwal = cm.meterAwal || 0;
      meterAkhir = cm.meterAkhir || 0;
      pemakaianM3 = cm.pemakaianM3 || 0;
      tglPengecekan = cm.createdAt;
    }
  }

  const dibayar = tagihan.pembayarans.reduce((a, p) => a + (p.jumlahBayar || 0), 0);
  const tagihanBulanIni = tagihan.totalTagihan || 0;
  const tagihanAwal = tagihanBulanIni - (tagihan.abonemen || 0);
  const totalDue = (tagihan.tagihanLalu || 0) + tagihanBulanIni;
  const sisaKurang = (tagihan.tagihanLalu || 0) + tagihanBulanIni - dibayar;

  return NextResponse.json({
    ok: true,
    periode,
    detail: {
      tagihanId: tagihan.id,
      pelangganId: tagihan.pelangganId,
      nama: tagihan.pelanggan?.nama ?? "-",
      alamat: tagihan.pelanggan?.alamat ?? "",
      tglPengecekan,
      meterAwal,
      meterAkhir,
      pemakaianM3,
      tarifPerM3: tagihan.tarifPerM3,
      abonemen: tagihan.abonemen,
      denda: tagihan.denda,
      tagihanAwal,
      tagihanLalu: tagihan.tagihanLalu,
      totalBulanIni: tagihanBulanIni,
      totalTagihanDue: totalDue,
      dibayar,
      sisaKurang,
      tglJatuhTempo: tagihan.tglJatuhTempo,
      pembayaran: tagihan.pembayarans.map(p => ({
        id: p.id,
        tanggalBayar: p.tanggalBayar,
        jumlahBayar: p.jumlahBayar,
        metode: p.metode,
        keterangan: p.keterangan,
      })),
    },
  });
}

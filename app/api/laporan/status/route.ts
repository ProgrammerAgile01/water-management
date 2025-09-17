// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

// export async function GET(req: NextRequest) {
//   const { searchParams } = new URL(req.url);
//   const periode = searchParams.get("periode"); // format "YYYY-MM"
//   if (!periode) {
//     return NextResponse.json({ ok: false, message: "Query ?periode=YYYY-MM wajib" }, { status: 400 });
//   }

//   // ambil CatatPeriode.id untuk join ke CatatMeter
//   const periodeRow = await prisma.catatPeriode.findUnique({
//     where: { kodePeriode: periode },
//     select: { id: true, tarifPerM3: true },
//   });

//   // ambil semua tagihan bulan tsb
//   const tagihans = await prisma.tagihan.findMany({
//     where: { periode },
//     include: {
//       pelanggan: { select: { id: true, nama: true } },
//       pembayarans: { select: { tanggalBayar: true, jumlahBayar: true }, orderBy: { tanggalBayar: "asc" } },
//     },
//     orderBy: [{ createdAt: "asc" }],
//   });

//   // peta CatatMeter per pelanggan untuk bulan ini
//   const cmMap = new Map<string, {
//     createdAt: Date | null;
//     meterAkhir: number;
//     pemakaianM3: number;
//   }>();

//   if (periodeRow?.id) {
//     const cms = await prisma.catatMeter.findMany({
//       where: { periodeId: periodeRow.id },
//       select: { pelangganId: true, createdAt: true, meterAkhir: true, pemakaianM3: true },
//     });
//     cms.forEach(c => cmMap.set(c.pelangganId, {
//       createdAt: c.createdAt,
//       meterAkhir: c.meterAkhir || 0,
//       pemakaianM3: c.pemakaianM3 || 0,
//     }));
//   }

//   const rows = tagihans.map((t, i) => {
//     const cm = cmMap.get(t.pelangganId) ?? { createdAt: null, meterAkhir: 0, pemakaianM3: 0 };
//     const sudahBayar = t.pembayarans.reduce((a, p) => a + (p.jumlahBayar || 0), 0);
//     const total = t.totalTagihan || 0;
//     const belumBayar = Math.max(total - sudahBayar, 0);
//     const kembalian = Math.max(sudahBayar - total, 0);
//     const tglBayar = t.pembayarans.length ? t.pembayarans[t.pembayarans.length - 1].tanggalBayar : null;

//     // mengikuti judul kolom Excel: tarif dari tagihan (snapshot) × pemakaianM3
//     const tagihanAwal = (t.tarifPerM3 || 0) * (cm.pemakaianM3 || 0);

//     return {
//       no: i + 1,
//       nama: t.pelanggan?.nama ?? "-",
//       tglPengecekan: cm.createdAt,          // Tgl Pengecekan Petugas
//       meterSaatPengecekan: cm.meterAkhir,
//       pemakaianM3: cm.pemakaianM3,
//       tagihanAwal,
//       abonemen: t.abonemen || 0,
//       totalTagihan: total,
//       tglBayar,
//       sudahBayar,
//       belumBayar,
//       kembalian,
//     };
//   });

//   // ringkasan bawah tabel
//   const summary = rows.reduce((acc, r) => {
//     acc.tagihanAwal += r.tagihanAwal;
//     acc.abonemen += r.abonemen;
//     acc.totalTagihan += r.totalTagihan;
//     acc.sudahBayar += r.sudahBayar;
//     acc.belumBayar += r.belumBayar;
//     acc.kembalian += r.kembalian;
//     return acc;
//   }, { tagihanAwal: 0, abonemen: 0, totalTagihan: 0, sudahBayar: 0, belumBayar: 0, kembalian: 0 });

//   return NextResponse.json({ ok: true, periode, rows, summary });
// }

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const periode = searchParams.get("periode");
  if (!periode)
    return NextResponse.json(
      { ok: false, message: "periode wajib" },
      { status: 400 }
    );

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
    const sisaKurang = (t.tagihanLalu || 0) + tagihanBulanIni - dibayar;

    return {
      // --- yang sudah ada ---
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

      // --- tambahkan ini ---
      pelangganId: t.pelangganId,
      tagihanId: t.id,
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
    }),
    {
      tagihanAwal: 0,
      abonemen: 0,
      tagihanLalu: 0,
      totalTagihan: 0,
      sudahBayar: 0,
      sisaKurang: 0,
    }
  );

  return NextResponse.json({ ok: true, periode, rows, summary });
}

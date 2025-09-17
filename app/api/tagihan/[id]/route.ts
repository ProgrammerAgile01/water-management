import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id)
      return NextResponse.json(
        { ok: false, message: "id wajib" },
        { status: 400 }
      );

    const t = await prisma.tagihan.findUnique({
      where: { id },
      include: {
        pelanggan: { select: { id: true, kode: true, nama: true, wa: true } },
        // ambil pembayaran agar bisa hitung “dibayar”
        pembayarans: {
          where: { deletedAt: null },
          select: { jumlahBayar: true, tanggalBayar: true },
        },
      },
    });
    if (!t)
      return NextResponse.json(
        { ok: false, message: "Tagihan tidak ditemukan" },
        { status: 404 }
      );

    // ambil catatan meter untuk periode & pelanggan ini (jika ada)
    const cm = await prisma.catatMeter.findFirst({
      where: {
        pelangganId: t.pelangganId,
        periode: { kodePeriode: t.periode },
        deletedAt: null,
      },
      include: { periode: true },
    });

    // ambil setting untuk nilai denda (biar UI bisa hitung saat user ubah tanggal)
    const setting = await prisma.setting.findUnique({ where: { id: 1 } });

    // === perhitungan baru ===
    const dibayar = t.pembayarans.reduce((a, p) => a + (p.jumlahBayar || 0), 0);
    const tagihanLalu = t.tagihanLalu || 0; // (+/-) carry-over
    const totalBulanIni = t.totalTagihan || 0; // tarif*m3 + abonemen (tanpa denda sesuai instruksi)
    const totalDue = tagihanLalu + totalBulanIni; // yang seharusnya ditagih bulan ini
    const sisaKurang = totalDue - dibayar; // (+ berarti masih kurang, - berarti lebih)

    return NextResponse.json({
      ok: true,
      tagihan: {
        id: t.id,
        pelangganId: t.pelangganId,
        pelangganKode: t.pelanggan?.kode ?? null,
        pelangganNama: t.pelanggan?.nama ?? "-",
        phone: t.pelanggan?.wa ?? null,

        periode: t.periode,
        tarifPerM3: t.tarifPerM3,
        abonemen: t.abonemen,
        denda: t.denda,
        totalTagihan: totalBulanIni, // (nama lama) = tagihan bulan ini
        tagihanLalu, // (+/-)
        totalDue, // (baru) = tagihanLalu + totalBulanIni
        dibayar, // (baru) total pembayaran yang sudah masuk
        sisaKurang, // (baru) dasar carry-over bulan depan
        
        statusBayar: t.statusBayar,
        statusVerif: t.statusVerif,
        tglJatuhTempo: t.tglJatuhTempo,

        meterAwal: cm?.meterAwal ?? null,
        meterAkhir: cm?.meterAkhir ?? null,
        pemakaianM3: cm?.pemakaianM3 ?? null,
      },
      dendaFirstMonth: setting?.dendaTelatBulanSama ?? 0,
      dendaNextMonths: setting?.dendaTelatBulanBerbeda ?? 0,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

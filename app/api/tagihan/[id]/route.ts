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
        pembayarans: {
          where: { deletedAt: null },
          select: { jumlahBayar: true, tanggalBayar: true },
        },
        // ★ ambil angka meter langsung dari relasi 1↔1
        catatMeter: {
          select: { meterAwal: true, meterAkhir: true, pemakaianM3: true },
        },
      },
    });

    if (!t)
      return NextResponse.json(
        { ok: false, message: "Tagihan tidak ditemukan" },
        { status: 404 }
      );

    // (hapus) cari catatMeter by (pelangganId, periode) — tidak diperlukan lagi

    // ambil setting untuk nilai denda (biar UI bisa hitung saat user ubah tanggal)
    const setting = await prisma.setting.findUnique({ where: { id: 1 } });

    // === perhitungan baru ===
    const dibayar = t.pembayarans.reduce((a, p) => a + (p.jumlahBayar || 0), 0);
    const tagihanLalu = t.tagihanLalu || 0; // (+/-) carry-over
    const totalBulanIni = t.totalTagihan || 0; // tarif*m3 + abonemen (tanpa denda)
    const totalDue = tagihanLalu + totalBulanIni;
    const sisaKurang = totalDue - dibayar; // (+ masih kurang, - lebih)

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
        totalTagihan: totalBulanIni, // tagihan bulan ini (tanpa carry)
        tagihanLalu,                 // (+/-)
        totalDue,                    // = tagihanLalu + totalBulanIni
        dibayar,                     // total payment masuk
        sisaKurang,                  // jadi dasar carry bulan depan

        statusBayar: t.statusBayar,
        statusVerif: t.statusVerif,
        tglJatuhTempo: t.tglJatuhTempo,

        info: t.info ?? null,

        // ★ angka meter dari relasi; aman walau periode dimajukan
        meterAwal: t.catatMeter?.meterAwal ?? null,
        meterAkhir: t.catatMeter?.meterAkhir ?? null,
        pemakaianM3: t.catatMeter?.pemakaianM3 ?? null,
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

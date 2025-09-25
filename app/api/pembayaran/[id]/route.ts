import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MetodeBayar } from "@prisma/client";
import { saveUploadFile } from "@/lib/uploads";
import { nextMonth } from "@/lib/period";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!id) return NextResponse.json({ ok: false, message: "id wajib" }, { status: 400 });

    const form = await req.formData();
    const nominalBayar = Number(form.get("nominalBayar") || 0);
    const tanggalStr = String(form.get("tanggalBayar") || "");
    const metodeRaw = String(form.get("metodeBayar") || "").toUpperCase();
    const keterangan = String(form.get("keterangan") || "");
    const file = form.get("buktiFile") as File | null;

    if (!nominalBayar || nominalBayar <= 0) {
      return NextResponse.json({ ok: false, message: "Nominal tidak valid" }, { status: 400 });
    }

    const allow = ["TUNAI", "TRANSFER", "EWALLET", "QRIS"] as const;
    const metode: MetodeBayar = (allow as readonly string[]).includes(metodeRaw)
      ? (metodeRaw as MetodeBayar)
      : MetodeBayar.TUNAI;

    const pay = await prisma.pembayaran.findUnique({
      where: { id },
      select: { id: true, tagihanId: true, buktiUrl: true },
    });
    if (!pay) return NextResponse.json({ ok: false, message: "Pembayaran tidak ditemukan" }, { status: 404 });

    const tanggalBayar = tanggalStr ? new Date(tanggalStr) : new Date();

    // simpan file baru jika ada, kalau tidak ada pakai yang lama
    let buktiUrl = pay.buktiUrl || null;
    if (file) {
      const saved = await saveUploadFile(file, "payment/bukti-bayar");
      buktiUrl = saved.publicUrl;
    }

    // TRANSAKSI: update pembayaran + rekalkulasi tagihan + propagate next
    await prisma.$transaction(async (tx) => {
      await tx.pembayaran.update({
        where: { id: pay.id },
        data: {
          jumlahBayar: Math.round(nominalBayar),
          tanggalBayar,
          buktiUrl,
          metode,
          keterangan: keterangan || null,
        },
      });

      // Recalc tagihan saat ini
      const t = await tx.tagihan.findUnique({
        where: { id: pay.tagihanId },
        select: { id: true, pelangganId: true, periode: true, totalTagihan: true, tagihanLalu: true },
      });
      if (!t) throw new Error("Tagihan tidak ditemukan");

      const agg = await tx.pembayaran.aggregate({
        where: { tagihanId: t.id, deletedAt: null },
        _sum: { jumlahBayar: true },
      });

      const totalBulanIni = t.totalTagihan ?? 0;
      const carry = t.tagihanLalu ?? 0;
      const totalDue = totalBulanIni + carry;
      const totalPaid = agg._sum.jumlahBayar ?? 0;
      const sisaKurang = totalDue - totalPaid;
      const statusBayar = totalPaid > 0 ? "PAID" : "UNPAID";

      await tx.tagihan.update({
        where: { id: t.id },
        data: { sisaKurang, statusBayar },
      });

      // Propagate ke bulan berikut
      const periodeNext = nextMonth(t.periode);
      const nextT = await tx.tagihan.findUnique({
        where: { pelangganId_periode: { pelangganId: t.pelangganId, periode: periodeNext } },
        select: { id: true, totalTagihan: true },
      });

      if (nextT) {
        await tx.tagihan.update({ where: { id: nextT.id }, data: { tagihanLalu: sisaKurang } });

        const aggNext = await tx.pembayaran.aggregate({
          where: { tagihanId: nextT.id, deletedAt: null },
          _sum: { jumlahBayar: true },
        });

        const totalPaidNext = aggNext._sum.jumlahBayar ?? 0;
        const totalDueNext = (nextT.totalTagihan ?? 0) + sisaKurang;
        const sisaNext = totalDueNext - totalPaidNext;
        const statusNext = totalPaidNext > 0 ? "PAID" : "UNPAID";

        await tx.tagihan.update({
          where: { id: nextT.id },
          data: { sisaKurang: sisaNext, statusBayar: statusNext },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "Server error" }, { status: 500 });
  }
}
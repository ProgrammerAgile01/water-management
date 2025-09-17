import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { prevMonth } from "@/lib/period";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { periode, items } = await req.json() as {
      periode: string; // "YYYY-MM"
      items: Array<{ pelangganId: string; totalBulanIni: number; tarifPerM3: number; abonemen: number; jatuhTempo: string }>;
    };

    if (!periode || !items?.length) {
      return NextResponse.json({ ok: false, message: "payload tidak lengkap" }, { status: 400 });
    }

    const periodePrev = prevMonth(periode);

    await prisma.$transaction(async (tx) => {
      for (const it of items) {
        // cari sisa bulan sebelumnya untuk carry
        let carry = 0;
        const prev = await tx.tagihan.findUnique({
          where: { pelangganId_periode: { pelangganId: it.pelangganId, periode: periodePrev } },
          select: { id: true, totalTagihan: true, tagihanLalu: true, sisaKurang: true },
        });

        if (prev) {
          // pakai sisaKurang kalau sudah tersimpan; fallback hitung cepat
          if (typeof prev.sisaKurang === "number") {
            carry = prev.sisaKurang;
          } else {
            const paidAgg = await tx.pembayaran.aggregate({
              where: { tagihanId: prev.id, deletedAt: null },
              _sum: { jumlahBayar: true },
            });
            const totalDuePrev = (prev.totalTagihan ?? 0) + (prev.tagihanLalu ?? 0);
            carry = totalDuePrev - (paidAgg._sum.jumlahBayar ?? 0);
          }
        }

        const totalDueNow = (it.totalBulanIni ?? 0) + carry;

        await tx.tagihan.create({
          data: {
            pelangganId: it.pelangganId,
            periode,
            tarifPerM3: it.tarifPerM3,
            abonemen: it.abonemen ?? 0,
            denda: 0,
            totalTagihan: it.totalBulanIni,
            tagihanLalu: carry,            // <<— penting
            sisaKurang: totalDueNow,       // awalnya = total (belum ada pembayaran)
            statusBayar: totalDueNow <= 0 ? "PAID" : "UNPAID",
            tglJatuhTempo: new Date(it.jatuhTempo),
          },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "Server error" }, { status: 500 });
  }
}

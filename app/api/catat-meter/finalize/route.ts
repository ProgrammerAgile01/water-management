import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const periodeStr = req.nextUrl.searchParams.get("periode") ?? "";
  if (!/^\d{4}-\d{2}$/.test(periodeStr)) {
    return NextResponse.json(
      { ok: false, message: "periode harus YYYY-MM" },
      { status: 400 }
    );
  }

  try {
    // Pastikan CatatPeriode ada (ambil tarif/abonemen dari snapshot periode)
    const cp = await prisma.catatPeriode.upsert({
      where: { kodePeriode: periodeStr },
      update: {},
      create: await (async () => {
        const s = await prisma.setting.findUnique({ where: { id: 1 } });
        if (!s) throw new Error("Setting tidak ditemukan");
        const y = Number(periodeStr.slice(0, 4));
        const m = Number(periodeStr.slice(5, 7));
        return {
          kodePeriode: periodeStr,
          bulan: m,
          tahun: y,
          tarifPerM3: s.tarifPerM3,
          abonemen: s.abonemen,
        };
      })(),
    });

    // Ambil baris DONE yang belum dikunci
    const rows = await prisma.catatMeter.findMany({
      where: {
        periodeId: cp.id,
        deletedAt: null,
        status: "DONE",
        OR: [{ isLocked: false }, { isLocked: null }],
      },
      select: {
        id: true,
        pelangganId: true,
        meterAwal: true,
        meterAkhir: true,
        pemakaianM3: true,
        tarifPerM3: true,
        abonemen: true,
      },
      orderBy: { id: "asc" },
    });

    if (rows.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Tidak ada pelanggan DONE untuk dikunci" },
        { status: 400 }
      );
    }

    const setting = await prisma.setting.findUnique({ where: { id: 1 } });
    if (!setting)
      return NextResponse.json(
        { ok: false, message: "Setting tidak ditemukan" },
        { status: 500 }
      );

    const today = new Date();
    const due = new Date(
      today.getFullYear(),
      today.getMonth(),
      setting.tglJatuhTempo
    );

    await prisma.$transaction(async (tx) => {
      for (const r of rows) {
        const tarif = r.tarifPerM3 ?? cp.tarifPerM3;
        const abon = r.abonemen ?? cp.abonemen;
        const pem = Math.max(
          0,
          r.pemakaianM3 ?? (r.meterAkhir ?? 0) - (r.meterAwal ?? 0)
        );
        const total = tarif * pem + abon + (setting.biayaAdmin ?? 0);

        await tx.tagihan.upsert({
          where: {
            pelangganId_periode: {
              pelangganId: r.pelangganId,
              periode: periodeStr,
            },
          },
          update: {
            tarifPerM3: tarif,
            abonemen: abon,
            totalTagihan: total,
            denda: 0,
            statusBayar: "UNPAID",
            statusVerif: "UNVERIFIED",
            tglJatuhTempo: due,
          },
          create: {
            pelangganId: r.pelangganId,
            periode: periodeStr,
            tarifPerM3: tarif,
            abonemen: abon,
            totalTagihan: total,
            denda: 0,
            statusBayar: "UNPAID",
            statusVerif: "UNVERIFIED",
            tglJatuhTempo: due,
          },
        });

        await tx.catatMeter.update({
          where: { id: r.id },
          data: { isLocked: true, lockedAt: new Date() },
        });
      }

      // Recompute progres periode
      const agg = await tx.catatMeter.groupBy({
        by: ["status"],
        where: { periodeId: cp.id, deletedAt: null },
        _count: { _all: true },
      });
      const selesai = agg.find((a) => a.status === "DONE")?._count._all ?? 0;
      const pending = agg.find((a) => a.status === "PENDING")?._count._all ?? 0;
      const total = selesai + pending;

      // Kunci periode hanya jika semua baris terkunci
      const belumTerkunci = await tx.catatMeter.count({
        where: {
          periodeId: cp.id,
          deletedAt: null,
          OR: [{ isLocked: false }, { isLocked: null }],
        },
      });
      const lockPeriod = belumTerkunci === 0;

      await tx.catatPeriode.update({
        where: { id: cp.id },
        data: {
          totalPelanggan: total,
          selesai,
          pending,
          isLocked: lockPeriod,
          lockedAt: lockPeriod ? new Date() : null,
          status: lockPeriod ? "FINAL" : "DRAFT",
        },
      });
    });

    return NextResponse.json({ ok: true, lockedRows: rows.length });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e.message ?? "Server error" },
      { status: 500 }
    );
  }
}

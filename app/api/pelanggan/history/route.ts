import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const qp = z.object({
    pelangganId: z.string(),
    page: z.string().optional(),
    pageSize: z.string().optional(),
});

function mapTagihanToItem(t: any) {
    const catat = t.catatMeter ?? null;
    const periodeCatat =
        catat && catat.periode
            ? // prefer kodePeriode (YYYY-MM) jika ada, else try month/year
              catat.periode.kodePeriode ??
              (catat.periode.tahun && catat.periode.bulan
                  ? `${catat.periode.tahun}-${String(
                        catat.periode.bulan
                    ).padStart(2, "0")}`
                  : null)
            : null;

    const pembayaran =
        Array.isArray(t.pembayarans) && t.pembayarans.length > 0
            ? t.pembayarans[0]
            : null;

    return {
        id: t.id,
        // periode: prefer periode catatMeter, fallback ke tagihan.periode
        periode: periodeCatat ?? t.periode ?? null,
        meterAwal: catat?.meterAwal ?? null,
        meterAkhir: catat?.meterAkhir ?? null,
        jmlPakai: catat?.pemakaianM3 ?? null,
        tarifPerM3:
            typeof t.tarifPerM3 === "number"
                ? t.tarifPerM3
                : catat?.tarifPerM3 ?? null,
        abonemen:
            typeof t.abonemen === "number"
                ? t.abonemen
                : catat?.abonemen ?? null,
        denda: typeof t.denda === "number" ? t.denda : null,
        total: typeof t.totalTagihan === "number" ? t.totalTagihan : null,
        statusBayar: t.statusBayar ?? null,
        tanggalBayar: pembayaran?.tanggalBayar
            ? new Date(pembayaran.tanggalBayar).toISOString()
            : null,
        keterangan: t.info ?? null,
        notaUrl: pembayaran?.buktiUrl ?? null,
        createdBy: null,
    };
}

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const parsed = qp.parse(Object.fromEntries(url.searchParams.entries()));

        const pelangganId = parsed.pelangganId;
        const page = Math.max(1, parseInt(parsed.page ?? "1", 10));
        const pageSize = Math.min(
            200,
            Math.max(1, parseInt(parsed.pageSize ?? "50", 10))
        );


        const where: any = { pelangganId, deletedAt: null };

        const total = await prisma.tagihan.count({ where });
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const safePage = Math.min(page, totalPages);

        const itemsRaw = await prisma.tagihan.findMany({
            where,
            orderBy: [{ periode: "desc" }, { createdAt: "desc" }],
            skip: (safePage - 1) * pageSize,
            take: pageSize,
            include: {
                pembayarans: {
                    orderBy: { tanggalBayar: "desc" },
                    take: 1,
                    select: {
                        id: true,
                        jumlahBayar: true,
                        buktiUrl: true,
                        tanggalBayar: true,
                    },
                },
                catatMeter: {
                    select: {
                        meterAwal: true,
                        meterAkhir: true,
                        pemakaianM3: true,
                        tarifPerM3: true,
                        abonemen: true,
                        total: true,
                        // include periode relation
                        periode: {
                            select: {
                                id: true,
                                kodePeriode: true,
                                bulan: true,
                                tahun: true,
                            },
                        },
                    },
                },
            },
        });

        const items = itemsRaw.map(mapTagihanToItem);

        return NextResponse.json({
            ok: true,
            items,
            pagination: { page: safePage, pageSize, total, totalPages },
        });
    } catch (err) {
        console.error("GET /api/pelanggan/history error:", err);
        return NextResponse.json(
            { ok: false, message: (err as any)?.message ?? "Server error" },
            { status: 500 }
        );
    }
}

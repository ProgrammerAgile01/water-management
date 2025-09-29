import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Parse rentang tanggal fleksibel (YYYY-MM-DD) */
function parseDateRange(dateFrom?: string | null, dateTo?: string | null) {
  let gte: Date | undefined;
  let lte: Date | undefined;
  if (dateFrom) {
    // 00:00:00 local
    gte = new Date(`${dateFrom}T00:00:00`);
  }
  if (dateTo) {
    // 23:59:59 local
    lte = new Date(`${dateTo}T23:59:59`);
  }
  return { gte, lte };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const giver = (url.searchParams.get("giver") || "").trim();
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");

    const where: any = {};
    if (giver) where.pemberi = giver;

    const { gte, lte } = parseDateRange(dateFrom, dateTo);
    if (gte || lte) {
      where.tanggalBayar = {};
      if (gte) where.tanggalBayar.gte = gte;
      if (lte) where.tanggalBayar.lte = lte;
    }

    // Ambil payment + detail + referensi hutangnya
    const rows = await prisma.hutangPayment.findMany({
      where,
      orderBy: [{ tanggalBayar: "desc" }, { createdAt: "desc" }],
      include: {
        details: {
          include: {
            hutangDetail: {
              select: {
                id: true,
                keterangan: true,
                hutang: {
                  select: {
                    id: true,
                    noBukti: true,
                    tanggalHutang: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Bentuk payload yang dipakai halaman
    const items = rows.map((p) => ({
      id: p.id,
      refNo: p.refNo,
      pemberi: p.pemberi,
      tanggalBayar:
        p.tanggalBayar instanceof Date
          ? p.tanggalBayar.toISOString()
          : (p.tanggalBayar as any),
      createdAt:
        p.createdAt instanceof Date
          ? p.createdAt.toISOString()
          : (p.createdAt as any),
      total: p.total || 0,
      note: p.note,
      details: (p.details || []).map((d) => ({
        id: d.id,
        hutangDetailId: d.hutangDetailId,
        hutangId: d.hutangDetail?.hutang?.id ?? null,
        hutangNoBukti: d.hutangDetail?.hutang?.noBukti ?? null,
        hutangTanggal:
          d.hutangDetail?.hutang?.tanggalHutang instanceof Date
            ? d.hutangDetail?.hutang?.tanggalHutang.toISOString()
            : (d.hutangDetail?.hutang?.tanggalHutang as any),
        keterangan: d.hutangDetail?.keterangan ?? null,
        amount: d.amount || 0,
      })),
    }));

    // Filter q di memory (ref/pemberi/note + detail.keterangan/noBukti)
    const filtered = q
      ? items.filter((p) => {
          const base = `${p.refNo || ""} ${p.pemberi || ""} ${
            p.note || ""
          }`.toLowerCase();
          const hitDetail = (p.details || []).some((d) =>
            `${d.keterangan || ""} ${d.hutangNoBukti || ""}`
              .toLowerCase()
              .includes(q)
          );
          return base.includes(q) || hitDetail;
        })
      : items;

    const summary = {
      count: filtered.length,
      total: filtered.reduce((a, b) => a + (b.total || 0), 0),
    };

    return NextResponse.json({ ok: true, items: filtered, summary });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "ERR_HISTORY" },
      { status: 500 }
    );
  }
}

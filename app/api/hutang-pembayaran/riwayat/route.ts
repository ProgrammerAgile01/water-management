import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/* util tanggal */
function parseDateRange(dateFrom?: string | null, dateTo?: string | null) {
  let gte: Date | undefined;
  let lte: Date | undefined;
  if (dateFrom) gte = new Date(`${dateFrom}T00:00:00`);
  if (dateTo) lte = new Date(`${dateTo}T23:59:59`);
  return { gte, lte };
}
const toISO = (d?: Date | null) =>
  d instanceof Date ? d.toISOString() : (d as any);

/* =================== GET =================== */
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
                  select: { id: true, noBukti: true, tanggalHutang: true },
                },
              },
            },
          },
        },
      },
    });

    const items = rows.map((p) => ({
      id: p.id,
      refNo: p.refNo,
      pemberi: p.pemberi,
      tanggalBayar: toISO(p.tanggalBayar),
      createdAt: toISO(p.createdAt),
      postedAt: toISO((p as any).postedAt ?? null), // biar gampang nentuin status
      total: p.total || 0,
      note: p.note,
      details: (p.details || []).map((d) => ({
        id: d.id,
        hutangDetailId: d.hutangDetailId,
        hutangId: d.hutangDetail?.hutang?.id ?? null,
        hutangNoBukti: d.hutangDetail?.hutang?.noBukti ?? null,
        hutangTanggal: toISO(d.hutangDetail?.hutang?.tanggalHutang),
        keterangan: d.hutangDetail?.keterangan ?? null,
        amount: d.amount || 0,
      })),
    }));

    const filtered =
      q.length === 0
        ? items
        : items.filter((p) => {
            const base = `${p.refNo || ""} ${p.pemberi || ""} ${
              p.note || ""
            }`.toLowerCase();
            const hitDetail = (p.details || []).some((d) =>
              `${d.keterangan || ""} ${d.hutangNoBukti || ""}`
                .toLowerCase()
                .includes(q)
            );
            return base.includes(q) || hitDetail;
          });

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

/* =================== PUT (update header + detail) =================== */
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const id: string = String(body?.id || "");
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing payment id" },
        { status: 400 }
      );
    }

    // ambil payment buat validasi status
    const current = await prisma.hutangPayment.findUnique({
      where: { id },
      select: { id: true, postedAt: true },
    });
    if (!current) {
      return NextResponse.json(
        { ok: false, error: "Pembayaran tidak ditemukan" },
        { status: 404 }
      );
    }
    if ((current as any).postedAt) {
      return NextResponse.json(
        { ok: false, error: "Pembayaran sudah POSTING (tidak bisa diedit)" },
        { status: 400 }
      );
    }

    // normalisasi input
    const pemberi: string = String(body?.pemberi || "").trim();
    const note: string = String(body?.note || "");
    const dateOnly: string = String(body?.tanggalBayar || ""); // YYYY-MM-DD
    const tanggalBayar = /^\d{4}-\d{2}-\d{2}$/.test(dateOnly)
      ? new Date(`${dateOnly}T00:00:00`)
      : new Date();

    const details: Array<{ id: string; amount: number }> = Array.isArray(
      body?.details
    )
      ? body.details
      : [];

    // hitung total baru
    const total = details.reduce(
      (s, d) => s + (Number.isFinite(Number(d.amount)) ? Number(d.amount) : 0),
      0
    );

    await prisma.$transaction(async (tx) => {
      await tx.hutangPayment.update({
        where: { id },
        data: { pemberi, note, tanggalBayar, total },
      });

      for (const d of details) {
        await tx.hutangPaymentDetail.update({
          where: { id: d.id },
          data: { amount: Number(d.amount || 0) },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "ERR_UPDATE" },
      { status: 500 }
    );
  }
}

/* =================== PATCH (posting) =================== */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const id: string = String(body?.id || "");

    const row = await prisma.hutangPayment.findUnique({ where: { id } });
    if (!row) {
      return NextResponse.json(
        { ok: false, error: "Pembayaran tidak ditemukan" },
        { status: 404 }
      );
    }
    if ((row as any).postedAt) {
      return NextResponse.json({ ok: true, already: true });
    }

    await prisma.hutangPayment.update({
      where: { id },
      data: { postedAt: new Date() as any }, // kolom opsional
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "ERR_POST" },
      { status: 500 }
    );
  }
}

/* =================== DELETE (hapus bila masih DRAFT) =================== */
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = String(url.searchParams.get("id") || "");

    const row = await prisma.hutangPayment.findUnique({ where: { id } });
    if (!row) {
      return NextResponse.json(
        { ok: false, error: "Pembayaran tidak ditemukan" },
        { status: 404 }
      );
    }
    if ((row as any).postedAt) {
      return NextResponse.json(
        { ok: false, error: "Sudah POSTING. Tidak bisa dihapus." },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.hutangPaymentDetail.deleteMany({ where: { paymentId: id } });
      await tx.hutangPayment.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "ERR_DELETE" },
      { status: 500 }
    );
  }
}

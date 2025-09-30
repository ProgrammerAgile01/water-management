import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const toRow = (h: any) => ({
  id: h.id,
  noBukti: h.noBukti,
  tanggalInput: h.tanggalInput.toISOString().slice(0, 10),
  tanggalHutang: h.tanggalHutang.toISOString().slice(0, 10),
  keterangan: h.keterangan,
  pemberi: h.pemberi,
  nominal: h.nominal,
  status: h.status === "CLOSE" ? "Close" : "Draft",
  details: (h.details ?? []).map((d: any, i: number) => ({
    id: d.id,
    no: d.no || i + 1,
    keterangan: d.keterangan,
    nominal: d.nominal,
  })),
});

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const q = (u.searchParams.get("q") || "").trim();
  const status = u.searchParams.get("status") || "";
  const dateFrom = u.searchParams.get("dateFrom");
  const dateTo = u.searchParams.get("dateTo");

  const where: any = {};
  if (q) {
    where.OR = [
      { noBukti: { contains: q, mode: "insensitive" } },
      { keterangan: { contains: q, mode: "insensitive" } },
      { pemberi: { contains: q, mode: "insensitive" } },
    ];
  }
  if (status === "DRAFT" || status === "CLOSE") where.status = status;
  if (dateFrom || dateTo) {
    where.tanggalHutang = {};
    if (dateFrom) where.tanggalHutang.gte = new Date(`${dateFrom}T00:00:00`);
    if (dateTo) where.tanggalHutang.lte = new Date(`${dateTo}T23:59:59.999`);
  }

  const rows = await prisma.hutang.findMany({
    where,
    orderBy: [{ tanggalHutang: "asc" }, { createdAt: "asc" }],
    include: { details: true },
  });

  const items = rows.map(toRow);
  const summary = {
    total: items.reduce((a, b) => a + (b.nominal || 0), 0),
    count: items.length,
  };
  return NextResponse.json({ ok: true, items, summary });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const {
    noBukti,
    tanggalHutang,
    keterangan,
    pemberi,
    nominal = 0,
  } = body ?? {};

  if (!noBukti || !tanggalHutang || !keterangan || !pemberi) {
    return NextResponse.json(
      { ok: false, error: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  try {
    const created = await prisma.hutang.create({
      data: {
        noBukti: String(noBukti),
        tanggalHutang: new Date(tanggalHutang),
        keterangan: String(keterangan),
        pemberi: String(pemberi),
        nominal: Number(nominal || 0),
        status: "DRAFT",
      },
      include: { details: true },
    });
    return NextResponse.json(
      { ok: true, item: toRow(created) },
      { status: 201 }
    );
  } catch (e: any) {
    if (
      String(e?.message || "")
        .toLowerCase()
        .includes("unique")
    ) {
      return NextResponse.json(
        { ok: false, error: "NOBUKTI_DUPLICATE" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: e?.message || "ERR_POST" },
      { status: 500 }
    );
  }
}

/** DELETE /api/hutang?id=... */
export async function DELETE(req: NextRequest) {
  const u = new URL(req.url);
  const id = u.searchParams.get("id");
  if (!id)
    return NextResponse.json(
      { ok: false, error: "ID_REQUIRED" },
      { status: 400 }
    );

  try {
    const head = await prisma.hutang.findUnique({ where: { id } });
    if (!head)
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND" },
        { status: 404 }
      );
    if (head.status === "CLOSE") {
      return NextResponse.json(
        { ok: false, error: "HUTANG_CLOSE" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.hutangDetail.deleteMany({ where: { hutangId: id } });
      await tx.hutang.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "ERR_DELETE" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const toHeader = (h: any) => ({
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
    tanggal:
      (d.tanggal instanceof Date
        ? d.tanggal.toISOString().slice(0, 10)
        : d.tanggal) ?? null, // ⬅️ NEW
  })),
});

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  const h = await prisma.hutang.findUnique({
    where: { id: params.id },
    include: { details: true },
  });
  if (!h)
    return NextResponse.json(
      { ok: false, error: "NOT_FOUND" },
      { status: 404 }
    );
  return NextResponse.json({ ok: true, item: toHeader(h) });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => ({}));
  const h = await prisma.hutang.findUnique({ where: { id: params.id } });
  if (!h)
    return NextResponse.json(
      { ok: false, error: "NOT_FOUND" },
      { status: 404 }
    );
  if (h.status === "CLOSE")
    return NextResponse.json(
      { ok: false, error: "HUTANG_CLOSE" },
      { status: 400 }
    );

  const data: any = {};
  if (typeof body.noBukti === "string" && body.noBukti.trim())
    data.noBukti = body.noBukti.trim();
  if (typeof body.keterangan === "string") data.keterangan = body.keterangan;
  if (typeof body.pemberi === "string") data.pemberi = body.pemberi;
  if (typeof body.tanggalHutang === "string")
    data.tanggalHutang = new Date(body.tanggalHutang);
  if (Number.isFinite(Number(body.nominal)))
    data.nominal = Number(body.nominal);

  const updated = await prisma.hutang.update({
    where: { id: params.id },
    data,
    include: { details: true },
  });
  return NextResponse.json({ ok: true, item: toHeader(updated) });
}

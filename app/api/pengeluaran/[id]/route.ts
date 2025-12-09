// app/api/pengeluaran/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function toClientHeader(p: any) {
  return {
    id: p.id,
    noBulan: p.noBulan,
    tanggalInput: p.tanggalInput.toISOString().slice(0, 10),
    tanggalPengeluaran: p.tanggalPengeluaran.toISOString().slice(0, 10),
    total: p.total,
    status: p.status === "CLOSE" ? "Close" : "Draft",
    details: (p.details ?? []).map((d: any) => ({
      id: d.id,
      keterangan: d.keterangan,
      biaya: d.biayaNamaSnapshot,
      nominal: d.nominal,
    })),
  };
}

export async function GET(
  _: NextRequest,
  context: { params: Promise<{ id: string }> }

) {
  const { id } = await context.params;

  const p = await prisma.pengeluaran.findUnique({
    where: { id: id },
    include: { details: true },
  });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(toClientHeader(p));
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }

) {
  const { id } = await context.params;

  const body = await req.json().catch(() => ({}));
  const data: any = {};

  if (typeof body?.noBulan === "string") data.noBulan = body.noBulan;
  if (typeof body?.tanggalPengeluaran === "string") {
    const tgl = new Date(body.tanggalPengeluaran);
    if (Number.isNaN(+tgl))
      return NextResponse.json(
        { error: "tanggalPengeluaran invalid" },
        { status: 400 }
      );
    data.tanggalPengeluaran = tgl;
  }

  const updated = await prisma.pengeluaran.update({
    where: { id: id },
    data,
    include: { details: true },
  });
  return NextResponse.json(toClientHeader(updated));
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  // action: "post" => CLOSE
  const body = await req.json().catch(() => ({}));
  if (body?.action !== "post") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  const p = await prisma.pengeluaran.findUnique({
    where: { id: id },
    include: { details: true },
  });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (p.status === "CLOSE")
    return NextResponse.json({ error: "Sudah CLOSE" }, { status: 400 });

  const closed = await prisma.pengeluaran.update({
    where: { id: id },
    data: { status: "CLOSE" },
    include: { details: true },
  });

  return NextResponse.json(toClientHeader(closed));
}

export async function DELETE(
  _: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const p = await prisma.pengeluaran.findUnique({ where: { id: id } });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (p.status === "CLOSE") {
    return NextResponse.json(
      { error: "Pengeluaran dalam status CLOSE tidak dapat dihapus" },
      { status: 400 }
    );
  }

  await prisma.pengeluaran.delete({ where: { id: id } });
  return NextResponse.json({ ok: true });
}

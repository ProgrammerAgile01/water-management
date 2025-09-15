// app/api/pengeluaran/[id]/detail/[detailId]/route.ts  (PUT update, DELETE)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; detailId: string } }
) {
  const body = await req.json().catch(() => ({}));
  const { masterBiayaId, keterangan, nominal } = body ?? {};

  const header = await prisma.pengeluaran.findUnique({
    where: { id: params.id },
  });
  if (!header)
    return NextResponse.json({ error: "Header not found" }, { status: 404 });
  if (header.status === "CLOSE")
    return NextResponse.json(
      { error: "Pengeluaran sudah CLOSE" },
      { status: 400 }
    );

  const data: any = {};
  if (masterBiayaId) {
    const mb = await prisma.masterBiaya.findUnique({
      where: { id: masterBiayaId },
    });
    if (!mb)
      return NextResponse.json(
        { error: "MasterBiaya not found" },
        { status: 404 }
      );
    data.masterBiayaId = masterBiayaId;
    data.biayaNamaSnapshot = mb.nama;
  }
  if (typeof keterangan === "string") data.keterangan = keterangan;
  if (typeof nominal === "number") data.nominal = nominal;

  await prisma.$transaction(async (tx) => {
    await tx.pengeluaranDetail.update({
      where: { id: params.detailId },
      data,
    });
    const totalAgg = await tx.pengeluaranDetail.aggregate({
      where: { pengeluaranId: params.id },
      _sum: { nominal: true },
    });
    await tx.pengeluaran.update({
      where: { id: params.id },
      data: { total: totalAgg._sum.nominal ?? 0 },
    });
  });

  const updated = await prisma.pengeluaran.findUnique({
    where: { id: params.id },
    include: { details: true },
  });

  return NextResponse.json({
    id: updated!.id,
    noBulan: updated!.noBulan,
    tanggalInput: updated!.tanggalInput.toISOString().slice(0, 10),
    tanggalPengeluaran: updated!.tanggalPengeluaran.toISOString().slice(0, 10),
    total: updated!.total,
    status: updated!.status === "CLOSE" ? "Close" : "Draft",
    details: updated!.details.map((d) => ({
      id: d.id,
      keterangan: d.keterangan,
      biaya: d.biayaNamaSnapshot,
      nominal: d.nominal,
    })),
  });
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string; detailId: string } }
) {
  const header = await prisma.pengeluaran.findUnique({
    where: { id: params.id },
  });
  if (!header)
    return NextResponse.json({ error: "Header not found" }, { status: 404 });
  if (header.status === "CLOSE")
    return NextResponse.json(
      { error: "Pengeluaran sudah CLOSE" },
      { status: 400 }
    );

  await prisma.$transaction(async (tx) => {
    await tx.pengeluaranDetail.delete({ where: { id: params.detailId } });
    const totalAgg = await tx.pengeluaranDetail.aggregate({
      where: { pengeluaranId: params.id },
      _sum: { nominal: true },
    });
    await tx.pengeluaran.update({
      where: { id: params.id },
      data: { total: totalAgg._sum.nominal ?? 0 },
    });
  });

  return NextResponse.json({ ok: true });
}

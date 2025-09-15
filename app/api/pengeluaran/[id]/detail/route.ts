// app/api/pengeluaran/[id]/detail/route.ts  (POST add)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => ({}));
  const { masterBiayaId, keterangan, nominal } = body ?? {};

  if (!masterBiayaId || !keterangan || typeof nominal !== "number") {
    return NextResponse.json(
      { error: "masterBiayaId, keterangan, nominal wajib" },
      { status: 400 }
    );
  }

  // cek header & status
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

  // ambil master biaya
  const mb = await prisma.masterBiaya.findUnique({
    where: { id: masterBiayaId },
  });
  if (!mb)
    return NextResponse.json(
      { error: "MasterBiaya not found" },
      { status: 404 }
    );

  await prisma.$transaction(async (tx) => {
    await tx.pengeluaranDetail.create({
      data: {
        pengeluaranId: params.id,
        masterBiayaId,
        biayaNamaSnapshot: mb.nama,
        keterangan,
        nominal,
      },
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

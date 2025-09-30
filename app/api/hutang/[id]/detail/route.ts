import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => ({}));
  const { keterangan, nominal, tanggal } = body ?? {};

  const head = await prisma.hutang.findUnique({ where: { id: params.id } });
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
  if (!keterangan || !Number.isFinite(Number(nominal)) || !tanggal) {
    return NextResponse.json(
      { ok: false, error: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    const count = await tx.hutangDetail.count({
      where: { hutangId: params.id },
    });
    await tx.hutangDetail.create({
      data: {
        hutangId: params.id,
        keterangan: String(keterangan),
        nominal: Number(nominal),
        no: count + 1,
        tanggal: new Date(`${tanggal}T00:00:00`), // ⬅️ simpan tanggal detail
      },
    });

    const agg = await tx.hutangDetail.aggregate({
      where: { hutangId: params.id },
      _sum: { nominal: true },
    });
    await tx.hutang.update({
      where: { id: params.id },
      data: { nominal: agg._sum.nominal ?? 0 },
    });
  });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; detailId: string } }
) {
  const body = await req.json().catch(() => ({}));
  const { keterangan, nominal } = body ?? {};

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

  const data: any = {};
  if (typeof keterangan === "string") data.keterangan = keterangan;
  if (Number.isFinite(Number(nominal))) data.nominal = Number(nominal);

  await prisma.$transaction(async (tx) => {
    await tx.hutangDetail.update({ where: { id: params.detailId }, data });
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

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string; detailId: string } }
) {
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

  await prisma.$transaction(async (tx) => {
    await tx.hutangDetail.delete({ where: { id: params.detailId } });
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

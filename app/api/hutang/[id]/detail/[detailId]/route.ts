import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type P = { id: string; detailId: string };

export async function PUT(
  req: NextRequest,
  ctx: { params: P } | { params: Promise<P> }
) {
  const { id, detailId } = await (ctx as any).params;
  const body = await req.json().catch(() => ({}));
  const { keterangan, nominal } = body ?? {};

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
  if (!keterangan || !Number.isFinite(Number(nominal))) {
    return NextResponse.json(
      { ok: false, error: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.hutangDetail.update({
      where: { id: detailId },
      data: { keterangan: String(keterangan), nominal: Number(nominal) },
    });
    const agg = await tx.hutangDetail.aggregate({
      where: { hutangId: id },
      _sum: { nominal: true },
    });
    await tx.hutang.update({
      where: { id },
      data: { nominal: agg._sum.nominal ?? 0 },
    });
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: P } | { params: Promise<P> }
) {
  const { id, detailId } = await (ctx as any).params;

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
    await tx.hutangDetail.delete({ where: { id: detailId } });
    // re-number optional: skip; only recompute total
    const agg = await tx.hutangDetail.aggregate({
      where: { hutangId: id },
      _sum: { nominal: true },
    });
    await tx.hutang.update({
      where: { id },
      data: { nominal: agg._sum.nominal ?? 0 },
    });
  });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const head = await prisma.hutang.findUnique({
    where: { id: params.id },
    include: { details: true },
  });
  if (!head) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  if (head.status === "CLOSE") return NextResponse.json({ ok: true }); // idempotent
  if (!head.details?.length) {
    return NextResponse.json({ ok: false, error: "DETAIL_REQUIRED" }, { status: 400 });
  }

  // pastikan total sesuai detail
  const total = head.details.reduce((a, b) => a + (b.nominal || 0), 0);
  await prisma.hutang.update({
    where: { id: params.id },
    data: { status: "CLOSE", nominal: total },
  });
  return NextResponse.json({ ok: true });
}

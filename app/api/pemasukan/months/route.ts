import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const data = await prisma.pemasukan.findMany({
    select: { tanggal: true },
  });

  const months = [
    ...new Set(data.map((item) => item.tanggal.toISOString().slice(0, 7))),
  ]
    .sort()
    .reverse();

  return NextResponse.json({ months });
}

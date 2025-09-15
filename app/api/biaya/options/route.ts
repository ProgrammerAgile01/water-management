// app/api/biaya/options/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.masterBiaya.findMany({
    where: { status: "Aktif" },
    orderBy: { nama: "asc" },
    select: { id: true, nama: true, kode: true },
  });
  return NextResponse.json({ items });
}

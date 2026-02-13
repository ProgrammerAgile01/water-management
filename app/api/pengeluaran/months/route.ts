import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.pengeluaran.findMany({
    select: {
      tanggalPengeluaran: true,
    },
  });

  // Ambil YYYY-MM unik
  const monthsSet = new Set<string>();

  items.forEach((item) => {
    const d = item.tanggalPengeluaran;
    const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
      2,
      "0",
    )}`;
    monthsSet.add(ym);
  });

  const months = Array.from(monthsSet).sort();

  return NextResponse.json({ months });
}

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const getMonthKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
};

export async function GET() {
  const data = await prisma.pemasukan.findMany({
    select: { tanggal: true },
  });

  const months = [...new Set(data.map((item) => getMonthKey(item.tanggal)))]
    .sort()
    .reverse();

  return NextResponse.json({ months });
}

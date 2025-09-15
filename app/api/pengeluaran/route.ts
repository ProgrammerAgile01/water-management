// app/api/pengeluaran/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function toClientHeader(p: any) {
  return {
    id: p.id,
    noBulan: p.noBulan,
    tanggalInput: p.tanggalInput.toISOString().slice(0, 10),
    tanggalPengeluaran: p.tanggalPengeluaran.toISOString().slice(0, 10),
    total: p.total,
    status: p.status === "CLOSE" ? "Close" : "Draft",
    details: (p.details ?? []).map((d: any) => ({
      id: d.id,
      keterangan: d.keterangan,
      biaya: d.biayaNamaSnapshot, // UI expects string
      nominal: d.nominal,
    })),
  };
}

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month"); // "YYYY-MM"
  const where: any = {};
  if (month) {
    const [y, m] = month.split("-").map((x) => parseInt(x, 10));
    if (!Number.isNaN(y) && !Number.isNaN(m)) {
      const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
      const end = new Date(Date.UTC(m === 12 ? y + 1 : y, m % 12, 1, 0, 0, 0));
      where.tanggalPengeluaran = { gte: start, lt: end };
    }
  }

  const items = await prisma.pengeluaran.findMany({
    where,
    orderBy: [{ tanggalPengeluaran: "asc" }, { createdAt: "asc" }],
    include: { details: true },
  });

  return NextResponse.json({ items: items.map(toClientHeader) });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { noBulan, tanggalPengeluaran } = body ?? {};

  if (!tanggalPengeluaran) {
    return NextResponse.json(
      { error: "tanggalPengeluaran wajib" },
      { status: 400 }
    );
  }

  const tgl = new Date(tanggalPengeluaran);
  if (Number.isNaN(+tgl)) {
    return NextResponse.json(
      { error: "tanggalPengeluaran invalid" },
      { status: 400 }
    );
  }

  // Jika noBulan tidak dikirim, generate "PG-YYYY-MM"
  const ym = `${tgl.getUTCFullYear()}-${String(tgl.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}`;
  const genNo = noBulan?.toString() || `PG-${ym}`;

  const created = await prisma.pengeluaran.create({
    data: {
      noBulan: genNo,
      tanggalPengeluaran: tgl,
      // tanggalInput default now()
      status: "DRAFT",
      total: 0,
    },
    include: { details: true },
  });

  return NextResponse.json(toClientHeader(created), { status: 201 });
}

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const parseTanggal = (value?: string) => {
  if (!value) return undefined;

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

// GET ALL
export async function GET() {
  const data = await prisma.pemasukan.findMany({
    orderBy: { tanggal: "desc" },
  });

  return NextResponse.json(data);
}

// CREATE
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const tanggal = parseTanggal(body.tanggal);

    if (!body.nama || !body.nominal) {
      return NextResponse.json(
        { message: "Nama dan nominal wajib diisi" },
        { status: 400 },
      );
    }

    if (body.tanggal && !tanggal) {
      return NextResponse.json(
        { message: "Tanggal pemasukan tidak valid" },
        { status: 400 },
      );
    }

    const created = await prisma.pemasukan.create({
      data: {
        tanggal,
        nama: body.nama,
        nominal: Number(body.nominal),
        keterangan: body.keterangan || null,
      },
    });

    return NextResponse.json(created);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Gagal membuat pemasukan" },
      { status: 500 },
    );
  }
}

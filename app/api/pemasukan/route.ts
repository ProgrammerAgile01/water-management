import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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

    if (!body.nama || !body.nominal) {
      return NextResponse.json(
        { message: "Nama dan nominal wajib diisi" },
        { status: 400 },
      );
    }

    const created = await prisma.pemasukan.create({
      data: {
        tanggal: body.tanggal ? new Date(body.tanggal) : new Date(),
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

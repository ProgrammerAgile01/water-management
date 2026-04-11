import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const parseTanggal = (value?: string) => {
  if (!value) return undefined;

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

// GET DETAIL
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const data = await prisma.pemasukan.findUnique({
    where: { id },
  });

  if (!data) {
    return NextResponse.json(
      { message: "Data tidak ditemukan" },
      { status: 404 },
    );
  }

  return NextResponse.json(data);
}

// UPDATE
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const existing = await prisma.pemasukan.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json(
      { message: "Data tidak ditemukan" },
      { status: 404 },
    );
  }

  if (existing.status === "POSTED") {
    return NextResponse.json(
      { message: "Data sudah diposting dan tidak bisa diubah" },
      { status: 400 },
    );
  }

  const body = await req.json();
  const tanggal = parseTanggal(body.tanggal);

  if (body.tanggal && !tanggal) {
    return NextResponse.json(
      { message: "Tanggal pemasukan tidak valid" },
      { status: 400 },
    );
  }

  const updated = await prisma.pemasukan.update({
    where: { id },
    data: {
      nama: body.nama,
      nominal: Number(body.nominal),
      keterangan: body.keterangan,
      tanggal: tanggal ?? existing.tanggal,
    },
  });

  return NextResponse.json(updated);
}

// DELETE
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const existing = await prisma.pemasukan.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json(
      { message: "Data tidak ditemukan" },
      { status: 404 },
    );
  }

  if (existing.status === "POSTED") {
    return NextResponse.json(
      { message: "Data sudah diposting dan tidak bisa dihapus" },
      { status: 400 },
    );
  }

  await prisma.pemasukan.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}

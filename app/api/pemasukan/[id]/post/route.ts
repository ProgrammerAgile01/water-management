import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
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
    return NextResponse.json({ message: "Sudah diposting" }, { status: 400 });
  }

  const updated = await prisma.pemasukan.update({
    where: { id },
    data: {
      status: "POSTED",
      postedAt: new Date(),
      // nanti bisa isi dari session
      // postedBy: userId
    },
  });

  return NextResponse.json(updated);
}

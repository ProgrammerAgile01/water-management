// app/api/jadwal/[id]/start/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.jadwalPencatatan.update({
      where: { id: params.id },
      data: { status: "IN_PROGRESS" },
    });
    return NextResponse.json({ ok: true, message: "Pencatatan dimulai." });
  } catch (e: any) {
    if (e?.code === "P2025")
      return NextResponse.json(
        { ok: false, message: "Jadwal tidak ditemukan" },
        { status: 404 }
      );
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

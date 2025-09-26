import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi"),
  kategori: z.string().optional().default(""),
  satuan: z.string().optional().default(""),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await req.json();
    const parsed = UpdateSchema.parse(body);

    const item = await prisma.item.update({
      where: { id },
      data: {
        nama: parsed.nama,
        kategori: parsed.kategori,
        satuan: parsed.satuan,
      },
      select: {
        id: true,
        kode: true,
        nama: true,
        kategori: true,
        satuan: true,
        stok: true,
        hargaBeli: true,
      },
    });

    return NextResponse.json({ ok: true, item });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json(
        { ok: false, message: e.errors?.[0]?.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, message: e?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    await prisma.item.update({
      where: { id },
      data: { deletedAt: new Date() }, // SOFT DELETE
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message },
      { status: 500 }
    );
  }
}

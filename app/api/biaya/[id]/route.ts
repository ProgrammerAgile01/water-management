// app/api/biaya/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await req.json().catch(() => ({}));

    const data: any = {};
    if (typeof body?.nama === "string") {
      const nama = body.nama.trim();
      if (!nama || nama.length < 3) {
        return NextResponse.json(
          { error: "Nama minimal 3 karakter" },
          { status: 400 }
        );
      }
      data.nama = nama;
    }
    if (typeof body?.deskripsi === "string") {
      data.deskripsi = body.deskripsi.trim() || null;
    }
    if (body?.status === "Aktif" || body?.status === "Nonaktif") {
      data.status = body.status;
    }

    // NB: kode dikunci dari UI (auto), tapi kalau suatu hari perlu update manual:
    if (typeof body?.kode === "string" && body.kode.trim()) {
      const kode = body.kode.trim().toUpperCase();
      // Cek unik kecuali record sendiri
      const exist = await prisma.masterBiaya.findFirst({
        where: { kode, NOT: { id } },
      });
      if (exist) {
        return NextResponse.json(
          { error: "Kode sudah digunakan" },
          { status: 409 }
        );
      }
      data.kode = kode;
    }

    const updated = await prisma.masterBiaya.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await req.json().catch(() => ({}));

    if (body?.action === "toggle") {
      const cur = await prisma.masterBiaya.findUnique({ where: { id } });
      if (!cur)
        return NextResponse.json({ error: "Not found" }, { status: 404 });

      const next = cur.status === "Aktif" ? "Nonaktif" : "Aktif";
      const updated = await prisma.masterBiaya.update({
        where: { id },
        data: { status: next },
      });
      return NextResponse.json(updated);
    }

    // Generic partial update (optional)
    const data: any = {};
    if (typeof body?.status === "string") data.status = body.status;
    if (typeof body?.deskripsi === "string")
      data.deskripsi = body.deskripsi.trim() || null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No-op" }, { status: 400 });
    }

    const updated = await prisma.masterBiaya.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    await prisma.masterBiaya.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}

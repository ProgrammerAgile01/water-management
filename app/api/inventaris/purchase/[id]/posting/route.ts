// app/api/inventaris/purchase/[id]/posting/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST: close (posting) satu purchase by id
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // cek ada & belum dihapus
    const existing = await prisma.purchase.findUnique({
      where: { id },
      select: { id: true, status: true, deletedAt: true },
    });
    if (!existing || existing.deletedAt) {
      return NextResponse.json(
        { ok: false, message: "Purchase tidak ditemukan." },
        { status: 404 }
      );
    }

    if (existing.status === "CLOSE") {
      return NextResponse.json(
        { ok: false, message: "Purchase sudah CLOSE." },
        { status: 400 }
      );
    }

    await prisma.purchase.update({
      where: { id },
      data: { status: "CLOSE" },
    });

    return NextResponse.json({ ok: true, closed: 1 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Gagal posting" },
      { status: 500 }
    );
  }
}

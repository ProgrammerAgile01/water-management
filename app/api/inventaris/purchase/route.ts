import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  tanggal: z.string().min(1), // "YYYY-MM-DDTHH:mm" dari <input type="datetime-local">
  supplier: z.string().min(1),
  itemId: z.string().min(1),
  qty: z.number().int().positive(),
  harga: z.number().int().positive(),
});

// helper: parse "YYYY-MM-DDTHH:mm" (waktu lokal) → Date UTC
function parseLocalDateTimeToUTC(s: string) {
  const [datePart, timePart = "00:00"] = s.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0));
}

export async function GET() {
  try {
    const rows = await prisma.purchase.findMany({
      where: { deletedAt: null },
      orderBy: { tanggal: "desc" },
      take: 100,
      select: {
        id: true,
        tanggal: true,
        supplier: true,
        qty: true,
        harga: true,
        total: true,
        status: true,
        itemId: true,
        item: { select: { nama: true } },
      },
    });
    const mapped = rows.map((r) => ({
      id: r.id,
      tanggal: r.tanggal.toISOString(),
      supplier: r.supplier,
      itemId: r.itemId,
      itemNama: r.item?.nama ?? "-",
      qty: r.qty,
      harga: r.harga,
      total: r.total,
      status: r.status,
    }));
    return NextResponse.json({ ok: true, rows: mapped });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateSchema.parse({
      ...body,
      qty: Number(body?.qty),
      harga: Number(body?.harga),
    });

    const tanggal = parseLocalDateTimeToUTC(parsed.tanggal); // ⬅️ PENTING

    await prisma.$transaction(async (tx) => {
      const total = parsed.qty * parsed.harga;

      await tx.purchase.create({
        data: {
          tanggal,
          supplier: parsed.supplier,
          qty: parsed.qty,
          harga: parsed.harga,
          total,
          itemId: parsed.itemId,
          status: "DRAFT",
        },
      });

      const updated = await tx.item.update({
        where: { id: parsed.itemId },
        data: { stok: { increment: parsed.qty }, hargaBeli: parsed.harga },
        select: { stok: true },
      });

      await tx.stockLedger.create({
        data: {
          tanggal,
          masuk: parsed.qty,
          keluar: 0,
          saldo: updated.stok,
          itemId: parsed.itemId,
        },
      });
    });

    return NextResponse.json({ ok: true });
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

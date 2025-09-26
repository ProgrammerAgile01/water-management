import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  tanggal: z.string().min(1), // "YYYY-MM-DDTHH:mm"
  supplier: z.string().min(1),
  itemId: z.string().min(1),
  qty: z.number().int().positive(),
  harga: z.number().int().positive(),
});

function parseLocalDateTimeToUTC(s: string) {
  const [datePart, timePart = "00:00"] = s.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0));
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    // Next 15: params async — aman juga kalau sync.
    const { id } = ctx.params;
    const body = await req.json();
    const parsed = UpdateSchema.parse({
      ...body,
      qty: Number(body?.qty),
      harga: Number(body?.harga),
    });

    await prisma.$transaction(async (tx) => {
      const existing = await tx.purchase.findUnique({
        where: { id },
        select: {
          id: true,
          itemId: true,
          qty: true,
          deletedAt: true,
          status: true,
        },
      });
      if (!existing || existing.deletedAt)
        throw new Error("Purchase tidak ditemukan");
      if (existing.status === "CLOSE")
        throw new Error("Purchase sudah CLOSE dan tidak bisa diedit.");

      const newTanggal = parseLocalDateTimeToUTC(parsed.tanggal); // ⬅️ PENTING
      const total = parsed.qty * parsed.harga;

      if (existing.itemId === parsed.itemId) {
        const agg = await tx.purchase.aggregate({
          where: { deletedAt: null, itemId: parsed.itemId, NOT: { id } },
          _sum: { qty: true },
        });
        const base = Number(agg._sum.qty || 0);
        const newStock = base + parsed.qty;
        const delta = parsed.qty - existing.qty;

        await tx.item.update({
          where: { id: parsed.itemId },
          data: { stok: newStock },
        });

        if (delta !== 0) {
          await tx.stockLedger.create({
            data: {
              tanggal: newTanggal,
              masuk: delta > 0 ? delta : 0,
              keluar: delta < 0 ? -delta : 0,
              saldo: newStock,
              itemId: parsed.itemId,
            },
          });
        }
      } else {
        const aggOld = await tx.purchase.aggregate({
          where: { deletedAt: null, itemId: existing.itemId, NOT: { id } },
          _sum: { qty: true },
        });
        const oldBase = Number(aggOld._sum.qty || 0);
        await tx.item.update({
          where: { id: existing.itemId },
          data: { stok: oldBase },
        });
        await tx.stockLedger.create({
          data: {
            tanggal: new Date(),
            masuk: 0,
            keluar: existing.qty,
            saldo: oldBase,
            itemId: existing.itemId,
          },
        });

        const aggNew = await tx.purchase.aggregate({
          where: { deletedAt: null, itemId: parsed.itemId },
          _sum: { qty: true },
        });
        const newBase = Number(aggNew._sum.qty || 0);
        const newStock = newBase + parsed.qty;
        await tx.item.update({
          where: { id: parsed.itemId },
          data: { stok: newStock },
        });
        await tx.stockLedger.create({
          data: {
            tanggal: newTanggal,
            masuk: parsed.qty,
            keluar: 0,
            saldo: newStock,
            itemId: parsed.itemId,
          },
        });
      }

      await tx.purchase.update({
        where: { id },
        data: {
          tanggal: newTanggal,
          supplier: parsed.supplier,
          itemId: parsed.itemId,
          qty: parsed.qty,
          harga: parsed.harga,
          total,
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
      { ok: false, message: e?.message || "Gagal update" },
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
    const existing = await prisma.purchase.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) throw new Error("Purchase tidak ditemukan");
    if (existing.status === "CLOSE") {
      return NextResponse.json(
        { ok: false, message: "Purchase sudah CLOSE dan tidak bisa dihapus." },
        { status: 400 }
      );
    }
    await prisma.purchase.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Gagal menghapus" },
      { status: 500 }
    );
  }
}

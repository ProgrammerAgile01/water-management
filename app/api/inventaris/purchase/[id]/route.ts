import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  tanggal: z.string().min(1),
  supplier: z.string().min(1),
  itemId: z.string().min(1),
  qty: z.number().int().positive(),
  harga: z.number().int().positive(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await req.json();
    const parsed = UpdateSchema.parse({
      ...body,
      qty: Number(body?.qty),
      harga: Number(body?.harga),
    });

    await prisma.$transaction(async (tx) => {
      const existing = await tx.purchase.findUnique({
        where: { id },
        select: { id: true, itemId: true, qty: true, deletedAt: true },
      });
      if (!existing || existing.deletedAt)
        throw new Error("Purchase tidak ditemukan");

      const newTanggal = new Date(`${parsed.tanggal}T00:00:00`);
      const total = parsed.qty * parsed.harga;

      if (existing.itemId === parsed.itemId) {
        // ===== Item TIDAK berubah
        // Hitung stok dasar DARI SUM pembelian item ini, KECUALI purchase yg sedang diedit.
        const agg = await tx.purchase.aggregate({
          where: {
            deletedAt: null,
            itemId: parsed.itemId,
            NOT: { id }, // exclude transaksi ini
          },
          _sum: { qty: true },
        });
        const base = Number(agg._sum.qty || 0); // stok tanpa transaksi ini
        const newStock = base + parsed.qty; // stok final absolut
        const delta = parsed.qty - existing.qty;

        // set stok absolut
        await tx.item.update({
          where: { id: parsed.itemId },
          data: { stok: newStock },
        });

        // catat ledger delta agar jejak rapi
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
        // ===== Item BERUBAH
        // 1) Item lama → stok dasar = sum pembelian item lama KECUALI transaksi ini
        const aggOld = await tx.purchase.aggregate({
          where: {
            deletedAt: null,
            itemId: existing.itemId,
            NOT: { id },
          },
          _sum: { qty: true },
        });
        const oldBase = Number(aggOld._sum.qty || 0); // stok absolut setelah transaksi ini dipindah
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

        // 2) Item baru → stok dasar = sum pembelian item baru (transaksi ini belum termasuk)
        const aggNew = await tx.purchase.aggregate({
          where: {
            deletedAt: null,
            itemId: parsed.itemId,
          },
          _sum: { qty: true },
        });
        const newBase = Number(aggNew._sum.qty || 0);
        const newStock = newBase + parsed.qty; // stok absolut setelah transaksi masuk ke item baru
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

      // Update purchase
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

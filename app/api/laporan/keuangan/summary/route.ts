import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isYm(x?: string | null) {
  return !!x && /^\d{4}-\d{2}$/.test(x);
}
function monthRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  return { start, end };
}
function clampRange(baseYm: string, from?: string | null, to?: string | null) {
  let { start, end } = monthRange(baseYm);
  if (from) {
    const f = new Date(`${from}T00:00:00`);
    if (!isNaN(+f) && f < end) start = f;
  }
  if (to) {
    const t = new Date(`${to}T23:59:59`);
    if (!isNaN(+t) && t > start) end = t;
  }
  return { start, end };
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const periode = sp.get("periode") || "";
    const q = (sp.get("q") || "").trim().toLowerCase();
    const from = sp.get("from");
    const to = sp.get("to");

    if (!isYm(periode)) {
      return NextResponse.json(
        { ok: false, message: "periode harus YYYY-MM" },
        { status: 400 }
      );
    }
    const { start, end } = clampRange(periode, from, to);

    // === MASUK: Pembayaran (respect soft delete)
    let pay = await prisma.pembayaran.findMany({
      where: { deletedAt: null, tanggalBayar: { gte: start, lt: end } },
      select: {
        jumlahBayar: true,
        metode: true,
        keterangan: true,
        tagihan: { select: { id: true, periode: true } },
      },
    });
    if (q) {
      pay = pay.filter((p) => {
        const m = String(p.metode || "").toLowerCase();
        const k = String(p.keterangan || "").toLowerCase();
        const ref = String(p.tagihan?.id || "").toLowerCase();
        const per = String(p.tagihan?.periode || "").toLowerCase();
        return (
          m.includes(q) || k.includes(q) || ref.includes(q) || per.includes(q)
        );
      });
    }
    const totalMasuk = pay.reduce((s, p) => s + (p.jumlahBayar || 0), 0);

    // === KELUAR: PengeluaranDetail — filter lewat pengeluaran.tanggalInput
    let outs = await prisma.pengeluaranDetail.findMany({
      where: { pengeluaran: { tanggalInput: { gte: start, lt: end } } }, // <<—
      select: {
        nominal: true,
        keterangan: true,
        masterBiaya: { select: { nama: true } },
        pengeluaran: { select: { noBulan: true } },
      },
    });

    if (q) {
      outs = outs.filter((d) => {
        const c = String(d.masterBiaya?.nama || "-").toLowerCase();
        const k = String(d.keterangan || "").toLowerCase();
        const no = String(d.pengeluaran?.noBulan || "").toLowerCase();
        return c.includes(q) || k.includes(q) || no.includes(q);
      });
    }
    const totalKeluar = outs.reduce((s, d) => s + (d.nominal || 0), 0);

    return NextResponse.json({
      ok: true,
      data: {
        periode,
        totalMasuk,
        totalKeluar,
        saldoAkhir: totalMasuk - totalKeluar,
      },
    });
  } catch (e: any) {
    console.error("summary error", e);
    return NextResponse.json(
      { ok: false, message: e?.message || "Gagal memuat summary" },
      { status: 500 }
    );
  }
}

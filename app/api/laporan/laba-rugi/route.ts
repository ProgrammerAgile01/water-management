// app/api/laporan/laba-rugi/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserWithRole } from "@/lib/auth-user-server";
import { PengeluaranStatus, MetodeBayar, PurchaseStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

function monthRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const start = new Date(Date.UTC(y, (m ?? 1) - 1, 1, 0, 0, 0));
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
}
function yearRange(yyyy: string) {
  const y = Number(yyyy);
  const start = new Date(Date.UTC(y, 0, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y + 1, 0, 1, 0, 0, 0));
  return { start, end };
}
function formatPeriodeID(ym?: string | null) {
  if (!ym) return "-";
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, (m ?? 1) - 1, 1));
  return d.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function GET(req: NextRequest) {
  try {
    // Auth
    const me = await getAuthUserWithRole(req);
    if (!me)
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    if (me.role !== "ADMIN" && me.role !== "PETUGAS") {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    // Range waktu
    const sp = req.nextUrl.searchParams;
    const scope = (sp.get("scope") || "month").toLowerCase(); // month|year
    const now = new Date();
    const ymDefault = `${now.getUTCFullYear()}-${String(
      now.getUTCMonth() + 1
    ).padStart(2, "0")}`;

    let start: Date,
      end: Date,
      periodLabel = "";
    if (scope === "year") {
      const y = sp.get("year") || String(now.getUTCFullYear());
      ({ start, end } = yearRange(y));
      periodLabel = `Tahun ${y}`;
    } else {
      const ym = sp.get("month") || ymDefault;
      ({ start, end } = monthRange(ym));
      const d = new Date(start);
      periodLabel = d.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
    }

    // ===== PENDAPATAN (Pembayaran) =====
    const payments = await prisma.pembayaran.findMany({
      where: { deletedAt: null, tanggalBayar: { gte: start, lt: end } },
      include: { tagihan: { select: { periode: true } } },
      orderBy: { tanggalBayar: "asc" },
    });

    const pendapatanTotal = payments.reduce(
      (s, p) => s + (p.jumlahBayar || 0),
      0
    );
    const pendapatanByMetode: Record<string, number> = {};
    for (const m of Object.values(MetodeBayar)) pendapatanByMetode[m] = 0;
    for (const p of payments) {
      pendapatanByMetode[p.metode] =
        (pendapatanByMetode[p.metode] || 0) + (p.jumlahBayar || 0);
    }

    // ===== BEBAN (Pengeluaran CLOSE + Purchase CLOSE) =====
    const pengeluaranDetails = await prisma.pengeluaranDetail.findMany({
      where: {
        pengeluaran: {
          status: PengeluaranStatus.CLOSE,
          tanggalPengeluaran: { gte: start, lt: end },
        },
      },
      include: {
        masterBiaya: { select: { nama: true } },
        pengeluaran: { select: { tanggalPengeluaran: true, noBulan: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const purchases = await prisma.purchase.findMany({
      where: {
        status: PurchaseStatus.CLOSE,
        deletedAt: null,
        tanggal: { gte: start, lt: end },
      },
      include: { item: { select: { nama: true, kode: true } } },
      orderBy: { tanggal: "asc" },
    });

    const bebanPengeluaran = pengeluaranDetails.reduce(
      (s, d) => s + (d.nominal || 0),
      0
    );
    const bebanPurchase = purchases.reduce((s, p) => s + (p.total || 0), 0);
    const bebanTotal = bebanPengeluaran + bebanPurchase;

    // Rekap beban per kategori
    const bebanByKategori: Record<string, { nama: string; total: number }> = {};
    for (const d of pengeluaranDetails) {
      const key = d.masterBiayaId || d.biayaNamaSnapshot || "Lainnya";
      if (!bebanByKategori[key])
        bebanByKategori[key] = {
          nama: d.masterBiaya?.nama || d.biayaNamaSnapshot || "Lainnya",
          total: 0,
        };
      bebanByKategori[key].total += d.nominal || 0;
    }
    if (bebanPurchase > 0) {
      const key = "_PEMBELIAN_";
      if (!bebanByKategori[key])
        bebanByKategori[key] = { nama: "Pembelian", total: 0 };
      bebanByKategori[key].total += bebanPurchase;
    }

    // ===== LEDGER (dengan jenisPendapatan/jenisBeban) =====
    type Row = {
      tanggal: Date;
      keterangan: string;
      debit: number; // Beban
      kredit: number; // Pendapatan
      jenisPendapatan: string | null; // "Pembayaran Tagihan"
      jenisBeban: string | null; // "Biaya Transport" / "Pembelian Pipa"
    };

    const ledgerPengeluaran: Row[] = pengeluaranDetails.map((d) => ({
      tanggal: d.pengeluaran.tanggalPengeluaran,
      keterangan: `${d.biayaNamaSnapshot || d.masterBiaya?.nama || "Biaya"} • ${
        d.keterangan || ""
      }`.trim(),
      debit: d.nominal,
      kredit: 0,
      jenisPendapatan: null,
      jenisBeban: d.masterBiaya?.nama || d.biayaNamaSnapshot || "Biaya",
    }));

    const ledgerPurchases: Row[] = purchases.map((p) => ({
      tanggal: p.tanggal,
      keterangan: `Pembelian ${p.item?.nama || ""}${
        p.item?.kode ? ` (${p.item.kode})` : ""
      }`,
      debit: p.total,
      kredit: 0,
      jenisPendapatan: null,
      jenisBeban: `Pembelian ${p.item?.nama || ""}`.trim(),
    }));

    const ledgerPayments: Row[] = payments.map((p) => ({
      tanggal: p.tanggalBayar,
      keterangan: `Pembayaran Tagihan Bulan ${formatPeriodeID(
        p.tagihan?.periode
      )}`,
      debit: 0,
      kredit: p.jumlahBayar,
      jenisPendapatan: "Pembayaran Tagihan",
      jenisBeban: null,
    }));

    const ledgerAll: Row[] = [
      ...ledgerPengeluaran,
      ...ledgerPurchases,
      ...ledgerPayments,
    ].sort((a, b) => +new Date(a.tanggal) - +new Date(b.tanggal));

    // ===== Pagination (in-memory, gabungan) =====
    const size = Math.max(1, Math.min(5000, Number(sp.get("size") || 1000))); // default 1000
    const page = Math.max(1, Number(sp.get("page") || 1));
    const total = ledgerAll.length;
    const pages = Math.max(1, Math.ceil(total / size));
    const startIdx = (page - 1) * size;
    const endIdx = startIdx + size;
    const ledger = ledgerAll.slice(startIdx, endIdx);

    const labaBersih = pendapatanTotal - bebanTotal;

    return NextResponse.json({
      ok: true,
      scope,
      periodLabel,
      range: { start, end },
      ringkasan: {
        bebanTotal,
        pendapatanTotal,
        labaBersih,
      },
      pendapatan: {
        total: pendapatanTotal,
        byMetode: pendapatanByMetode,
        rows: payments, // jika ingin, ini bisa dipaginasi terpisah nanti
      },
      beban: {
        total: bebanTotal,
        byKategori: Object.values(bebanByKategori),
        pengeluaranDetails,
        purchases,
      },
      ledger,
      pagination: {
        total,
        page,
        size,
        pages,
        hasPrev: page > 1,
        hasNext: page < pages,
      },
    });
  } catch (e: any) {
    console.error("LR API error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

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

function ymLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("id-ID", {
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
        { status: 401 },
      );
    if (me.role !== "ADMIN" && me.role !== "PETUGAS") {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 },
      );
    }

    const sp = req.nextUrl.searchParams;
    const multi = (sp.get("multi") || "").toLowerCase();

    // ============ NEW: rekap bulanan setahun ============
    if (multi === "months") {
      const yearParam = sp.get("year");

      const whereYear = yearParam
        ? {
            gte: new Date(Date.UTC(Number(yearParam), 0, 1)),
            lt: new Date(Date.UTC(Number(yearParam) + 1, 0, 1)),
          }
        : undefined;

      // =========================
      // 1. Pendapatan per bulan
      // =========================
      const pendapatanRows = await prisma.pembayaran.findMany({
        where: {
          deletedAt: null,
          ...(whereYear ? { tanggalBayar: whereYear } : {}),
        },
        select: {
          tanggalBayar: true,
          jumlahBayar: true,
        },
      });

      // =========================
      // 2. Beban pengeluaran
      // =========================
      const pengeluaranRows = await prisma.pengeluaranDetail.findMany({
        where: {
          pengeluaran: {
            status: PengeluaranStatus.CLOSE,
            ...(whereYear ? { tanggalPengeluaran: whereYear } : {}),
          },
        },
        select: {
          nominal: true,
          pengeluaran: { select: { tanggalPengeluaran: true } },
        },
      });

      // =========================
      // 3. Beban purchase
      // =========================
      const purchaseRows = await prisma.purchase.findMany({
        where: {
          status: PurchaseStatus.CLOSE,
          deletedAt: null,
          ...(whereYear ? { tanggal: whereYear } : {}),
        },
        select: {
          tanggal: true,
          total: true,
        },
      });

      // =========================
      // 4. Merge by YM
      // =========================
      const map = new Map<string, { pendapatan: number; beban: number }>();

      const getYm = (d: Date) =>
        `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

      for (const r of pendapatanRows) {
        const ym = getYm(r.tanggalBayar);
        const cur = map.get(ym) || { pendapatan: 0, beban: 0 };
        cur.pendapatan += r.jumlahBayar || 0;
        map.set(ym, cur);
      }

      for (const r of pengeluaranRows) {
        const ym = getYm(r.pengeluaran.tanggalPengeluaran);
        const cur = map.get(ym) || { pendapatan: 0, beban: 0 };
        cur.beban += r.nominal || 0;
        map.set(ym, cur);
      }

      for (const r of purchaseRows) {
        const ym = getYm(r.tanggal);
        const cur = map.get(ym) || { pendapatan: 0, beban: 0 };
        cur.beban += r.total || 0;
        map.set(ym, cur);
      }

      // =========================
      // 5. Build response
      // =========================
      const months = Array.from(map.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([ym, v]) => ({
          ym,
          label: ymLabel(ym),
          pendapatan: v.pendapatan,
          beban: v.beban,
          laba: v.pendapatan - v.beban,
        }));

      return NextResponse.json({ ok: true, months });
    }

    // ====== (kode lama) satu periode: scope=month|year|all + ledger detail ======
    const scope = (sp.get("scope") || "month").toLowerCase(); // month|year|all
    const now = new Date();
    const ymDefault = `${now.getUTCFullYear()}-${String(
      now.getUTCMonth() + 1,
    ).padStart(2, "0")}`;

    let start: Date | null = null,
      end: Date | null = null,
      periodLabel = "";

    if (scope === "all") {
      periodLabel = "Semua Periode";
    } else if (scope === "year") {
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

    // ===== PENDAPATAN =====
    const pembayaranWhere: any = { deletedAt: null };
    if (start && end) pembayaranWhere.tanggalBayar = { gte: start, lt: end };

    const payments = await prisma.pembayaran.findMany({
      where: pembayaranWhere,
      include: { tagihan: { select: { periode: true } } },
      orderBy: { tanggalBayar: "asc" },
    });
    const pendapatanTotal = payments.reduce(
      (s, p) => s + (p.jumlahBayar || 0),
      0,
    );
    const pendapatanByMetode: Record<string, number> = {};
    for (const m of Object.values(MetodeBayar)) pendapatanByMetode[m] = 0;
    for (const p of payments) {
      pendapatanByMetode[p.metode] =
        (pendapatanByMetode[p.metode] || 0) + (p.jumlahBayar || 0);
    }

    // ===== BEBAN =====
    const pengeluaranDetailWhere: any = {
      pengeluaran: { status: PengeluaranStatus.CLOSE },
    };
    if (start && end)
      pengeluaranDetailWhere.pengeluaran.tanggalPengeluaran = {
        gte: start,
        lt: end,
      };
    const pengeluaranDetails = await prisma.pengeluaranDetail.findMany({
      where: pengeluaranDetailWhere,
      include: {
        masterBiaya: { select: { nama: true } },
        pengeluaran: {
          select: { tanggalPengeluaran: true, noBulan: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const purchaseWhere: any = {
      status: PurchaseStatus.CLOSE,
      deletedAt: null,
    };
    if (start && end) purchaseWhere.tanggal = { gte: start, lt: end };
    const purchases = await prisma.purchase.findMany({
      where: purchaseWhere,
      include: { item: { select: { nama: true, kode: true } } },
      orderBy: { tanggal: "asc" },
    });

    const bebanPengeluaran = pengeluaranDetails.reduce(
      (s, d) => s + (d.nominal || 0),
      0,
    );
    const bebanPurchase = purchases.reduce((s, p) => s + (p.total || 0), 0);
    const bebanTotal = bebanPengeluaran + bebanPurchase;

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

    // ===== LEDGER =====
    type Row = {
      tanggal: Date;
      keterangan: string;
      debit: number;
      kredit: number;
      jenisPendapatan: string | null;
      jenisBeban: string | null;
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
        p.tagihan?.periode,
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

    // pagination in-memory (tetap)
    const size = Math.max(1, Math.min(5000, Number(sp.get("size") || 1000)));
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
      range: start && end ? { start, end } : null,
      ringkasan: { bebanTotal, pendapatanTotal, labaBersih },
      pendapatan: {
        total: pendapatanTotal,
        byMetode: pendapatanByMetode,
        rows: payments,
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
      { status: 500 },
    );
  }
}

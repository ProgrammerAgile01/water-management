// app/api/laporan/keuangan/mutasi/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type MoneyFlow = "ALL" | "IN" | "OUT";

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
function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function toHms(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
function ymToLong(ym: string) {
  const m = ym.match(/^(\d{4})-(\d{1,2})$/);
  const fixed = m ? `${m[1]}-${String(Number(m[2])).padStart(2, "0")}` : ym;
  const d = new Date(`${fixed}-01T00:00:00`);
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}
function joinDateTime(tgl?: string, jam?: string | null) {
  if (!tgl) return null;
  const t = jam && /^\d{2}:\d{2}/.test(jam) ? jam : "00:00:00";
  return new Date(`${tgl}T${t}`);
}

type MutasiRow = {
  id: string;
  tanggal: string;
  jam?: string | null;
  tipe: "IN" | "OUT";
  kategori?: string | null;
  metode?: string | null;
  keterangan?: string | null;
  jumlah: number;
  refCode?: string | null;
  createdAt?: string | null;
  statusVerif?: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const periode = sp.get("periode") || "";
    const flow = (
      (sp.get("flow") || "ALL") as MoneyFlow
    ).toUpperCase() as MoneyFlow;
    const q = (sp.get("q") || "").trim().toLowerCase();
    const from = sp.get("from");
    const to = sp.get("to");

    const page = Math.max(1, Number(sp.get("page") || 1));
    const pageSize = Math.min(
      100,
      Math.max(5, Number(sp.get("pageSize") || 20))
    );
    const offset = (page - 1) * pageSize;

    if (!isYm(periode)) {
      return NextResponse.json(
        { ok: false, message: "periode harus 'YYYY-MM'" },
        { status: 400 }
      );
    }

    const { start, end } = clampRange(periode, from, to);

    // ===== IN (ACCRUAL): Pembayaran berdasarkan periode tagihan =====
    const pays = await prisma.pembayaran.findMany({
      where: {
        deletedAt: null,
        tagihan: { periode }, // accrual
      },
      select: {
        id: true,
        tanggalBayar: true,
        jumlahBayar: true,
        metode: true,
        keterangan: true,
        // createdAt: (TIDAK ADA di model Pembayaran kamu)
        tagihan: {
          select: {
            id: true,
            periode: true,
            statusVerif: true,
            pelanggan: { select: { nama: true } },
          },
        },
      },
    });

    let inRows: MutasiRow[] = pays.map((p) => {
      const d = new Date(p.tanggalBayar);
      const prettyPeriod = ymToLong(p.tagihan?.periode || periode);
      const ketDefault = `Pembayaran Tagihan ${prettyPeriod}`;
      return {
        id: p.id,
        tanggal: toYmd(d),
        jam: toHms(d),
        tipe: "IN",
        kategori: "Pembayaran Tagihan",
        metode: String(p.metode || ""),
        keterangan:
          (p.keterangan && p.keterangan.trim().length
            ? p.keterangan
            : ketDefault) || ketDefault,
        jumlah: p.jumlahBayar || 0,
        refCode: p.tagihan?.id || p.tagihan?.periode || undefined,
        createdAt: null, // <- pembayaran tidak punya createdAt di schema kamu
        statusVerif: p.tagihan?.statusVerif ?? null,
      };
    });

    // ===== OUT 1: PengeluaranDetail (tanggal dari header.tanggalInput) =====
    const outDetails = await prisma.pengeluaranDetail.findMany({
      where: {
        pengeluaran: {
          tanggalInput: {
            gte: monthRange(periode).start,
            lt: monthRange(periode).end,
          },
        },
      },
      select: {
        id: true,
        nominal: true,
        keterangan: true,
        createdAt: true,
        masterBiaya: { select: { nama: true } },
        pengeluaran: {
          select: { id: true, noBulan: true, tanggalInput: true },
        },
      },
    });

    let outRows: MutasiRow[] = outDetails.map((d) => {
      const t = new Date(d.pengeluaran!.tanggalInput);
      return {
        id: d.id,
        tanggal: toYmd(t),
        jam: toHms(t),
        tipe: "OUT",
        kategori: d.masterBiaya?.nama || "Pengeluaran",
        metode: "-",
        keterangan: d.keterangan || undefined,
        jumlah: d.nominal || 0,
        refCode: d.pengeluaran?.noBulan || d.pengeluaran?.id || undefined,
        createdAt: d.createdAt?.toISOString() ?? null,
        statusVerif: null,
      };
    });

    // ===== OUT 2: Purchase (inventaris) =====
    const purchases = await prisma.purchase.findMany({
      where: {
        deletedAt: null,
        tanggal: {
          gte: monthRange(periode).start,
          lt: monthRange(periode).end,
        },
      },
      select: {
        id: true,
        tanggal: true,
        total: true,
        supplier: true,
        createdAt: true,
        item: { select: { nama: true } },
      },
    });

    const outPurchases: MutasiRow[] = purchases.map((p) => {
      const d = new Date(p.tanggal);
      return {
        id: p.id,
        tanggal: toYmd(d),
        jam: toHms(d),
        tipe: "OUT",
        kategori: "Pembelian Inventaris",
        metode: "-",
        keterangan: `Pembelian ${p.item?.nama || "Item"}${
          p.supplier ? ` • ${p.supplier}` : ""
        }`,
        jumlah: p.total || 0,
        refCode: p.id,
        createdAt: p.createdAt?.toISOString() ?? null,
        statusVerif: null,
      };
    });

    outRows = [...outRows, ...outPurchases];

    // ------ gabung ------
    let rows: MutasiRow[] = [...inRows, ...outRows];

    // filter q
    const contains = (s: any) =>
      String(s || "")
        .toLowerCase()
        .includes(q);
    if (q) {
      rows = rows.filter(
        (r) =>
          contains(r.kategori) ||
          contains(r.metode) ||
          contains(r.keterangan) ||
          contains(r.refCode) ||
          contains(r.statusVerif)
      );
    }

    // filter flow
    if (flow !== "ALL") rows = rows.filter((r) => r.tipe === flow);

    // filter from–to
    rows = rows.filter((r) => {
      const ts = joinDateTime(r.tanggal, r.jam)?.getTime() ?? 0;
      return ts >= start.getTime() && ts <= end.getTime();
    });

    // ===== Sort ASC by tanggal & jam =====
    rows.sort((a, b) => {
      const da = joinDateTime(a.tanggal, a.jam)?.getTime() ?? 0;
      const db = joinDateTime(b.tanggal, b.jam)?.getTime() ?? 0;
      if (da !== db) return da - db; // ASC
      const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ca - cb; // ASC tie-break
    });

    // pagination (in-memory)
    const total = rows.length;
    const paged = rows.slice(offset, offset + pageSize);

    return NextResponse.json({
      ok: true,
      rows: paged,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (e: any) {
    console.error("mutasi accrual error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message || "Gagal memuat mutasi" },
      { status: 500 }
    );
  }
}

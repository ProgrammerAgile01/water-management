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
function safeHmsFromDb(d: Date) {
  const midnightUTC =
    d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
  return midnightUTC ? "00:00:00" : toHms(d);
}
function metodeLabel(x?: any) {
  const s = String(x || "").toUpperCase();
  if (s === "TUNAI") return "Tunai";
  if (s === "TRANSFER") return "Transfer";
  if (s === "EWALLET") return "E-Wallet";
  if (s === "QRIS") return "QRIS";
  return x || "-";
}

type MutasiRow = {
  id: string;
  tanggal: string; // YYYY-MM-DD
  jam?: string | null; // HH:mm:ss
  tipe: "IN" | "OUT";
  kategori?: string | null;
  metode?: string | null;
  keterangan?: string | null;
  jumlah: number;
  refCode?: string | null;
  createdAt?: string | null;
  statusVerif?: string | null; // <<— DITAMBAHKAN
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

    // pagination
    const page = Math.max(1, Number(sp.get("page") || 1));
    const pageSize = Math.min(
      100,
      Math.max(5, Number(sp.get("pageSize") || 20))
    );
    const offset = (page - 1) * pageSize;

    if (!isYm(periode)) {
      return NextResponse.json(
        { ok: false, message: "periode harus YYYY-MM" },
        { status: 400 }
      );
    }
    const { start, end } = clampRange(periode, from, to);

    // ===== IN: Pembayaran (pendapatan tagihan)
    const pays = await prisma.pembayaran.findMany({
      where: { deletedAt: null, tanggalBayar: { gte: start, lt: end } },
      select: {
        id: true,
        tanggalBayar: true,
        jumlahBayar: true,
        metode: true,
        keterangan: true,
        tagihan: {
          select: {
            id: true,
            periode: true,
            statusVerif: true, // <<— SELECT statusVerif
            pelanggan: { select: { nama: true } },
          },
        },
      },
    });

    let inRows: MutasiRow[] = pays.map((x) => {
      const d = new Date(x.tanggalBayar);
      return {
        id: x.id,
        tanggal: toYmd(d),
        jam: safeHmsFromDb(d),
        tipe: "IN",
        kategori: "Pembayaran Tagihan",
        metode: metodeLabel(x.metode),
        keterangan:
          x.keterangan ||
          (x.tagihan?.pelanggan?.nama
            ? `By ${x.tagihan.pelanggan.nama}`
            : undefined),
        jumlah: x.jumlahBayar || 0,
        refCode: x.tagihan?.id || x.tagihan?.periode || undefined,
        createdAt: null,
        statusVerif: x.tagihan?.statusVerif ?? null, // <<— ISI statusVerif
      };
    });

    // ===== OUT: PengeluaranDetail — range pakai tanggalInput
    const outs = await prisma.pengeluaranDetail.findMany({
      where: { pengeluaran: { tanggalInput: { gte: start, lt: end } } },
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

    let outRows: MutasiRow[] = outs.map((d) => {
      const inputDate = new Date(d.pengeluaran!.tanggalInput);
      return {
        id: d.id,
        tanggal: toYmd(inputDate),
        jam: toHms(inputDate),
        tipe: "OUT",
        kategori: d.masterBiaya?.nama || "-",
        metode: "-",
        keterangan: d.keterangan || undefined,
        jumlah: d.nominal || 0,
        refCode: d.pengeluaran?.noBulan || d.pengeluaran?.id || undefined,
        createdAt: d.createdAt?.toISOString() ?? null,
        statusVerif: null, // <<— OUT tidak punya status verif
      };
    });

    // filter q
    const contains = (s: any) =>
      String(s || "")
        .toLowerCase()
        .includes(q);
    if (q) {
      inRows = inRows.filter(
        (r) =>
          contains(r.kategori) ||
          contains(r.metode) ||
          contains(r.keterangan) ||
          contains(r.refCode) ||
          contains(r.statusVerif) // <<— bisa cari by status
      );
      outRows = outRows.filter(
        (r) =>
          contains(r.kategori) || contains(r.keterangan) || contains(r.refCode)
      );
    }

    // gabung & filter flow
    let rows: MutasiRow[] = [...inRows, ...outRows];
    if (flow !== "ALL") rows = rows.filter((r) => r.tipe === flow);

    // sort terbaru
    rows.sort((a, b) => {
      const da = new Date(`${a.tanggal}T${a.jam || "00:00:00"}`).getTime();
      const db = new Date(`${b.tanggal}T${b.jam || "00:00:00"}`).getTime();
      if (db !== da) return db - da;
      const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return cb - ca;
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
    console.error("mutasi error", e);
    return NextResponse.json(
      { ok: false, message: e?.message || "Gagal memuat mutasi" },
      { status: 500 }
    );
  }
}

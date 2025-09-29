// //app/api/laporan/keuangan/mutasi/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

// export const dynamic = "force-dynamic";
// export const runtime = "nodejs";

// type MoneyFlow = "ALL" | "IN" | "OUT";

// const isYm = (x?: string | null) => !!x && /^\d{4}-\d{2}$/.test(x || "");

// function monthRange(ym: string) {
//   const [y, m] = ym.split("-").map(Number);
//   const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
//   const end = new Date(Date.UTC(y, m, 1, 0, 0, 0)); // awal bulan berikut
//   return { start, end };
// }
// function clampRange(baseYm: string, from?: string | null, to?: string | null) {
//   let { start, end } = monthRange(baseYm);
//   if (from) {
//     const f = new Date(`${from}T00:00:00`);
//     if (!isNaN(+f) && f < end) start = f;
//   }
//   if (to) {
//     const t = new Date(`${to}T23:59:59`);
//     if (!isNaN(+t) && t > start) end = t;
//   }
//   return { start, end };
// }
// const toYmd = (d: Date) =>
//   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
//     d.getDate()
//   ).padStart(2, "0")}`;
// const toHms = (d: Date) =>
//   `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(
//     2,
//     "0"
//   )}:${String(d.getSeconds()).padStart(2, "0")}`;
// const ymToLong = (ym: string) =>
//   new Date(`${ym}-01T00:00:00`).toLocaleDateString("id-ID", {
//     month: "long",
//     year: "numeric",
//   });
// function metodeLabel(x?: any) {
//   const s = String(x || "").toUpperCase();
//   if (s === "TUNAI") return "Tunai";
//   if (s === "TRANSFER") return "Transfer";
//   if (s === "EWALLET") return "E-Wallet";
//   if (s === "QRIS") return "QRIS";
//   return x || "-";
// }
// const ymUTC = (d: Date) =>
//   `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

// type MutasiRow = {
//   id: string;
//   tanggal: string;
//   jam?: string | null;
//   tipe: "IN" | "OUT";
//   kategori?: string | null;
//   metode?: string | null;
//   keterangan?: string | null;
//   jumlah: number;
//   refCode?: string | null;
//   createdAt?: string | null;
//   statusVerif?: string | null;
// };

// export async function GET(req: NextRequest) {
//   try {
//     const sp = req.nextUrl.searchParams;
//     const periode = sp.get("periode") || "";
//     const flow = (
//       (sp.get("flow") || "ALL") as MoneyFlow
//     ).toUpperCase() as MoneyFlow;
//     const q = (sp.get("q") || "").trim().toLowerCase();
//     const from = sp.get("from");
//     const to = sp.get("to");

//     if (!isYm(periode)) {
//       return NextResponse.json(
//         { ok: false, message: "periode harus YYYY-MM" },
//         { status: 400 }
//       );
//     }

//     const { start, end } = clampRange(periode, from, to);

//     /* ================= IN =================
//        Sekarang berdasarkan TANGGAL BAYAR REAL
//        (bukan tagihan.periode)
//     */
//     const pays = await prisma.pembayaran.findMany({
//       where: {
//         deletedAt: null,
//         tanggalBayar: { gte: start, lt: end },
//       },
//       select: {
//         id: true,
//         tanggalBayar: true,
//         jumlahBayar: true,
//         metode: true,
//         keterangan: true,
//         tagihan: {
//           select: {
//             id: true,
//             periode: true,
//             statusVerif: true,
//             pelanggan: { select: { nama: true } },
//           },
//         },
//       },
//     });

//     const inRows: MutasiRow[] = pays.map((x) => {
//       const d = new Date(x.tanggalBayar);
//       const ym = ymUTC(d); // bulan untuk keterangan
//       return {
//         id: x.id,
//         tanggal: toYmd(d),
//         jam: toHms(d),
//         tipe: "IN",
//         kategori: "Pembayaran Tagihan",
//         metode: metodeLabel(x.metode),
//         keterangan: `Pembayaran Tagihan ${ymToLong(ym)}`,
//         jumlah: x.jumlahBayar || 0,
//         refCode: x.tagihan?.id || undefined, // tetap simpan id/refs
//         createdAt: null,
//         statusVerif: x.tagihan?.statusVerif ?? null,
//       };
//     });

//     /* ============ OUT: Pengeluaran CLOSE (tanggalInput) ============ */
//     const outs = await prisma.pengeluaranDetail.findMany({
//       where: {
//         pengeluaran: {
//           status: "CLOSE",
//           tanggalInput: { gte: start, lt: end },
//         },
//       },
//       select: {
//         id: true,
//         nominal: true,
//         keterangan: true,
//         createdAt: true,
//         masterBiaya: { select: { nama: true } },
//         pengeluaran: {
//           select: { id: true, noBulan: true, tanggalInput: true },
//         },
//       },
//     });

//     const outRows: MutasiRow[] = outs.map((d) => {
//       const t = new Date(d.pengeluaran!.tanggalInput);
//       return {
//         id: d.id,
//         tanggal: toYmd(t),
//         jam: toHms(t),
//         tipe: "OUT",
//         kategori: d.masterBiaya?.nama || "Pengeluaran",
//         metode: "-",
//         keterangan: d.keterangan || undefined,
//         jumlah: d.nominal || 0,
//         refCode: d.pengeluaran?.noBulan || d.pengeluaran?.id || undefined,
//         createdAt: d.createdAt?.toISOString() ?? null,
//         statusVerif: "CLOSE",
//       };
//     });

//     /* ============ OUT: Purchase CLOSE (tanggal) ============ */
//     const purchases = await prisma.purchase.findMany({
//       where: {
//         deletedAt: null,
//         status: "CLOSE",
//         tanggal: { gte: start, lt: end },
//       },
//       select: {
//         id: true,
//         tanggal: true,
//         supplier: true,
//         total: true,
//         status: true,
//         item: { select: { nama: true, kategori: true } },
//         createdAt: true,
//       },
//     });

//     const purchaseRows: MutasiRow[] = purchases.map((p) => {
//       const d = new Date(p.tanggal);
//       return {
//         id: p.id,
//         tanggal: toYmd(d),
//         jam: toHms(d),
//         tipe: "OUT",
//         kategori: p.item?.kategori
//           ? `Pembelian • ${p.item.kategori}`
//           : "Pembelian Inventaris",
//         metode: "-",
//         keterangan: p.item?.nama
//           ? `Beli ${p.item.nama}${p.supplier ? ` • ${p.supplier}` : ""}`
//           : p.supplier || "Pembelian",
//         jumlah: p.total || 0,
//         refCode: p.id,
//         createdAt: p.createdAt?.toISOString() ?? null,
//         statusVerif: p.status || "CLOSE",
//       };
//     });

//     // gabung & filter
//     let rows: MutasiRow[] = [...inRows, ...outRows, ...purchaseRows];
//     if (flow !== "ALL") rows = rows.filter((r) => r.tipe === flow);

//     if (q) {
//       const s = q.toLowerCase();
//       rows = rows.filter(
//         (r) =>
//           String(r.kategori || "")
//             .toLowerCase()
//             .includes(s) ||
//           String(r.metode || "")
//             .toLowerCase()
//             .includes(s) ||
//           String(r.keterangan || "")
//             .toLowerCase()
//             .includes(s) ||
//           String(r.refCode || "")
//             .toLowerCase()
//             .includes(s) ||
//           String(r.statusVerif || "")
//             .toLowerCase()
//             .includes(s)
//       );
//     }

//     // ASC by tanggal+jam, lalu createdAt
//     rows.sort((a, b) => {
//       const da = new Date(`${a.tanggal}T${a.jam || "00:00:00"}`).getTime();
//       const db = new Date(`${b.tanggal}T${b.jam || "00:00:00"}`).getTime();
//       if (da !== db) return da - db;
//       const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
//       const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
//       return ca - cb;
//     });

//     return NextResponse.json({ ok: true, rows });
//   } catch (e: any) {
//     console.error("mutasi accrual error:", e);
//     return NextResponse.json(
//       { ok: false, message: e?.message || "Gagal memuat mutasi" },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type MoneyFlow = "ALL" | "IN" | "OUT";

const isYm = (x?: string | null) => !!x && /^\d{4}-\d{2}$/.test(x || "");

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
const toYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
const toHms = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(
    2,
    "0"
  )}:${String(d.getSeconds()).padStart(2, "0")}`;
const ymToLong = (ym: string) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
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

    if (!isYm(periode)) {
      return NextResponse.json(
        { ok: false, message: "periode harus YYYY-MM" },
        { status: 400 }
      );
    }

    const { start, end } = clampRange(periode, from, to);

    /* ================= IN =================
       Pembayaran Tagihan — tanggalBayar (real)
    */
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
            statusVerif: true,
            pelanggan: { select: { nama: true } },
          },
        },
      },
    });

    const inRowsFromTagihan: MutasiRow[] = pays.map((x) => {
      const d = new Date(x.tanggalBayar);
      const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
        2,
        "0"
      )}`;
      return {
        id: x.id,
        tanggal: toYmd(d),
        jam: toHms(d),
        tipe: "IN",
        kategori: "Pembayaran Tagihan",
        metode: metodeLabel(x.metode),
        keterangan: `Pembayaran Tagihan ${ymToLong(ym)}`,
        jumlah: x.jumlahBayar || 0,
        refCode: x.tagihan?.id || undefined,
        createdAt: null,
        statusVerif: x.tagihan?.statusVerif ?? null,
      };
    });

    /* ============== IN: Hutang (Pinjaman) ==============
       Tanggal dari hutang.tanggalInput
       Keterangan: "<keterangan header> (<keterangan detail>)"
       → contoh: "Pinjam ke Koperasi A (Perbaikan tandon)"
    */
    const hutangDetails = await prisma.hutangDetail.findMany({
      where: { hutang: { tanggalInput: { gte: start, lt: end } } },
      select: {
        id: true,
        nominal: true,
        keterangan: true, // keterangan detail
        hutang: {
          select: {
            id: true,
            noBukti: true,
            tanggalInput: true,
            pemberi: true,
            status: true,
            keterangan: true, // keterangan header
          },
        },
      },
    });

    const inRowsFromHutang: MutasiRow[] = hutangDetails.map((d) => {
      const t = new Date(d.hutang!.tanggalInput as Date);

      // rakit keterangan sesuai contoh
      const headerKet = (d.hutang?.keterangan || "").trim();
      const detailKet = (d.keterangan || "").trim();
      const ket =
        headerKet && detailKet
          ? `${headerKet} (${detailKet})`
          : headerKet || detailKet || "-";

      return {
        id: d.id,
        tanggal: toYmd(t),
        jam: toHms(t),
        tipe: "IN",
        kategori: "Hutang (Pinjaman)",
        metode: "-",
        keterangan: ket,
        jumlah: d.nominal || 0,
        refCode: d.hutang?.noBukti || d.hutang?.id || undefined,
        createdAt:
          (d.hutang?.tanggalInput as Date | undefined)?.toISOString() ?? null,
        statusVerif: d.hutang?.status || null,
      };
    });

    /* ============ OUT: Pengeluaran CLOSE (tanggalInput) ============ */
    const outs = await prisma.pengeluaranDetail.findMany({
      where: {
        pengeluaran: { status: "CLOSE", tanggalInput: { gte: start, lt: end } },
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

    const outRowsFromPengeluaran: MutasiRow[] = outs.map((d) => {
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
        statusVerif: "CLOSE",
      };
    });

    /* ============ OUT: Purchase CLOSE (tanggal) ============ */
    const purchases = await prisma.purchase.findMany({
      where: {
        deletedAt: null,
        status: "CLOSE",
        tanggal: { gte: start, lt: end },
      },
      select: {
        id: true,
        tanggal: true,
        supplier: true,
        total: true,
        status: true,
        item: { select: { nama: true, kategori: true } },
        createdAt: true,
      },
    });

    const outRowsFromPurchase: MutasiRow[] = purchases.map((p) => {
      const d = new Date(p.tanggal);
      return {
        id: p.id,
        tanggal: toYmd(d),
        jam: toHms(d),
        tipe: "OUT",
        kategori: p.item?.kategori
          ? `Pembelian • ${p.item.kategori}`
          : "Pembelian Inventaris",
        metode: "-",
        keterangan: p.item?.nama
          ? `Beli ${p.item.nama}${p.supplier ? ` • ${p.supplier}` : ""}`
          : p.supplier || "Pembelian",
        jumlah: p.total || 0,
        refCode: p.id,
        createdAt: p.createdAt?.toISOString() ?? null,
        statusVerif: p.status || "CLOSE",
      };
    });

    /* ============ OUT: Pembayaran Hutang (per-detail) ============ */
    const hutangPays = await prisma.hutangPaymentDetail.findMany({
      where: { payment: { tanggalBayar: { gte: start, lt: end } } },
      select: {
        id: true,
        amount: true,
        note: true,
        payment: {
          select: {
            id: true,
            refNo: true,
            pemberi: true,
            tanggalBayar: true,
            note: true,
          },
        },
        hutangDetail: {
          select: {
            keterangan: true,
            hutang: { select: { noBukti: true } },
          },
        },
      },
    });

    const outRowsFromHutangPay: MutasiRow[] = hutangPays.map((d) => {
      const t = new Date(d.payment!.tanggalBayar as Date);
      return {
        id: d.id,
        tanggal: toYmd(t),
        jam: toHms(t),
        tipe: "OUT",
        kategori: "Pembayaran Hutang",
        metode: "-",
        // pakai catatan payment sebagai keterangan utama
        keterangan:
          d.payment?.note ||
          d.note ||
          [
            d.payment?.refNo ? `No ${d.payment?.refNo}` : null,
            d.payment?.pemberi ? `Ke ${d.payment?.pemberi}` : null,
            d.hutangDetail?.hutang?.noBukti
              ? `(${d.hutangDetail.hutang.noBukti})`
              : null,
            d.hutangDetail?.keterangan || null,
          ]
            .filter(Boolean)
            .join(" • "),
        jumlah: d.amount || 0,
        refCode: d.payment?.refNo || d.payment?.id || undefined,
        createdAt: d.payment?.tanggalBayar?.toISOString() ?? null,
        statusVerif: "PAID",
      };
    });

    // gabung & filter
    let rows: MutasiRow[] = [
      ...inRowsFromTagihan,
      ...inRowsFromHutang, // <- sudah gabung header(detail)
      ...outRowsFromPengeluaran,
      ...outRowsFromPurchase,
      ...outRowsFromHutangPay,
    ];

    if (flow !== "ALL") rows = rows.filter((r) => r.tipe === flow);

    if (q) {
      const s = q.toLowerCase();
      rows = rows.filter(
        (r) =>
          String(r.kategori || "")
            .toLowerCase()
            .includes(s) ||
          String(r.metode || "")
            .toLowerCase()
            .includes(s) ||
          String(r.keterangan || "")
            .toLowerCase()
            .includes(s) ||
          String(r.refCode || "")
            .toLowerCase()
            .includes(s) ||
          String(r.statusVerif || "")
            .toLowerCase()
            .includes(s)
      );
    }

    // ASC by tanggal+jam, lalu createdAt
    rows.sort((a, b) => {
      const da = new Date(`${a.tanggal}T${a.jam || "00:00:00"}`).getTime();
      const db = new Date(`${b.tanggal}T${b.jam || "00:00:00"}`).getTime();
      if (da !== db) return da - db;
      const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ca - cb;
    });

    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    console.error("mutasi error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message || "Gagal memuat mutasi" },
      { status: 500 }
    );
  }
}

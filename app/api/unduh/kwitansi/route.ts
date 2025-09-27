// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { renderKwitansiToJPG } from "@/lib/render-kwitansi";
// import { resolveUploadPath } from "@/lib/uploads";
// import fs from "node:fs/promises";

// export const runtime = "nodejs";

// function getAppOrigin(req: NextRequest) {
//   const h = req.headers;
//   return (
//     process.env.APP_ORIGIN ||
//     process.env.NEXT_PUBLIC_APP_URL ||
//     h.get("origin") ||
//     `${h.get("x-forwarded-proto") || "http"}://${
//       h.get("x-forwarded-host") || h.get("host") || ""
//     }`
//   )?.replace(/\/$/, "");
// }

// function parseClosedBy(info?: string | null) {
//   if (!info) return null;
//   const m = info.match(/\[CLOSED_BY:(\d{4}-\d{2})\]/);
//   return m ? m[1] : null;
// }
// function parsePaidAt(info?: string | null) {
//   if (!info) return null;
//   const m = info.match(/\[PAID_AT:([^\]]+)\]/);
//   if (!m) return null;
//   const d = new Date(m[1]);
//   return isNaN(d.getTime()) ? null : d;
// }

// function startOfDay(d: Date) {
//   const x = new Date(d);
//   x.setHours(0, 0, 0, 0);
//   return x;
// }
// function endOfDay(d: Date) {
//   const x = new Date(d);
//   x.setHours(23, 59, 59, 999);
//   return x;
// }

// export async function GET(req: NextRequest) {
//   try {
//     const url = new URL(req.url);
//     const tagihanId = url.searchParams.get("tagihanId") || "";
//     let payId = url.searchParams.get("payId") || undefined;
//     if (!tagihanId) {
//       return NextResponse.json(
//         { ok: false, message: "tagihanId wajib" },
//         { status: 400 }
//       );
//     }

//     // Ambil tagihan + info untuk cek CLOSED_BY / PAID_AT
//     const t = await prisma.tagihan.findUnique({
//       where: { id: tagihanId, deletedAt: null },
//       select: {
//         id: true,
//         periode: true,
//         info: true,
//         totalTagihan: true,
//         tagihanLalu: true,
//         pelangganId: true,
//         pelanggan: { select: { kode: true } },
//       },
//     });
//     if (!t)
//       return NextResponse.json(
//         { ok: false, message: "Tagihan tidak ditemukan" },
//         { status: 404 }
//       );

//     const closedBy = parseClosedBy(t.info);
//     const paidAt = parsePaidAt(t.info);

//     // Hitung due vs paid untuk guard
//     const agg = await prisma.pembayaran.aggregate({
//       where: { tagihanId, deletedAt: null },
//       _sum: { jumlahBayar: true },
//     });
//     const totalPaid = agg._sum.jumlahBayar || 0;
//     const totalDue = (t.totalTagihan || 0) + (t.tagihanLalu || 0);
//     const isLunasByAmount = totalDue - totalPaid <= 0;

//     // RULE: boleh unduh jika (lunas by angka) ATAU (ditutup oleh periode lain)
//     if (!isLunasByAmount && !closedBy) {
//       return NextResponse.json(
//         {
//           ok: false,
//           message: "Belum lunas. Kwitansi bisa diunduh setelah lunas.",
//         },
//         { status: 400 }
//       );
//     }

//     // Tentukan payId:
//     // - Jika tagihan INI punya pembayaran → pakai pembayaran terakhir (kecuali user sudah kirim payId)
//     // - Jika TIDAK ada pembayaran DAN ada CLOSED_BY → BIARKAN tanpa payId (template harus mendukung)
//     if (!payId) {
//       // 1) coba pembayaran di tagihan ini
//       const lastPay = await prisma.pembayaran.findFirst({
//         where: { tagihanId, deletedAt: null },
//         orderBy: { tanggalBayar: "desc" },
//         select: { id: true },
//       });
//       if (lastPay) {
//         payId = lastPay.id;
//       } else if (closedBy) {
//         // 2) TIDAK ada pembayaran di tagihan ini -> cari di ANCHOR (periode CLOSED_BY)
//         const anchor = await prisma.tagihan.findUnique({
//           where: {
//             pelangganId_periode: {
//               pelangganId: t.pelangganId,
//               periode: closedBy,
//             },
//           },
//           select: { id: true },
//         });

//         if (anchor) {
//           // Prioritas: cari payment di anchor pada HARI yang sama dengan PAID_AT
//           let anchorPay = null as null | { id: string };

//           if (paidAt) {
//             anchorPay = await prisma.pembayaran.findFirst({
//               where: {
//                 tagihanId: anchor.id,
//                 deletedAt: null,
//                 tanggalBayar: {
//                   gte: startOfDay(paidAt),
//                   lte: endOfDay(paidAt),
//                 },
//               },
//               orderBy: { tanggalBayar: "asc" },
//               select: { id: true },
//             });
//           }

//           // fallback: kalau tidak ketemu di hari itu, ambil pembayaran anchor yang paling akhir
//           if (!anchorPay) {
//             anchorPay = await prisma.pembayaran.findFirst({
//               where: { tagihanId: anchor.id, deletedAt: null },
//               orderBy: { tanggalBayar: "desc" },
//               select: { id: true },
//             });
//           }

//           if (anchorPay) payId = anchorPay.id;
//         }
//       }
//     }

//     const origin = getAppOrigin(req);
//     const baseUrl = `${origin}/print/kwitansi/${encodeURIComponent(tagihanId)}`;
//     const tplUrl = payId
//       ? `${baseUrl}?payId=${encodeURIComponent(payId)}`
//       : baseUrl;

//     const safeKode = (t.pelanggan?.kode || "CUST").replace(
//       /[^A-Za-z0-9_-]/g,
//       ""
//     );
//     const outName = `kwitansi-${t.periode}-${safeKode}.jpg`;

//     // Cache hasil render
//     const relSegments = ["payment", "kwitansi", "img"];
//     const absPath = resolveUploadPath(...relSegments, outName);
//     const apiUrl = `/api/file/${relSegments.join("/")}/${outName}`;

//     const exists = await fs
//       .stat(absPath)
//       .then(() => true)
//       .catch(() => false);
//     if (exists)
//       return NextResponse.json({ ok: true, url: apiUrl, cache: true });

//     const jpgUrl = await renderKwitansiToJPG({ tplUrl, outName });
//     return NextResponse.json({ ok: true, url: jpgUrl, cache: false });
//   } catch (e: any) {
//     console.error("[unduh-kwitansi]", e);
//     return NextResponse.json(
//       { ok: false, message: e?.message || "Server error" },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderKwitansiToJPG } from "@/lib/render-kwitansi";
import { resolveUploadPath } from "@/lib/uploads";
import fs from "node:fs/promises";

export const runtime = "nodejs";

function getAppOrigin(req: NextRequest) {
  const h = req.headers;
  return (
    process.env.APP_ORIGIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    h.get("origin") ||
    `${h.get("x-forwarded-proto") || "http"}://${h.get("x-forwarded-host") || h.get("host") || ""}`
  )?.replace(/\/$/, "");
}

// === NEW: dukung CLOSED_BY atau PAID_BY (legacy) ===
function parseClosedByOrPaidBy(info?: string | null) {
  if (!info) return null;
  const m1 = info.match(/\[(?:CLOSED_BY|PAID_BY):(\d{4}-\d{2})\]/);
  return m1 ? m1[1] : null;
}
function parsePaidAt(info?: string | null) {
  if (!info) return null;
  const m = info.match(/\[PAID_AT:([^\]]+)\]/);
  if (!m) return null;
  const d = new Date(m[1]);
  return isNaN(d.getTime()) ? null : d;
}

const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const eod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const tagihanId = url.searchParams.get("tagihanId") || "";
    let payId = url.searchParams.get("payId") || undefined;
    const noCache = url.searchParams.get("nocache") === "1"; // <<< NEW

    if (!tagihanId) {
      return NextResponse.json({ ok: false, message: "tagihanId wajib" }, { status: 400 });
    }

    // PUBLIC: tanpa cookie
    const t = await prisma.tagihan.findUnique({
      where: { id: tagihanId, deletedAt: null },
      select: {
        id: true,
        periode: true,
        info: true,
        totalTagihan: true,
        tagihanLalu: true,
        pelangganId: true,
        pelanggan: { select: { kode: true } },
      },
    });
    if (!t) return NextResponse.json({ ok: false, message: "Tagihan tidak ditemukan" }, { status: 404 });

    const closedBy = parseClosedByOrPaidBy(t.info); // <<< NEW
    const paidAt = parsePaidAt(t.info);

    // Guard lunas: by angka ATAU ditutup di bulan lain
    const agg = await prisma.pembayaran.aggregate({
      where: { tagihanId, deletedAt: null },
      _sum: { jumlahBayar: true },
    });
    const totalPaid = agg._sum.jumlahBayar || 0;
    const totalDue = (t.totalTagihan || 0) + (t.tagihanLalu || 0);
    const isLunasByAmount = totalDue - totalPaid <= 0;

    if (!isLunasByAmount && !closedBy) {
      return NextResponse.json(
        { ok: false, message: "Belum lunas. Kwitansi bisa diunduh setelah lunas." },
        { status: 400 }
      );
    }

    // Tentukan payId (biar METODE bisa ikut):
    if (!payId) {
      const lastPay = await prisma.pembayaran.findFirst({
        where: { tagihanId, deletedAt: null },
        orderBy: { tanggalBayar: "desc" },
        select: { id: true },
      });
      if (lastPay) {
        payId = lastPay.id;
      } else if (closedBy) {
        const anchor = await prisma.tagihan.findUnique({
          where: { pelangganId_periode: { pelangganId: t.pelangganId, periode: closedBy } },
          select: { id: true },
        });
        if (anchor) {
          let anchorPay: { id: string } | null = null;
          if (paidAt) {
            anchorPay = await prisma.pembayaran.findFirst({
              where: {
                tagihanId: anchor.id,
                deletedAt: null,
                tanggalBayar: { gte: sod(paidAt), lte: eod(paidAt) },
              },
              orderBy: { tanggalBayar: "asc" },
              select: { id: true },
            });
          }
          if (!anchorPay) {
            anchorPay = await prisma.pembayaran.findFirst({
              where: { tagihanId: anchor.id, deletedAt: null },
              orderBy: { tanggalBayar: "desc" },
              select: { id: true },
            });
          }
          if (anchorPay) payId = anchorPay.id;
        }
      }
    }

    const origin = getAppOrigin(req);
    const baseUrl = `${origin}/print/kwitansi/${encodeURIComponent(tagihanId)}`;
    const tplUrl = payId ? `${baseUrl}?payId=${encodeURIComponent(payId)}` : baseUrl;

    const safeKode = (t.pelanggan?.kode || "CUST").replace(/[^A-Za-z0-9_-]/g, "");
    const suffix = noCache
      ? `-r${Date.now()}` // <<< NEW: paksa nama beda tiap request nocache
      : payId
      ? `-pay_${payId}`
      : closedBy
      ? `-closedby`
      : "";
    const outName = `kwitansi-${t.periode}-${safeKode}${suffix}.jpg`;

    // Cache file (skip kalau nocache)
    const relSegments = ["payment", "kwitansi", "img"];
    const absPath = resolveUploadPath(...relSegments, outName);
    const apiUrl = `/api/file/${relSegments.join("/")}/${outName}`;

    if (!noCache) {
      const exists = await fs.stat(absPath).then(() => true).catch(() => false);
      if (exists) return NextResponse.json({ ok: true, url: apiUrl, cache: true });
    }

    const jpgUrl = await renderKwitansiToJPG({ tplUrl, outName });
    return NextResponse.json({ ok: true, url: jpgUrl, cache: false });
  } catch (e: any) {
    console.error("[unduh-kwitansi]", e);
    return NextResponse.json({ ok: false, message: e?.message || "Server error" }, { status: 500 });
  }
}

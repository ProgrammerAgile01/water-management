// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { CatatStatus } from "@prisma/client";
// import { randomToken } from "@/lib/auth-utils";
// import { cookies } from "next/headers";
// import puppeteer from "puppeteer";
// export const runtime = "nodejs";

// // util: ambil base URL app untuk bikin link PDF
// function getAppOrigin(req: NextRequest) {
//   const h = req.headers;
//   return (
//     process.env.APP_ORIGIN || // kalau kamu set ini
//     process.env.NEXT_PUBLIC_APP_URL || // env kamu sekarang
//     h.get("origin") ||
//     `${h.get("x-forwarded-proto") || "http"}://${
//       h.get("x-forwarded-host") || h.get("host") || ""
//     }`
//   )?.replace(/\/$/, "");
// }

// function formatRp(n: number) {
//   return "Rp " + Number(n || 0).toLocaleString("id-ID");
// }

// function fmtTanggalID(d: Date) {
//   return d.toLocaleDateString("id-ID", {
//     weekday: "long",
//     day: "2-digit",
//     month: "long",
//     year: "numeric",
//   });
// }

// function waText(p: {
//   setting?: {
//     namaPerusahaan?: string | null;
//     telepon?: string | null;
//     email?: string | null;
//     alamat?: string | null;
//     anNorekPembayaran?: string | null;
//     namaBankPembayaran?: string | null;
//     namaBendahara?: string | null;
//     norekPembayaran?: string | null;
//     whatsappCs?: string | null;
//   };
//   nama?: string;
//   kode?: string;
//   periode: string; // "YYYY-MM"
//   meterAwal: number;
//   meterAkhir: number;
//   pemakaian: number;
//   tarifPerM3: number;
//   abonemen: number;
//   biayaAdmin: number;
//   total: number;
//   due: Date;
//   pdfUrl?: string; // opsional, kalau ada link preview
// }) {
//   const perusahaan = p.setting?.namaPerusahaan || "Tirtabening";
//   const bulan = new Date(p.periode + "-01").toLocaleDateString("id-ID", {
//     month: "long",
//     year: "numeric",
//   });

//   const bayarLines = [
//     `• Tunai ke bendahara (${p.setting?.namaBendahara}).`,
//     `• ${p.setting?.namaBankPembayaran} ${p.setting?.norekPembayaran} a.n. ${p.setting?.anNorekPembayaran}.`,
//   ].join("\n");

//   const kontakLine = [
//     p.setting?.telepon ? `Telepon: ${p.setting.telepon}` : null,
//     p.setting?.email ? `Email: ${p.setting.email}` : null,
//     p.setting?.whatsappCs ? `WhatsApp: ${p.setting.whatsappCs}` : null,
//   ]
//     .filter(Boolean)
//     .join("\n");

//   const sections: string[] = [];

//   // Header
//   sections.push(
//     [
//       `Kepada pelanggan ${perusahaan} yang terhormat,\n`,
//       `Tagihan Air Bulan ${bulan}`,
//       p.nama ? `Pelanggan: *${p.nama}*` : undefined,
//     ]
//       .filter(Boolean)
//       .join("\n")
//   );

//   // Ringkasan
//   sections.push(
//     [
//       "*Ringkasan*",
//       `• Pemakaian: ${p.pemakaian} m³`,
//       `• Total Tagihan: *${formatRp(p.total)}*`,
//       `• Batas Bayar: *${fmtTanggalID(p.due)}*`,
//     ].join("\n")
//   );

//   // Rincian
//   sections.push(
//     [
//       "*Rincian*",
//       `• Meter Awal: ${p.meterAwal}`,
//       `• Meter Akhir: ${p.meterAkhir}`,
//       `• Pemakaian: ${p.pemakaian} m³`,
//       `• Tarif/m³: ${formatRp(p.tarifPerM3)}`,
//       `• Abonemen: ${formatRp(p.abonemen)}`,
//       "—",
//       `*Total Tagihan: ${formatRp(p.total)}*`,
//     ].join("\n")
//   );

//   // Pembayaran
//   sections.push(["*Informasi Pembayaran*", bayarLines].join("\n"));

//   //   // PDF (opsional)
//   //   if (p.pdfUrl) {
//   //     sections.push(["Unduh tagihan (PDF):", p.pdfUrl].join("\n"));
//   //   }

//   // Bantuan (opsional)
//   if (kontakLine) {
//     sections.push(["*Bantuan*", kontakLine].join("\n"));
//   }

//   // Penutup
//   sections.push("Terima kasih 🙏");

//   // note
//   sections.push(["*NOTE:*"].join("\n"));

//   // Gabung antar-section dengan 1 baris kosong
//   return sections
//     .map((s) => s.replace(/[ \t]+$/g, "")) // hapus trailing spaces
//     .join("\n\n");
// }

// async function sendWaAndLog(tujuanRaw: string, text: string) {
//   const to = tujuanRaw.replace(/\D/g, "").replace(/^0/, "62");

//   // ⬇️ ambil URL & API KEY dari env
//   const base = (process.env.WA_SENDER_URL || "").replace(/\/$/, "");
//   const apiKey = process.env.WA_SENDER_API_KEY || "";

//   // ⬇️ kalau belum diset, langsung log FAILED & keluar (fail-safe dev)
//   if (!base) {
//     await prisma.waLog.create({
//       data: {
//         tujuan: to,
//         tipe: "TAGIHAN",
//         payload: JSON.stringify({ to, text }),
//         status: "FAILED",
//       },
//     });
//     return;
//   }

//   const url = `${base}/send`;

//   // log awal
//   const log = await prisma.waLog.create({
//     data: {
//       tujuan: to,
//       tipe: "TAGIHAN",
//       payload: JSON.stringify({ to, text }),
//       status: "PENDING",
//     },
//   });

//   // ⬇️ tambahkan API key + timeout
//   const ac = new AbortController();
//   const t = setTimeout(() => ac.abort(), 10_000); // 10s timeout

//   fetch(url, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       ...(apiKey ? { "x-api-key": apiKey } : {}), // ⬅️ penting
//     },
//     body: JSON.stringify({ to, text }),
//     signal: ac.signal,
//   })
//     .then((r) =>
//       prisma.waLog.update({
//         where: { id: log.id },
//         data: { status: r.ok ? "SENT" : "FAILED" },
//       })
//     )
//     .catch(() =>
//       prisma.waLog.update({
//         where: { id: log.id },
//         data: { status: "FAILED" },
//       })
//     )
//     .finally(() => clearTimeout(t));
// }

// // lampiran pdf ke wa
// // async function sendWaPdfAndLog(
// //   tujuanRaw: string,
// //   pdfUrl: string,
// //   filename: string,
// //   caption?: string
// // ) {
// //   const to = tujuanRaw.replace(/\D/g, "").replace(/^0/, "62");
// //   const base = (process.env.WA_SENDER_URL || "").replace(/\/$/, "");
// //   const apiKey = process.env.WA_SENDER_API_KEY || "";
// //   if (!base) {
// //     await prisma.waLog.create({
// //       data: {
// //         tujuan: to,
// //         tipe: "TAGIHAN_PDF",
// //         payload: JSON.stringify({
// //           to,
// //           pdfUrl,
// //           filename,
// //           caption,
// //           err: "WA_SENDER_URL empty",
// //         }),
// //         status: "FAILED",
// //       },
// //     });
// //     return;
// //   }

// //   const log = await prisma.waLog.create({
// //     data: {
// //       tujuan: to,
// //       tipe: "TAGIHAN_PDF",
// //       payload: JSON.stringify({ to, pdfUrl, filename, caption }),
// //       status: "PENDING",
// //     },
// //   });

// //   try {
// //     const r = await fetch(`${base}/send-document`, {
// //       method: "POST",
// //       headers: {
// //         "Content-Type": "application/json",
// //         ...(apiKey ? { "x-api-key": apiKey } : {}),
// //       },
// //       body: JSON.stringify({
// //         to,
// //         url: pdfUrl,
// //         filename,
// //         caption,
// //         mimeType: "application/pdf",
// //       }),
// //     });

// //     await prisma.waLog.update({
// //       where: { id: log.id },
// //       data: {
// //         status: r.ok ? "SENT" : "FAILED",
// //         payload: JSON.stringify({
// //           to,
// //           pdfUrl,
// //           filename,
// //           http: { ok: r.ok, status: r.status },
// //         }),
// //       },
// //     });
// //   } catch (e: any) {
// //     await prisma.waLog.update({
// //       where: { id: log.id },
// //       data: {
// //         status: "FAILED",
// //         payload: JSON.stringify({
// //           to,
// //           pdfUrl,
// //           filename,
// //           err: String(e?.message || e),
// //         }),
// //       },
// //     });
// //   }
// // }

// // kirim jpg
// async function sendWaImageAndLog(
//   tujuanRaw: string,
//   tagihanId: string,
//   caption?: string
// ) {
//   const to = tujuanRaw.replace(/\D/g, "").replace(/^0/, "62");
//   const base = (process.env.WA_SENDER_URL || "").replace(/\/$/, "");
//   const apiKey = process.env.WA_SENDER_API_KEY || "";
//   if (!base) {
//     await prisma.waLog.create({
//       data: {
//         tujuan: to,
//         tipe: "TAGIHAN_IMG",
//         payload: JSON.stringify({
//           to,
//           tagihanId,
//           caption,
//           err: "WA_SENDER_URL empty",
//         }),
//         status: "FAILED",
//       },
//     });
//     return;
//   }

//   const log = await prisma.waLog.create({
//     data: {
//       tujuan: to,
//       tipe: "TAGIHAN_IMG",
//       payload: JSON.stringify({ to, tagihanId, caption }),
//       status: "PENDING",
//     },
//   });

//   try {
//     // ⬇️ render halaman tagihan pakai Puppeteer
//     const browser = await puppeteer.launch({ headless: "new" });
//     const page = await browser.newPage();
//     const origin =
//       process.env.APP_ORIGIN ||
//       process.env.NEXT_PUBLIC_APP_URL ||
//       "http://localhost:3000";

//     await page.goto(`${origin}/print/tagihan/${tagihanId}?compact=1`, {
//       waitUntil: "networkidle0",
//     });

//     await page.setViewport({ width: 380, height: 800, deviceScaleFactor: 2 });
//     await page.evaluate(() => { document.body.style.background = "#ffffff"; });

//     // Screenshot jadi JPEG
//     const buffer = await page.screenshot({ type: "jpeg", quality: 85, fullPage: true });
//     await browser.close();

//     // Kirim ke WA sender
//     const r = await fetch(`${base}/send-image`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         ...(apiKey ? { "x-api-key": apiKey } : {}),
//       },
//       body: JSON.stringify({
//         to,
//         base64: buffer.toString("base64"), // ⬅️ WAJIB: pakai 'base64', bukan 'image'
//         filename: `tagihan-${tagihanId}.jpg`,
//         caption,
//         mimeType: "image/jpeg",
//       }),
//     });

//     await prisma.waLog.update({
//       where: { id: log.id },
//       data: { status: r.ok ? "SENT" : "FAILED" },
//     });
//   } catch (e: any) {
//     await prisma.waLog.update({
//       where: { id: log.id },
//       data: {
//         status: "FAILED",
//         payload: JSON.stringify({
//           to,
//           tagihanId,
//           caption,
//           err: String(e?.message || e),
//         }),
//       },
//     });
//   }
// }

// export async function POST(req: NextRequest) {
//   try {
//     const { id, sendWa }: { id?: string; sendWa?: boolean } = await req.json();
//     if (!id)
//       return NextResponse.json(
//         { ok: false, message: "id wajib" },
//         { status: 400 }
//       );

//     // ⬇️ tambahkan select kode pelanggan
//     const row = await prisma.catatMeter.findUnique({
//       where: { id },
//       include: {
//         periode: true,
//         pelanggan: {
//           select: { id: true, nama: true, wa: true, kode: true, userId: true },
//         },
//       },
//     });
//     if (!row || row.deletedAt)
//       return NextResponse.json(
//         { ok: false, message: "Data tidak ditemukan" },
//         { status: 404 }
//       );
//     if (row.periode.isLocked)
//       return NextResponse.json(
//         { ok: false, message: "Periode sudah dikunci" },
//         { status: 423 }
//       );
//     if (row.isLocked)
//       return NextResponse.json({
//         ok: true,
//         locked: true,
//         message: "Row sudah dikunci",
//       });

//     const periodeStr = row.periode.kodePeriode; // "YYYY-MM"
//     const setting = await prisma.setting.findUnique({ where: { id: 1 } });
//     if (!setting)
//       return NextResponse.json(
//         { ok: false, message: "Setting tidak ditemukan" },
//         { status: 500 }
//       );

//     // Hitung total
//     const akhir = Math.max(row.meterAkhir ?? row.meterAwal, row.meterAwal);
//     const pem = Math.max(0, akhir - row.meterAwal);
//     const tarif = row.tarifPerM3 ?? row.periode.tarifPerM3 ?? 0;
//     const abon = row.abonemen ?? row.periode.abonemen ?? 0;
//     const biayaAdmin = setting.biayaAdmin ?? 0;
//     const total = tarif * pem + abon + biayaAdmin;

//     // Due date dari bulan periode
//     const [yy, mm] = periodeStr.split("-").map(Number);
//     const due = new Date(yy, mm - 1, Math.max(1, setting.tglJatuhTempo ?? 15));

//     // Transaksi: lock row + upsert tagihan + progress
//     const { periodeId, pelanggan, tagihan } = await prisma.$transaction(
//       async (tx) => {
//         const updated = await tx.catatMeter.update({
//           where: { id: row.id },
//           data: {
//             isLocked: true,
//             status: CatatStatus.DONE,
//             meterAkhir: akhir,
//             pemakaianM3: pem,
//             total,
//             tarifPerM3: tarif,
//             abonemen: abon,
//           },
//           select: { periodeId: true },
//         });

//         const t = await tx.tagihan.upsert({
//           where: {
//             pelangganId_periode: {
//               pelangganId: row.pelangganId,
//               periode: periodeStr,
//             },
//           },
//           update: {
//             tarifPerM3: tarif,
//             abonemen: abon,
//             totalTagihan: total,
//             denda: 0,
//             statusBayar: "UNPAID",
//             statusVerif: "UNVERIFIED",
//             tglJatuhTempo: due,
//           },
//           create: {
//             pelangganId: row.pelangganId,
//             periode: periodeStr,
//             tarifPerM3: tarif,
//             abonemen: abon,
//             totalTagihan: total,
//             denda: 0,
//             statusBayar: "UNPAID",
//             statusVerif: "UNVERIFIED",
//             tglJatuhTempo: due,
//           },
//         });

//         const agg = await tx.catatMeter.groupBy({
//           by: ["status"],
//           where: { periodeId: updated.periodeId, deletedAt: null },
//           _count: { _all: true },
//         });
//         const selesai =
//           agg.find((a) => a.status === CatatStatus.DONE)?._count._all ?? 0;
//         const pending =
//           agg.find((a) => a.status === CatatStatus.PENDING)?._count._all ?? 0;
//         await tx.catatPeriode.update({
//           where: { id: updated.periodeId },
//           data: { totalPelanggan: selesai + pending, selesai, pending },
//         });

//         return {
//           periodeId: updated.periodeId,
//           pelanggan: row.pelanggan,
//           tagihan: t,
//         };
//       }
//     );

//     // magic link
//     // --- 1) Pastikan pelanggan punya User (role WARGA) ---
//     let userId = pelanggan.userId as string | undefined;
//     if (!userId) {
//       const username = pelanggan.kode; // unik, kamu sudah unique di schema
//       const pwd = randomToken(12); // password random (bisa kirim terpisah kalau perlu)
//       const user = await prisma.user.create({
//         data: {
//           username,
//           passwordHash: pwd, // TODO: kalau kamu hashing sendiri, hash dulu
//           name: pelanggan.nama,
//           phone: pelanggan.wa ?? null,
//           role: "WARGA",
//           isActive: true,
//         },
//         select: { id: true },
//       });
//       userId = user.id;

//       // tautkan ke pelanggan
//       await prisma.pelanggan.update({
//         where: { id: pelanggan.id },
//         data: { userId },
//       });
//     }

//     // --- 2) Buat magic link token ---
//     const token = randomToken(32);
//     const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 day
//     await prisma.magicLinkToken.create({
//       data: {
//         token,
//         userId: userId!,
//         tagihanId: tagihan.id, // biar landing langsung ke tagihan /pelunasan?id=...
//         purpose: "pembayaran",
//         expiresAt,
//       },
//     });

//     // --- 3) Bangun link untuk WA ---
//     const origin = getAppOrigin(req);
//     const magicUrl =
//       origin &&
//       `${origin.replace(/\/$/, "")}/api/auth/magic?token=${encodeURIComponent(
//         token
//       )}`;

//     // === Compose pesan profesional + kirim WA ===
//     if (sendWa && pelanggan?.wa) {
//       const origin = getAppOrigin(req);

//       // siapkan pdfUrl di scope luar
//       const pdfUrl = origin
//         ? `${origin.replace(/\/$/, "")}/api/tagihan/preview/${pelanggan.id}`
//         : undefined;

//       const linkBaris = magicUrl
//         ? `\n\nBayar/unggah bukti dengan aman via tautan berikut:\n${magicUrl}`
//         : "";

//       const text =
//         waText({
//           setting: {
//             namaPerusahaan: setting.namaPerusahaan,
//             telepon: setting.telepon,
//             email: setting.email,
//             alamat: setting.alamat,
//             anNorekPembayaran: setting.anNorekPembayaran,
//             namaBankPembayaran: setting.namaBankPembayaran,
//             namaBendahara: setting.namaBendahara,
//             norekPembayaran: setting.norekPembayaran,
//             whatsappCs: setting.whatsappCs,
//           },
//           nama: pelanggan.nama,
//           kode: pelanggan.kode || undefined,
//           periode: periodeStr,
//           meterAwal: row.meterAwal,
//           meterAkhir: akhir,
//           pemakaian: pem,
//           tarifPerM3: tarif,
//           abonemen: abon,
//           biayaAdmin,
//           total,
//           due,
//           pdfUrl,
//         }) + linkBaris;

//       // === KIRIM DI BACKGROUND — JANGAN await ===
//       (async () => {
//         try {
//           await sendWaAndLog(pelanggan.wa!, text);
//         } catch {}

//         // kirim gambar (bukan pdf)
//         try {
//           const caption = `Tagihan Air Periode ${new Date(
//             `${periodeStr}-01`
//           ).toLocaleDateString("id-ID", {
//             month: "long",
//             year: "numeric",
//           })} - ${pelanggan.nama}`;

//           await sendWaImageAndLog(pelanggan.wa!, tagihan.id, caption);
//         } catch {}
//       })();
//     }

//     return NextResponse.json({ ok: true, locked: true, tagihan });
//   } catch (e: any) {
//     return NextResponse.json(
//       { ok: false, message: e?.message ?? "Server error" },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { CatatStatus } from "@prisma/client"
import { randomToken } from "@/lib/auth-utils"
import puppeteer from "puppeteer"

export const runtime = "nodejs"

/* =======================
   Helper periode
   ======================= */
// "YYYY-MM" -> "YYYY-MM" bulan sebelumnya
function prevPeriod(code: string) {
  const [y, m] = code.split("-").map(Number)
  const d = new Date(y, m - 1, 1)
  d.setMonth(d.getMonth() - 1)
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  return `${yy}-${mm}`
}
// "YYYY-MM" -> "YYYY-MM" bulan berikutnya
function nextPeriod(code: string) {
  const [y, m] = code.split("-").map(Number)
  const d = new Date(y, m - 1, 1)
  d.setMonth(d.getMonth() + 1)
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  return `${yy}-${mm}`
}

/* =======================
   Helper existing
   ======================= */
function getAppOrigin(req: NextRequest) {
  const h = req.headers
  return (
    process.env.APP_ORIGIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    h.get("origin") ||
    `${h.get("x-forwarded-proto") || "http"}://${h.get("x-forwarded-host") || h.get("host") || ""}`
  )?.replace(/\/$/, "")
}
function formatRp(n: number) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID")
}
function fmtTanggalID(d: Date) {
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}
function waText(p: {
  setting?: {
    namaPerusahaan?: string | null
    telepon?: string | null
    email?: string | null
    alamat?: string | null
    anNorekPembayaran?: string | null
    namaBankPembayaran?: string | null
    namaBendahara?: string | null
    norekPembayaran?: string | null
    whatsappCs?: string | null
  }
  nama?: string
  kode?: string
  periode: string
  meterAwal: number
  meterAkhir: number
  pemakaian: number
  tarifPerM3: number
  abonemen: number
  biayaAdmin: number
  total: number
  due: Date
  pdfUrl?: string
}) {
  const perusahaan = p.setting?.namaPerusahaan || "Tirtabening"
  const bulan = new Date(p.periode + "-01").toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  })
  const bayarLines = [
    `• Tunai ke bendahara (${p.setting?.namaBendahara}).`,
    `• ${p.setting?.namaBankPembayaran} ${p.setting?.norekPembayaran} a.n. ${p.setting?.anNorekPembayaran}.`,
  ].join("\n")
  const kontakLine = [
    p.setting?.telepon ? `Telepon: ${p.setting.telepon}` : null,
    p.setting?.email ? `Email: ${p.setting.email}` : null,
    p.setting?.whatsappCs ? `WhatsApp: ${p.setting.whatsappCs}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  const sections: string[] = []
  sections.push(
    [
      `Kepada pelanggan ${perusahaan} yang terhormat,\n`,
      `Tagihan Air Bulan ${bulan}`,
      p.nama ? `Pelanggan: *${p.nama}*` : undefined,
    ]
      .filter(Boolean)
      .join("\n"),
  )
  sections.push(
    [
      "*Ringkasan*",
      `• Pemakaian: ${p.pemakaian} m³`,
      `• Total Tagihan: *${formatRp(p.total)}*`,
      `• Batas Bayar: *${fmtTanggalID(p.due)}*`,
    ].join("\n"),
  )
  sections.push(
    [
      "*Rincian*",
      `• Meter Awal: ${p.meterAwal}`,
      `• Meter Akhir: ${p.meterAkhir}`,
      `• Pemakaian: ${p.pemakaian} m³`,
      `• Tarif/m³: ${formatRp(p.tarifPerM3)}`,
      `• Abonemen: ${formatRp(p.abonemen)}`,
      "—",
      `*Total Tagihan: ${formatRp(p.total)}*`,
    ].join("\n"),
  )
  sections.push(["*Informasi Pembayaran*", bayarLines].join("\n"))
  if (kontakLine) sections.push(["*Bantuan*", kontakLine].join("\n"))
  sections.push("Terima kasih 🙏")
  sections.push(["*NOTE:*"].join("\n"))

  return sections.map((s) => s.replace(/[ \t]+$/g, "")).join("\n\n")
}

async function sendWaAndLog(tujuanRaw: string, text: string) {
  const to = tujuanRaw.replace(/\D/g, "").replace(/^0/, "62")
  const base = (process.env.WA_SENDER_URL || "").replace(/\/$/, "")
  const apiKey = process.env.WA_SENDER_API_KEY || ""
  if (!base) {
    await prisma.waLog.create({
      data: { tujuan: to, tipe: "TAGIHAN", payload: JSON.stringify({ to, text }), status: "FAILED" },
    })
    return
  }
  const url = `${base}/send`
  const log = await prisma.waLog.create({
    data: { tujuan: to, tipe: "TAGIHAN", payload: JSON.stringify({ to, text }), status: "PENDING" },
  })
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), 10000)
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(apiKey ? { "x-api-key": apiKey } : {}) },
    body: JSON.stringify({ to, text }),
    signal: ac.signal,
  })
    .then((r) => prisma.waLog.update({ where: { id: log.id }, data: { status: r.ok ? "SENT" : "FAILED" } }))
    .catch(() => prisma.waLog.update({ where: { id: log.id }, data: { status: "FAILED" } }))
    .finally(() => clearTimeout(t))
}

async function sendWaImageAndLog(tujuanRaw: string, tagihanId: string, caption?: string) {
  const to = tujuanRaw.replace(/\D/g, "").replace(/^0/, "62")
  const base = (process.env.WA_SENDER_URL || "").replace(/\/$/, "")
  const apiKey = process.env.WA_SENDER_API_KEY || ""
  if (!base) {
    await prisma.waLog.create({
      data: {
        tujuan: to,
        tipe: "TAGIHAN_IMG",
        payload: JSON.stringify({ to, tagihanId, caption, err: "WA_SENDER_URL empty" }),
        status: "FAILED",
      },
    })
    return
  }

  try {
    const browser = await puppeteer.launch({ headless: "new" })
    const page = await browser.newPage()
    const origin = process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    await page.goto(`${origin}/print/tagihan/${tagihanId}?compact=1`, { waitUntil: "networkidle0" })
    await page.setViewport({ width: 380, height: 800, deviceScaleFactor: 2 })
    await page.evaluate(() => {
      document.body.style.background = "#ffffff"
    })
    const buffer = await page.screenshot({ type: "jpeg", quality: 85, fullPage: true })
    await browser.close()

    const r = await fetch(`${base}/send-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(apiKey ? { "x-api-key": apiKey } : {}) },
      body: JSON.stringify({
        to,
        base64: buffer.toString("base64"),
        filename: `tagihan-${tagihanId}.jpg`,
        caption,
        mimeType: "image/jpeg",
      }),
    })

    await prisma.waLog.create({
      data: {
        tujuan: to,
        tipe: "TAGIHAN_IMG",
        payload: JSON.stringify({ to, tagihanId, http: { ok: r.ok, status: r.status } }),
        status: r.ok ? "SENT" : "FAILED",
      },
    })
  } catch (e: any) {
    await prisma.waLog.create({
      data: {
        tujuan: to,
        tipe: "TAGIHAN_IMG",
        payload: JSON.stringify({ to, tagihanId, caption, err: String(e?.message || e) }),
        status: "FAILED",
      },
    })
  }
}

/* =======================
   FINALIZE ROW
   ======================= */
export async function POST(req: NextRequest) {
  try {
    const { id, sendWa }: { id?: string; sendWa?: boolean } = await req.json()
    if (!id) return NextResponse.json({ ok: false, message: "id wajib" }, { status: 400 })

    const row = await prisma.catatMeter.findUnique({
      where: { id },
      include: {
        periode: true,
        pelanggan: { select: { id: true, nama: true, wa: true, kode: true, userId: true } },
      },
    })
    if (!row || row.deletedAt) return NextResponse.json({ ok: false, message: "Data tidak ditemukan" }, { status: 404 })
    if (row.periode.isLocked) return NextResponse.json({ ok: false, message: "Periode sudah dikunci" }, { status: 423 })
    if (row.isLocked) return NextResponse.json({ ok: true, locked: true, message: "Row sudah dikunci" })

    const periodeStr = row.periode.kodePeriode // "YYYY-MM"
    const setting = await prisma.setting.findUnique({ where: { id: 1 } })
    if (!setting) return NextResponse.json({ ok: false, message: "Setting tidak ditemukan" }, { status: 500 })

    // hitung total periode berjalan
    const akhir = Math.max(row.meterAkhir ?? row.meterAwal, row.meterAwal)
    const pem = Math.max(0, akhir - row.meterAwal)
    const tarif = row.tarifPerM3 ?? row.periode.tarifPerM3 ?? 0
    const abon = row.abonemen ?? row.periode.abonemen ?? 0
    const biayaAdmin = setting.biayaAdmin ?? 0
    const total = tarif * pem + abon + biayaAdmin

    // due date
    const [yy, mm] = periodeStr.split("-").map(Number)
    const due = new Date(yy, mm - 1, Math.max(1, setting.tglJatuhTempo ?? 15))

    // ★ ambil saldo bulan sebelumnya (tagihanLalu = sisaKurang prev)
    const prevCode = prevPeriod(periodeStr)
    const prevBill = await prisma.tagihan.findUnique({
      where: { pelangganId_periode: { pelangganId: row.pelangganId, periode: prevCode } },
      select: { sisaKurang: true },
    })
    const carryFromPrev = prevBill?.sisaKurang ?? 0 // bisa +/−/0

    // Transaksi
    const { periodeId, pelanggan, tagihan } = await prisma.$transaction(async (tx) => {
      // lock row
      const updated = await tx.catatMeter.update({
        where: { id: row.id },
        data: {
          isLocked: true,
          status: CatatStatus.DONE,
          meterAkhir: akhir,
          pemakaianM3: pem,
          total,
          tarifPerM3: tarif,
          abonemen: abon,
        },
        select: { periodeId: true },
      })

      // ★ hitung total pembayaran yang sudah ada untuk periode ini (kalau ada)
      const paidAgg = await tx.pembayaran.aggregate({
        where: { tagihan: { pelangganId: row.pelangganId, periode: periodeStr }, deletedAt: null },
        _sum: { jumlahBayar: true },
      })
      const alreadyPaid = paidAgg._sum.jumlahBayar ?? 0

      // ★ upsert tagihan + set tagihanLalu & sisaKurang
      const t = await tx.tagihan.upsert({
        where: {
          pelangganId_periode: { pelangganId: row.pelangganId, periode: periodeStr },
        },
        update: {
          tarifPerM3: tarif,
          abonemen: abon,
          totalTagihan: total,
          denda: 0,
          tagihanLalu: carryFromPrev, // ★
          sisaKurang: total + carryFromPrev - alreadyPaid, // ★
          statusBayar: total + carryFromPrev - alreadyPaid <= 0 ? "PAID" : "UNPAID", // ★
          statusVerif: "UNVERIFIED",
          tglJatuhTempo: due,
        },
        create: {
          pelangganId: row.pelangganId,
          periode: periodeStr,
          tarifPerM3: tarif,
          abonemen: abon,
          totalTagihan: total,
          denda: 0,
          tagihanLalu: carryFromPrev, // ★
          sisaKurang: total + carryFromPrev - alreadyPaid, // ★
          statusBayar: total + carryFromPrev - alreadyPaid <= 0 ? "PAID" : "UNPAID", // ★
          statusVerif: "UNVERIFIED",
          tglJatuhTempo: due,
        },
      })

      // update progress periode
      const agg = await tx.catatMeter.groupBy({
        by: ["status"],
        where: { periodeId: updated.periodeId, deletedAt: null },
        _count: { _all: true },
      })
      const selesai = agg.find((a) => a.status === CatatStatus.DONE)?._count._all ?? 0
      const pending = agg.find((a) => a.status === CatatStatus.PENDING)?._count._all ?? 0
      await tx.catatPeriode.update({
        where: { id: updated.periodeId },
        data: { totalPelanggan: selesai + pending, selesai, pending },
      })

      // ★ dorong ke bulan berikutnya jika sudah ada tagihan tsb
      const nextCode = nextPeriod(periodeStr)
      const nextExists = await tx.tagihan.findUnique({
        where: { pelangganId_periode: { pelangganId: row.pelangganId, periode: nextCode } },
        select: { id: true, totalTagihan: true },
      })
      if (nextExists) {
        // sisaKurang periode berjalan menjadi tagihanLalu periode berikutnya
        await tx.tagihan.update({
          where: { id: nextExists.id },
          data: {
            tagihanLalu: t.sisaKurang,
            sisaKurang: nextExists.totalTagihan + t.sisaKurang, // belum ada pembayaran di next saat ini
            statusBayar: nextExists.totalTagihan + t.sisaKurang <= 0 ? "PAID" : "UNPAID",
          },
        })
      }

      return { periodeId: updated.periodeId, pelanggan: row.pelanggan, tagihan: t }
    })

    // === Magic link user WARGA (bagian lamamu, tidak diubah) ===
    let userId = pelanggan.userId as string | undefined
    if (!userId) {
      const username = pelanggan.kode
      const pwd = randomToken(12)
      const user = await prisma.user.create({
        data: {
          username,
          passwordHash: pwd,
          name: pelanggan.nama,
          phone: pelanggan.wa ?? null,
          role: "WARGA",
          isActive: true,
        },
        select: { id: true },
      })
      userId = user.id
      await prisma.pelanggan.update({ where: { id: pelanggan.id }, data: { userId } })
    }

    const token = randomToken(32)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await prisma.magicLinkToken.create({
      data: { token, userId: userId!, tagihanId: tagihan.id, purpose: "pembayaran", expiresAt },
    })
    const origin = getAppOrigin(req)
    const magicUrl = origin && `${origin}/api/auth/magic?token=${encodeURIComponent(token)}`

    // === Kirim WA (teks + screenshot) seperti sebelumnya ===
    if (sendWa && pelanggan?.wa) {
      const linkBaris = magicUrl ? `\n\nBayar/unggah bukti dengan aman via tautan berikut:\n${magicUrl}` : ""
      const text =
        waText({
          setting: {
            namaPerusahaan: setting.namaPerusahaan,
            telepon: setting.telepon,
            email: setting.email,
            alamat: setting.alamat,
            anNorekPembayaran: setting.anNorekPembayaran,
            namaBankPembayaran: setting.namaBankPembayaran,
            namaBendahara: setting.namaBendahara,
            norekPembayaran: setting.norekPembayaran,
            whatsappCs: setting.whatsappCs,
          },
          nama: pelanggan.nama,
          kode: pelanggan.kode || undefined,
          periode: periodeStr,
          meterAwal: row.meterAwal,
          meterAkhir: Math.max(row.meterAkhir ?? row.meterAwal, row.meterAwal),
          pemakaian: Math.max(0, (row.meterAkhir ?? row.meterAwal) - row.meterAwal),
          tarifPerM3: tarif,
          abonemen: abon,
          biayaAdmin,
          total,
          due,
        }) + linkBaris

      ;(async () => {
        try {
          await sendWaAndLog(pelanggan.wa!, text)
        } catch {}
        try {
          const caption = `Tagihan Air Periode ${new Date(`${periodeStr}-01`).toLocaleDateString("id-ID", {
            month: "long",
            year: "numeric",
          })} - ${pelanggan.nama}`
          await sendWaImageAndLog(pelanggan.wa!, tagihan.id, caption)
        } catch {}
      })()
    }

    return NextResponse.json({ ok: true, locked: true, tagihan })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "Server error" }, { status: 500 })
  }
}
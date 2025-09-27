// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { MetodeBayar } from "@prisma/client";
// import { getAuthUserId } from "@/lib/auth";
// import { randomToken } from "@/lib/auth-utils";
// import { nextMonth } from "@/lib/period";
// import { saveUploadFile } from "@/lib/uploads"; // ⬅️ simpan bukti

// export const runtime = "nodejs";

// // ==== util origin ====
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

// // ====== util kecil untuk WA ======
// function formatRp(n: number) {
//   return "Rp " + Number(n || 0).toLocaleString("id-ID");
// }
// function fmtTanggalID(d: Date | string) {
//   const dd = typeof d === "string" ? new Date(d) : d;
//   return dd.toLocaleDateString("id-ID", {
//     day: "2-digit",
//     month: "long",
//     year: "numeric",
//   });
// }
// function adminWaText(p: {
//   perusahaan?: string | null;
//   pelangganNama: string;
//   pelangganKode?: string | null;
//   periode: string; // "YYYY-MM"
//   nominal: number;
//   metode: string;
//   tanggalBayar: Date;
//   tagihanId: string;
//   link?: string;
// }) {
//   const periodeLabel = new Date(p.periode + "-01").toLocaleDateString("id-ID", {
//     month: "long",
//     year: "numeric",
//   });
//   return [
//     `*Notifikasi Pembayaran Masuk*${p.perusahaan ? `\n${p.perusahaan}` : ""}`,
//     "",
//     "----------------------------------",
//     `• Pelanggan : ${p.pelangganNama}${
//       p.pelangganKode ? ` (${p.pelangganKode})` : ""
//     }`,
//     `• Periode      : ${periodeLabel}`,
//     `• Nominal     : ${formatRp(p.nominal)}`,
//     `• Metode      : ${p.metode}`,
//     `• Tanggal     : ${fmtTanggalID(p.tanggalBayar)}`,
//     "----------------------------------",
//     "",
//     p.link ? `Tinjau & verifikasi:\n${p.link}` : undefined,
//   ]
//     .filter(Boolean)
//     .join("\n");
// }

// async function sendWaAndLog(tujuanRaw: string, text: string) {
//   const to = tujuanRaw.replace(/\D/g, "").replace(/^0/, "62");
//   const base = (process.env.WA_SENDER_URL || "").replace(/\/$/, "");
//   const apiKey = process.env.WA_SENDER_API_KEY || "";

//   if (!base) {
//     await prisma.waLog.create({
//       data: {
//         tujuan: to,
//         tipe: "APPROVAL PEMBAYARAN",
//         payload: JSON.stringify({ to, text }),
//         status: "FAILED",
//       },
//     });
//     return;
//   }

//   const url = `${base}/send`;
//   const log = await prisma.waLog.create({
//     data: {
//       tujuan: to,
//       tipe: "APPROVAL PEMBAYARAN",
//       payload: JSON.stringify({ to, text }),
//       status: "PENDING",
//     },
//   });

//   const ac = new AbortController();
//   const t = setTimeout(() => ac.abort(), 10_000);

//   fetch(url, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       ...(apiKey ? { "x-api-key": apiKey } : {}),
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
//       prisma.waLog.update({ where: { id: log.id }, data: { status: "FAILED" } })
//     )
//     .finally(() => clearTimeout(t));
// }

// // ================ HELPER TANGGAL BAYAR ================

// // helper: kalau input cuma tanggal, pakai jam real saat ini
// function composeWithNowTime(dateStr: string) {
//   const base = new Date(dateStr); // ambil tanggalnya
//   if (isNaN(base.getTime())) return new Date(); // fallback now kalau invalid
//   const now = new Date(); // jam real saat simpan
//   base.setHours(
//     now.getHours(),
//     now.getMinutes(),
//     now.getSeconds(),
//     now.getMilliseconds()
//   );
//   return base;
// }

// // ================ HELPER INFO (append) ================
// function appendInfo(info: string | null | undefined, lines: string[]) {
//   const add = lines.filter(Boolean).join("\n");
//   return info ? `${info}\n${add}` : add;
// }

// // ================ HANDLER ================
// export async function POST(req: NextRequest) {
//   try {
//     const form = await req.formData();
//     const tagihanId = String(form.get("tagihanId") || "");
//     const nominalBayar = Number(form.get("nominalBayar") || 0);
//     const tanggalStr = String(form.get("tanggalBayar") || "");
//     const metodeRaw = String(form.get("metodeBayar") || "").toUpperCase();
//     const keterangan = String(form.get("keterangan") || "");
//     const file = form.get("buktiFile") as File | null;

//     // tentukan role user & nama admin (jika ada)
//     let adminName: string | null = null;
//     let userRole: "ADMIN" | "PETUGAS" | "WARGA" | null = null;
//     try {
//       const uid = await getAuthUserId(req);
//       if (uid) {
//         const u = await prisma.user.findUnique({
//           where: { id: uid },
//           select: { name: true, role: true },
//         });
//         userRole = (u?.role as any) || null;
//         if (u && u.role !== "WARGA") adminName = u.name ?? null;
//       }
//     } catch {}

//     const allow = ["TUNAI", "TRANSFER", "EWALLET", "QRIS"] as const;
//     const metode: MetodeBayar = (allow as readonly string[]).includes(metodeRaw)
//       ? (metodeRaw as MetodeBayar)
//       : MetodeBayar.TUNAI;

//     // RULE: WARGA TIDAK BOLEH TUNAI
//     if (userRole === "WARGA" && metode === MetodeBayar.TUNAI) {
//       return NextResponse.json(
//         {
//           ok: false,
//           message: "WARGA tidak diperbolehkan memilih metode TUNAI.",
//         },
//         { status: 400 }
//       );
//     }

//     // validasi dasar (kecuali bukti, lihat needsProof)
//     if (!tagihanId || !nominalBayar || !metodeRaw) {
//       return NextResponse.json(
//         { ok: false, message: "Data wajib belum lengkap" },
//         { status: 400 }
//       );
//     }

//     // RULE: bukti wajib kecuali TUNAI oleh ADMIN/PETUGAS
//     const needsProof = !(metode === MetodeBayar.TUNAI && userRole !== "WARGA");
//     if (needsProof && !file) {
//       return NextResponse.json(
//         { ok: false, message: "Bukti pembayaran wajib diunggah" },
//         { status: 400 }
//       );
//     }

//     // simpan bukti jika ada; kalau TUNAI-admin → paksa null
//     let buktiUrl: string | null = null;
//     if (metode === MetodeBayar.TUNAI && userRole !== "WARGA") {
//       buktiUrl = null;
//     } else if (file) {
//       const saved = await saveUploadFile(file, "payment/bukti-bayar");
//       buktiUrl = saved.publicUrl; // contoh: /api/file/payment/bukti-bayar/xxxxx.png
//     }

//     // Tanggal bayar versi lama
//     // const tanggalBayar = tanggalStr ? new Date(tanggalStr) : new Date();

//     // const tanggalBayar = tanggalStr ? new Date(tanggalStr) : new Date();
//     const tanggalBayar = tanggalStr
//       ? /\d{2}:\d{2}/.test(tanggalStr) // ada jam di string?
//         ? new Date(tanggalStr) // pakai apa adanya
//         : composeWithNowTime(tanggalStr) // cuma tanggal → tambah jam now
//       : new Date(); // kosong → full now

//     // ========== TRANSAKSI ==========
//     const pembayaran = await prisma.$transaction(async (tx) => {
//       // 0) Anchor (bulan aktif yang sedang dibayar)
//       const anchor = await tx.tagihan.findUnique({
//         where: { id: tagihanId },
//         include: {
//           pelanggan: { select: { id: true, nama: true, kode: true } },
//           pembayarans: { where: { deletedAt: null } },
//         },
//       });
//       if (!anchor) throw new Error("Tagihan tidak ditemukan");

//       const pelangganId = anchor.pelangganId;
//       const periodeAktif = anchor.periode;

//       // 1) Simpan 1 baris pembayaran DI ANCHOR (keterangan murni dari user/admin)
//       const pay = await tx.pembayaran.create({
//         data: {
//           tagihanId: anchor.id,
//           jumlahBayar: Math.round(nominalBayar),
//           tanggalBayar,
//           buktiUrl,
//           adminBayar: adminName,
//           metode,
//           keterangan: keterangan || null,
//         },
//       });

//       // 2) Ambil SEMUA tagihan pelanggan urut lama→baru utk alokasi virtual (tanpa mengubah angka history)
//       const tags = await tx.tagihan.findMany({
//         where: { pelangganId, deletedAt: null },
//         orderBy: { periode: "asc" },
//         include: { pembayarans: { where: { deletedAt: null } } },
//       });

//       // helper sisa (berdasarkan snapshot bulan itu)
//       const calcSisa = (t: (typeof tags)[number]) =>
//         (t.tagihanLalu || 0) +
//         (t.totalTagihan || 0) +
//         (t.denda || 0) -
//         t.pembayarans.reduce((a, b) => a + b.jumlahBayar, 0);

//       let dana = Math.round(nominalBayar);
//       const clearedPeriods: string[] = [];

//       for (const t of tags) {
//         if (dana <= 0) break;
//         const before = calcSisa(t); // posisi snapshot bulan tsb
//         if (before <= 0) continue; // sudah lunas/kredit

//         const potong = Math.min(before, dana);
//         const after = before - potong; // hasil *virtual* sesudah alokasi
//         dana -= potong;

//         // IMMUTABLE: JANGAN update sisa/status di bulan lama
//         // cukup tandai kalau DIA TERTUTUP (from >0 to <=0) & bukan anchor
//         if (before > 0 && after <= 0 && t.id !== anchor.id) {
//           await tx.tagihan.update({
//             where: { id: t.id },
//             data: {
//               info: appendInfo(t.info, [
//                 `Dibayarkan di periode ${periodeAktif}`, // human readable
//                 `[CLOSED_BY:${periodeAktif}]`, // machine tag
//               ]),
//             },
//           });
//           clearedPeriods.push(t.periode);
//         }
//       }

//       // 3) Tag metadata di ANCHOR (bulan aktif)
//       if (clearedPeriods.length) {
//         await tx.tagihan.update({
//           where: { id: anchor.id },
//           data: {
//             info: appendInfo(anchor.info, [
//               `Termasuk pelunasan tagihan lalu: ${clearedPeriods.join(", ")}`,
//               `[PREV_CLEARED:${clearedPeriods.join(", ")}]`,
//             ]),
//           },
//         });
//       }

//       // 4) Hitung posisi ANCHOR sekarang (boleh negatif → kredit)
//       const anchorAfterAgg = await tx.pembayaran.aggregate({
//         where: { tagihanId: anchor.id, deletedAt: null },
//         _sum: { jumlahBayar: true },
//       });
//       const paidAnchor = anchorAfterAgg._sum.jumlahBayar || 0;
//       const sisaAnchor =
//         (anchor.tagihanLalu || 0) +
//         (anchor.totalTagihan || 0) +
//         (anchor.denda || 0) -
//         paidAnchor;

//       const infoWithCredit =
//         sisaAnchor < 0
//           ? appendInfo(
//               (await tx.tagihan.findUnique({ where: { id: anchor.id } }))!.info,
//               [`[CREDIT:${Math.abs(sisaAnchor)}]`]
//             )
//           : undefined;

//       await tx.tagihan.update({
//         where: { id: anchor.id },
//         data: {
//           sisaKurang: sisaAnchor, // bulan aktif boleh berubah (termasuk negatif = kredit)
//           statusBayar:
//             sisaAnchor <= 0 ? "PAID" : paidAnchor > 0 ? "PAID" : "UNPAID",
//           ...(infoWithCredit ? { info: infoWithCredit } : {}),
//         },
//       });

//       // 5) (opsional) jika record bulan berikut SUDAH ada, sinkron tagihanLalu = sisaAnchor
//       const periodeNext = nextMonth(periodeAktif);
//       const nextT = await tx.tagihan.findUnique({
//         where: { pelangganId_periode: { pelangganId, periode: periodeNext } },
//         select: { id: true, totalTagihan: true },
//       });
//       if (nextT) {
//         const paidNextAgg = await tx.pembayaran.aggregate({
//           where: { tagihanId: nextT.id, deletedAt: null },
//           _sum: { jumlahBayar: true },
//         });
//         const paidNext = paidNextAgg._sum.jumlahBayar || 0;
//         const sisaNext = sisaAnchor + (nextT.totalTagihan || 0) - paidNext; // denda bisa ditambah kalau ada

//         await tx.tagihan.update({
//           where: { id: nextT.id },
//           data: {
//             tagihanLalu: sisaAnchor, // bisa negatif (kredit)
//             sisaKurang: sisaNext,
//             statusBayar:
//               sisaNext <= 0 ? "PAID" : paidNext > 0 ? "PARTIAL" : "UNPAID",
//           },
//         });
//       }

//       return pay;
//     });

//     // ==== kirim WA admin ====
//     try {
//       const origin = getAppOrigin(req);
//       const tFull = await prisma.tagihan.findUnique({
//         where: { id: String(pembayaran.tagihanId) },
//         select: {
//           id: true,
//           periode: true,
//           totalTagihan: true,
//           pelanggan: { select: { nama: true, kode: true } },
//         },
//       });
//       const setting = await prisma.setting.findUnique({
//         where: { id: 1 },
//         select: { namaPerusahaan: true },
//       });
//       const admins = await prisma.user.findMany({
//         where: { role: "ADMIN", isActive: true, phone: { not: null } },
//         select: { id: true, phone: true, name: true },
//       });

//       for (const a of admins) {
//         if (!a.phone) continue;

//         const token = randomToken(32);
//         const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
//         await prisma.magicLinkToken.create({
//           data: {
//             token,
//             userId: a.id,
//             tagihanId: String(pembayaran.tagihanId),
//             purpose: "admin-review",
//             expiresAt,
//           },
//         });

//         const next = `/input-pembayaran/${encodeURIComponent(
//           String(pembayaran.tagihanId)
//         )}`;
//         const link = origin
//           ? `${origin}/api/auth/magic?token=${encodeURIComponent(
//               token
//             )}&next=${encodeURIComponent(next)}`
//           : undefined;

//         const text = adminWaText({
//           perusahaan: setting?.namaPerusahaan,
//           pelangganNama: tFull?.pelanggan.nama || "-",
//           pelangganKode: tFull?.pelanggan.kode || undefined,
//           periode: tFull?.periode || "",
//           nominal: Math.round(pembayaran.jumlahBayar),
//           metode: pembayaran.metode,
//           tanggalBayar: pembayaran.tanggalBayar,
//           tagihanId: String(pembayaran.tagihanId),
//           link,
//         });

//         await sendWaAndLog(a.phone!, text);
//       }
//     } catch (err) {
//       console.error("[notify-admin-wa]", err);
//     }

//     return NextResponse.json({ ok: true, pembayaran });
//   } catch (e: any) {
//     return NextResponse.json(
//       { ok: false, message: e?.message ?? "Server error" },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MetodeBayar } from "@prisma/client";
import { getAuthUserId } from "@/lib/auth";
import { randomToken } from "@/lib/auth-utils";
import { nextMonth } from "@/lib/period";
import { saveUploadFile } from "@/lib/uploads"; // ⬅️ simpan bukti

export const runtime = "nodejs";

// ==== util origin ====
function getAppOrigin(req: NextRequest) {
  const h = req.headers;
  return (
    process.env.APP_ORIGIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    h.get("origin") ||
    `${h.get("x-forwarded-proto") || "http"}://${
      h.get("x-forwarded-host") || "host" in h ? h.get("host") : ""
    }`
  )?.replace(/\/$/, "");
}

// ====== util kecil untuk WA ======
function formatRp(n: number) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}
function fmtTanggalID(d: Date | string) {
  const dd = typeof d === "string" ? new Date(d) : d;
  return dd.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
function adminWaText(p: {
  perusahaan?: string | null;
  pelangganNama: string;
  pelangganKode?: string | null;
  periode: string; // "YYYY-MM"
  nominal: number;
  metode: string;
  tanggalBayar: Date;
  tagihanId: string;
  link?: string;
}) {
  const periodeLabel = new Date(p.periode + "-01").toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
  return [
    `*Notifikasi Pembayaran Masuk*${p.perusahaan ? `\n${p.perusahaan}` : ""}`,
    "",
    "----------------------------------",
    `• Pelanggan : ${p.pelangganNama}${
      p.pelangganKode ? ` (${p.pelangganKode})` : ""
    }`,
    `• Periode      : ${periodeLabel}`,
    `• Nominal     : ${formatRp(p.nominal)}`,
    `• Metode      : ${p.metode}`,
    `• Tanggal     : ${fmtTanggalID(p.tanggalBayar)}`,
    "----------------------------------",
    "",
    p.link ? `Tinjau & verifikasi:\n${p.link}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendWaAndLog(tujuanRaw: string, text: string) {
  const to = tujuanRaw.replace(/\D/g, "").replace(/^0/, "62");
  const base = (process.env.WA_SENDER_URL || "").replace(/\/$/, "");
  const apiKey = process.env.WA_SENDER_API_KEY || "";

  if (!base) {
    await prisma.waLog.create({
      data: {
        tujuan: to,
        tipe: "APPROVAL PEMBAYARAN",
        payload: JSON.stringify({ to, text }),
        status: "FAILED",
      },
    });
    return;
  }

  const url = `${base}/send`;
  const log = await prisma.waLog.create({
    data: {
      tujuan: to,
      tipe: "APPROVAL PEMBAYARAN",
      payload: JSON.stringify({ to, text }),
      status: "PENDING",
    },
  });

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 10_000);

  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "x-api-key": apiKey } : {}),
    },
    body: JSON.stringify({ to, text }),
    signal: ac.signal,
  })
    .then((r) =>
      prisma.waLog.update({
        where: { id: log.id },
        data: { status: r.ok ? "SENT" : "FAILED" },
      })
    )
    .catch(() =>
      prisma.waLog.update({ where: { id: log.id }, data: { status: "FAILED" } })
    )
    .finally(() => clearTimeout(t));
}

// ================ HELPER TANGGAL BAYAR ================

// helper: kalau input cuma tanggal, pakai jam real saat ini
function composeWithNowTime(dateStr: string) {
  const base = new Date(dateStr); // ambil tanggalnya
  if (isNaN(base.getTime())) return new Date(); // fallback now kalau invalid
  const now = new Date(); // jam real saat simpan
  base.setHours(
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds()
  );
  return base;
}

// ================ HELPER INFO (append) ================
function appendInfo(
  info: string | null | undefined,
  lines: (string | undefined | null)[]
) {
  const add = lines.filter(Boolean).join("\n");
  return info ? `${info}\n${add}` : add;
}

// ================ HANDLER ================
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const tagihanId = String(form.get("tagihanId") || "");
    const nominalBayar = Number(form.get("nominalBayar") || 0);
    const tanggalStr = String(form.get("tanggalBayar") || "");
    const metodeRaw = String(form.get("metodeBayar") || "").toUpperCase();
    const keterangan = String(form.get("keterangan") || "");
    const file = form.get("buktiFile") as File | null;

    // tentukan role user & nama admin (jika ada)
    let adminName: string | null = null;
    let userRole: "ADMIN" | "PETUGAS" | "WARGA" | null = null;
    try {
      const uid = await getAuthUserId(req);
      if (uid) {
        const u = await prisma.user.findUnique({
          where: { id: uid },
          select: { name: true, role: true },
        });
        userRole = (u?.role as any) || null;
        if (u && u.role !== "WARGA") adminName = u.name ?? null;
      }
    } catch {}

    const allow = ["TUNAI", "TRANSFER", "EWALLET", "QRIS"] as const;
    const metode: MetodeBayar = (allow as readonly string[]).includes(metodeRaw)
      ? (metodeRaw as MetodeBayar)
      : MetodeBayar.TUNAI;

    // RULE: WARGA TIDAK BOLEH TUNAI
    if (userRole === "WARGA" && metode === MetodeBayar.TUNAI) {
      return NextResponse.json(
        {
          ok: false,
          message: "WARGA tidak diperbolehkan memilih metode TUNAI.",
        },
        { status: 400 }
      );
    }

    // validasi dasar (kecuali bukti, lihat needsProof)
    if (!tagihanId || !nominalBayar || !metodeRaw) {
      return NextResponse.json(
        { ok: false, message: "Data wajib belum lengkap" },
        { status: 400 }
      );
    }

    // RULE: bukti wajib kecuali TUNAI oleh ADMIN/PETUGAS
    const needsProof = !(metode === MetodeBayar.TUNAI && userRole !== "WARGA");
    if (needsProof && !file) {
      return NextResponse.json(
        { ok: false, message: "Bukti pembayaran wajib diunggah" },
        { status: 400 }
      );
    }

    // simpan bukti jika ada; kalau TUNAI-admin → paksa null
    let buktiUrl: string | null = null;
    if (metode === MetodeBayar.TUNAI && userRole !== "WARGA") {
      buktiUrl = null;
    } else if (file) {
      const saved = await saveUploadFile(file, "payment/bukti-bayar");
      buktiUrl = saved.publicUrl; // contoh: /api/file/payment/bukti-bayar/xxxxx.png
    }

    // Tanggal bayar (support input hanya tanggal → tambah jam now)
    const tanggalBayar = tanggalStr
      ? /\d{2}:\d{2}/.test(tanggalStr)
        ? new Date(tanggalStr)
        : composeWithNowTime(tanggalStr)
      : new Date();

    // === NEW: string tanggal untuk tag mesin & manusia ===
    const paidAtISO = new Date(tanggalBayar).toISOString();
    const paidAtHuman = fmtTanggalID(tanggalBayar);

    // ========== TRANSAKSI ==========
    const pembayaran = await prisma.$transaction(async (tx) => {
      // 0) Anchor (bulan aktif yang sedang dibayar)
      const anchor = await tx.tagihan.findUnique({
        where: { id: tagihanId },
        include: {
          pelanggan: { select: { id: true, nama: true, kode: true } },
          pembayarans: { where: { deletedAt: null } },
        },
      });
      if (!anchor) throw new Error("Tagihan tidak ditemukan");

      const pelangganId = anchor.pelangganId;
      const periodeAktif = anchor.periode;

      // 1) Simpan 1 baris pembayaran DI ANCHOR (keterangan murni dari user/admin)
      const pay = await tx.pembayaran.create({
        data: {
          tagihanId: anchor.id,
          jumlahBayar: Math.round(nominalBayar),
          tanggalBayar,
          buktiUrl,
          adminBayar: adminName,
          metode,
          keterangan: keterangan || null,
        },
      });

      // 2) Ambil SEMUA tagihan pelanggan urut lama→baru utk alokasi virtual
      const tags = await tx.tagihan.findMany({
        where: { pelangganId, deletedAt: null },
        orderBy: { periode: "asc" },
        include: { pembayarans: { where: { deletedAt: null } } },
      });

      // helper sisa (berdasarkan snapshot bulan itu)
      const calcSisa = (t: (typeof tags)[number]) =>
        (t.tagihanLalu || 0) +
        (t.totalTagihan || 0) +
        (t.denda || 0) -
        t.pembayarans.reduce((a, b) => a + b.jumlahBayar, 0);

      let dana = Math.round(nominalBayar);
      const clearedPeriods: string[] = [];

      for (const t of tags) {
        if (dana <= 0) break;
        const before = calcSisa(t); // posisi snapshot bulan tsb
        if (before <= 0) continue; // sudah lunas/kredit

        const potong = Math.min(before, dana);
        const after = before - potong; // hasil *virtual* sesudah alokasi
        dana -= potong;

        // IMMUTABLE: JANGAN update angka/sisa di bulan lama.
        // Hanya tandai closure + tanggal bayarnya (PAID_AT)
        if (before > 0 && after <= 0 && t.id !== anchor.id) {
          await tx.tagihan.update({
            where: { id: t.id },
            data: {
              info: appendInfo(t.info, [
                // manusia:
                `Dibayarkan di periode ${periodeAktif} pada ${paidAtHuman}`,
                // mesin:
                `[CLOSED_BY:${periodeAktif}]`,
                `[PAID_AT:${paidAtISO}]`,
              ]),
              // Status saja, jangan ubah sisaKurang
              statusBayar: "PAID",
              statusVerif: "VERIFIED",
            },
          });
          clearedPeriods.push(t.periode);
        }
      }

      // 3) Tag metadata di ANCHOR (bulan aktif)
      if (clearedPeriods.length) {
        await tx.tagihan.update({
          where: { id: anchor.id },
          data: {
            info: appendInfo(anchor.info, [
              `Termasuk pelunasan tagihan lalu: ${clearedPeriods.join(", ")}`,
              `[PREV_CLEARED:${clearedPeriods.join(", ")}]`,
            ]),
          },
        });
      }

      // === NEW: Tambahkan PAID_AT & human line di ANCHOR ===
      const anchorCurrent = await tx.tagihan.findUnique({
        where: { id: anchor.id },
        select: {
          info: true,
          tagihanLalu: true,
          totalTagihan: true,
          denda: true,
        },
      });

      // 4) Hitung posisi ANCHOR sekarang (boleh negatif → kredit)
      const anchorAfterAgg = await tx.pembayaran.aggregate({
        where: { tagihanId: anchor.id, deletedAt: null },
        _sum: { jumlahBayar: true },
      });
      const paidAnchor = anchorAfterAgg._sum.jumlahBayar || 0;
      const sisaAnchor =
        (anchor.tagihanLalu || 0) +
        (anchor.totalTagihan || 0) +
        (anchor.denda || 0) -
        paidAnchor;

      // susun info anchor (PAID_AT + optional CREDIT)
      let newAnchorInfo = appendInfo(anchorCurrent?.info, [
        `Dibayar tanggal ${paidAtHuman}`,
        `[PAID_AT:${paidAtISO}]`,
      ]);
      if (sisaAnchor < 0) {
        newAnchorInfo = appendInfo(newAnchorInfo, [
          `[CREDIT:${Math.abs(sisaAnchor)}]`,
        ]);
      }

      await tx.tagihan.update({
        where: { id: anchor.id },
        data: {
          sisaKurang: sisaAnchor,
          statusBayar:
            sisaAnchor <= 0 ? "PAID" : paidAnchor > 0 ? "PAID" : "UNPAID",
          info: newAnchorInfo,
        },
      });

      // 5) (opsional) bulan berikut SUDAH ada → sinkron tagihanLalu = sisaAnchor
      const periodeNext = nextMonth(periodeAktif);
      const nextT = await tx.tagihan.findUnique({
        where: { pelangganId_periode: { pelangganId, periode: periodeNext } },
        select: { id: true, totalTagihan: true },
      });
      if (nextT) {
        const paidNextAgg = await tx.pembayaran.aggregate({
          where: { tagihanId: nextT.id, deletedAt: null },
          _sum: { jumlahBayar: true },
        });
        const paidNext = paidNextAgg._sum.jumlahBayar || 0;
        const sisaNext = sisaAnchor + (nextT.totalTagihan || 0) - paidNext;

        await tx.tagihan.update({
          where: { id: nextT.id },
          data: {
            tagihanLalu: sisaAnchor, // bisa negatif (kredit)
            sisaKurang: sisaNext,
            statusBayar:
              sisaNext <= 0 ? "PAID" : paidNext > 0 ? "PARTIAL" : "UNPAID",
          },
        });
      }

      return pay;
    });

    // ==== kirim WA admin ====
    try {
      const origin = getAppOrigin(req);
      const tFull = await prisma.tagihan.findUnique({
        where: { id: String(pembayaran.tagihanId) },
        select: {
          id: true,
          periode: true,
          totalTagihan: true,
          pelanggan: { select: { nama: true, kode: true } },
        },
      });
      const setting = await prisma.setting.findUnique({
        where: { id: 1 },
        select: { namaPerusahaan: true },
      });
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN", isActive: true, phone: { not: null } },
        select: { id: true, phone: true, name: true },
      });

      for (const a of admins) {
        if (!a.phone) continue;

        const token = randomToken(32);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await prisma.magicLinkToken.create({
          data: {
            token,
            userId: a.id,
            tagihanId: String(pembayaran.tagihanId),
            purpose: "admin-review",
            expiresAt,
          },
        });

        const next = `/input-pembayaran/${encodeURIComponent(
          String(pembayaran.tagihanId)
        )}`;
        const link = origin
          ? `${origin}/api/auth/magic?token=${encodeURIComponent(
              token
            )}&next=${encodeURIComponent(next)}`
          : undefined;

        const text = adminWaText({
          perusahaan: setting?.namaPerusahaan,
          pelangganNama: tFull?.pelanggan.nama || "-",
          pelangganKode: tFull?.pelanggan.kode || undefined,
          periode: tFull?.periode || "",
          nominal: Math.round(pembayaran.jumlahBayar),
          metode: pembayaran.metode,
          tanggalBayar: pembayaran.tanggalBayar,
          tagihanId: String(pembayaran.tagihanId),
          link,
        });

        await sendWaAndLog(a.phone!, text);
      }
    } catch (err) {
      console.error("[notify-admin-wa]", err);
    }

    return NextResponse.json({ ok: true, pembayaran });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

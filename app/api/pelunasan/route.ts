// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { MetodeBayar } from "@prisma/client";
// import fs from "node:fs/promises";
// import path from "node:path";
// import { getAuthUserId } from "@/lib/auth";
// import { randomToken } from "@/lib/auth-utils";

// export const runtime = "nodejs";

// // helper: origin untuk bikin URL absolut
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

// // pesan WA untuk admin
// function adminWaText(p: {
//   perusahaan?: string | null;
//   pelangganNama: string;
//   pelangganKode?: string | null;
//   periode: string; // "YYYY-MM"
//   nominal: number;
//   metode: string; // TUNAI/TRANSFER/...
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

//   // ⬇️ ambil URL & API KEY dari env
//   const base = (process.env.WA_SENDER_URL || "").replace(/\/$/, "");
//   const apiKey = process.env.WA_SENDER_API_KEY || "";

//   // ⬇️ kalau belum diset, langsung log FAILED & keluar (fail-safe dev)
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

//   // log awal
//   const log = await prisma.waLog.create({
//     data: {
//       tujuan: to,
//       tipe: "APPROVAL PEMBAYARAN",
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

// async function saveUpload(file: File | null): Promise<string | undefined> {
//   if (!file || file.size === 0) return undefined;
//   const buf = Buffer.from(await file.arrayBuffer());
//   const ext = (file.name.split(".").pop() || "dat").toLowerCase();
//   const name = `bukti-${Date.now()}-${Math.random()
//     .toString(36)
//     .slice(2)}.${ext}`;
//   const dir = path.join(
//     process.cwd(),
//     "public",
//     "uploads",
//     "payment",
//     "bukti-bayar"
//   );
//   await fs.mkdir(dir, { recursive: true });
//   await fs.writeFile(path.join(dir, name), buf);
//   return `/uploads/payment/bukti-bayar/${name}`;
// }

// export async function POST(req: NextRequest) {
//   try {
//     const form = await req.formData();
//     const tagihanId = String(form.get("tagihanId") || "");
//     const nominalBayar = Number(form.get("nominalBayar") || 0);
//     const tanggalStr = String(form.get("tanggalBayar") || "");
//     const metodeRaw = String(form.get("metodeBayar") || "").toUpperCase();
//     const keterangan = String(form.get("keterangan") || "");
//     const file = form.get("buktiFile") as File | null;

//     if (!tagihanId || !nominalBayar || !metodeRaw || !file) {
//       return NextResponse.json(
//         { ok: false, message: "Data wajib belum lengkap" },
//         { status: 400 }
//       );
//     }

//     const allow = ["TUNAI", "TRANSFER", "EWALLET", "QRIS"] as const;
//     const metode: MetodeBayar = (allow as readonly string[]).includes(metodeRaw)
//       ? (metodeRaw as MetodeBayar)
//       : MetodeBayar.TUNAI;

//     const buktiUrl = await saveUpload(file);
//     const tanggalBayar = tanggalStr ? new Date(tanggalStr) : new Date();

//     // ambil setting utk perhitungan denda
//     // const setting = await prisma.setting.findUnique({
//     //   where: { id: 1 },
//     //   select: {
//     //     dendaTelatBulanSama: true,
//     //     dendaTelatBulanBerbeda: true,
//     //   },
//     // });
//     const t0 = await prisma.tagihan.findUnique({
//       where: { id: tagihanId },
//       select: {
//         id: true,
//         periode: true,
//         tglJatuhTempo: true,
//         denda: true,
//         totalTagihan: true, // tagihan bulan ini
//         tagihanLalu: true, // (+/-) carry-over
//         pelangganId: true,
//         pelanggan: { select: { nama: true, kode: true } },
//       },
//     });
//     if (!t0)
//       return NextResponse.json(
//         { ok: false, message: "Tagihan tidak ditemukan" },
//         { status: 404 }
//       );

//     // // hitung denda sesuai tanggal bayar
//     // let calculatedDenda = 0;
//     // if (t0.tglJatuhTempo && tanggalBayar > t0.tglJatuhTempo) {
//     //   const diffMs = +tanggalBayar - +t0.tglJatuhTempo;
//     //   const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
//     //   const diffMonths = Math.floor(diffDays / 30);
//     //   if (diffMonths === 0) calculatedDenda = setting?.dendaTelatBulanSama ?? 0;
//     //   else calculatedDenda = setting?.dendaTelatBulanBerbeda ?? 0;
//     // }

//     // (opsional) tulis nama admin jika bukan warga
//     let adminName: string | null = null;
//     try {
//       const uid = await getAuthUserId(req);
//       if (uid) {
//         const u = await prisma.user.findUnique({
//           where: { id: uid },
//           select: { name: true, role: true },
//         });
//         if (u && u.role !== "WARGA") adminName = u.name ?? null;
//       }
//     } catch {}

//     const pembayaran = await prisma.$transaction(async (tx) => {
//       // // 1) upsert denda ke Tagihan jika perlu (agar tidak mismatch)
//       // if ((t0.denda ?? 0) !== calculatedDenda) {
//       //   await tx.tagihan.update({
//       //     where: { id: tagihanId },
//       //     data: { denda: calculatedDenda },
//       //   });
//       // }

//       // 2) simpan pembayaran
//       const pay = await tx.pembayaran.create({
//         data: {
//           tagihanId,
//           jumlahBayar: Math.round(nominalBayar),
//           tanggalBayar,
//           buktiUrl: buktiUrl!, // required
//           adminBayar: adminName,
//           metode,
//           keterangan: keterangan || null,
//         },
//       });

//       // 3) hitung ulang status bayar
//       const agg = await tx.pembayaran.aggregate({
//         where: { tagihanId, deletedAt: null },
//         _sum: { jumlahBayar: true },
//       });
//       const t = await tx.tagihan.findUnique({
//         where: { id: tagihanId },
//         select: {
//           id: true,
//           pelangganId: true,
//           periode: true,
//           totalTagihan: true,
//           tagihanLalu: true,
//         },
//       });
//       // const t = await tx.tagihan.findUnique({
//       //   where: { id: tagihanId },
//       //   select: { totalTagihan: true, tagihanLalu: true },
//       //   // select: { totalTagihan: true, denda: true },
//       // });

//       // *** PERUBAHAN UTAMA ***
//       // Total Due = Tagihan Lalu (+/-) + Tagihan Bulan Ini
//       const harus = (t?.tagihanLalu ?? 0) + (t?.totalTagihan ?? 0);
//       const sudah = agg._sum.jumlahBayar ?? 0;
//       // const harus = (t?.totalTagihan ?? 0) + (t?.denda ?? 0);

//       await tx.tagihan.update({
//         where: { id: tagihanId },
//         data: { statusBayar: sudah >= harus ? "PAID" : "UNPAID" },
//       });

//       return pay;
//     });

//     // === Kirim WA ke ADMIN dgn magic link admin (7 hari) ===
//     try {
//       const origin = getAppOrigin(req);

//       // Ambil pelanggan & periode untuk pesan
//       const tFull = await prisma.tagihan.findUnique({
//         where: { id: tagihanId },
//         select: {
//           id: true,
//           periode: true,
//           totalTagihan: true,
//           pelanggan: { select: { nama: true, kode: true } },
//         },
//       });

//       // Ambil nama perusahaan (opsional)
//       const setting = await prisma.setting.findUnique({
//         where: { id: 1 },
//         select: { namaPerusahaan: true },
//       });

//       // Kirim ke semua admin yg punya nomor WA
//       const admins = await prisma.user.findMany({
//         where: { role: "ADMIN", isActive: true, phone: { not: null } },
//         select: { id: true, phone: true, name: true },
//       });

//       for (const a of admins) {
//         if (!a.phone) continue;

//         // Magic token untuk ADMIN, expired 7 hari, multi-use (jgn set usedAt)
//         const token = randomToken(32);
//         const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

//         await prisma.magicLinkToken.create({
//           data: {
//             token,
//             userId: a.id,
//             tagihanId, // biar bisa diarahkan tepat
//             purpose: "admin-review",
//             expiresAt,
//           },
//         });

//         // next redirect: langsung ke halaman list/verifikasi tagihan tertentu
//         const next = `/input-pembayaran/${encodeURIComponent(tagihanId)}`;
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
//           nominal: Math.round(nominalBayar),
//           metode: metode,
//           tanggalBayar,
//           tagihanId,
//           link,
//         });

//         await sendWaAndLog(a.phone, text);
//       }
//     } catch (err) {
//       console.error("[notify-admin-wa]", err);
//     }

//     /* ------------------- kembalikan snapshot cepat ke UI ------------------- */
//     const sum = await prisma.pembayaran.aggregate({
//       where: { tagihanId, deletedAt: null },
//       _sum: { jumlahBayar: true },
//     });
//     const tag = await prisma.tagihan.findUnique({
//       where: { id: tagihanId },
//       select: {
//         totalTagihan: true,
//         tagihanLalu: true,
//         statusBayar: true,
//         statusVerif: true,
//       },
//     });
//     const totalDue = (tag?.tagihanLalu ?? 0) + (tag?.totalTagihan ?? 0);
//     const dibayar = sum._sum.jumlahBayar ?? 0;

//     return NextResponse.json({
//       ok: true,
//       pembayaran,
//       snapshot: {
//         totalDue,
//         dibayar,
//         sisaKurang: totalDue - dibayar,
//         statusBayar: tag?.statusBayar,
//         statusVerif: tag?.statusVerif,
//       },
//     });
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
import fs from "node:fs/promises";
import path from "node:path";
import { getAuthUserId } from "@/lib/auth";
import { randomToken } from "@/lib/auth-utils";
import { nextMonth } from "@/lib/period";

export const runtime = "nodejs";

// ==== util origin ====
function getAppOrigin(req: NextRequest) {
  const h = req.headers;
  return (
    process.env.APP_ORIGIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    h.get("origin") ||
    `${h.get("x-forwarded-proto") || "http"}://${h.get("x-forwarded-host") || h.get("host") || ""}`
  )?.replace(/\/$/, "");
}

// ====== util kecil untuk WA (dipertahankan seperti versi kamu) ======
function formatRp(n: number) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}
function fmtTanggalID(d: Date | string) {
  const dd = typeof d === "string" ? new Date(d) : d;
  return dd.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
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
  const periodeLabel = new Date(p.periode + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  return [
    `*Notifikasi Pembayaran Masuk*${p.perusahaan ? `\n${p.perusahaan}` : ""}`,
    "",
    "----------------------------------",
    `• Pelanggan : ${p.pelangganNama}${p.pelangganKode ? ` (${p.pelangganKode})` : ""}`,
    `• Periode      : ${periodeLabel}`,
    `• Nominal     : ${formatRp(p.nominal)}`,
    `• Metode      : ${p.metode}`,
    `• Tanggal     : ${fmtTanggalID(p.tanggalBayar)}`,
    "----------------------------------",
    "",
    p.link ? `Tinjau & verifikasi:\n${p.link}` : undefined,
  ].filter(Boolean).join("\n");
}

async function sendWaAndLog(tujuanRaw: string, text: string) {
  const to = tujuanRaw.replace(/\D/g, "").replace(/^0/, "62");
  const base = (process.env.WA_SENDER_URL || "").replace(/\/$/, "");
  const apiKey = process.env.WA_SENDER_API_KEY || "";

  // kalau belum setting → catat FAILED tapi jangan gagalkan transaksi
  if (!base) {
    await prisma.waLog.create({
      data: { tujuan: to, tipe: "APPROVAL PEMBAYARAN", payload: JSON.stringify({ to, text }), status: "FAILED" },
    });
    return;
  }

  const url = `${base}/send`;
  const log = await prisma.waLog.create({
    data: { tujuan: to, tipe: "APPROVAL PEMBAYARAN", payload: JSON.stringify({ to, text }), status: "PENDING" },
  });

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 10_000);

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(apiKey ? { "x-api-key": apiKey } : {}) },
    body: JSON.stringify({ to, text }),
    signal: ac.signal,
  })
    .then((r) => prisma.waLog.update({ where: { id: log.id }, data: { status: r.ok ? "SENT" : "FAILED" } }))
    .catch(() => prisma.waLog.update({ where: { id: log.id }, data: { status: "FAILED" } }))
    .finally(() => clearTimeout(t));
}

async function saveUpload(file: File | null): Promise<string | undefined> {
  if (!file || file.size === 0) return undefined;
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "dat").toLowerCase();
  const name = `bukti-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "payment", "bukti-bayar");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), buf);
  return `/uploads/payment/bukti-bayar/${name}`;
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

    if (!tagihanId || !nominalBayar || !metodeRaw || !file) {
      return NextResponse.json({ ok: false, message: "Data wajib belum lengkap" }, { status: 400 });
    }

    const allow = ["TUNAI", "TRANSFER", "EWALLET", "QRIS"] as const;
    const metode: MetodeBayar = (allow as readonly string[]).includes(metodeRaw)
      ? (metodeRaw as MetodeBayar)
      : MetodeBayar.TUNAI;

    const buktiUrl = await saveUpload(file);
    const tanggalBayar = tanggalStr ? new Date(tanggalStr) : new Date();

    let adminName: string | null = null;
    try {
      const uid = await getAuthUserId(req);
      if (uid) {
        const u = await prisma.user.findUnique({ where: { id: uid }, select: { name: true, role: true } });
        if (u && u.role !== "WARGA") adminName = u.name ?? null;
      }
    } catch {}

    // ========== TRANSAKSI ==========
    const pembayaran = await prisma.$transaction(async (tx) => {
      // 1) simpan pembayaran
      const pay = await tx.pembayaran.create({
        data: {
          tagihanId,
          jumlahBayar: Math.round(nominalBayar),
          tanggalBayar,
          buktiUrl: buktiUrl!,
          adminBayar: adminName,
          metode,
          keterangan: keterangan || null,
        },
      });

      // 2) hitung ulang sisaKurang tagihan ini
      const agg = await tx.pembayaran.aggregate({
        where: { tagihanId, deletedAt: null },
        _sum: { jumlahBayar: true },
      });

      const t = await tx.tagihan.findUnique({
        where: { id: tagihanId },
        select: { id: true, pelangganId: true, periode: true, totalTagihan: true, tagihanLalu: true },
      });
      if (!t) throw new Error("Tagihan tidak ditemukan (recalc)");

      const totalBulanIni = t.totalTagihan ?? 0;
      const carry = t.tagihanLalu ?? 0;    // denda dimatikan
      const totalDue = totalBulanIni + carry;
      const totalPaid = agg._sum.jumlahBayar ?? 0;
      const sisaKurang = totalDue - totalPaid;

      await tx.tagihan.update({
        where: { id: t.id },
        data: { sisaKurang, statusBayar: sisaKurang <= 0 ? "PAID" : "UNPAID" },
      });

      // 3) sinkronkan ke BULAN BERIKUT (jika sdh ada tagihannya)
      const periodeNext = nextMonth(t.periode);
      const nextT = await tx.tagihan.findUnique({
        where: { pelangganId_periode: { pelangganId: t.pelangganId, periode: periodeNext } },
        select: { id: true, totalTagihan: true },
      });

      if (nextT) {
        // set carry bulan berikut = sisa bulan ini
        await tx.tagihan.update({ where: { id: nextT.id }, data: { tagihanLalu: sisaKurang } });

        // hitung saldo bulan berikut (kalau sudah ada pembayaran)
        const aggNext = await tx.pembayaran.aggregate({
          where: { tagihanId: nextT.id, deletedAt: null },
          _sum: { jumlahBayar: true },
        });
        const totalDueNext = (nextT.totalTagihan ?? 0) + sisaKurang;
        const sisaNext = totalDueNext - (aggNext._sum.jumlahBayar ?? 0);

        await tx.tagihan.update({
          where: { id: nextT.id },
          data: { sisaKurang: sisaNext, statusBayar: sisaNext <= 0 ? "PAID" : "UNPAID" },
        });
      }

      return pay;
    });

    // ==== kirim WA admin (sama persis seperti punyamu) ====
    try {
      const origin = getAppOrigin(req);
      const tFull = await prisma.tagihan.findUnique({
        where: { id: String(pembayaran.tagihanId) },
        select: { id: true, periode: true, totalTagihan: true, pelanggan: { select: { nama: true, kode: true } } },
      });
      const setting = await prisma.setting.findUnique({ where: { id: 1 }, select: { namaPerusahaan: true } });
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN", isActive: true, phone: { not: null } },
        select: { id: true, phone: true, name: true },
      });

      for (const a of admins) {
        if (!a.phone) continue;

        const token = randomToken(32);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await prisma.magicLinkToken.create({
          data: { token, userId: a.id, tagihanId: String(pembayaran.tagihanId), purpose: "admin-review", expiresAt },
        });

        const next = `/input-pembayaran/${encodeURIComponent(String(pembayaran.tagihanId))}`;
        const link = origin ? `${origin}/api/auth/magic?token=${encodeURIComponent(token)}&next=${encodeURIComponent(next)}` : undefined;

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

        await sendWaAndLog(a.phone, text);
      }
    } catch (err) {
      console.error("[notify-admin-wa]", err);
    }

    return NextResponse.json({ ok: true, pembayaran });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "Server error" }, { status: 500 });
  }
}

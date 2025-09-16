// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { getAuthUserId } from "@/lib/auth";
// import puppeteer from "puppeteer";
// import path from "node:path";
// import fs from "node:fs/promises";

// export const runtime = "nodejs";

// /** ===== Helpers origin domain ===== */
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
// function tanggalID(d?: Date | null) {
//   if (!d) return "-";
//   return d.toLocaleDateString("id-ID", {
//     weekday: "long",
//     day: "2-digit",
//     month: "long",
//     year: "numeric",
//   });
// }
// function periodLong(ym: string) {
//   const d = new Date(`${ym}-01T00:00:00`);
//   return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
// }

// /** WhatsApp message (verifikasi pembayaran) */
// function waTextPembayaranVerified(p: {
//   setting?: {
//     namaPerusahaan?: string | null;
//     telepon?: string | null;
//     email?: string | null;
//     alamat?: string | null;
//   };
//   nama?: string | null;
//   kode?: string | null;
//   periode: string; // YYYY-MM
//   tanggalBayar: Date;
//   metode: string;
//   jumlahBayar: number;
//   totalTagihan: number;
//   pdfUrl?: string;
// }) {
//   // const perusahaan = p.setting?.namaPerusahaan || "Tirtabening";
//   const lines: string[] = [];

//   lines.push(
//     `Halo *${p.nama || "Pelanggan"}*,`,
//     `Pembayaran tagihan air Anda telah *TERVERIFIKASI*.`,
//     lines.join("\n")
//   );

//   lines.push(
//     "*Rincian Pembayaran*",
//     `• Nama Pelanggan : ${p.nama || "-"}`,
//     `• Kode Pelanggan : ${p.kode || "-"}`,
//     `• Periode : ${periodLong(p.periode)}`,
//     `• Tanggal Bayar : ${tanggalID(p.tanggalBayar)}`,
//     `• Metode : ${p.metode}`,
//     `• Total Tagihan : ${formatRp(p.totalTagihan)}`,
//     `• Jumlah Dibayar : *${formatRp(p.jumlahBayar)}*`
//   );

//   const kontak: string[] = [];
//   if (p.setting?.telepon) kontak.push(`Telepon: ${p.setting.telepon}`);
//   if (p.setting?.email) kontak.push(`Email: ${p.setting.email}`);
//   if (kontak.length) lines.push("", "*Kontak*", kontak.join("\n"));

//   lines.push("", "Terima kasih 🙏");
//   return lines.map((s) => s.replace(/[ \t]+$/g, "")).join("\n");
// }

// /** WA send helpers */
// async function sendWaAndLog(tujuanRaw: string, text: string) {
//   const to = tujuanRaw.replace(/\D/g, "").replace(/^0/, "62");
//   const base = (process.env.WA_SENDER_URL || "").replace(/\/$/, "");
//   const apiKey = process.env.WA_SENDER_API_KEY || "";

//   if (!base) {
//     await prisma.waLog.create({
//       data: {
//         tujuan: to,
//         tipe: "PEMBAYARAN APPROVED",
//         payload: JSON.stringify({ to, text, err: "WA_SENDER_URL empty" }),
//         status: "FAILED",
//       },
//     });
//     return;
//   }

//   const log = await prisma.waLog.create({
//     data: {
//       tujuan: to,
//       tipe: "PEMBAYARAN APPROVED",
//       payload: JSON.stringify({ to, text }),
//       status: "PENDING",
//     },
//   });

//   const ac = new AbortController();
//   const t = setTimeout(() => ac.abort(), 10_000);

//   fetch(`${base}/send`, {
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

// async function sendWaPdfAndLog(
//   tujuanRaw: string,
//   pdfUrl: string,
//   filename: string,
//   caption?: string
// ) {
//   const to = tujuanRaw.replace(/\D/g, "").replace(/^0/, "62");
//   const base = (process.env.WA_SENDER_URL || "").replace(/\/$/, "");
//   const apiKey = process.env.WA_SENDER_API_KEY || "";

//   if (!base) {
//     await prisma.waLog.create({
//       data: {
//         tujuan: to,
//         tipe: "PEMBAYARAN_PDF APPROVED",
//         payload: JSON.stringify({
//           to,
//           pdfUrl,
//           filename,
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
//       tipe: "PEMBAYARAN_PDF APPROVED",
//       payload: JSON.stringify({ to, pdfUrl, filename, caption }),
//       status: "PENDING",
//     },
//   });

//   try {
//     const r = await fetch(`${base}/send-document`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         ...(apiKey ? { "x-api-key": apiKey } : {}),
//       },
//       body: JSON.stringify({
//         to,
//         url: pdfUrl,
//         filename,
//         caption,
//         mimeType: "application/pdf",
//       }),
//     });

//     await prisma.waLog.update({
//       where: { id: log.id },
//       data: {
//         status: r.ok ? "SENT" : "FAILED",
//         payload: JSON.stringify({
//           to,
//           pdfUrl,
//           filename,
//           http: { ok: r.ok, status: r.status },
//         }),
//       },
//     });
//   } catch (e: any) {
//     await prisma.waLog.update({
//       where: { id: log.id },
//       data: {
//         status: "FAILED",
//         payload: JSON.stringify({
//           to,
//           pdfUrl,
//           filename,
//           err: String(e?.message || e),
//         }),
//       },
//     });
//   }
// }

// // PATCH /api/tagihan/:id/verify
// // body bisa { verified: boolean } ATAU { action: "VERIFY" | "UNVERIFY" }
// export async function PATCH(
//   req: Request,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const id = params.id;
//     const body = (await req.json()) ?? {};
//     const to =
//       typeof body.verified === "boolean"
//         ? body.verified
//           ? "VERIFIED"
//           : "UNVERIFIED"
//         : body.action === "UNVERIFY"
//         ? "UNVERIFIED"
//         : "VERIFIED";

//     // (opsional) hanya non-WARGA yang boleh verifikasi
//     try {
//       const uid = await getAuthUserId(req as any);
//       if (uid) {
//         const u = await prisma.user.findUnique({
//           where: { id: uid },
//           select: { role: true },
//         });
//         if (!u || u.role === "WARGA") {
//           return NextResponse.json(
//             { ok: false, message: "Tidak berizin" },
//             { status: 403 }
//           );
//         }
//       }
//     } catch {}

//     // update statusVerif sesuai permintaan
//     const t = await prisma.tagihan.update({
//       where: { id },
//       data: { statusVerif: to }, // VERIFIED / UNVERIFIED
//       select: {
//         id: true,
//         periode: true,
//         totalTagihan: true,
//         pelangganId: true,
//         statusVerif: true,
//       },
//     });

//     // kalau bukan VERIFIED, cukup selesai di sini
//     if (to !== "VERIFIED") {
//       return NextResponse.json({ ok: true, tagihan: t });
//     }

//     // pastikan ada pembayaran (ambil terbaru) & set statusBayar TANPA denda
//     const pembayaran = await prisma.pembayaran.findFirst({
//       where: { tagihanId: id, deletedAt: null },
//       orderBy: { tanggalBayar: "desc" },
//     });
//     if (!pembayaran) {
//       return NextResponse.json(
//         { ok: false, message: "Belum ada pembayaran untuk diverifikasi" },
//         { status: 400 }
//       );
//     }
//     const sum = await prisma.pembayaran.aggregate({
//       where: { tagihanId: id, deletedAt: null },
//       _sum: { jumlahBayar: true },
//     });

//     const sudah = sum._sum.jumlahBayar ?? 0;
//     const statusBayar = sudah >= (t.totalTagihan || 0) ? "PAID" : "UNPAID";
//     await prisma.tagihan.update({ where: { id }, data: { statusBayar } });

//     // ambil data pelanggan + setting untuk WA
//     const [pelanggan, setting] = await Promise.all([
//       prisma.pelanggan.findUnique({
//         where: { id: t.pelangganId },
//         select: { nama: true, kode: true, wa: true },
//       }),
//       prisma.setting.findUnique({ where: { id: 1 } }),
//     ]);

//     // render PDF kwitansi via template /print/kwitansi/[tagihanId]?payId=...
//     const origin = getAppOrigin(req);
//     const tplUrl = `${origin}/print/kwitansi/${id}?payId=${pembayaran.id}`;
//     const outDir = path.join(
//       process.cwd(),
//       "public",
//       "uploads",
//       "payment",
//       "kwitansi"
//     );
//     await fs.mkdir(outDir, { recursive: true });
//     const fname = `kwitansi-${id}-${pembayaran.id}.pdf`;
//     const fpath = path.join(outDir, fname);
//     const publicUrl = `/uploads/payment/kwitansi/${fname}`;

//     const browser = await puppeteer.launch({
//       headless: "new",
//       args: ["--no-sandbox", "--disable-setuid-sandbox"],
//     });
//     try {
//       const page = await browser.newPage();
//       await page.setViewport({ width: 380, height: 800, deviceScaleFactor: 2 });
//       await page.goto(tplUrl, { waitUntil: "networkidle0" });
//       await page.pdf({
//         path: fpath,
//         printBackground: true,
//         width: "95mm",
//         height: "170mm",
//         margin: { top: "0", right: "0", bottom: "0", left: "0" },
//       });
//     } finally {
//       await browser.close().catch(() => {});
//     }

//     // kirim WA (opsional)
//     if (body.sendWa && pelanggan?.wa) {
//       const text = waTextPembayaranVerified({
//         setting: {
//           namaPerusahaan: setting?.namaPerusahaan,
//           telepon: setting?.telepon,
//           email: setting?.email,
//           alamat: setting?.alamat,
//         },
//         nama: pelanggan?.nama,
//         kode: pelanggan?.kode,
//         periode: t.periode,
//         tanggalBayar: pembayaran.tanggalBayar,
//         metode: pembayaran.metode,
//         jumlahBayar: pembayaran.jumlahBayar,
//         totalTagihan: t.totalTagihan || 0,
//         pdfUrl: `${origin}${publicUrl}`,
//       });

//       // jalankan di background (tanpa await)
//       (async () => {
//         try {
//           await sendWaAndLog(pelanggan.wa!, text);
//         } catch {}
//         try {
//           const caption = `Kwitansi Pembayaran • ${periodLong(t.periode)} • ${
//             pelanggan?.nama || ""
//           }`;
//           await sendWaPdfAndLog(
//             pelanggan.wa!,
//             `${origin}${publicUrl}`,
//             fname,
//             caption
//           );
//         } catch {}
//       })();
//     }

//     return NextResponse.json({
//       ok: true,
//       tagihan: { ...t, statusBayar },
//       pdfUrl: publicUrl,
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
import { getAuthUserId } from "@/lib/auth";
import { renderKwitansiToJPG } from "@/lib/render-kwitansi";

export const runtime = "nodejs";

function getAppOrigin(req: NextRequest) {
  const h = req.headers;
  return (
    process.env.APP_ORIGIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    h.get("origin") ||
    `${h.get("x-forwarded-proto") || "http"}://${
      h.get("x-forwarded-host") || h.get("host") || ""
    }`
  )?.replace(/\/$/, "");
}

function formatRp(n: number) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}
function tanggalID(d?: Date | null) {
  if (!d) return "-";
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
function periodLong(ym: string) {
  const d = new Date(`${ym}-01T00:00:00`);
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

/** WhatsApp message (verifikasi pembayaran) */
function waTextPembayaranVerified(p: {
  setting?: {
    namaPerusahaan?: string | null;
    telepon?: string | null;
    email?: string | null;
    alamat?: string | null;
  };
  nama?: string | null;
  kode?: string | null;
  periode: string; // YYYY-MM
  tanggalBayar: Date;
  metode: string;
  jumlahBayar: number;
  totalTagihan: number;
}) {
  const lines: string[] = [];
  lines.push(
    `Halo *${p.nama || "Pelanggan"}*,`,
    `Pembayaran tagihan air Anda telah *TERVERIFIKASI*.`
  );

  lines.push(
    "",
    "*Rincian Pembayaran*",
    `• Nama Pelanggan : ${p.nama || "-"}`,
    `• Kode Pelanggan : ${p.kode || "-"}`,
    `• Periode : ${periodLong(p.periode)}`,
    `• Tanggal Bayar : ${tanggalID(p.tanggalBayar)}`,
    `• Metode : ${p.metode}`,
    `• Total Tagihan : ${formatRp(p.totalTagihan)}`,
    `• Jumlah Dibayar : *${formatRp(p.jumlahBayar)}*`
  );

  const kontak: string[] = [];
  if (p.setting?.telepon) kontak.push(`Telepon: ${p.setting.telepon}`);
  if (p.setting?.email) kontak.push(`Email: ${p.setting.email}`);
  if (kontak.length) lines.push("", "*Kontak*", kontak.join("\n"));

  lines.push("", "Terima kasih 🙏");
  return lines.map((s) => s.replace(/[ \t]+$/g, "")).join("\n");
}

/** WA send helpers (TEXT saja) */
async function sendWaAndLog(tujuanRaw: string, text: string) {
  const to = tujuanRaw.replace(/\D/g, "").replace(/^0/, "62");
  const base = (process.env.WA_SENDER_URL || "").replace(/\/$/, "");
  const apiKey = process.env.WA_SENDER_API_KEY || "";

  if (!base) {
    await prisma.waLog.create({
      data: {
        tujuan: to,
        tipe: "PEMBAYARAN APPROVED",
        payload: JSON.stringify({ to, text, err: "WA_SENDER_URL empty" }),
        status: "FAILED",
      },
    });
    return;
  }

  const log = await prisma.waLog.create({
    data: {
      tujuan: to,
      tipe: "PEMBAYARAN APPROVED",
      payload: JSON.stringify({ to, text }),
      status: "PENDING",
    },
  });

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 10_000);

  fetch(`${base}/send`, {
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

/** [BARU] WA send helper untuk IMAGE */
async function sendWaImageAndLog(
  tujuanRaw: string,
  imageUrl: string,
  filename: string,
  caption?: string
) {
  const to = tujuanRaw.replace(/\D/g, "").replace(/^0/, "62");
  const base = (process.env.WA_SENDER_URL || "").replace(/\/$/, "");
  const apiKey = process.env.WA_SENDER_API_KEY || "";

  if (!base) {
    await prisma.waLog.create({
      data: {
        tujuan: to,
        tipe: "PEMBAYARAN_IMG APPROVED",
        payload: JSON.stringify({
          to,
          imageUrl,
          filename,
          caption,
          err: "WA_SENDER_URL empty",
        }),
        status: "FAILED",
      },
    });
    return;
  }

  const log = await prisma.waLog.create({
    data: {
      tujuan: to,
      tipe: "PEMBAYARAN_IMG APPROVED",
      payload: JSON.stringify({ to, imageUrl, filename, caption }),
      status: "PENDING",
    },
  });

  try {
    const r = await fetch(`${base}/send-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      },
      body: JSON.stringify({
        to,
        url: imageUrl,
        filename,
        caption,
        mimeType: "image/jpeg",
      }),
    });

    await prisma.waLog.update({
      where: { id: log.id },
      data: {
        status: r.ok ? "SENT" : "FAILED",
        payload: JSON.stringify({
          to,
          imageUrl,
          filename,
          http: { ok: r.ok, status: r.status },
        }),
      },
    });
  } catch (e: any) {
    await prisma.waLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        payload: JSON.stringify({
          to,
          imageUrl,
          filename,
          err: String(e?.message || e),
        }),
      },
    });
  }
}

// PATCH /api/tagihan/:id/verify
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = (await req.json()) ?? {};
    const to =
      typeof body.verified === "boolean"
        ? body.verified
          ? "VERIFIED"
          : "UNVERIFIED"
        : body.action === "UNVERIFY"
        ? "UNVERIFIED"
        : "VERIFIED";

    // otorisasi ringkas
    try {
      const uid = await getAuthUserId(req as any);
      if (uid) {
        const u = await prisma.user.findUnique({
          where: { id: uid },
          select: { role: true },
        });
        if (!u || u.role === "WARGA")
          return NextResponse.json(
            { ok: false, message: "Tidak berizin" },
            { status: 403 }
          );
      }
    } catch {}

    // update status verif
    const t = await prisma.tagihan.update({
      where: { id },
      data: { statusVerif: to },
      select: {
        id: true,
        periode: true,
        totalTagihan: true,
        pelangganId: true,
        statusVerif: true,
      },
    });

    if (to !== "VERIFIED") {
      return NextResponse.json({ ok: true, tagihan: t });
    }

    // ambil pembayaran terbaru & set status bayar TANPA denda
    const pembayaran = await prisma.pembayaran.findFirst({
      where: { tagihanId: id, deletedAt: null },
      orderBy: { tanggalBayar: "desc" },
    });
    if (!pembayaran)
      return NextResponse.json(
        { ok: false, message: "Belum ada pembayaran untuk diverifikasi" },
        { status: 400 }
      );

    const sum = await prisma.pembayaran.aggregate({
      where: { tagihanId: id, deletedAt: null },
      _sum: { jumlahBayar: true },
    });
    const sudah = sum._sum.jumlahBayar ?? 0;
    const statusBayar = sudah >= (t.totalTagihan || 0) ? "PAID" : "UNPAID";
    await prisma.tagihan.update({ where: { id }, data: { statusBayar } });

    // ambil pelanggan + setting
    const [pelanggan, setting] = await Promise.all([
      prisma.pelanggan.findUnique({
        where: { id: t.pelangganId },
        select: { nama: true, kode: true, wa: true },
      }),
      prisma.setting.findUnique({ where: { id: 1 } }),
    ]);

    // render halaman kwitansi → SIMPAN JPG SAJA
    const origin = getAppOrigin(req as any);

    // balas cepat ke frontend
    const responseBody = {
      ok: true,
      tagihan: { ...t, statusBayar },
    };
    const res = NextResponse.json(responseBody);

    // === LANJUTKAN DI BACKGROUND TANPA NUNGGU ===
    setImmediate(async () => {
      try {
        // 1) RENDER JPG (pindahkan kode screenshot ke sini)
        const jpgUrl = await renderKwitansiToJPG({
          tplUrl: `${origin}/print/kwitansi/${id}?payId=${pembayaran.id}`,
          outName: `kwitansi-${id}-${pembayaran.id}.jpg`,
        });

        if (body.sendWa && pelanggan?.wa) {
          // 2) KIRIM TEKS
          try {
            const text = waTextPembayaranVerified({
              setting: {
                namaPerusahaan: setting?.namaPerusahaan,
                telepon: setting?.telepon,
                email: setting?.email,
                alamat: setting?.alamat,
              },
              nama: pelanggan?.nama,
              kode: pelanggan?.kode,
              periode: t.periode,
              tanggalBayar: pembayaran.tanggalBayar,
              metode: pembayaran.metode,
              jumlahBayar: pembayaran.jumlahBayar,
              totalTagihan: t.totalTagihan || 0,
            });
            await sendWaAndLog(pelanggan.wa!, text);
          } catch {}

          // 3) KIRIM GAMBAR
          try {
            const caption = `Kwitansi Pembayaran Periode${periodLong(t.periode)} - ${
              pelanggan?.nama || ""
            }`;
            await sendWaImageAndLog(
              pelanggan.wa!,
              `${origin}${jpgUrl}`,
              `kwitansi-${id}-${pembayaran.id}.jpg`,
              caption
            );
          } catch {}
        }
      } catch (e) {
        // optional: tulis log error render/kirim
        console.error("[bg-render-wa] error:", e);
      }
    });

    return res; // <- response TIDAK menunggu render & kirim
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

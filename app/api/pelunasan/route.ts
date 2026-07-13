import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MetodeBayar } from "@prisma/client";
import { getAuthUserId } from "@/lib/auth";
import { randomToken } from "@/lib/auth-utils";
import { rebuildPaymentLedger } from "@/lib/payment-ledger";
import { saveUploadFile } from "@/lib/uploads";

// === NEW: kompresi & util
import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type"; // ⬅️ benar, bukan fromBuffer
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

/* ===================== KOMPresi Helpers ===================== */

async function compressImageToTargetKB(
  input: Buffer,
  targetKB = 200,
  options?: { maxWidth?: number; minWidth?: number; format?: "webp" | "avif" }
) {
  const targetBytes = targetKB * 1024;
  let width = options?.maxWidth ?? 1600;
  const minWidth = options?.minWidth ?? 600;
  let quality = 80;
  const minQuality = 40;
  const format = options?.format ?? "webp";

  let out = await sharp(input, { failOn: "none" })
    .rotate()
    .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
    [format]({ quality })
    .toBuffer();

  let iter = 0;
  while (out.byteLength > targetBytes && iter < 12) {
    iter++;
    if (out.byteLength > targetBytes * 1.6 && width > minWidth) {
      width = Math.max(minWidth, Math.floor(width * 0.85));
    } else if (quality > minQuality) {
      quality = Math.max(minQuality, quality - 8);
    } else if (width > minWidth) {
      width = Math.max(minWidth, Math.floor(width * 0.9));
    } else {
      break;
    }

    out = await sharp(input, { failOn: "none" })
      .rotate()
      .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
      [format]({ quality })
      .toBuffer();
  }

  const mime = format === "webp" ? "image/webp" : "image/avif";
  const ext = format;
  return { buffer: out, mime, ext };
}

async function compressPdfWithGhostscriptToTargetKB(
  input: Buffer,
  targetKB = 200
) {
  const targetBytes = targetKB * 1024;
  const id = randomUUID();
  const tmpIn = path.join(tmpdir(), `pdf-in-${id}.pdf`);
  const tmpOut = path.join(tmpdir(), `pdf-out-${id}.pdf`);

  await fs.writeFile(tmpIn, input);

  const presets = ["/ebook", "/screen"];
  let outBuf: Buffer | null = null;

  for (const preset of presets) {
    await new Promise<void>((resolve, reject) => {
      const gs = spawn("gs", [
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        `-dPDFSETTINGS=${preset}`,
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        `-sOutputFile=${tmpOut}`,
        tmpIn,
      ]);
      gs.on("error", reject);
      gs.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error(`gs exit ${code}`))
      );
    });

    const buf = await fs.readFile(tmpOut);
    outBuf = buf;
    if (buf.byteLength <= targetBytes) break;
  }

  fs.unlink(tmpIn).catch(() => {});
  fs.unlink(tmpOut).catch(() => {});

  return outBuf!;
}

async function makeCompressedFileMax200KB(original: File, targetKB = 200) {
  const arrayBuf = await original.arrayBuffer();
  const input = Buffer.from(arrayBuf);
  const t = await fileTypeFromBuffer(input);
  const mime = t?.mime || original.type || "application/octet-stream";
  const ext = t?.ext || "";

  if (/^image\//.test(mime)) {
    const {
      buffer,
      mime: outMime,
      ext: outExt,
    } = await compressImageToTargetKB(input, targetKB, {
      maxWidth: 1600,
      minWidth: 600,
      format: "webp",
    });
    const u8 = new Uint8Array(buffer); // ⬅️ penting untuk File
    return new File([u8], `${randomUUID()}.${outExt}`, { type: outMime });
  }

  const isPdf = mime === "application/pdf" || ext === "pdf";
  if (isPdf) {
    const enableGs = !!process.env.ENABLE_GS;
    if (!enableGs) {
      if (input.byteLength <= targetKB * 1024) return original;
      throw new Error(
        "PDF > 200KB membutuhkan Ghostscript di server (set ENABLE_GS=1)."
      );
    }
    const compressed = await compressPdfWithGhostscriptToTargetKB(
      input,
      targetKB
    );
    const u8 = new Uint8Array(compressed);
    return new File([u8], `${randomUUID()}.pdf`, { type: "application/pdf" });
  }

  throw new Error("Format file tidak didukung. Unggah gambar atau PDF.");
}

/* ===================== Util Existing ===================== */

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
  periode: string;
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

function composeWithNowTime(dateStr: string) {
  const base = new Date(dateStr);
  if (isNaN(base.getTime())) return new Date();
  const now = new Date();
  base.setHours(
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds()
  );
  return base;
}

function appendInfo(
  info: string | null | undefined,
  lines: (string | undefined | null)[]
) {
  const add = lines.filter(Boolean).join("\n");
  return info ? `${info}\n${add}` : add;
}

/* ===================== HANDLER ===================== */

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const tagihanId = String(form.get("tagihanId") || "");
    const nominalBayar = Number(form.get("nominalBayar") || 0);
    const tanggalStr = String(form.get("tanggalBayar") || "");
    const metodeRaw = String(form.get("metodeBayar") || "").toUpperCase();
    const keterangan = String(form.get("keterangan") || "");
    const file = form.get("buktiFile") as File | null;

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

    if (userRole === "WARGA" && metode === MetodeBayar.TUNAI) {
      return NextResponse.json(
        {
          ok: false,
          message: "WARGA tidak diperbolehkan memilih metode TUNAI.",
        },
        { status: 400 }
      );
    }

    if (!tagihanId || !nominalBayar || !metodeRaw) {
      return NextResponse.json(
        { ok: false, message: "Data wajib belum lengkap" },
        { status: 400 }
      );
    }

    const needsProof = !(metode === MetodeBayar.TUNAI && userRole !== "WARGA");
    if (needsProof && !file) {
      return NextResponse.json(
        { ok: false, message: "Bukti pembayaran wajib diunggah" },
        { status: 400 }
      );
    }

    // === SIMPAN BUKTI DENGAN KOMPRESI ≤ 200 KB ===
    let buktiUrl: string | null = null;
    if (metode === MetodeBayar.TUNAI && userRole !== "WARGA") {
      buktiUrl = null;
    } else if (file) {
      const compressed = await makeCompressedFileMax200KB(file, 200);
      const saved = await saveUploadFile(compressed, "payment/bukti-bayar");
      buktiUrl = saved.publicUrl;
    }

    const tanggalBayar = tanggalStr
      ? /\d{2}:\d{2}/.test(tanggalStr)
        ? new Date(tanggalStr)
        : composeWithNowTime(tanggalStr)
      : new Date();

    const paidAtISO = new Date(tanggalBayar).toISOString();
    const paidAtHuman = fmtTanggalID(tanggalBayar);

    const pembayaran = await prisma.$transaction(async (tx) => {
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

      // ambil semua tagihan pelanggan BEFORE membuat pembayaran baru (urutan kronologis)
      const tags = await tx.tagihan.findMany({
        where: { pelangganId, deletedAt: null },
        orderBy: { periode: "asc" },
        include: { pembayarans: { where: { deletedAt: null } } },
      });

      // 1) ALLOCATE only to principal (totalTagihan) — jangan alokasikan langsung ke tagihanLalu/denda
      let dana = Math.round(nominalBayar);
      const allocations: {
        tagihanId: string;
        periode: string;
        potong: number;
        beforePrincipal: number;
        afterPrincipal: number;
      }[] = [];

      for (const t of tags) {
        if (dana <= 0) break;

        // existing payments already allocated to this tagihan (detailPembayaran)
        const existingAgg = await tx.detailPembayaran.aggregate({
          where: { tagihanId: t.id },
          _sum: { jumlahTerbayar: true },
        });
        const existingPaid = existingAgg._sum.jumlahTerbayar || 0;

        // remaining principal to be paid for this period
        const remainingPrincipal = Math.max(
          0,
          (t.totalTagihan || 0) - existingPaid
        );
        if (remainingPrincipal <= 0) continue;

        const potong = Math.min(remainingPrincipal, dana);
        const afterPrincipal = remainingPrincipal - potong;
        dana -= potong;

        allocations.push({
          tagihanId: t.id,
          periode: t.periode,
          potong,
          beforePrincipal: remainingPrincipal,
          afterPrincipal,
        });
      }

      // 2) create main pembayaran record
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

      // 3) apply allocations: create detailPembayaran per period (only potong)
      const clearedPeriods: string[] = [];
      for (const alloc of allocations) {
        const t = tags.find((x) => x.id === alloc.tagihanId)!;

        // create detailPembayaran only for the allocated principal
        await tx.detailPembayaran.create({
          data: {
            pembayaranId: pay.id,
            tagihanId: t.id,
            pelangganId,
            periode: t.periode,
            jumlahTerbayar: alloc.potong,
          },
        });

        // recalc sudahBayar from detailPembayaran (source of truth)
        const agg = await tx.detailPembayaran.aggregate({
          where: { tagihanId: t.id },
          _sum: { jumlahTerbayar: true },
        });
        const sumTerbayar = agg._sum.jumlahTerbayar || 0;

        // belumBayarPrincipal = remaining principal only (for per-period display)
        const newBelumBayarPrincipal = Math.max(
          0,
          (t.totalTagihan || 0) - sumTerbayar
        );

        // update partial fields (do NOT finalize tagihanLalu/sisaKurang yet)
        await tx.tagihan.update({
          where: { id: t.id },
          data: {
            sudahBayar: sumTerbayar,
            belumBayar: newBelumBayarPrincipal,
            // leave tagihanLalu & sisaKurang to be recalculated in next pass
            statusBayar: newBelumBayarPrincipal <= 0 ? "PAID" : "UNPAID",
            info: appendInfo(t.info, [
              `Dibayar tanggal ${paidAtHuman}`,
              `[PAID_AT:${paidAtISO}]`,
            ]),
          },
        });

        if (alloc.beforePrincipal > 0 && alloc.afterPrincipal <= 0) {
          await tx.tagihan.update({
            where: { id: t.id },
            data: {
              info: appendInfo(t.info, [
                `Dibayarkan di periode ${periodeAktif} pada ${paidAtHuman}`,
                `[CLOSED_BY:${periodeAktif}]`,
                `[PAID_AT:${paidAtISO}]`,
              ]),
              // statusVerif: "VERIFIED",
            },
          });
          clearedPeriods.push(t.periode);
        }
      }

      await rebuildPaymentLedger(tx, {
        pelangganId,
        fromPeriode: anchor.periode,
      });

      // 6) append cleared info to anchor if any
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

      return pay;
    });

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
        const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
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

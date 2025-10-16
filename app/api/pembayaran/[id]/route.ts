// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { MetodeBayar, Prisma } from "@prisma/client";
// import { saveUploadFile } from "@/lib/uploads";
// import { nextMonth } from "@/lib/period";
// import { getAuthUserId } from "@/lib/auth";

// export const runtime = "nodejs";

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

// function stripManagedTags(info: string | null | undefined): string {
//   if (!info) return "";
//   return info
//     .split("\n")
//     .filter((line) => !/\[(PREV_CLEARED|CLOSED_BY|CREDIT|PAID_AT):/.test(line))
//     .join("\n")
//     .trim();
// }

// function appendInfo(info: string | null | undefined, lines: string[]) {
//   const base = (info || "").trim();
//   const add = lines.filter(Boolean).join("\n");
//   return base ? `${base}\n${add}` : add;
// }

// async function rebuildImmutableInfo(
//   tx: Prisma.TransactionClient,
//   anchorId: string,
//   paidAt: Date
// ) {
//   const paidAtISO = paidAt.toISOString();
//   const paidAtHuman = paidAt.toLocaleDateString("id-ID", {
//     day: "2-digit",
//     month: "long",
//     year: "numeric",
//   });

//   // 1) anchor + pelanggan
//   const anchor = await tx.tagihan.findUnique({
//     where: { id: anchorId },
//     include: {
//       pelanggan: { select: { id: true } },
//       pembayarans: {
//         where: { deletedAt: null },
//         select: { jumlahBayar: true },
//       },
//     },
//   });
//   if (!anchor) throw new Error("Tagihan anchor tidak ditemukan");
//   const pelangganId = anchor.pelangganId;

//   // 2) ambil semua tagihan pelanggan (urut lama→baru) + pembayaran masing-masing (untuk hitung snapshot)
//   const tags = await tx.tagihan.findMany({
//     where: { pelangganId, deletedAt: null },
//     orderBy: { periode: "asc" },
//     include: {
//       pembayarans: {
//         where: { deletedAt: null },
//         select: { jumlahBayar: true },
//       },
//     },
//   });

//   // helper sisa snapshot per bulan
//   const sisa = (t: (typeof tags)[number]) =>
//     (t.tagihanLalu || 0) +
//     (t.totalTagihan || 0) +
//     (t.denda || 0) -
//     t.pembayarans.reduce((a, b) => a + (b.jumlahBayar || 0), 0);

//   // 3) total dana anchor (akumulasi semua pembayaran anchor)
//   const danaAnchor = anchor.pembayarans.reduce(
//     (a, b) => a + (b.jumlahBayar || 0),
//     0
//   );

//   // 4) alokasi virtual
//   let dana = danaAnchor;
//   const cleared: string[] = [];
//   for (const t of tags) {
//     if (dana <= 0) break;
//     const before = sisa(t);
//     if (before <= 0) continue; // sudah lunas/kredit pada snapshot-nya
//     const potong = Math.min(before, dana);
//     dana -= potong;
//     const after = before - potong;
//     if (before > 0 && after <= 0 && t.id !== anchor.id) {
//       // bulan lama jadi TERTUTUP oleh anchor
//       const freshInfo = stripManagedTags(t.info);
//       await tx.tagihan.update({
//         where: { id: t.id },
//         data: {
//           info: appendInfo(freshInfo, [
//             `Dibayarkan di periode ${anchor.periode}`,
//             `[CLOSED_BY:${anchor.periode}]`,
//             `[PAID_AT:${paidAtISO}]`,
//           ]),
//           // status saja, sisaKurang TIDAK disentuh
//           statusBayar: "PAID",
//           statusVerif: "VERIFIED",
//         },
//       });
//       cleared.push(t.periode);
//     } else {
//       // bulan lama yang tidak tertutup → pastikan tag managed dibersihkan
//       const cleaned = stripManagedTags(t.info);
//       if (cleaned !== (t.info || "").trim()) {
//         await tx.tagihan.update({
//           where: { id: t.id },
//           data: { info: cleaned || null },
//         });
//       }
//     }
//   }

//   // 5) hitung posisi anchor + tulis tag PREV_CLEARED/CREDIT
//   const anchorPaid = danaAnchor;
//   const anchorSisa =
//     (anchor.tagihanLalu || 0) +
//     (anchor.totalTagihan || 0) +
//     (anchor.denda || 0) -
//     anchorPaid;

//   let anchorInfo = stripManagedTags(anchor.info);
//   if (cleared.length) {
//     anchorInfo = appendInfo(anchorInfo, [
//       `Termasuk pelunasan tagihan lalu: ${cleared.join(", ")}`,
//       `[PREV_CLEARED:${cleared.join(", ")}]`,
//     ]);
//   }

//   // tulis PAID_AT & baris manusia di anchor (di-replace karena strip dulu)
//   anchorInfo = appendInfo(anchorInfo, [
//     `Dibayar tanggal ${paidAtHuman}`,
//     `[PAID_AT:${paidAtISO}]`,
//   ]);

//   if (anchorSisa < 0) {
//     anchorInfo = appendInfo(anchorInfo, [`[CREDIT:${Math.abs(anchorSisa)}]`]);
//   }

//   await tx.tagihan.update({
//     where: { id: anchor.id },
//     data: {
//       info: anchorInfo || null,
//       sisaKurang: anchorSisa,
//       statusBayar:
//         anchorPaid > 0 ? (anchorSisa <= 0 ? "PAID" : "PAID") : "UNPAID",
//     },
//   });

//   // 6) (opsional) propagate ke bulan berikut (snapshot), TANPA menyentuh bulan lama
//   const periodeNext = nextMonth(anchor.periode);
//   const nextT = await tx.tagihan.findUnique({
//     where: { pelangganId_periode: { pelangganId, periode: periodeNext } },
//     select: { id: true, totalTagihan: true },
//   });
//   if (nextT) {
//     const aggNext = await tx.pembayaran.aggregate({
//       where: { tagihanId: nextT.id, deletedAt: null },
//       _sum: { jumlahBayar: true },
//     });
//     const paidNext = aggNext._sum.jumlahBayar || 0;
//     const sisaNext = (nextT.totalTagihan || 0) + anchorSisa - paidNext;
//     await tx.tagihan.update({
//       where: { id: nextT.id },
//       data: {
//         tagihanLalu: anchorSisa,
//         sisaKurang: sisaNext,
//         statusBayar:
//           paidNext > 0 ? (sisaNext <= 0 ? "PAID" : "PAID") : "UNPAID",
//       },
//     });
//   }
// }

// export async function PATCH(
//   req: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   const uid = await getAuthUserId(req);
//   if (uid) {
//     const u = await prisma.user.findUnique({
//       where: { id: uid },
//       select: { role: true },
//     });
//     if (!u || u.role === "WARGA") {
//       return NextResponse.json(
//         { ok: false, message: "Tidak berizin" },
//         { status: 403 }
//       );
//     }
//   } else {
//     return NextResponse.json(
//       { ok: false, message: "Unauthorized" },
//       { status: 401 }
//     );
//   }

//   try {
//     const id = params.id;
//     if (!id)
//       return NextResponse.json(
//         { ok: false, message: "id wajib" },
//         { status: 400 }
//       );

//     const form = await req.formData();
//     const nominalBayar = Number(form.get("nominalBayar") || 0);
//     const tanggalStr = String(form.get("tanggalBayar") || "");
//     const metodeRaw = String(form.get("metodeBayar") || "").toUpperCase();
//     const keterangan = String(form.get("keterangan") || "");
//     const file = form.get("buktiFile") as File | null;

//     if (!nominalBayar || nominalBayar <= 0) {
//       return NextResponse.json(
//         { ok: false, message: "Nominal tidak valid" },
//         { status: 400 }
//       );
//     }

//     const allow = ["TUNAI", "TRANSFER", "EWALLET", "QRIS"] as const;
//     const metode: MetodeBayar = (allow as readonly string[]).includes(metodeRaw)
//       ? (metodeRaw as MetodeBayar)
//       : MetodeBayar.TUNAI;

//     const pay = await prisma.pembayaran.findUnique({
//       where: { id },
//       select: { id: true, tagihanId: true, buktiUrl: true },
//     });
//     if (!pay)
//       return NextResponse.json(
//         { ok: false, message: "Pembayaran tidak ditemukan" },
//         { status: 404 }
//       );

//     // const tanggalBayar = tanggalStr ? new Date(tanggalStr) : new Date();
//     const tanggalBayar = tanggalStr
//       ? /\d{2}:\d{2}/.test(tanggalStr) // ada jam di string?
//         ? new Date(tanggalStr) // pakai apa adanya
//         : composeWithNowTime(tanggalStr) // cuma tanggal → tambah jam now
//       : new Date(); // kosong → full now

//     // Aturan: jika direvisi menjadi TUNAI → paksa buktiUrl = null
//     let buktiUrl = pay.buktiUrl || null;
//     if (metode === MetodeBayar.TUNAI) {
//       buktiUrl = null;
//     } else if (file) {
//       const saved = await saveUploadFile(file, "payment/bukti-bayar");
//       buktiUrl = saved.publicUrl;
//     }

//     // TRANSAKSI: update pembayaran + rekalkulasi tagihan + propagate next
//     await prisma.$transaction(async (tx) => {
//       await tx.pembayaran.update({
//         where: { id: pay.id },
//         data: {
//           jumlahBayar: Math.round(nominalBayar),
//           tanggalBayar,
//           buktiUrl,
//           metode,
//           keterangan: keterangan || null,
//         },
//       });

//       // ⬇️ Rebuild immutable tags + posisi anchor saja
//       await rebuildImmutableInfo(tx, pay.tagihanId, tanggalBayar);
//     });

//     return NextResponse.json({ ok: true });
//   } catch (e: any) {
//     return NextResponse.json(
//       { ok: false, message: e?.message ?? "Server error" },
//       { status: 500 }
//     );
//   }
// }

// app/api/pembayaran/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MetodeBayar, Prisma } from "@prisma/client";
import { saveUploadFile } from "@/lib/uploads";
import { nextMonth } from "@/lib/period";
import { getAuthUserId } from "@/lib/auth";

// === NEW: kompresi & util file
import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type"; // penting: pakai fileTypeFromBuffer
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

/* ===================== Helpers umum ===================== */

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

function stripManagedTags(info: string | null | undefined): string {
  if (!info) return "";
  return info
    .split("\n")
    .filter((line) => !/\[(PREV_CLEARED|CLOSED_BY|CREDIT|PAID_AT):/.test(line))
    .join("\n")
    .trim();
}

function appendInfo(info: string | null | undefined, lines: string[]) {
  const base = (info || "").trim();
  const add = lines.filter(Boolean).join("\n");
  return base ? `${base}\n${add}` : add;
}

/* ===================== KOMPresi Helpers (≤ 200 KB) ===================== */

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
    const u8 = new Uint8Array(buffer);
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

/* ===================== Rebuilder posisi tagihan ===================== */

async function rebuildImmutableInfo(
  tx: Prisma.TransactionClient,
  anchorId: string,
  paidAt: Date
) {
  const paidAtISO = paidAt.toISOString();
  const paidAtHuman = paidAt.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // 1) anchor + pelanggan
  const anchor = await tx.tagihan.findUnique({
    where: { id: anchorId },
    include: {
      pelanggan: { select: { id: true } },
      pembayarans: {
        where: { deletedAt: null },
        select: { jumlahBayar: true },
      },
    },
  });
  if (!anchor) throw new Error("Tagihan anchor tidak ditemukan");
  const pelangganId = anchor.pelangganId;

  // 2) ambil semua tagihan pelanggan (urut lama→baru) + pembayaran masing-masing (untuk hitung snapshot)
  const tags = await tx.tagihan.findMany({
    where: { pelangganId, deletedAt: null },
    orderBy: { periode: "asc" },
    include: {
      pembayarans: {
        where: { deletedAt: null },
        select: { jumlahBayar: true },
      },
    },
  });

  // helper sisa snapshot per bulan
  const sisa = (t: (typeof tags)[number]) =>
    (t.tagihanLalu || 0) +
    (t.totalTagihan || 0) +
    (t.denda || 0) -
    t.pembayarans.reduce((a, b) => a + (b.jumlahBayar || 0), 0);

  // 3) total dana anchor (akumulasi semua pembayaran anchor)
  const danaAnchor = anchor.pembayarans.reduce(
    (a, b) => a + (b.jumlahBayar || 0),
    0
  );

  // 4) alokasi virtual
  let dana = danaAnchor;
  const cleared: string[] = [];
  for (const t of tags) {
    if (dana <= 0) break;
    const before = sisa(t);
    if (before <= 0) continue; // sudah lunas/kredit pada snapshot-nya
    const potong = Math.min(before, dana);
    dana -= potong;
    const after = before - potong;
    if (before > 0 && after <= 0 && t.id !== anchor.id) {
      // bulan lama jadi TERTUTUP oleh anchor
      const freshInfo = stripManagedTags(t.info);
      await tx.tagihan.update({
        where: { id: t.id },
        data: {
          info: appendInfo(freshInfo, [
            `Dibayarkan di periode ${anchor.periode}`,
            `[CLOSED_BY:${anchor.periode}]`,
            `[PAID_AT:${paidAtISO}]`,
          ]),
          // status saja, sisaKurang TIDAK disentuh
          statusBayar: "PAID",
          statusVerif: "VERIFIED",
        },
      });
      cleared.push(t.periode);
    } else {
      // bulan lama yang tidak tertutup → pastikan tag managed dibersihkan
      const cleaned = stripManagedTags(t.info);
      if (cleaned !== (t.info || "").trim()) {
        await tx.tagihan.update({
          where: { id: t.id },
          data: { info: cleaned || null },
        });
      }
    }
  }

  // 5) hitung posisi anchor + tulis tag PREV_CLEARED/CREDIT
  const anchorPaid = danaAnchor;
  const anchorSisa =
    (anchor.tagihanLalu || 0) +
    (anchor.totalTagihan || 0) +
    (anchor.denda || 0) -
    anchorPaid;

  let anchorInfo = stripManagedTags(anchor.info);
  if (cleared.length) {
    anchorInfo = appendInfo(anchorInfo, [
      `Termasuk pelunasan tagihan lalu: ${cleared.join(", ")}`,
      `[PREV_CLEARED:${cleared.join(", ")}]`,
    ]);
  }

  // tulis PAID_AT & baris manusia di anchor (di-replace karena strip dulu)
  anchorInfo = appendInfo(anchorInfo, [
    `Dibayar tanggal ${paidAtHuman}`,
    `[PAID_AT:${paidAtISO}]`,
  ]);

  if (anchorSisa < 0) {
    anchorInfo = appendInfo(anchorInfo, [`[CREDIT:${Math.abs(anchorSisa)}]`]);
  }

  await tx.tagihan.update({
    where: { id: anchor.id },
    data: {
      info: anchorInfo || null,
      sisaKurang: anchorSisa,
      statusBayar:
        anchorPaid > 0 ? (anchorSisa <= 0 ? "PAID" : "PAID") : "UNPAID",
    },
  });

  // 6) propagate ke bulan berikut (snapshot)
  const periodeNext = nextMonth(anchor.periode);
  const nextT = await tx.tagihan.findUnique({
    where: { pelangganId_periode: { pelangganId, periode: periodeNext } },
    select: { id: true, totalTagihan: true },
  });
  if (nextT) {
    const aggNext = await tx.pembayaran.aggregate({
      where: { tagihanId: nextT.id, deletedAt: null },
      _sum: { jumlahBayar: true },
    });
    const paidNext = aggNext._sum.jumlahBayar || 0;
    const sisaNext = (nextT.totalTagihan || 0) + anchorSisa - paidNext;
    await tx.tagihan.update({
      where: { id: nextT.id },
      data: {
        tagihanLalu: anchorSisa,
        sisaKurang: sisaNext,
        statusBayar:
          paidNext > 0 ? (sisaNext <= 0 ? "PAID" : "PAID") : "UNPAID",
      },
    });
  }
}

/* ===================== PATCH Handler ===================== */

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const uid = await getAuthUserId(req);
  if (uid) {
    const u = await prisma.user.findUnique({
      where: { id: uid },
      select: { role: true },
    });
    if (!u || u.role === "WARGA") {
      return NextResponse.json(
        { ok: false, message: "Tidak berizin" },
        { status: 403 }
      );
    }
  } else {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const id = params.id;
    if (!id)
      return NextResponse.json(
        { ok: false, message: "id wajib" },
        { status: 400 }
      );

    const form = await req.formData();
    const nominalBayar = Number(form.get("nominalBayar") || 0);
    const tanggalStr = String(form.get("tanggalBayar") || "");
    const metodeRaw = String(form.get("metodeBayar") || "").toUpperCase();
    const keterangan = String(form.get("keterangan") || "");
    const file = form.get("buktiFile") as File | null;

    if (!nominalBayar || nominalBayar <= 0) {
      return NextResponse.json(
        { ok: false, message: "Nominal tidak valid" },
        { status: 400 }
      );
    }

    const allow = ["TUNAI", "TRANSFER", "EWALLET", "QRIS"] as const;
    const metode: MetodeBayar = (allow as readonly string[]).includes(metodeRaw)
      ? (metodeRaw as MetodeBayar)
      : MetodeBayar.TUNAI;

    const pay = await prisma.pembayaran.findUnique({
      where: { id },
      select: { id: true, tagihanId: true, buktiUrl: true },
    });
    if (!pay)
      return NextResponse.json(
        { ok: false, message: "Pembayaran tidak ditemukan" },
        { status: 404 }
      );

    // Tanggal bayar (pakai jam now jika tidak ada jam)
    const tanggalBayar = tanggalStr
      ? /\d{2}:\d{2}/.test(tanggalStr) // ada jam di string?
        ? new Date(tanggalStr) // pakai apa adanya
        : composeWithNowTime(tanggalStr) // cuma tanggal → tambah jam now
      : new Date(); // kosong → full now

    // === SIMPAN/REVISI BUKTI DENGAN KOMPRESI ≤ 200 KB ===
    let buktiUrl = pay.buktiUrl || null;
    if (metode === MetodeBayar.TUNAI) {
      // Aturan: jika direvisi menjadi TUNAI → paksa buktiUrl = null
      buktiUrl = null;
    } else if (file) {
      try {
        const compressed = await makeCompressedFileMax200KB(file, 200);
        const saved = await saveUploadFile(compressed, "payment/bukti-bayar");
        buktiUrl = saved.publicUrl;
      } catch (err: any) {
        // Misal PDF > 200KB & ENABLE_GS tidak aktif
        return NextResponse.json(
          { ok: false, message: err?.message || "Gagal kompres bukti" },
          { status: 400 }
        );
      }
    }

    // TRANSAKSI: update pembayaran + rekalkulasi tagihan + propagate next
    await prisma.$transaction(async (tx) => {
      await tx.pembayaran.update({
        where: { id: pay.id },
        data: {
          jumlahBayar: Math.round(nominalBayar),
          tanggalBayar,
          buktiUrl,
          metode,
          keterangan: keterangan || null,
        },
      });

      // Rebuild immutable tags + posisi anchor saja
      await rebuildImmutableInfo(tx, pay.tagihanId, tanggalBayar);
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { renderKwitansiToJPG } from "@/lib/render-kwitansi";
import fs from "node:fs/promises";
import path from "node:path";
import { resolveUploadPath } from "@/lib/uploads";

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
    whatsapp?: string | null;
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
  // if (p.setting?.telepon) kontak.push(`Telepon: ${p.setting.telepon}`);
  // if (p.setting?.email) kontak.push(`Email: ${p.setting.email}`);
  if (p.setting?.whatsapp)
    kontak.push(`WhatsApp:\nKlik nomor berikut -> ${p.setting.whatsapp}`);
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
/** Kirim IMAGE via base64 ke WA Sender */
async function sendWaImageAndLog(
  tujuanRaw: string,
  jpgRef: string, // contoh: "/uploads/payment/kwitansi/img/kwitansi-....jpg" bole api/file
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
          jpgRef,
          filename,
          caption,
          err: "WA_SENDER_URL empty",
        }),
        status: "FAILED",
      },
    });
    return;
  }

  // catat log awal
  const log = await prisma.waLog.create({
    data: {
      tujuan: to,
      tipe: "PEMBAYARAN_IMG APPROVED",
      payload: JSON.stringify({ to, jpgRef, filename, caption }),
      status: "PENDING",
    },
  });

  // ------ ambil buffer gambar secara robust ------
  async function loadBuffer(j: string): Promise<Buffer> {
    // absolute URL -> fetch
    if (/^https?:\/\//i.test(j)) {
      const r = await fetch(j);
      if (!r.ok) throw new Error(`fetch ${j} -> ${r.status}`);
      const ab = await r.arrayBuffer();
      return Buffer.from(ab);
    }

    // /api/file/<relPath> -> map ke .uploads/<relPath>
    if (j.startsWith("/api/file/")) {
      const rel = j.replace(/^\/api\/file\//, ""); // "payment/kwitansi/img/xxx.jpg"
      const abs = resolveUploadPath(...rel.split("/"));
      return fs.readFile(abs);
    }

    // /uploads/<relPath> -> public/uploads/<relPath>
    if (j.startsWith("/uploads/")) {
      const abs = path.join(process.cwd(), "public", j.replace(/^\/+/, ""));
      return fs.readFile(abs);
    }

    // fallback: anggap path relatif ke UPLOAD_DIR
    const abs = resolveUploadPath(...j.replace(/^\/+/, "").split("/"));
    return fs.readFile(abs);
  }
  try {
    // 1) baca file dari folder public (jpgRelPath berbentuk "/uploads/...")
    // const filePath = path.join(
    //   process.cwd(),
    //   "public",
    //   jpgRelPath.replace(/^\/+/, "")
    // );
    if (!base) throw new Error("WA_SENDER_URL empty");

    const buf = await loadBuffer(jpgRef);
    const b64 = buf.toString("base64"); // ⬅️ base64 murni (tanpa prefix data:)

    // 2) kirim ke wa-sender
    const r = await fetch(`${base}/send-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      },
      body: JSON.stringify({
        to,
        base64: b64, // ⬅️ gunakan base64
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
          jpgRef,
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
          jpgRef,
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
        tagihanLalu: true,
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

    // const sum = await prisma.pembayaran.aggregate({
    //   where: { tagihanId: id, deletedAt: null },
    //   _sum: { jumlahBayar: true },
    // });
    // const sudah = sum._sum.jumlahBayar ?? 0;

    // NEW: total bulan ini + carry-over bulan lalu (bisa negatif/positif)
    const totalBulanIni = t.totalTagihan ?? 0;
    const carryOver = t.tagihanLalu ?? 0;
    const totalDitagihkan = totalBulanIni + carryOver;

    // GANTI: statusBayar berdasarkan totalDitagihkan
    // const statusBayar = sudah >= totalDitagihkan ? "PAID" : "UNPAID";
    // await prisma.tagihan.update({ where: { id }, data: { statusBayar } });

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
      tagihan: { ...t, totalDitagihkan },
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
                whatsapp: setting?.whatsappCs,
              },
              nama: pelanggan?.nama,
              kode: pelanggan?.kode,
              periode: t.periode,
              tanggalBayar: pembayaran.tanggalBayar,
              metode: pembayaran.metode,
              jumlahBayar: pembayaran.jumlahBayar,
              totalTagihan: totalDitagihkan,
            });
            await sendWaAndLog(pelanggan.wa!, text);
          } catch {}

          // 3) KIRIM GAMBAR
          try {
            const caption = `Kwitansi Pembayaran Periode ${periodLong(
              t.periode
            )} - ${pelanggan?.nama || ""}`;
            await sendWaImageAndLog(
              pelanggan.wa!,
              jpgUrl, // ⬅️ path relatif (mis. "/uploads/…/kwitansi-xxx.jpg")
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

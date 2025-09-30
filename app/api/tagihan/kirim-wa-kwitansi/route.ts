// app/api/tagihan/kirim-wa-kwitansi/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { renderKwitansiToJPG } from "@/lib/render-kwitansi";
import { resolveUploadPath } from "@/lib/uploads";
import fs from "node:fs/promises";

// ——— Helpers yang sama seperti PATCH verify (dipersingkat) ———
function getAppOrigin(req: NextRequest) {
  const h = req.headers;
  return (
    process.env.APP_ORIGIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    h.get("origin") ||
    `${h.get("x-forwarded-proto") || "http"}://${h.get("x-forwarded-host") || h.get("host") || ""}`
  )?.replace(/\/$/, "");
}
function periodLong(ym: string) {
  const d = new Date(`${ym}-01T00:00:00`);
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
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
function parseClosedByOrPaidBy(info?: string | null) {
  if (!info) return null;
  const m = info.match(/\[(?:CLOSED_BY|PAID_BY):(\d{4}-\d{2})\]/);
  return m ? m[1] : null;
}
function parsePaidAt(info?: string | null) {
  if (!info) return null;
  const m = info.match(/\[PAID_AT:([^\]]+)\]/);
  if (!m) return null;
  const d = new Date(m[1]);
  return isNaN(d.getTime()) ? null : d;
}
function formatRp(n: number) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

// ——— Utility kirim WA (SAMAKAN dengan yang di PATCH verify) ———
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
    data: { tujuan: to, tipe: "PEMBAYARAN APPROVED", payload: JSON.stringify({ to, text }), status: "PENDING" },
  });

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 10_000);

  fetch(`${base}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(apiKey ? { "x-api-key": apiKey } : {}) },
    body: JSON.stringify({ to, text }),
    signal: ac.signal,
  })
    .then((r) => prisma.waLog.update({ where: { id: log.id }, data: { status: r.ok ? "SENT" : "FAILED" } }))
    .catch(() => prisma.waLog.update({ where: { id: log.id }, data: { status: "FAILED" } }))
    .finally(() => clearTimeout(t));
}

async function sendWaImageAndLog(
  tujuanRaw: string,
  jpgRef: string,
  filename: string,
  caption?: string
) {
  const to = tujuanRaw.replace(/\D/g, "").replace(/^0/, "62");
  const base = (process.env.WA_SENDER_URL || "").replace(/\/$/, "");
  const apiKey = process.env.WA_SENDER_API_KEY || "";

  const log = await prisma.waLog.create({
    data: {
      tujuan: to,
      tipe: "PEMBAYARAN_IMG APPROVED",
      payload: JSON.stringify({ to, jpgRef, filename, caption }),
      status: "PENDING",
    },
  });

  try {
    if (!base) throw new Error("WA_SENDER_URL empty");

    async function loadBuffer(j: string): Promise<Buffer> {
      if (/^https?:\/\//i.test(j)) {
        const r = await fetch(j);
        if (!r.ok) throw new Error(`fetch ${j} -> ${r.status}`);
        const ab = await r.arrayBuffer();
        return Buffer.from(ab);
      }
      if (j.startsWith("/api/file/")) {
        const rel = j.replace(/^\/api\/file\//, "");
        const abs = resolveUploadPath(...rel.split("/"));
        return fs.readFile(abs);
      }
      if (j.startsWith("/uploads/")) {
        const path = (await import("node:path")).default;
        const abs = path.join(process.cwd(), "public", j.replace(/^\/+/, ""));
        return fs.readFile(abs);
      }
      const abs = resolveUploadPath(...j.replace(/^\/+/, "").split("/"));
      return fs.readFile(abs);
    }

    const buf = await loadBuffer(jpgRef);
    const b64 = buf.toString("base64");

    const r = await fetch(`${base}/send-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(apiKey ? { "x-api-key": apiKey } : {}) },
      body: JSON.stringify({ to, base64: b64, filename, caption, mimeType: "image/jpeg" }),
    });

    await prisma.waLog.update({
      where: { id: log.id },
      data: { status: r.ok ? "SENT" : "FAILED" },
    });
  } catch (e: any) {
    await prisma.waLog.update({
      where: { id: log.id },
      data: { status: "FAILED", payload: JSON.stringify({ error: String(e?.message || e) }) },
    });
  }
}

function waTextPembayaranVerified(p: {
  setting?: { namaPerusahaan?: string | null; telepon?: string | null; email?: string | null; alamat?: string | null; whatsapp?: string | null; };
  nama?: string | null; kode?: string | null;
  periode: string; tanggalBayar: Date; metode: string; jumlahBayar: number; totalTagihan: number;
}) {
  const lines: string[] = [];
  lines.push(`Halo *${p.nama || "Pelanggan"}*,`, `Pembayaran tagihan air Anda telah *TERVERIFIKASI*.`);
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
  if (p.setting?.whatsapp) kontak.push(`WhatsApp:\nKlik nomor berikut -> ${p.setting.whatsapp}`);
  if (kontak.length) lines.push("", "*Kontak*", kontak.join("\n"));
  lines.push("", "Terima kasih 🙏");
  return lines.map((s) => s.replace(/[ \t]+$/g, "")).join("\n");
}

// ——— POST /api/tagihan/kirim-wa-kwitansi ———
export async function POST(req: NextRequest) {
  try {
    const { tagihanId } = await req.json();

    if (!tagihanId) {
      return NextResponse.json({ ok: false, message: "tagihanId wajib diisi" }, { status: 400 });
    }

    // Auth: larang WARGA
    try {
      const uid = await getAuthUserId(req as any);
      if (uid) {
        const u = await prisma.user.findUnique({ where: { id: uid }, select: { role: true } });
        if (!u || u.role === "WARGA") {
          return NextResponse.json({ ok: false, message: "Tidak berizin" }, { status: 403 });
        }
      }
    } catch {}

    // Ambil tagihan + pelanggan
    const tagihan = await prisma.tagihan.findUnique({
      where: { id: tagihanId },
      include: { pelanggan: { select: { nama: true, kode: true, wa: true, alamat: true } } },
    });
    if (!tagihan) return NextResponse.json({ ok: false, message: "Tagihan tidak ditemukan" }, { status: 404 });

    const closedBy = parseClosedByOrPaidBy(tagihan.info);
    const paidAtTag = parsePaidAt(tagihan.info);

    // Ambil pembayaran terakhir (supaya METODE akurat)
    let pembayaran = await prisma.pembayaran.findFirst({
      where: { tagihanId, deletedAt: null },
      orderBy: { tanggalBayar: "desc" },
    });

    // Hitung total ditagihkan (bulan ini + carry)
    const totalBulanIni = tagihan.totalTagihan ?? 0;
    const carryOver = tagihan.tagihanLalu ?? 0;
    const totalDitagihkan = totalBulanIni + carryOver;

    // Jika belum ada pembayaran & CLOSED_BY → pakai virtual
    if (!pembayaran && closedBy) {
      const anchor = await prisma.tagihan.findUnique({
        where: { pelangganId_periode: { pelangganId: tagihan.pelangganId, periode: closedBy } },
        select: { id: true },
      });
      let anchorPay: any = null;

      if (anchor && paidAtTag) {
        const gte = new Date(paidAtTag); gte.setHours(0,0,0,0);
        const lte = new Date(paidAtTag); lte.setHours(23,59,59,999);
        anchorPay = await prisma.pembayaran.findFirst({
          where: { tagihanId: anchor.id, deletedAt: null, tanggalBayar: { gte, lte } },
          orderBy: { tanggalBayar: "asc" },
        });
      }
      if (!anchorPay && anchor) {
        anchorPay = await prisma.pembayaran.findFirst({
          where: { tagihanId: anchor.id, deletedAt: null },
          orderBy: { tanggalBayar: "desc" },
        });
      }

      pembayaran = {
        id: "virtual",
        tagihanId: tagihan.id,
        tanggalBayar: paidAtTag ?? new Date(),
        jumlahBayar: Math.max(totalDitagihkan, 0),
        buktiUrl: null,
        adminBayar: null,
        metode: (anchorPay?.metode as any) || "—",
        keterangan: "",
        deletedAt: null,
        deletedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
    }

    // Validasi kondisi kirim kwitansi: harus sudah lunas (atau CLOSED_BY)
    const sum = await prisma.pembayaran.aggregate({
      where: { tagihanId, deletedAt: null },
      _sum: { jumlahBayar: true },
    });
    const totalPaid = sum._sum.jumlahBayar || 0;
    const isLunas = !!closedBy || totalPaid >= totalDitagihkan;
    if (!isLunas) {
      return NextResponse.json({
        ok: false,
        message: "Belum lunas. Kwitansi dikirim jika tagihan sudah lunas.",
      }, { status: 400 });
    }

    if (!tagihan.pelanggan?.wa) {
      return NextResponse.json({ ok: false, message: "Nomor WA pelanggan kosong" }, { status: 400 });
    }
    if (!pembayaran) {
      return NextResponse.json({ ok: false, message: "Tidak ada data pembayaran/penutupan" }, { status: 400 });
    }

    // Balas cepat ke FE (non-blocking render & send)
    const origin = getAppOrigin(req);
    const res = NextResponse.json({ ok: true });

    setImmediate(async () => {
      try {
        // 1) Render JPG (gunakan template /print/kwitansi/:id optionally ?payId=)
        const payIdParam = pembayaran.id && pembayaran.id !== "virtual" ? `?payId=${pembayaran.id}` : "";
        const jpgUrl = await renderKwitansiToJPG({
          tplUrl: `${origin}/print/kwitansi/${tagihan.id}${payIdParam}`,
          outName: `kwitansi-${tagihan.id}-${pembayaran.id || "auto"}.jpg`,
        });

        // 2) Kirim teks
        const setting = await prisma.setting.findUnique({ where: { id: 1 } });
        const text = waTextPembayaranVerified({
          setting: {
            namaPerusahaan: setting?.namaPerusahaan,
            telepon: setting?.telepon,
            email: setting?.email,
            alamat: setting?.alamat,
            whatsapp: setting?.whatsappCs,
          },
          nama: tagihan.pelanggan?.nama,
          kode: tagihan.pelanggan?.kode,
          periode: tagihan.periode,
          tanggalBayar: pembayaran.tanggalBayar,
          metode: (pembayaran as any).metode ?? "—",
          jumlahBayar: pembayaran.jumlahBayar,
          totalTagihan: totalDitagihkan,
        });
        await sendWaAndLog(tagihan.pelanggan.wa!, text);

        // 3) Kirim gambar
        const caption = `Kwitansi Pembayaran Periode ${periodLong(tagihan.periode)} - ${tagihan.pelanggan?.nama || ""}`;
        await sendWaImageAndLog(
          tagihan.pelanggan.wa!, 
          jpgUrl,
          `kwitansi-${tagihan.id}-${pembayaran.id || "auto"}.jpg`,
          caption
        );
      } catch (e) {
        console.error("[kirim-wa-kwitansi] error:", e);
      }
    });

    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || "Server error" }, { status: 500 });
  }
}
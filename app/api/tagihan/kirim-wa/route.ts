import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import puppeteer from "puppeteer";
import { randomToken } from "@/lib/auth-utils";

/* ============ Helpers ============ */
function getAppOrigin(req: NextRequest) {
  const h = req.headers;
  return (
    process.env.APP_ORIGIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    h.get("origin") ||
    `${h.get("x-forwarded-proto") || "http"}://${h.get("x-forwarded-host") || h.get("host") || ""}`
  )?.replace(/\/$/, "");
}
function formatRp(n: number) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}
function fmtTanggalID(d: Date) {
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
function waText(p: {
  setting?: {
    namaPerusahaan?: string | null;
    telepon?: string | null;
    email?: string | null;
    alamat?: string | null;
    anNorekPembayaran?: string | null;
    namaBankPembayaran?: string | null;
    namaBendahara?: string | null;
    norekPembayaran?: string | null;
    whatsappCs?: string | null;
  };
  nama?: string;
  kode?: string;
  periode: string;
  meterAwal?: number;
  meterAkhir?: number;
  pemakaian?: number;
  tarifPerM3?: number;
  abonemen?: number;
  biayaAdmin?: number;
  total?: number;
  due: Date;
  pdfUrl?: string;
  tagihanLalu: number;
  tagihanBulanIni: number;
  sisaKurang?: number;
  tglCatat?: Date;
}) {
  const perusahaan = p.setting?.namaPerusahaan || "Tirtabening";
  const bulan = new Date(p.periode + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const bayarLines = [
    `• Tunai ke bendahara (${p.setting?.namaBendahara}).`,
    `• Transfer ke Rekening ${p.setting?.namaBankPembayaran} ${p.setting?.norekPembayaran} a.n. ${p.setting?.anNorekPembayaran}.`,
  ].join("\n");
  const kontakLine = p.setting?.whatsappCs ? `WhatsApp:\nKlik nomor berikut -> ${p.setting.whatsappCs}` : "";

  const totalGabungan = (p.tagihanLalu || 0) + (p.tagihanBulanIni || 0);
  const renderSisaKurangText = (n: number) =>
    n > 0 ? `Kurang ${formatRp(n)}` : n < 0 ? `Sisa ${formatRp(Math.abs(n))}` : "Rp 0";

  const sections: string[] = [];
  sections.push(
    [
      `Kepada pelanggan ${perusahaan} yang terhormat,\n`,
      `Tagihan Air Bulan ${bulan}`,
      p.nama ? `Pelanggan: *${p.nama}*` : undefined,
    ].filter(Boolean).join("\n")
  );
  sections.push(
    [
      "*Ringkasan*",
      `• Tagihan Bulan Lalu: ${renderSisaKurangText(p.tagihanLalu)}`,
      `• Tagihan Bulan Ini: ${formatRp(p.tagihanBulanIni)}`,
      `• *Total Tagihan: ${formatRp(totalGabungan)}*`,
      `• Batas Bayar: *${fmtTanggalID(p.due)}*`,
    ].join("\n")
  );
  sections.push(
    [
      "*Rincian*",
      p.tglCatat ? `• Tanggal Catat: ${fmtTanggalID(p.tglCatat)}` : undefined,
      p.meterAwal != null ? `• Meter Awal: ${p.meterAwal}` : undefined,
      p.meterAkhir != null ? `• Meter Akhir: ${p.meterAkhir}` : undefined,
      p.pemakaian != null ? `• Pemakaian: ${p.pemakaian} m³` : undefined,
      p.tarifPerM3 != null ? `• Tarif/m³: ${formatRp(p.tarifPerM3)}` : undefined,
      p.abonemen != null ? `• Abonemen: ${formatRp(p.abonemen)}` : undefined,
      `• Tagihan Bulan Ini: ${formatRp(p.tagihanBulanIni)}`,
      `• Tagihan Bulan Lalu: ${renderSisaKurangText(p.tagihanLalu)}`,
      "—",
      `*Total Tagihan: ${formatRp(totalGabungan)}*`,
    ].filter(Boolean).join("\n")
  );
  sections.push(["*Cara Pembayaran*", bayarLines].join("\n"));
  if (kontakLine) sections.push(["*Bantuan*", kontakLine].join("\n"));
  sections.push("Terima kasih 🙏");
  sections.push(
    [
      "*NOTE:*",
      `Setelah melakukan Transfer, silahkan konfirmasi ke nomor ${p.setting?.whatsappCs}\n\nAtau`,
    ].join("\n")
  );

  return sections.map((s) => s.replace(/[ \t]+$/g, "")).join("\n\n");
}

async function sendWaAndLog(tujuanRaw: string, text: string) {
  const to = tujuanRaw.replace(/\D/g, "").replace(/^0/, "62");
  const base = (process.env.WA_SENDER_URL || "").replace(/\/$/, "");
  const apiKey = process.env.WA_SENDER_API_KEY || "";
  if (!base) {
    await prisma.waLog.create({
      data: { tujuan: to, tipe: "TAGIHAN", payload: JSON.stringify({ to, text, err: "WA_SENDER_URL empty" }), status: "FAILED" },
    });
    return;
  }
  const url = `${base}/send`;
  const log = await prisma.waLog.create({
    data: { tujuan: to, tipe: "TAGIHAN", payload: JSON.stringify({ to, text }), status: "PENDING" },
  });
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 10000);
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

async function sendWaImageAndLog(tujuanRaw: string, tagihanId: string, caption?: string) {
  const to = tujuanRaw.replace(/\D/g, "").replace(/^0/, "62");
  const base = (process.env.WA_SENDER_URL || "").replace(/\/$/, "");
  const apiKey = process.env.WA_SENDER_API_KEY || "";
  if (!base) {
    await prisma.waLog.create({
      data: {
        tujuan: to, tipe: "TAGIHAN_IMG",
        payload: JSON.stringify({ to, tagihanId, caption, err: "WA_SENDER_URL empty" }),
        status: "FAILED",
      },
    });
    return;
  }
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    const origin = process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await page.goto(`${origin}/print/tagihan/${tagihanId}?compact=1`, { waitUntil: "networkidle0" });
    await page.setViewport({ width: 380, height: 800, deviceScaleFactor: 2 });
    await page.evaluate(() => { (document.body as any).style.background = "#ffffff"; });
    const buffer = await page.screenshot({ type: "jpeg", quality: 85, fullPage: true });
    await browser.close();

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
    });

    await prisma.waLog.create({
      data: { tujuan: to, tipe: "TAGIHAN_IMG", payload: JSON.stringify({ to, tagihanId, http: { ok: r.ok, status: r.status } }), status: r.ok ? "SENT" : "FAILED" },
    });
  } catch (e: any) {
    await prisma.waLog.create({
      data: { tujuan: to, tipe: "TAGIHAN_IMG", payload: JSON.stringify({ to, tagihanId, caption, err: String(e?.message || e) }), status: "FAILED" },
    });
  }
}

/* ============ POST: kirim WA tagihan by tagihanId ============ */
export async function POST(req: NextRequest) {
  try {
    const { tagihanId } = await req.json();
    if (!tagihanId) {
      return NextResponse.json({ ok: false, message: "tagihanId wajib" }, { status: 400 });
    }

    // Ambil tagihan + pelanggan + relasi catat untuk angka meter (jika ada)
    const t = await prisma.tagihan.findUnique({
      where: { id: tagihanId },
      include: {
        pelanggan: { select: { id: true, nama: true, kode: true, wa: true, userId: true } },
        catatMeter: { select: { meterAwal: true, meterAkhir: true, pemakaianM3: true, updatedAt: true } },
      },
    });
    if (!t || t.deletedAt) {
      return NextResponse.json({ ok: false, message: "Tagihan tidak ditemukan" }, { status: 404 });
    }
    if (!t.pelanggan?.wa) {
      return NextResponse.json({ ok: false, message: "Nomor WhatsApp pelanggan belum diisi" }, { status: 400 });
    }

    const setting = await prisma.setting.findUnique({ where: { id: 1 } });
    if (!setting) {
      return NextResponse.json({ ok: false, message: "Setting tidak ditemukan" }, { status: 500 });
    }

    // Pastikan ada user WARGA
    let userId = t.pelanggan.userId as string | undefined;
    if (!userId) {
      const username = t.pelanggan.kode || ("WARGA-" + t.pelanggan.id.slice(-6));
      const pwd = randomToken(12);
      const user = await prisma.user.create({
        data: {
          username,
          passwordHash: pwd,
          name: t.pelanggan.nama,
          phone: t.pelanggan.wa ?? null,
          role: "WARGA",
          isActive: true,
        },
        select: { id: true },
      });
      userId = user.id;
      await prisma.pelanggan.update({ where: { id: t.pelanggan.id }, data: { userId } });
    }

    // Magic link untuk pelunasan / upload bukti
    const token = randomToken(32);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.magicLinkToken.create({
      data: { token, userId: userId!, tagihanId: t.id, purpose: "pembayaran", expiresAt },
    });
    const origin = getAppOrigin(req);
    const magicUrl = origin && `${origin}/api/auth/magic?token=${encodeURIComponent(token)}`;

    const now = new Date();
    const due = new Date(t.tglJatuhTempo);
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
        nama: t.pelanggan?.nama,
        kode: t.pelanggan?.kode || undefined,
        periode: t.periode,
        meterAwal: t.catatMeter?.meterAwal ?? undefined,
        meterAkhir: t.catatMeter?.meterAkhir ?? undefined,
        pemakaian: t.catatMeter?.pemakaianM3 ?? undefined,
        tarifPerM3: t.tarifPerM3,
        abonemen: t.abonemen,
        tagihanLalu: t.tagihanLalu,
        tagihanBulanIni: t.totalTagihan,
        sisaKurang: t.sisaKurang,
        total: t.totalTagihan,
        due,
        tglCatat: t.catatMeter?.updatedAt ?? now,
      }) + (magicUrl ? `\n\nUnggah bukti pembayaran dengan aman via tautan berikut:\n${magicUrl}` : "");

    // Kirim WA teks + gambar (async fire-and-forget di server)
    (async () => {
      try { await sendWaAndLog(t.pelanggan!.wa!, text); } catch {}
      try {
        const caption = `Tagihan Air Periode ${new Date(`${t.periode}-01`).toLocaleDateString("id-ID", { month: "long", year: "numeric" })} - ${t.pelanggan?.nama}`;
        await sendWaImageAndLog(t.pelanggan!.wa!, t.id, caption);
      } catch {}
    })();

    return NextResponse.json({ ok: true, message: "WA tagihan dikirim" });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, message: e?.message ?? "Server error" }, { status: 500 });
  }
}
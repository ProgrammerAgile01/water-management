import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CatatStatus } from "@prisma/client";
import { randomToken } from "@/lib/auth-utils";
import puppeteer from "puppeteer";

export const runtime = "nodejs";

/* =======================
   Helper periode
   ======================= */
function prevPeriod(code: string) {
  const [y, m] = code.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  d.setMonth(d.getMonth() - 1);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}
function nextPeriod(code: string) {
  const [y, m] = code.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  d.setMonth(d.getMonth() + 1);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

/* =======================
   Helper existing
   ======================= */
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
function fmtTanggalID(d: Date) {
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/* =======================
   Pesan WA
   ======================= */
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
  periode: string; // periode billing (+1)
  meterAwal: number;
  meterAkhir: number;
  pemakaian: number;
  tarifPerM3: number;
  abonemen: number;
  biayaAdmin: number;
  total: number;
  due: Date;
  pdfUrl?: string;
  tagihanLalu: number;
  tagihanBulanIni: number;
  sisaKurang?: number;
  tglCatat?: Date; // hanya untuk ditampilkan
}) {
  const perusahaan = p.setting?.namaPerusahaan || "Tirtabening";
  const bulan = new Date(p.periode + "-01").toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
  const bayarLines = [
    `• Tunai ke bendahara (${p.setting?.namaBendahara}).`,
    `• Transfer ke Rekening ${p.setting?.namaBankPembayaran} ${p.setting?.norekPembayaran} a.n. ${p.setting?.anNorekPembayaran}.`,
  ].join("\n");
  const kontakLine = [
    p.setting?.whatsappCs
      ? `WhatsApp:\nKlik nomor berikut -> ${p.setting.whatsappCs}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const totalGabungan = (p.tagihanLalu || 0) + (p.tagihanBulanIni || 0);
  const renderSisaKurangText = (n: number) =>
    n > 0
      ? `Kurang ${formatRp(n)}`
      : n < 0
      ? `Sisa ${formatRp(Math.abs(n))}`
      : "Rp 0";

  const sections: string[] = [];
  sections.push(
    [
      `Kepada pelanggan ${perusahaan} yang terhormat,\n`,
      `Tagihan Air Bulan ${bulan}`,
      p.nama ? `Pelanggan: *${p.nama}*` : undefined,
    ]
      .filter(Boolean)
      .join("\n")
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
      `• Meter Awal: ${p.meterAwal}`,
      `• Meter Akhir: ${p.meterAkhir}`,
      `• Pemakaian: ${p.pemakaian} m³`,
      `• Tarif/m³: ${formatRp(p.tarifPerM3)}`,
      `• Abonemen: ${formatRp(p.abonemen)}`,
      `• Tagihan Bulan Ini: ${formatRp(p.tagihanBulanIni)}`,
      `• Tagihan Bulan Lalu: ${renderSisaKurangText(p.tagihanLalu)}`,
      "—",
      `*Total Tagihan: ${formatRp(totalGabungan)}*`,
    ]
      .filter(Boolean)
      .join("\n")
  );
  sections.push(["*Cara Pembayaran*", bayarLines].join("\n"));
  if (kontakLine) sections.push(["*Bantuan*", kontakLine].join("\n"));
  sections.push("Terima kasih 🙏");
  sections.push(
    [
      "*NOTE:*",
      `Setelah melakukan Transfer, silahkan konfirmasi ke Bp. Masrur di nomor ${p.setting?.whatsappCs}\n\nAtau`,
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
      data: {
        tujuan: to,
        tipe: "TAGIHAN",
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
      tipe: "TAGIHAN",
      payload: JSON.stringify({ to, text }),
      status: "PENDING",
    },
  });
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 10000);
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

async function sendWaImageAndLog(
  tujuanRaw: string,
  tagihanId: string,
  caption?: string
) {
  const to = tujuanRaw.replace(/\D/g, "").replace(/^0/, "62");
  const base = (process.env.WA_SENDER_URL || "").replace(/\/$/, "");
  const apiKey = (process.env as any).WA_SENDER_API_KEY || "";
  if (!base) {
    await prisma.waLog.create({
      data: {
        tujuan: to,
        tipe: "TAGIHAN_IMG",
        payload: JSON.stringify({
          to,
          tagihanId,
          caption,
          err: "WA_SENDER_URL empty",
        }),
        status: "FAILED",
      },
    });
    return;
  }

  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    const origin =
      process.env.APP_ORIGIN ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";
    await page.goto(`${origin}/print/tagihan/${tagihanId}?compact=1`, {
      waitUntil: "networkidle0",
    });
    await page.setViewport({ width: 380, height: 800, deviceScaleFactor: 2 });
    await page.evaluate(() => {
      document.body.style.background = "#ffffff";
    });
    const buffer = await page.screenshot({
      type: "jpeg",
      quality: 85,
      fullPage: true,
    });
    await browser.close();

    const r = await fetch(`${base}/send-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      },
      body: JSON.stringify({
        to,
        base64: buffer.toString("base64"),
        filename: `tagihan-${tagihanId}.jpg`,
        caption,
        mimeType: "image/jpeg",
      }),
    });

    await prisma.waLog.create({
      data: {
        tujuan: to,
        tipe: "TAGIHAN_IMG",
        payload: JSON.stringify({
          to,
          tagihanId,
          http: { ok: r.ok, status: r.status },
        }),
        status: r.ok ? "SENT" : "FAILED",
      },
    });
  } catch (e: any) {
    await prisma.waLog.create({
      data: {
        tujuan: to,
        tipe: "TAGIHAN_IMG",
        payload: JSON.stringify({
          to,
          tagihanId,
          caption,
          err: String(e?.message || e),
        }),
        status: "FAILED",
      },
    });
  }
}

/* =======================
   FINALIZE ROW
   ======================= */
export async function POST(req: NextRequest) {
  try {
    const { id, sendWa }: { id?: string; sendWa?: boolean } = await req.json();
    if (!id)
      return NextResponse.json(
        { ok: false, message: "id wajib" },
        { status: 400 }
      );

    const row = await prisma.catatMeter.findUnique({
      where: { id },
      include: {
        periode: true,
        pelanggan: {
          select: { id: true, nama: true, wa: true, kode: true, userId: true },
        },
      },
    });
    if (!row || row.deletedAt)
      return NextResponse.json(
        { ok: false, message: "Data tidak ditemukan" },
        { status: 404 }
      );
    if (row.periode.isLocked)
      return NextResponse.json(
        { ok: false, message: "Periode sudah dikunci" },
        { status: 423 }
      );
    if (row.isLocked)
      return NextResponse.json({
        ok: true,
        locked: true,
        message: "Row sudah dikunci",
      });

    const periodeStr = row.periode.kodePeriode; // "YYYY-MM" (bulan catat)
    const setting = await prisma.setting.findUnique({ where: { id: 1 } });
    if (!setting)
      return NextResponse.json(
        { ok: false, message: "Setting tidak ditemukan" },
        { status: 500 }
      );

    // Periode tagihan = +1 bulan
    const billingPeriode = nextPeriod(periodeStr);

    // Hitung total berdasar angka meter yang dicatat
    const akhir = Math.max(row.meterAkhir ?? row.meterAwal, row.meterAwal);
    const pem = Math.max(0, akhir - row.meterAwal);
    const tarif = row.tarifPerM3 ?? row.periode.tarifPerM3 ?? 0;
    const abon = row.abonemen ?? row.periode.abonemen ?? 0;
    const biayaAdmin = setting.biayaAdmin ?? 0;
    const total = tarif * pem + abon + biayaAdmin;

    // Due date di bulan billing (+1)
    const [yy, mm] = billingPeriode.split("-").map(Number);
    // const due = new Date(yy, mm - 1, Math.max(1, setting.tglJatuhTempo ?? 15));
    const day = Math.min(
      Math.max(1, setting.tglJatuhTempo ?? 15),
      new Date(yy, mm, 0).getDate()
    );
    // versi lokal (WIB): tidak akan nyeret ke hari sebelumnya saat jadi UTC
    const due = new Date(yy, mm - 1, day, 12, 0, 0, 0);

    // Carry-over dari bulan sebelum billing
    const prevCode = prevPeriod(billingPeriode);
    const prevBill = await prisma.tagihan.findUnique({
      where: {
        pelangganId_periode: {
          pelangganId: row.pelangganId,
          periode: prevCode,
        },
      },
      select: { sisaKurang: true },
    });
    const carryFromPrev = prevBill?.sisaKurang ?? 0;

    // Timestamp untuk ditampilkan di WA (tanpa disimpan DB)
    const now = new Date();

    // Transaksi
    const { periodeId, pelanggan, tagihan } = await prisma.$transaction(
      async (tx) => {
        // Lock row — TIDAK menyimpan tglCatat
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
        });

        // Total pembayaran yang sudah ada untuk PERIODE BILLING (+1)
        const paidAgg = await tx.pembayaran.aggregate({
          where: {
            tagihan: { pelangganId: row.pelangganId, periode: billingPeriode },
            deletedAt: null,
          },
          _sum: { jumlahBayar: true },
        });
        const alreadyPaid = paidAgg._sum.jumlahBayar ?? 0;

        // Upsert tagihan untuk PERIODE BILLING (+1)
        const t = await tx.tagihan.upsert({
          where: {
            pelangganId_periode: {
              pelangganId: row.pelangganId,
              periode: billingPeriode,
            },
          },
          update: {
            tarifPerM3: tarif,
            abonemen: abon,
            totalTagihan: total,
            denda: 0,
            tagihanLalu: carryFromPrev,
            sisaKurang: total + carryFromPrev - alreadyPaid,
            statusBayar:
              total + carryFromPrev - alreadyPaid <= 0 ? "PAID" : "UNPAID",
            statusVerif: "UNVERIFIED",
            tglJatuhTempo: due,
            catatMeterId: row.id, // ★ relasi ke catat meter
          },
          create: {
            pelangganId: row.pelangganId,
            periode: billingPeriode,
            tarifPerM3: tarif,
            abonemen: abon,
            totalTagihan: total,
            denda: 0,
            tagihanLalu: carryFromPrev,
            sisaKurang: total + carryFromPrev - alreadyPaid,
            statusBayar:
              total + carryFromPrev - alreadyPaid <= 0 ? "PAID" : "UNPAID",
            statusVerif: "UNVERIFIED",
            tglJatuhTempo: due,
            catatMeterId: row.id, // ★ relasi ke catat meter
          },
        });

        /* =======================
         Update progress + auto FINAL & lock periode
         ======================= */
        const agg = await tx.catatMeter.groupBy({
          by: ["status"],
          where: { periodeId: updated.periodeId, deletedAt: null },
          _count: { _all: true },
        });

        const selesai =
          agg.find((a) => a.status === CatatStatus.DONE)?._count._all ?? 0;
        const pending =
          agg.find((a) => a.status === CatatStatus.PENDING)?._count._all ?? 0;

        // Pastikan benar2 tidak ada row isLocked=false (lebih ketat)
        const unlockedCount = await tx.catatMeter.count({
          where: {
            periodeId: updated.periodeId,
            deletedAt: null,
            isLocked: false,
          },
        });

        // Semua baris terkunci bila:
        // - tidak ada pending,
        // - ada minimal 1 selesai,
        // - dan tidak ada row yang masih isLocked=false
        const allLocked = pending === 0 && selesai > 0 && unlockedCount === 0;

        await tx.catatPeriode.update({
          where: { id: updated.periodeId },
          data: {
            totalPelanggan: selesai + pending,
            selesai,
            pending,
            ...(allLocked
              ? {
                  status: "FINAL",
                  isLocked: true,
                  lockedAt: new Date(),
                  // lockedBy: currentUserId, // ← isi kalau kamu punya user id di context
                }
              : {}),
          },
        });

        /* ======================= */

        // Dorong carry ke bulan setelah billing
        const nextCode = nextPeriod(billingPeriode);
        const nextExists = await tx.tagihan.findUnique({
          where: {
            pelangganId_periode: {
              pelangganId: row.pelangganId,
              periode: nextCode,
            },
          },
          select: { id: true, totalTagihan: true },
        });
        if (nextExists) {
          await tx.tagihan.update({
            where: { id: nextExists.id },
            data: {
              tagihanLalu: t.sisaKurang,
              sisaKurang: nextExists.totalTagihan + t.sisaKurang,
              statusBayar:
                nextExists.totalTagihan + t.sisaKurang <= 0 ? "PAID" : "UNPAID",
            },
          });
        }

        return {
          periodeId: updated.periodeId,
          pelanggan: row.pelanggan,
          tagihan: t,
        };
      }
    );

    // === Magic link user WARGA ===
    let userId = pelanggan.userId as string | undefined;
    if (!userId) {
      const username = pelanggan.kode;
      const pwd = randomToken(12);
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
      });
      userId = user.id;
      await prisma.pelanggan.update({
        where: { id: pelanggan.id },
        data: { userId },
      });
    }

    const token = randomToken(32);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.magicLinkToken.create({
      data: {
        token,
        userId: userId!,
        tagihanId: tagihan.id,
        purpose: "pembayaran",
        expiresAt,
      },
    });
    const origin = getAppOrigin(req);
    const magicUrl =
      origin && `${origin}/api/auth/magic?token=${encodeURIComponent(token)}`;

    // === Kirim WA (teks + gambar) ===
    if (sendWa && pelanggan?.wa) {
      const linkBaris = magicUrl
        ? `\n\nUnggah bukti pembayaran dengan aman via tautan berikut:\n${magicUrl}`
        : "";

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
          periode: billingPeriode, // kirim periode billing (+1)
          meterAwal: row.meterAwal,
          meterAkhir: Math.max(row.meterAkhir ?? row.meterAwal, row.meterAwal),
          pemakaian: Math.max(
            0,
            (row.meterAkhir ?? row.meterAwal) - row.meterAwal
          ),
          tarifPerM3: tarif,
          abonemen: abon,
          biayaAdmin,
          tagihanLalu: tagihan.tagihanLalu,
          tagihanBulanIni: tagihan.totalTagihan,
          sisaKurang: tagihan.sisaKurang,
          total,
          due,
          tglCatat: now, // hanya untuk ditampilkan di WA
        }) + linkBaris;

      (async () => {
        try {
          await sendWaAndLog(pelanggan.wa!, text);
        } catch {}
        try {
          const caption = `Tagihan Air Periode ${new Date(
            `${billingPeriode}-01`
          ).toLocaleDateString("id-ID", {
            month: "long",
            year: "numeric",
          })} - ${pelanggan.nama}`;
          await sendWaImageAndLog(pelanggan.wa!, tagihan.id, caption);
        } catch {}
      })();
    }

    return NextResponse.json({ ok: true, locked: true, tagihan });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

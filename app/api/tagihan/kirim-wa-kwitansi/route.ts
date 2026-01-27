import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { renderKwitansiToJPG } from "@/lib/render-kwitansi";
import { sendWaAndLog, sendWaImageAndLog } from "@/lib/wa-send";

export const runtime = "nodejs";

function getAppOrigin(req: NextRequest) {
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (process.env.NODE_ENV === "production" ? "https" : "http");

  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    "localhost:3000";

  return `${proto}://${host}`;
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
  periode: string;
  tanggalBayar: Date;
  metode: string;
  jumlahBayar: number;
  totalTagihan: number;
}) {
  const lines: string[] = [];
  lines.push(
    `Halo *${p.nama || "Pelanggan"}*,`,
    `Pembayaran tagihan air Anda telah *TERVERIFIKASI*.`,
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
    `• Jumlah Dibayar : *${formatRp(p.jumlahBayar)}*`,
  );
  const kontak: string[] = [];
  if (p.setting?.whatsapp)
    kontak.push(`WhatsApp:\nKlik nomor berikut -> ${p.setting.whatsapp}`);
  if (kontak.length) lines.push("", "*Kontak*", kontak.join("\n"));
  lines.push("", "Terima kasih 🙏");
  return lines.map((s) => s.replace(/[ \t]+$/g, "")).join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const { tagihanId } = await req.json();
    if (!tagihanId)
      return NextResponse.json(
        { ok: false, message: "tagihanId wajib diisi" },
        { status: 400 },
      );

    // Auth
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
            { status: 403 },
          );
      }
    } catch {}

    const tagihan = await prisma.tagihan.findUnique({
      where: { id: tagihanId },
      include: {
        pelanggan: {
          select: { nama: true, kode: true, wa: true, alamat: true },
        },
      },
    });
    if (!tagihan)
      return NextResponse.json(
        { ok: false, message: "Tagihan tidak ditemukan" },
        { status: 404 },
      );

    const closedBy = parseClosedByOrPaidBy(tagihan.info);
    const paidAtTag = parsePaidAt(tagihan.info);

    let pembayaran = await prisma.pembayaran.findFirst({
      where: { tagihanId, deletedAt: null },
      orderBy: { tanggalBayar: "desc" },
    });

    const totalBulanIni = tagihan.totalTagihan ?? 0;
    const carryOver = tagihan.tagihanLalu ?? 0;
    const totalDitagihkan = totalBulanIni + carryOver;

    if (!pembayaran && closedBy) {
      const anchor = await prisma.tagihan.findUnique({
        where: {
          pelangganId_periode: {
            pelangganId: tagihan.pelangganId,
            periode: closedBy,
          },
        },
        select: { id: true },
      });
      let anchorPay: any = null;
      if (anchor && paidAtTag) {
        const gte = new Date(paidAtTag);
        gte.setHours(0, 0, 0, 0);
        const lte = new Date(paidAtTag);
        lte.setHours(23, 59, 59, 999);
        anchorPay = await prisma.pembayaran.findFirst({
          where: {
            tagihanId: anchor.id,
            deletedAt: null,
            tanggalBayar: { gte, lte },
          },
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

    const sum = await prisma.pembayaran.aggregate({
      where: { tagihanId, deletedAt: null },
      _sum: { jumlahBayar: true },
    });
    const totalPaid = sum._sum.jumlahBayar || 0;
    const isLunas = !!closedBy || totalPaid >= totalDitagihkan;
    if (!isLunas)
      return NextResponse.json(
        {
          ok: false,
          message: "Belum lunas. Kwitansi dikirim jika tagihan sudah lunas.",
        },
        { status: 400 },
      );

    if (!tagihan.pelanggan?.wa)
      return NextResponse.json(
        { ok: false, message: "Nomor WA pelanggan kosong" },
        { status: 400 },
      );
    if (!pembayaran)
      return NextResponse.json(
        { ok: false, message: "Tidak ada data pembayaran/penutupan" },
        { status: 400 },
      );

    const origin = getAppOrigin(req);
    const res = NextResponse.json({ ok: true }); // balas cepat

    setImmediate(async () => {
      try {
        const payIdParam =
          pembayaran.id && pembayaran.id !== "virtual"
            ? `?payId=${pembayaran.id}`
            : "";
        const out = await renderKwitansiToJPG({
          tplUrl: `${origin}/print/kwitansi/${tagihan.id}${payIdParam}`,
          outName: `kwitansi-${tagihan.id}-${pembayaran.id || "auto"}.jpg`,
          persist: false,
        });

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

        if (!out || !("base64" in out) || !out.base64) {
          console.error("[KWITANSI] render gagal, kirim teks saja");
          return;
        }

        const caption = `Kwitansi Pembayaran Periode ${periodLong(
          tagihan.periode,
        )} - ${tagihan.pelanggan?.nama || ""}`;
        await sendWaImageAndLog(tagihan.pelanggan.wa!, {
          base64: out.base64,
          filename: out.filename,
          caption,
        });
      } catch (e) {
        console.error("[kirim-wa-kwitansi] error:", e);
      }
    });

    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Server error" },
      { status: 500 },
    );
  }
}

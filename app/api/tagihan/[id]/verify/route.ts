import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { renderKwitansiToJPG } from "@/lib/render-kwitansi";
import { sendWaAndLog, sendWaImageAndLog } from "@/lib/wa-send";

export const runtime = "nodejs";

/* ===== helpers kecil ===== */
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
  if (p.setting?.whatsapp)
    kontak.push(`WhatsApp:\nKlik nomor berikut -> ${p.setting.whatsapp}`);
  if (kontak.length) lines.push("", "*Kontak*", kontak.join("\n"));
  lines.push("", "Terima kasih 🙏");
  return lines.map((s) => s.replace(/[ \t]+$/g, "")).join("\n");
}

/* ===== PATCH /api/tagihan/:id/verify ===== */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await (req as any).json()) ?? {};
    const to =
      typeof body.verified === "boolean"
        ? body.verified
          ? "VERIFIED"
          : "UNVERIFIED"
        : body.action === "UNVERIFY"
        ? "UNVERIFIED"
        : "VERIFIED";

    // auth sederhana
    try {
      const uid = await getAuthUserId(req as any);
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
      }
    } catch {}

    // update verif
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

    if (to !== "VERIFIED") return NextResponse.json({ ok: true, tagihan: t });

    // pembayaran terbaru
    const pembayaran = await prisma.pembayaran.findFirst({
      where: { tagihanId: id, deletedAt: null },
      orderBy: { tanggalBayar: "desc" },
    });
    if (!pembayaran) {
      return NextResponse.json(
        { ok: false, message: "Belum ada pembayaran untuk diverifikasi" },
        { status: 400 }
      );
    }

    const totalDitagihkan = (t.totalTagihan ?? 0) + (t.tagihanLalu ?? 0);

    const [pelanggan, setting] = await Promise.all([
      prisma.pelanggan.findUnique({
        where: { id: t.pelangganId },
        select: { nama: true, kode: true, wa: true },
      }),
      prisma.setting.findUnique({ where: { id: 1 } }),
    ]);

    const origin = getAppOrigin(req as any);
    const res = NextResponse.json({
      ok: true,
      tagihan: { ...t, totalDitagihkan },
    });

    // background: render → base64 → kirim WA (jika diminta atau default on)
    setImmediate(async () => {
      try {
        const rendered = await renderKwitansiToJPG({
          tplUrl: `${origin}/print/kwitansi/${id}?payId=${pembayaran.id}`,
          outName: `kwitansi-${id}-${pembayaran.id}.jpg`,
          persist: false as any, // jika util lama: akan diabaikan & return string → masih aman
        });

        const shouldSendWa = body.sendWa ?? true; // <-- default true kalau mau otomatis
        if (shouldSendWa && pelanggan?.wa) {
          // TEXT
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
          } catch (e) {
            console.error("[verify:send text] ", e);
          }

          // IMAGE (normalize ke base64 kalau render mengembalikan string)
          try {
            let base64: string, filename: string;
            if (typeof rendered === "string") {
              // fetch file/URL → buffer → base64
              const r = await fetch(rendered);
              const buf = Buffer.from(await r.arrayBuffer());
              base64 = buf.toString("base64");
              filename = rendered.split("/").pop() || `kwitansi-${id}.jpg`;
            } else {
              base64 = rendered.base64;
              filename = rendered.filename;
            }
            await sendWaImageAndLog(pelanggan.wa!, {
              base64,
              filename,
              caption: `Kwitansi Pembayaran Periode ${periodLong(
                t.periode
              )} - ${pelanggan?.nama || ""}`,
            });
          } catch (e) {
            console.error("[verify:send image] ", e);
          }
        }
      } catch (e) {
        console.error("[verify:bg] ", e);
      }
    });

    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

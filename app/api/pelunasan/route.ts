import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MetodeBayar } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";
import { getAuthUserId } from "@/lib/auth";

export const runtime = "nodejs";

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

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const tagihanId = String(form.get("tagihanId") || "");
    const nominalBayar = Number(form.get("nominalBayar") || 0);
    const tanggalStr = String(form.get("tanggalBayar") || "");
    const metodeRaw = String(form.get("metodeBayar") || "").toUpperCase();
    const keterangan = String(form.get("keterangan") || "");
    const file = form.get("buktiFile") as File | null;

    if (!tagihanId || !nominalBayar || !metodeRaw) {
      return NextResponse.json({ ok: false, message: "Data wajib belum lengkap" }, { status: 400 });
    }

    const allow = ["TUNAI", "TRANSFER", "EWALLET", "QRIS"] as const;
    const metode: MetodeBayar = (allow as readonly string[]).includes(metodeRaw)
      ? (metodeRaw as MetodeBayar)
      : MetodeBayar.TUNAI;

    const buktiUrl = await saveUpload(file);
    const tanggalBayar = tanggalStr ? new Date(tanggalStr) : new Date();

    // --- ambil user (opsional, untuk adminBayar)
    let adminName: string | null = null;
    try {
      const userId = await getAuthUserId(req);
      if (userId) {
        const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, role: true } });
        if (u && u.role !== "WARGA") adminName = u.name ?? null;
      }
    } catch {}

    // ★ denda: hitung dan sinkronkan denda ke Tagihan sebelum hitung status
    const [tRow, setting] = await Promise.all([
      prisma.tagihan.findUnique({
        where: { id: tagihanId },
        select: { id: true, periode: true, tglJatuhTempo: true, denda: true, totalTagihan: true },
      }),
      prisma.setting.findUnique({
        where: { id: 1 },
        select: { tglJatuhTempo: true, dendaTelatBulanSama: true, dendaTelatBulanBerbeda: true },
      }),
    ]);
    if (!tRow) return NextResponse.json({ ok: false, message: "Tagihan tidak ditemukan" }, { status: 404 });

    // tentukan due date: pakai kolom tagihan; fallback dari setting + periode
    const due =
      tRow.tglJatuhTempo ??
      (() => {
        try {
          const d = new Date(`${tRow.periode}-01T00:00:00`);
          d.setDate(Math.max(1, setting?.tglJatuhTempo ?? 15));
          return d;
        } catch {
          return null as any;
        }
      })();

    const calcDenda = (() => {
      if (!due || Number.isNaN(due.getTime()) || tanggalBayar <= due) return 0;
      const diffDays = Math.ceil((tanggalBayar.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      const diffMonths = Math.floor(diffDays / 30);
      const denda1 = setting?.dendaTelatBulanSama ?? 0;       // bulan ke-1
      const denda2 = setting?.dendaTelatBulanBerbeda ?? 0;    // bulan ke-2+
      return diffMonths === 0 ? denda1 : denda2;
    })();

    // update hanya jika berubah (menghindari write tak perlu)
    let dendaFinal = tRow.denda ?? 0;
    if (calcDenda !== dendaFinal) {
      await prisma.tagihan.update({ where: { id: tagihanId }, data: { denda: calcDenda } });
      dendaFinal = calcDenda;
    }
    // ★ end denda

    // Simpan pembayaran
    const pay = await prisma.pembayaran.create({
      data: {
        tagihanId,
        jumlahBayar: Math.round(nominalBayar),
        tanggalBayar,
        buktiUrl,
        adminBayar: adminName,
        metode,
        keterangan: keterangan ? keterangan : null,
      },
    });

    // Hitung ulang status Tagihan (gunakan dendaFinal yang baru)
    const agg = await prisma.pembayaran.aggregate({
      where: { tagihanId, deletedAt: null },
      _sum: { jumlahBayar: true },
    });

    const harus = (tRow.totalTagihan ?? 0) + dendaFinal;
    const sudah = agg._sum.jumlahBayar ?? 0;

    await prisma.tagihan.update({
      where: { id: tagihanId },
      data: { statusBayar: sudah >= harus ? "PAID" : "UNPAID" },
    });

    return NextResponse.json({ ok: true, pembayaran: pay });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "Server error" }, { status: 500 });
  }
}

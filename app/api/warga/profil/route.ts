// app/api/warga/profil/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

function jsonOk(data: any) {
  return NextResponse.json({ ok: true, data });
}
function jsonErr(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) return jsonErr(401, "UNAUTHORIZED");

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { pelanggan: { include: { zona: true } } },
    });
    if (!user || !user.pelanggan) {
      return jsonErr(404, "Profil pelanggan tidak ditemukan");
    }

    const p = user.pelanggan;
    const payload = {
      customerId: p.id,
      name: p.nama,
      code: p.kode,
      zone: p.zona?.nama || "-",
      // ganti ke kolom serial meter riil kalau ada (misal: p.nomorMeter)
      meterSerial: p.id,
      address: p.alamat,
      phone: p.wa || user.phone || null,
    };

    return jsonOk(payload);
  } catch (e) {
    console.error("GET /api/warga/profil error:", e);
    return jsonErr(500, "Internal Server Error");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) return jsonErr(401, "UNAUTHORIZED");

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim();
    const phone = String(body?.phone ?? "").trim();
    const address = String(body?.address ?? "").trim();

    if (!name) return jsonErr(422, "Nama wajib diisi");

    // pastikan user memiliki pelanggan
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { pelanggan: true },
    });
    if (!user || !user.pelanggan)
      return jsonErr(404, "Profil pelanggan tidak ditemukan");

    // normalisasi nomor WA/telepon sederhana
    const normalizedPhone =
      phone === "" ? null : phone.replace(/[^0-9+]/g, "").replace(/^0/, "62"); // opsional: ganti leading 0 → 62

    // update di dua tempat yang relevan:
    // - Pelanggan: nama, wa, alamat
    // - User: phone (opsional sinkron)
    const [pelangganUpdated] = await prisma.$transaction([
      prisma.pelanggan.update({
        where: { id: user.pelanggan.id },
        data: {
          nama: name,
          wa: normalizedPhone,
          alamat: address,
        },
        include: { zona: true },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          phone: normalizedPhone || undefined,
          name: name,
        },
      }),
    ]);

    const payload = {
      customerId: pelangganUpdated.id,
      name: pelangganUpdated.nama,
      code: pelangganUpdated.kode,
      zone: pelangganUpdated.zona?.nama || "-",
      meterSerial: pelangganUpdated.id, // ganti bila ada kolom serial meter riil
      address: pelangganUpdated.alamat,
      phone: pelangganUpdated.wa || null,
    };

    return jsonOk(payload);
  } catch (e) {
    console.error("PUT /api/warga/profil error:", e);
    return jsonErr(500, "Internal Server Error");
  }
}

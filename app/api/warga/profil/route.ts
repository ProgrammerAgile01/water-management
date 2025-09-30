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
      lat: (p as any).lat ?? null, // pastikan kolom lat/lng sudah ditambahkan di schema & migration
      lng: (p as any).lng ?? null,
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

    // lat/lng boleh undefined (tidak diubah), null (kosongkan), atau number (set nilai)
    const latRaw = body?.lat;
    const lngRaw = body?.lng;

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

    // siapkan perubahan untuk pelanggan
    const pelangganData: any = {
      nama: name,
      wa: normalizedPhone,
      alamat: address,
    };

    // kelola lat/lng jika dikirim
    function isNullish(v: any) {
      return v === null || v === undefined;
    }

    if (!isNullish(latRaw) || !isNullish(lngRaw)) {
      // harus keduanya null atau keduanya number valid
      if (latRaw === null && lngRaw === null) {
        pelangganData.lat = null;
        pelangganData.lng = null;
      } else {
        const lat = Number(latRaw);
        const lng = Number(lngRaw);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return jsonErr(422, "Latitude/Longitude harus angka valid.");
        }
        if (lat < -90 || lat > 90)
          return jsonErr(422, "Latitude harus -90…90.");
        if (lng < -180 || lng > 180)
          return jsonErr(422, "Longitude harus -180…180.");
        pelangganData.lat = lat;
        pelangganData.lng = lng;
      }
    }

    // update di dua tempat yang relevan:
    // - Pelanggan: nama, wa, alamat
    // - User: phone (opsional sinkron)
    const [pelangganUpdated] = await prisma.$transaction([
      prisma.pelanggan.update({
        where: { id: user.pelanggan.id },
        data: pelangganData,
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
      lat: (pelangganUpdated as any).lat ?? null,
      lng: (pelangganUpdated as any).lng ?? null,
    };

    return jsonOk(payload);
  } catch (e) {
    console.error("PUT /api/warga/profil error:", e);
    return jsonErr(500, "Internal Server Error");
  }
}

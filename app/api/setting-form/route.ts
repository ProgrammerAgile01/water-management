// app/api/setting-form/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Hanya field profil (bukan tarif)
const SystemSchema = z.object({
  namaPerusahaan: z.string().max(120).nullable().optional(),
  alamat: z.string().max(255).nullable().optional(),
  telepon: z.string().max(30).nullable().optional(),
  email: z.string().email().max(120).nullable().optional(),
  logoUrl: z.string().max(255).nullable().optional(),
});

export async function GET() {
  try {
    // pastikan row id=1 ada
    const data =
      (await prisma.setting.findUnique({ where: { id: 1 } })) ??
      (await prisma.setting.create({
        data: {
          id: 1,
          // nilai default aman; tarif tidak disentuh di endpoint ini
          tarifPerM3: 3000,
          abonemen: 10000,
          biayaAdmin: 2500,
          tglJatuhTempo: 15,
          dendaTelatBulanSama: 5000,
          dendaTelatBulanBerbeda: 10000,
        },
      }));

    // kirim hanya field profil
    return NextResponse.json({
      namaPerusahaan: data.namaPerusahaan ?? "",
      alamat: data.alamat ?? "",
      telepon: data.telepon ?? "",
      email: data.email ?? "",
      logoUrl: data.logoUrl ?? "",
    });
  } catch (e) {
    console.error("GET /api/setting-form error:", e);
    return NextResponse.json({ message: "Gagal memuat profil" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const payload = await req.json().catch(() => ({}));
    const parsed = SystemSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validasi gagal", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await prisma.setting.upsert({
      where: { id: 1 },
      update: { ...parsed.data },
      create: { id: 1, ...parsed.data },
      select: {
        namaPerusahaan: true,
        alamat: true,
        telepon: true,
        email: true,
        logoUrl: true,
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("PUT /api/setting-form error:", e);
    return NextResponse.json({ message: "Gagal menyimpan profil" }, { status: 500 });
  }
}
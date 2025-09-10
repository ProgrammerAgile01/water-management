// app/api/setting/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma"



// skema validasi untuk update tarif & profil (boleh kirim subset/partial)
const SettingSchema = z.object({
  tarifPerM3: z.number().int().min(0).optional(),
  abonemen: z.number().int().min(0).optional(),
  biayaAdmin: z.number().int().min(0).optional(),
  tglJatuhTempo: z.number().int().min(1).max(28).optional(),
  dendaTelatBulanSama: z.number().int().min(0).optional(),
  dendaTelatBulanBerbeda: z.number().int().min(0).optional(),
  // profil sistem
  namaPerusahaan: z.string().max(120).optional().nullable(),
  alamat: z.string().max(255).optional().nullable(),
  telepon: z.string().max(30).optional().nullable(),
  email: z.string().email().max(120).optional().nullable(),
  logoUrl: z.string().max(255).optional().nullable(),
});

// GET: baca / buat default jika belum ada
export async function GET() {
  try {
    const data =
      (await prisma.setting.findUnique({ where: { id: 1 } })) ??
      (await prisma.setting.create({
        data: {
          id: 1,
          tarifPerM3: 3000,
          abonemen: 10000,
          biayaAdmin: 2500,
          tglJatuhTempo: 15,
          dendaTelatBulanSama: 5000,
          dendaTelatBulanBerbeda: 10000,
          namaPerusahaan: "Tirta Bening",
          alamat: "",
          telepon: "",
          email: "",
          logoUrl: "",
        },
      }));

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/setting error:", err);
    return NextResponse.json({ message: "Failed to load setting" }, { status: 500 });
  }
}

// PUT: update sebagian / seluruh kolom
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const parsed = SettingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validasi gagal", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await prisma.setting.upsert({
      where: { id: 1 },
      update: parsed.data,         // partial OK
      create: { id: 1, ...parsed.data },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/setting error:", err);
    return NextResponse.json({ message: "Failed to update setting" }, { status: 500 });
  }
}
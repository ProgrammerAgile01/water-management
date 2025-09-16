// app/api/setting/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Optional: pastikan route selalu dieksekusi secara dinamis
export const dynamic = "force-dynamic";

// Util: buang key yang bernilai undefined (Prisma tidak menerima undefined)
function cleanData<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

// Validasi payload untuk pengaturan tarif + profil + jadwal (opsional)
const SettingSchema = z.object({
  // Tarif & penagihan
  tarifPerM3: z.number().int().min(0).optional(),
  abonemen: z.number().int().min(0).optional(),
  biayaAdmin: z.number().int().min(0).optional(),
  tglJatuhTempo: z.number().int().min(1).max(28).optional(),
  dendaTelatBulanSama: z.number().int().min(0).optional(),
  dendaTelatBulanBerbeda: z.number().int().min(0).optional(),

  // Profil sistem
  namaPerusahaan: z.string().max(120).optional().nullable(),
  alamat: z.string().max(255).optional().nullable(),
  telepon: z.string().max(30).optional().nullable(),
  email: z.string().email().max(120).optional().nullable(),
  logoUrl: z.string().max(255).optional().nullable(),

  // Pembayaran & kontak
  namaBankPembayaran: z.string().max(120).optional().nullable(),
  norekPembayaran: z.string().max(50).optional().nullable(),
  anNorekPembayaran: z.string().max(120).optional().nullable(),
  namaBendahara: z.string().max(120).optional().nullable(),
  whatsappCs: z.string().max(30).optional().nullable(),

  // Jadwal
  tanggalCatatDefault: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});

// GET
export async function GET() {
  try {
    const row =
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

          // field baru default kosong
          namaBankPembayaran: "",
          norekPembayaran: "",
          anNorekPembayaran: "",
          namaBendahara: "",
          whatsappCs: "",

          tanggalCatatDefault: null,
        },
      }));

    return NextResponse.json({
      ...row,
      tanggalCatatDefault: row.tanggalCatatDefault
        ? row.tanggalCatatDefault.toISOString().slice(0, 10)
        : null,
    });
  } catch (err) {
    console.error("GET /api/setting error:", err);
    return NextResponse.json(
      { message: "Gagal memuat setting" },
      { status: 500 }
    );
  }
}

// PUT
export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = SettingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validasi gagal", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = cleanData(parsed.data) as any;

    if ("tanggalCatatDefault" in data) {
      data.tanggalCatatDefault =
        data.tanggalCatatDefault == null
          ? null
          : new Date(`${data.tanggalCatatDefault}T00:00:00.000Z`);
    }

    const updated = await prisma.setting.upsert({
      where: { id: 1 },
      update: data,
      create: {
        id: 1,
        tarifPerM3: 3000,
        abonemen: 10000,
        biayaAdmin: 2500,
        tglJatuhTempo: 15,
        dendaTelatBulanSama: 5000,
        dendaTelatBulanBerbeda: 10000,

        namaPerusahaan: "",
        alamat: "",
        telepon: "",
        email: "",
        logoUrl: "",

        // field baru default
        namaBankPembayaran: "",
        norekPembayaran: "",
        anNorekPembayaran: "",
        namaBendahara: "",
        whatsappCs: "",

        tanggalCatatDefault: null,
        ...data,
      },
    });

    return NextResponse.json({
      ...updated,
      tanggalCatatDefault: updated.tanggalCatatDefault
        ? updated.tanggalCatatDefault.toISOString().slice(0, 10)
        : null,
    });
  } catch (err) {
    console.error("PUT /api/setting error:", err);
    return NextResponse.json(
      { message: "Gagal memperbarui setting" },
      { status: 500 }
    );
  }
}

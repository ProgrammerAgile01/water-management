// // app/api/setting/route.ts

// import { NextResponse } from "next/server";
// import { z } from "zod";
// import { db } from "@/lib/db";
// export const dynamic = "force-dynamic";

// function cleanData<T extends Record<string, any>>(obj: T): Partial<T> {
//   const out: Record<string, any> = {};
//   for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
//   return out as Partial<T>;
// }

// const SettingSchema = z.object({
//   // Tarif & penagihan
//   tarifPerM3: z.number().int().min(0).optional(),
//   abonemen: z.number().int().min(0).optional(),
//   biayaAdmin: z.number().int().min(0).optional(),
//   tglJatuhTempo: z.number().int().min(1).max(28).optional(),
//   dendaTelatBulanSama: z.number().int().min(0).optional(),
//   dendaTelatBulanBerbeda: z.number().int().min(0).optional(),

//   // Profil
//   namaPerusahaan: z.string().max(120).optional().nullable(),
//   alamat: z.string().max(255).optional().nullable(),
//   telepon: z.string().max(30).optional().nullable(),
//   email: z.string().email().max(120).optional().nullable(),
//   logoUrl: z.string().max(255).optional().nullable(),

//   // Pembayaran & kontak
//   namaBankPembayaran: z.string().max(120).optional().nullable(),
//   norekPembayaran: z.string().max(50).optional().nullable(),
//   anNorekPembayaran: z.string().max(120).optional().nullable(),
//   namaBendahara: z.string().max(120).optional().nullable(),
//   whatsappCs: z.string().max(30).optional().nullable(),

//   // Jadwal — sekarang integer hari 1..31
//   tanggalCatatDefault: z.number().int().min(1).max(31).optional().nullable(),
// });

// // GET
// export async function GET() {
//   const prisma = await db();
//   try {
//     const row =
//       (await prisma.setting.findUnique({ where: { id: 1 } })) ??
//       (await prisma.setting.create({
//         data: {
//           id: 1,
//           tarifPerM3: 3000,
//           abonemen: 10000,
//           biayaAdmin: 2500,
//           tglJatuhTempo: 15,
//           dendaTelatBulanSama: 5000,
//           dendaTelatBulanBerbeda: 10000,
//           namaPerusahaan: "Tirta Bening",
//           alamat: "",
//           telepon: "",
//           email: "",
//           logoUrl: "",
//           namaBankPembayaran: "",
//           norekPembayaran: "",
//           anNorekPembayaran: "",
//           namaBendahara: "",
//           whatsappCs: "",
//           tanggalCatatDefault: null, // integer
//         },
//       }));

//     return NextResponse.json({
//       ...row,
//       // langsung kirim integer atau null
//       tanggalCatatDefault: row.tanggalCatatDefault ?? null,
//     });
//   } catch (err) {
//     console.error("GET /api/setting error:", err);
//     return NextResponse.json(
//       { message: "Gagal memuat setting" },
//       { status: 500 }
//     );
//   }
// }

// // PUT
// export async function PUT(req: Request) {
//   const prisma = await db();
//   try {
//     const body = await req.json().catch(() => ({}));
//     const parsed = SettingSchema.safeParse(body);
//     if (!parsed.success) {
//       return NextResponse.json(
//         { message: "Validasi gagal", issues: parsed.error.flatten() },
//         { status: 400 }
//       );
//     }

//     const data = cleanData(parsed.data);

//     const updated = await prisma.setting.upsert({
//       where: { id: 1 },
//       update: data,
//       create: {
//         id: 1,
//         tarifPerM3: 3000,
//         abonemen: 10000,
//         biayaAdmin: 2500,
//         tglJatuhTempo: 15,
//         dendaTelatBulanSama: 5000,
//         dendaTelatBulanBerbeda: 10000,
//         namaPerusahaan: "",
//         alamat: "",
//         telepon: "",
//         email: "",
//         logoUrl: "",
//         namaBankPembayaran: "",
//         norekPembayaran: "",
//         anNorekPembayaran: "",
//         namaBendahara: "",
//         whatsappCs: "",
//         tanggalCatatDefault: null,
//         ...data,
//       },
//     });

//     return NextResponse.json({
//       ...updated,
//       tanggalCatatDefault: updated.tanggalCatatDefault ?? null,
//     });
//   } catch (err) {
//     console.error("PUT /api/setting error:", err);
//     return NextResponse.json(
//       { message: "Gagal memperbarui setting" },
//       { status: 500 }
//     );
//   }
// }

// app/api/setting/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

// helper: "" -> null (untuk field nullable)
const toNullIfEmpty = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    schema
  );

// helper: buang undefined (biar partial update tidak nulis undefined)
function cleanData<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out as Partial<T>;
}

const SettingSchema = z.object({
  // Tarif & penagihan (coerce number, boleh null)
  tarifPerM3: z.coerce.number().int().min(0).optional().nullable(),
  abonemen: z.coerce.number().int().min(0).optional().nullable(),
  biayaAdmin: z.coerce.number().int().min(0).optional().nullable(),
  tglJatuhTempo: z.coerce.number().int().min(1).max(28).optional().nullable(),
  dendaTelatBulanSama: z.coerce.number().int().min(0).optional().nullable(),
  dendaTelatBulanBerbeda: z.coerce.number().int().min(0).optional().nullable(),

  // Profil (nullable string; ""->null)
  namaPerusahaan: toNullIfEmpty(z.string().max(120)).optional().nullable(),
  alamat: toNullIfEmpty(z.string().max(255)).optional().nullable(),
  telepon: toNullIfEmpty(z.string().max(30)).optional().nullable(),
  email: toNullIfEmpty(z.string().email().max(120)).optional().nullable(),
  logoUrl: toNullIfEmpty(z.string().max(255)).optional().nullable(),

  // Pembayaran & kontak
  namaBankPembayaran: toNullIfEmpty(z.string().max(120)).optional().nullable(),
  norekPembayaran: toNullIfEmpty(z.string().max(50)).optional().nullable(),
  anNorekPembayaran: toNullIfEmpty(z.string().max(120)).optional().nullable(),
  namaBendahara: toNullIfEmpty(z.string().max(120)).optional().nullable(),
  whatsappCs: toNullIfEmpty(z.string().max(30)).optional().nullable(),

  // Jadwal — integer hari 1..31 (nullable)
  tanggalCatatDefault: z.coerce
    .number()
    .int()
    .min(1)
    .max(31)
    .optional()
    .nullable(),
});

// GET: kembalikan row; kalau belum ada, buat minimal {id:1} TANPA default angka
export async function GET() {
  try {
    const row = await prisma.setting.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 }, // ⬅️ jangan isi default tarif di sini kalau maunya kosong
    });

    return NextResponse.json({
      ...row,
      tanggalCatatDefault: row.tanggalCatatDefault ?? null,
    });
  } catch (err) {
    console.error("GET /api/setting error:", err);
    return NextResponse.json(
      { message: "Gagal memuat setting" },
      { status: 500 }
    );
  }
}

// PUT: upsert lalu update field yang dikirim
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

    const data = cleanData(parsed.data);

    // pastikan row ada
    await prisma.setting.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });

    // update partial sesuai input
    const updated = await prisma.setting.update({
      where: { id: 1 },
      data,
    });

    return NextResponse.json({
      ...updated,
      tanggalCatatDefault: updated.tanggalCatatDefault ?? null,
    });
  } catch (err) {
    console.error("PUT /api/setting error:", err);
    return NextResponse.json(
      { message: "Gagal memperbarui setting" },
      { status: 500 }
    );
  }
}

// app/api/jadwal/sync-tanggal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// type guard supaya TS aman
function isBulan(x: unknown): x is string {
  return typeof x === "string" && /^\d{4}-\d{2}$/.test(x);
}

async function doSync(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  let bulan: unknown = sp.get("bulan");

  if (!isBulan(bulan)) {
    const body = await req.json().catch(() => ({}));
    if (isBulan(body?.bulan)) bulan = body.bulan;
  }

  if (!isBulan(bulan)) {
    const setting = await prisma.setting.findUnique({
      where: { id: 1 },
      select: { periodeJadwalAktif: true },
    });
    if (isBulan(setting?.periodeJadwalAktif))
      bulan = setting!.periodeJadwalAktif!;
  }

  if (!isBulan(bulan)) {
    const latest = await prisma.jadwalPencatatan.findFirst({
      orderBy: { bulan: "desc" },
      select: { bulan: true },
    });
    if (isBulan(latest?.bulan)) bulan = latest!.bulan!;
  }

  if (!isBulan(bulan)) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Bulan tidak ditemukan. Sertakan ?bulan=YYYY-MM atau set di Pengaturan.",
      },
      { status: 400 }
    );
  }

  const setting = await prisma.setting.findUnique({
    where: { id: 1 },
    select: { tanggalCatatDefault: true },
  });
  if (!setting?.tanggalCatatDefault) {
    return NextResponse.json(
      { ok: false, message: "tanggalCatatDefault belum diisi di Pengaturan." },
      { status: 400 }
    );
  }

  const planDate = setting.tanggalCatatDefault; // Date dari Prisma
  const { count } = await prisma.jadwalPencatatan.updateMany({
    where: { bulan },
    data: { tanggalRencana: planDate },
  });

  return NextResponse.json({
    ok: true,
    updated: count,
    message: `Tanggal rencana bulan ${bulan} diset ke ${planDate
      .toISOString()
      .slice(0, 10)}.`,
  });
}

// ✅ terima POST
export async function POST(req: NextRequest) {
  try {
    return await doSync(req);
  } catch (e: any) {
    console.error("POST /api/jadwal/sync-tanggal error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

// ✅ alias GET → POST (hindari 405)
export async function GET(req: NextRequest) {
  try {
    return await doSync(req);
  } catch (e: any) {
    console.error("GET /api/jadwal/sync-tanggal error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

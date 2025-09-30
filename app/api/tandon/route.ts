// app/api/tandon/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PREFIX = "TDN-";
const PAD = 3; // TDN-001

async function getNextTandonCode() {
  const last = await prisma.tandon.findFirst({
    where: { kode: { startsWith: PREFIX } },
    orderBy: { kode: "desc" },
    select: { kode: true },
  });
  const lastNum = Number(last?.kode.match(/\d+$/)?.[0] || "0");
  const nextNum = lastNum + 1;
  return `${PREFIX}${String(nextNum).padStart(PAD, "0")}`;
}

/**
 * GET
 * - List     : ?page=1&pageSize=20&q=...
 * - Next code: ?action=next-code
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "next-code") {
      const kode = await getNextTandonCode();
      return NextResponse.json({ ok: true, kode });
    }

    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get("pageSize") || 20))
    );
    const q = (searchParams.get("q") || "").trim();

    const where = q
      ? {
          OR: [
            { kode: { contains: q, mode: "insensitive" } },
            { nama: { contains: q, mode: "insensitive" } },
            { deskripsi: { contains: q, mode: "insensitive" } },
          ],
        }
      : {};

    const [total, items] = await Promise.all([
      prisma.tandon.count({ where }),
      prisma.tandon.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          kode: true,
          nama: true,
          deskripsi: true,
          initialMeter: true, // ⬅️ NEW
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return NextResponse.json({ ok: true, items, total, page, pageSize });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Failed" },
      { status: 500 }
    );
  }
}

/**
 * POST
 * Body: { kode?: string, nama: string, deskripsi?: string|null, initialMeter?: number }
 * - Jika kode kosong, akan auto-generate
 */
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}));
    const nama: string | undefined = b?.nama;
    const deskripsi: string | null = (b?.deskripsi ?? null) || null;
    const initialMeter: number = Math.max(0, Number(b?.initialMeter) || 0);
    const rawKode: string | undefined = b?.kode;

    if (!nama?.trim()) {
      return NextResponse.json(
        { ok: false, message: "Nama wajib diisi" },
        { status: 400 }
      );
    }

    // Jika user memberikan kode spesifik → pakai langsung, biarkan DB enforce unique
    if (rawKode?.trim()) {
      try {
        const created = await prisma.tandon.create({
          data: {
            kode: rawKode.trim().toUpperCase(),
            nama: nama.trim(),
            deskripsi,
            initialMeter,
          },
        });
        return NextResponse.json({ ok: true, item: created });
      } catch (e: any) {
        const msg = String(e?.message || "");
        if (msg.includes("Unique constraint"))
          return NextResponse.json(
            { ok: false, message: "Kode sudah dipakai" },
            { status: 409 }
          );
        throw e;
      }
    }

    // Auto-generate kode dengan retry jika bentrok
    const MAX_RETRY = 5;
    let lastErr: any;
    for (let i = 0; i < MAX_RETRY; i++) {
      try {
        const kode = await getNextTandonCode();
        const created = await prisma.tandon.create({
          data: {
            kode,
            nama: nama.trim(),
            deskripsi,
            initialMeter,
          },
        });
        return NextResponse.json({ ok: true, item: created });
      } catch (e: any) {
        const msg = String(e?.message || "");
        if (!msg.includes("Unique constraint")) {
          lastErr = e;
          break;
        }
        lastErr = e; // retry next loop
      }
    }

    return NextResponse.json(
      { ok: false, message: lastErr?.message || "Gagal membuat tandon" },
      { status: 500 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Failed" },
      { status: 500 }
    );
  }
}

/**
 * PUT
 * Body: { id: string, kode?: string, nama?: string, deskripsi?: string|null, initialMeter?: number }
 */
export async function PUT(req: Request) {
  try {
    const b = await req.json().catch(() => ({}));
    const id: string | undefined = b?.id;
    if (!id)
      return NextResponse.json(
        { ok: false, message: "id wajib" },
        { status: 400 }
      );

    const data: any = {};
    if (typeof b?.kode === "string") data.kode = b.kode.trim().toUpperCase();
    if (typeof b?.nama === "string") data.nama = b.nama.trim();
    if (b?.deskripsi === null || typeof b?.deskripsi === "string")
      data.deskripsi = b.deskripsi;
    if (b?.initialMeter != null)
      data.initialMeter = Math.max(0, Number(b.initialMeter) || 0); // ⬅️ NEW

    try {
      const updated = await prisma.tandon.update({ where: { id }, data });
      return NextResponse.json({ ok: true, item: updated });
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg.includes("Unique constraint"))
        return NextResponse.json(
          { ok: false, message: "Kode sudah dipakai" },
          { status: 409 }
        );
      throw e;
    }
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Failed" },
      { status: 500 }
    );
  }
}

/**
 * DELETE
 * Body: { id: string }
 */
export async function DELETE(req: Request) {
  try {
    const b = await req.json().catch(() => ({}));
    const id: string | undefined = b?.id;
    if (!id)
      return NextResponse.json(
        { ok: false, message: "id wajib" },
        { status: 400 }
      );

    await prisma.tandon.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Failed" },
      { status: 500 }
    );
  }
}

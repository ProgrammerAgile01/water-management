// app/api/biaya/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function generateCode(nama: string) {
  const words = nama.trim().toUpperCase().split(/\s+/);
  let code = "";
  for (const w of words) {
    if (code.length >= 6) break;
    const clean = w.replace(/[^A-Z]/g, "");
    if (clean) code += clean.slice(0, 3);
  }
  if (code.length < 3) code = code.padEnd(3, "X");
  const rand = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0");
  return (code.slice(0, 6) + rand).slice(0, 8);
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const q = (sp.get("q") ?? "").trim().toLowerCase();
    const year = sp.get("year");

    const where: any = {};
    if (q) {
      where.OR = [
        { nama: { contains: q, mode: "insensitive" } },
        { kode: { contains: q, mode: "insensitive" } },
        { deskripsi: { contains: q, mode: "insensitive" } },
      ];
    }
    // Filter by year = tahun(createdAt)
    if (year) {
      const y = parseInt(year, 10);
      if (!Number.isNaN(y)) {
        const start = new Date(Date.UTC(y, 0, 1, 0, 0, 0));
        const end = new Date(Date.UTC(y + 1, 0, 1, 0, 0, 0));
        where.createdAt = { gte: start, lt: end };
      }
    }

    const items = await prisma.masterBiaya.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ items });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const nama: string = (body?.nama ?? "").trim();
    const deskripsi: string | undefined = body?.deskripsi?.trim() || undefined;
    const status: "Aktif" | "Nonaktif" =
      body?.status === "Nonaktif" ? "Nonaktif" : "Aktif";

    if (!nama || nama.length < 3) {
      return NextResponse.json(
        { error: "Nama minimal 3 karakter" },
        { status: 400 }
      );
    }

    let kode: string | undefined =
      body?.kode?.toString().trim().toUpperCase() || undefined;
    if (!kode) {
      // generate unique code
      for (let i = 0; i < 5; i++) {
        const cand = generateCode(nama);
        const exist = await prisma.masterBiaya
          .findUnique({ where: { kode: cand } })
          .catch(() => null);
        if (!exist) {
          kode = cand;
          break;
        }
      }
    } else {
      // pastikan unik
      const exist = await prisma.masterBiaya
        .findUnique({ where: { kode } })
        .catch(() => null);
      if (exist) {
        return NextResponse.json(
          { error: "Kode sudah digunakan" },
          { status: 409 }
        );
      }
    }

    const created = await prisma.masterBiaya.create({
      data: { nama, kode, deskripsi, status },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}

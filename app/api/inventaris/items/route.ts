import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateItemSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi"),
  kategori: z.string().optional().default(""),
  satuan: z.string().optional().default(""),
});

const PREFIX = "INV";
const WIDTH = 4;

async function generateNextKode(tx: typeof prisma) {
  const last = await tx.item.findFirst({
    where: { deletedAt: null, kode: { startsWith: PREFIX } },
    orderBy: { kode: "desc" },
    select: { kode: true },
  });
  let n = 0;
  if (last?.kode) {
    const m = last.kode.match(new RegExp(`^${PREFIX}(\\d{${WIDTH}})$`));
    if (m) n = parseInt(m[1], 10);
  }
  return `${PREFIX}${String(n + 1).padStart(WIDTH, "0")}`;
}

export async function GET() {
  try {
    const items = await prisma.item.findMany({
      where: { deletedAt: null },
      orderBy: [{ nama: "asc" }],
      select: {
        id: true,
        kode: true,
        nama: true,
        kategori: true,
        satuan: true,
        stok: true,
        hargaBeli: true,
      },
    });
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateItemSchema.parse(body);

    const MAX_RETRY = 3;
    let created: any = null;
    let errMemo: any = null;

    for (let i = 0; i < MAX_RETRY && !created; i++) {
      try {
        created = await prisma.$transaction(async (tx) => {
          const kode = await generateNextKode(tx as any);
          return tx.item.create({
            data: {
              kode,
              nama: parsed.nama,
              kategori: parsed.kategori,
              satuan: parsed.satuan,
            },
            select: {
              id: true,
              kode: true,
              nama: true,
              kategori: true,
              satuan: true,
              stok: true,
              hargaBeli: true,
            },
          });
        });
      } catch (err: any) {
        errMemo = err;
        if (err?.code === "P2002") continue;
        throw err;
      }
    }

    if (!created) throw errMemo || new Error("Gagal membuat item");
    return NextResponse.json({ ok: true, item: created });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json(
        { ok: false, message: e.errors?.[0]?.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, message: e?.message },
      { status: 500 }
    );
  }
}

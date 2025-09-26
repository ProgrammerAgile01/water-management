import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PREFIX = "INV";
const WIDTH = 4;

export async function GET() {
  try {
    const last = await prisma.item.findFirst({
      where: { deletedAt: null, kode: { startsWith: PREFIX } },
      orderBy: { kode: "desc" },
      select: { kode: true },
    });
    let n = 0;
    if (last?.kode) {
      const m = last.kode.match(new RegExp(`^${PREFIX}(\\d{${WIDTH}})$`));
      if (m) n = parseInt(m[1], 10);
    }
    const next = `${PREFIX}${String(n + 1).padStart(WIDTH, "0")}`;
    return NextResponse.json({ ok: true, kode: next });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message },
      { status: 500 }
    );
  }
}

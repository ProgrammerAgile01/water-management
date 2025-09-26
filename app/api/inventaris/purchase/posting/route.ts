// app/api/inventaris/purchase/posting/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST: close semua DRAFT, atau (opsional) subset by ids
export async function POST(req: NextRequest) {
  try {
    let ids: string[] | undefined;
    try {
      const body = await req.json().catch(() => ({}));
      if (Array.isArray(body?.ids)) ids = body.ids as string[];
    } catch {}

    const where = {
      deletedAt: null as null,
      status: "DRAFT" as const,
      ...(ids?.length ? { id: { in: ids } } : {}),
    };

    const result = await prisma.purchase.updateMany({
      where,
      data: { status: "CLOSE" },
    });

    return NextResponse.json({ ok: true, closedCount: result.count });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Gagal posting" },
      { status: 500 }
    );
  }
}

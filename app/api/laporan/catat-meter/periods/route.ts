import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserWithRole } from "@/lib/auth-user-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const me = await getAuthUserWithRole(req);
    if (!me) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    if (me.role !== "ADMIN" && me.role !== "PETUGAS")
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

    const sp = req.nextUrl.searchParams;
    const includeDraft = sp.get("includeDraft") === "1"; // optional toggle

    if (includeDraft) {
      // Kembalikan SEMUA periode (DRAFT/FINAL) terurut baru -> lama
      const all = await prisma.catatPeriode.findMany({
        where: { deletedAt: null },
        select: { kodePeriode: true },
        orderBy: { kodePeriode: "desc" },
      });
      const uniq = Array.from(new Set(all.map(p => p.kodePeriode))).filter(Boolean);
      return NextResponse.json({ ok: true, periods: uniq });
    }

    // Default lama: FINAL yang punya DONE
    const finals = await prisma.catatPeriode.findMany({
      where: { status: "FINAL", entries: { some: { status: "DONE", deletedAt: null } } },
      select: { kodePeriode: true },
      orderBy: { kodePeriode: "desc" },
    });

    // Tambahkan bulan terbaru apa pun statusnya (agar dropdown bisa menampilkan September)
    const latest = await prisma.catatPeriode.findFirst({
      where: { deletedAt: null },
      select: { kodePeriode: true },
      orderBy: { kodePeriode: "desc" },
    });

    const uniq = Array.from(
      new Set([latest?.kodePeriode, ...finals.map(p => p.kodePeriode)].filter(Boolean))
    ) as string[];

    return NextResponse.json({ ok: true, periods: uniq });
  } catch (e) {
    console.error("ERR /api/laporan/catat-meter/periods:", e);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

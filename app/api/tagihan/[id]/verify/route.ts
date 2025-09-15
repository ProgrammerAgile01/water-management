import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

export const runtime = "nodejs";

// PATCH /api/tagihan/:id/verify
// body bisa { verified: boolean } ATAU { action: "VERIFY" | "UNVERIFY" }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = (await req.json()) ?? {};
    const to =
      typeof body.verified === "boolean"
        ? body.verified ? "VERIFIED" : "UNVERIFIED"
        : body.action === "UNVERIFY" ? "UNVERIFIED" : "VERIFIED";

    // (opsional) hanya non-WARGA yang boleh verifikasi
    try {
      const uid = await getAuthUserId(req as any);
      if (uid) {
        const u = await prisma.user.findUnique({ where: { id: uid }, select: { role: true } });
        if (!u || u.role === "WARGA") {
          return NextResponse.json({ ok: false, message: "Tidak berizin" }, { status: 403 });
        }
      }
    } catch {}

    const t = await prisma.tagihan.update({
      where: { id },
      data: { statusVerif: to }, // ← VERIFIED | UNVERIFIED
      select: { id: true, statusVerif: true },
    });

    return NextResponse.json({ ok: true, tagihan: t });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "Server error" }, { status: 500 });
  }
}

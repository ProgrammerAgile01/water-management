// app/api/jadwal/options/petugas/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { role: "PETUGAS" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    // ✅ samakan key dengan kebutuhan frontend: { id, nama, avatar? }
    const data = users.map((u) => ({
      id: u.id,
      nama: u.name ?? "",
      avatar: (u as any).avatar ?? null,
    }));

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

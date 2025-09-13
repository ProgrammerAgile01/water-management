import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";

export async function GET(req: NextRequest) {
  try {
    const jwt = req.cookies.get("tb_token")?.value;
    if (!jwt) return NextResponse.json({ ok: false }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");
    const { payload } = await jose.jwtVerify(jwt, secret);

    const userId = (payload.sub as string) || (payload["id"] as string);
    if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true, name: true, phone: true, isActive: true },
    });
    if (!user || !user.isActive) return NextResponse.json({ ok: false }, { status: 401 });

    return NextResponse.json({ ok: true, user });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}

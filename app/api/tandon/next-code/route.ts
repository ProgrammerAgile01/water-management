import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getNextTandonCode } from "@/lib/server/next-tandon-code";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 }
    );

  const kode = await getNextTandonCode(prisma);
  return NextResponse.json({ ok: true, kode });
}

//
// app/api/support/threads/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const item = await prisma.supportThread.findUnique({
    where: { id: id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!item)
    return NextResponse.json(
      { ok: false, message: "Not found" },
      { status: 404 }
    );
  return NextResponse.json({ ok: true, item });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }

) {
  const { id } = await context.params;

  const { status, topic } = await req.json();
  const item = await prisma.supportThread.update({
    where: { id: id },
    data: { status, topic },
  });
  return NextResponse.json({ ok: true, item });
}

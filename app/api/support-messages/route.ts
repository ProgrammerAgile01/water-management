// app/api/support-messages/route.ts
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

// NOTE: In-memory only (reset saat reload). Ganti dengan DB Anda.
const bucket: any[] = [];

export async function GET() {
  return NextResponse.json({ ok: true, items: bucket });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const item = {
    id: randomUUID(),
    author: "me",
    topic: (body?.topic ?? "").slice(0, 200),
    message: String(body?.message ?? "").slice(0, 5000),
    createdAt: new Date().toISOString(),
  };
  bucket.unshift(item);
  return NextResponse.json({ ok: true, item });
}

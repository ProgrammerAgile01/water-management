import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const format = sp.get("format") ?? "excel";
  return NextResponse.json({ ok: true, message: `TODO: generate ${format}` });
}

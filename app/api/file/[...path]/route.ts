import { NextRequest, NextResponse } from "next/server";
import { resolveUploadPath, guessMimeByExt } from "@/lib/uploads";
import fs from "node:fs/promises";

export const runtime = "nodejs";

/**
 * GET /api/file/<subdir>/<namaFile>
 * Contoh:
 *   /api/file/payment/bukti-bayar/bukti-1723abcd.png
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: { path: string[] } }
) {
  try {
    const parts = ctx.params.path || [];
    if (!parts.length) {
      return NextResponse.json(
        { ok: false, message: "Path kosong" },
        { status: 400 }
      );
    }

    const absPath = resolveUploadPath(...parts);
    const data = await fs.readFile(absPath);
    const mime = guessMimeByExt(parts[parts.length - 1] || "");

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": mime,
        // bisa dibuat agresif kalau perlu; sekarang no-cache biar fresh
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Not found" },
      { status: 404 }
    );
  }
}

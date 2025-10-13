// app/api/upload/route.ts
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const form = await req.formData();
        const file = form.get("file");
        if (!(file instanceof File)) {
            return NextResponse.json(
                { ok: false, message: "File tidak ditemukan" },
                { status: 400 }
            );
        }

        // validasi ringan
        if (!file.type.startsWith("image/")) {
            return NextResponse.json(
                { ok: false, message: "Harus file gambar" },
                { status: 400 }
            );
        }
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        await fs.mkdir(uploadsDir, { recursive: true });

        const ext = (file.name.split(".").pop() || "png").toLowerCase();
        const fname = `${randomUUID()}.${ext}`;
        const outPath = path.join(uploadsDir, fname);

        await fs.writeFile(outPath, buffer);

        // URL publik
        const publicUrl = `/uploads/${fname}`;

        return NextResponse.json({ ok: true, url: publicUrl });
    } catch (e: any) {
        console.error("UPLOAD error:", e);
        return NextResponse.json(
            { ok: false, message: "Gagal upload" },
            { status: 500 }
        );
    }
}

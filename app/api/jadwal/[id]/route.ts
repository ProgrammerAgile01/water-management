// app/api/jadwal/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { toDbStatus } from "@/lib/status-map";

const schema = z.object({
  progress: z.number().int().min(0).optional(),
  target: z.number().int().min(0).optional(),
  status: z.enum(["waiting", "in-progress", "non-progress", "finished", "overdue"]).optional(),
  tanggalRencana: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  petugasId: z.string().nullable().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map(i => i.message).join(", ");
      return NextResponse.json({ ok: false, message: msg }, { status: 400 });
    }

    const data: any = {};
    if (parsed.data.progress !== undefined) data.progress = parsed.data.progress;
    if (parsed.data.target !== undefined) data.target = parsed.data.target;
    if (parsed.data.status !== undefined) data.status = toDbStatus(parsed.data.status);
    if (parsed.data.tanggalRencana) data.tanggalRencana = new Date(parsed.data.tanggalRencana);
    if (parsed.data.petugasId !== undefined) data.petugasId = parsed.data.petugasId;

    const updated = await prisma.jadwalPencatatan.update({
      where: { id: params.id },
      data,
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: updated.id, message: "Jadwal diperbarui" });
  } catch (e: any) {
    if (e?.code === "P2025") return NextResponse.json({ ok: false, message: "Jadwal tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ ok: false, message: e?.message ?? "Server error" }, { status: 500 });
  }
}

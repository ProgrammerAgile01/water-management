// app/api/petugas/profil/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Util: payload yang dikirim ke client
const userSelect = {
  id: true,
  username: true,
  name: true,
  phone: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  // relasi zona yang dipegang (opsional, kalau dibutuhkan di UI profil)
  zonasDipegang: {
    select: { id: true, kode: true, nama: true },
  },
};

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "User tidak ditemukan" },
        { status: 404 }
      );
    }

    // Samakan dengan tipe Profil di frontend:
    const data = {
      id: user.id,
      username: user.username,
      name: user.name,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      zonas: (user.zonasDipegang ?? []).map((z) => ({
        id: z.id,
        kode: z.kode,
        nama: z.nama,
      })),
    };

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

// Update name/phone
export async function PUT(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({} as any));
    const name = (body?.name ?? "").trim();
    const phoneRaw = body?.phone;
    const phone = typeof phoneRaw === "string" ? phoneRaw.trim() : null;

    if (!name) {
      return NextResponse.json(
        { ok: false, message: "Nama wajib diisi" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { name, phone: phone || null },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

// Ganti password (verifikasi sandi lama)
export async function PATCH(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({} as any));
    const oldPassword = String(body?.oldPassword ?? "");
    const newPassword = String(body?.newPassword ?? "");

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { ok: false, message: "Sandi lama & baru wajib diisi" },
        { status: 400 }
      );
    }
    if (newPassword.length < 6) {
      return NextResponse.json(
        { ok: false, message: "Sandi baru minimal 6 karakter" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });
    if (!user) {
      return NextResponse.json(
        { ok: false, message: "User tidak ditemukan" },
        { status: 404 }
      );
    }

    const match = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!match) {
      return NextResponse.json(
        { ok: false, message: "Sandi lama salah" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

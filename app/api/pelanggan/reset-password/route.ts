// app/api/pelanggan/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ---- Helper auth sama seperti di route pelanggan ----
type JwtPayload = { sub?: string };
async function getAuthUser(req: NextRequest) {
  const token = req.cookies.get("tb_token")?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "supersecret"
    ) as JwtPayload;
    if (!decoded?.sub) return null;
    const u = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, role: true },
    });
    return u;
  } catch {
    return null;
  }
}

// ---- Generator password kuat ----
function generateStrongPassword(len = 12) {
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const nums = "23456789";
  const syms = "!@#$%^&*()-_=+?";
  const all = lower + upper + nums + syms;

  // pastikan ada campuran
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const base = [pick(lower), pick(upper), pick(nums), pick(syms)];

  while (base.length < len) base.push(pick(all));

  // shuffle sederhana
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  return base.join("");
}

export async function POST(req: NextRequest) {
  try {
    const me = await getAuthUser(req);
    if (!me || me.role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, message: "Tidak berizin" },
        { status: 403 }
      );
    }

    // Mode: single atau all?
    const sp = req.nextUrl.searchParams;
    const allFlag = sp.get("all") === "true";
    const body = (await req.json().catch(() => ({}))) as {
      pelangganId?: string;
      all?: boolean;
    };
    const pelangganId = body?.pelangganId || sp.get("pelangganId") || undefined;
    const doAll = allFlag || !!body?.all;

    if (!doAll && !pelangganId) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "pelangganId wajib diisi untuk reset per pelanggan, atau set all=true untuk reset massal.",
        },
        { status: 400 }
      );
    }

    if (doAll) {
      // ambil semua pelanggan aktif yang punya user
      const list = await prisma.pelanggan.findMany({
        where: { deletedAt: null, statusAktif: true, userId: { not: null } },
        select: {
          id: true,
          nama: true,
          userId: true,
          user: { select: { username: true } },
        },
      });

      if (list.length === 0) {
        return NextResponse.json({
          ok: false,
          data: [],
          message: "Tidak ada pelanggan aktif yang memiliki user.",
        });
      }

      const results: {
        pelangganId: string;
        nama: string;
        username: string;
        newPassword: string;
      }[] = [];
      // siapkan operasi batch
      const ops: any[] = [];

      // kumpulkan userId untuk hapus sesi
      const userIds: string[] = [];

      for (const row of list) {
        if (!row.userId) continue;
        const newPass = generateStrongPassword(12);
        const hash = await bcrypt.hash(newPass, 10);

        userIds.push(row.userId);
        // update hash user
        ops.push(
          prisma.user.update({
            where: { id: row.userId },
            data: { passwordHash: hash },
          })
        );
        // update plaintext pelanggan
        ops.push(
          prisma.pelanggan.update({
            where: { id: row.id },
            data: { passwordPlain: newPass },
          })
        );

        // audit walog (opsional)
        ops.push(
          prisma.waLog.create({
            data: {
              tipe: "RESET_PASSWORD",
              tujuan: row.user?.username || "-",
              status: "OK",
              payload: JSON.stringify({
                scope: "ALL",
                pelangganId: row.id,
                at: new Date().toISOString(),
              }),
            },
          })
        );

        results.push({
          pelangganId: row.id,
          nama: row.nama,
          username: row.user?.username || "",
          newPassword: newPass,
        });
      }

      // hapus sesi lama (sekali saja di luar loop)
      if (userIds.length > 0) {
        ops.push(
          prisma.session.deleteMany({ where: { userId: { in: userIds } } })
        );
      }

      await prisma.$transaction(ops);

      return NextResponse.json({
        ok: true,
        count: results.length,
        data: results,
        message: `Berhasil reset password ${results.length} pelanggan.`,
      });
    }

    // ---- Single pelanggan ----
    const pel = await prisma.pelanggan.findUnique({
      where: { id: String(pelangganId) },
      select: {
        id: true,
        nama: true,
        userId: true,
        user: { select: { id: true, username: true } },
      },
    });

    if (!pel) {
      return NextResponse.json(
        { ok: false, message: "Pelanggan tidak ditemukan" },
        { status: 404 }
      );
    }
    if (!pel.userId) {
      return NextResponse.json(
        { ok: false, message: "Pelanggan belum memiliki user untuk di-reset." },
        { status: 409 }
      );
    }

    const newPass = generateStrongPassword(12);
    const hash = await bcrypt.hash(newPass, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: pel.userId },
        data: { passwordHash: hash },
      }),
      prisma.pelanggan.update({
        where: { id: pel.id },
        data: { passwordPlain: newPass },
      }),
      prisma.session.deleteMany({ where: { userId: pel.userId } }),
      prisma.waLog.create({
        data: {
          tipe: "RESET_PASSWORD",
          tujuan: pel.user?.username || "-",
          status: "OK",
          payload: JSON.stringify({
            scope: "SINGLE",
            pelangganId: pel.id,
            at: new Date().toISOString(),
          }),
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        pelangganId: pel.id,
        nama: pel.nama,
        username: pel.user?.username,
        newPassword: newPass, // dikembalikan sekali agar admin bisa salin
      },
      message: "Password berhasil di-reset.",
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

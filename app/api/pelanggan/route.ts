// app/api/pelanggan/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { Prisma } from "@prisma/client"
import jwt from "jsonwebtoken"

// ========== Helpers singkat ==========
function genCustomerCode(name: string) {
  const base = (name || "TB").trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
  const four = Math.random().toString().slice(2, 6)
  return `TB${base.slice(0, 2)}${four}`
}

function genUsername(name: string) {
  const slug = (name || "warga").toLowerCase().replace(/[^a-z0-9]/g, "")
  const n = Math.random().toString(36).slice(2, 5)
  return `${slug}${n}`
}

// ========= Validasi body (CREATE) =========
// 🔹 TAMBAH zonaId (opsional)
const bodySchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi"),
  wa: z.string().trim().optional(),
  alamat: z.string().min(1, "Alamat wajib diisi"),
  meterAwal: z.number().int().nonnegative().optional().default(0),
  zonaId: z.string().trim().nullable().optional(),      // 🔹
  noUrutRumah: z.number().int().positive().optional(),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/i).optional(),
  password: z.string().min(6).max(100).optional(),
})

// ========= CREATE =========
export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      const msg = parsed.error.issues.map(i => i.message).join(", ")
      return NextResponse.json({ ok: false, message: msg }, { status: 400 })
    }

    const { nama, wa, alamat, meterAwal, username, password } = parsed.data
    const zonaId = parsed.data.zonaId ? parsed.data.zonaId : null
    let noUrutRumah = parsed.data.noUrutRumah ?? null

    // validasi zona kalau ada
    if (zonaId) {
      const existsZona = await prisma.zona.findUnique({ where: { id: zonaId }, select: { id: true } })
      if (!existsZona) return NextResponse.json({ ok: false, message: "Zona tidak ditemukan" }, { status: 404 })
    }

    const kode = genCustomerCode(nama)
    const finalUsername = username ?? genUsername(nama)
    const rawPassword = password ?? `tb-${Math.random().toString(36).slice(2, 8)}`
    const passwordHash = await bcrypt.hash(rawPassword, 10)

    const result = await prisma.$transaction(async (tx) => {
      // 1) create user
      const user = await tx.user.create({
        data: { username: finalUsername, passwordHash, name: nama, phone: wa ?? null, role: "WARGA", isActive: true },
        select: { id: true, username: true, name: true },
      })

      // 2) auto noUrutRumah jika zona ada & noUrutRumah tidak dikirim
      if (zonaId && noUrutRumah === null) {
        const max = await tx.pelanggan.aggregate({
          where: { zonaId, deletedAt: null },
          _max: { noUrutRumah: true },
        })
        const next = (max._max.noUrutRumah ?? 0) + 1
        noUrutRumah = next
      }

      // 3) create pelanggan
      const pelanggan = await tx.pelanggan.create({
        data: {
          kode, nama, wa: wa ?? null, alamat,
          meterAwal: meterAwal ?? 0,
          userId: user.id,
          statusAktif: true,
          zonaId,
          noUrutRumah, // boleh null kalau tidak ada zona
        },
        select: { id: true, kode: true, nama: true, zonaId: true, noUrutRumah: true },
      })

      return { user, pelanggan }
    })

    return NextResponse.json({
      ok: true,
      data: {
        pelanggan: result.pelanggan,
        user: { username: result.user.username },
        tempPassword: password ? undefined : rawPassword,
      },
      message: "Pelanggan & user berhasil dibuat",
    }, { status: 201 })
  } catch (e: any) {
    if (e?.code === "P2002") {
      // unik (username/kode) atau (zonaId,noUrutRumah)
      return NextResponse.json({ ok: false, message: "Data bentrok (username/kode atau nomor urut di zona)." }, { status: 409 })
    }
    return NextResponse.json({ ok: false, message: e?.message ?? "Server error" }, { status: 500 })
  }
}

// Helper kecil untuk "Title Case"
function toTitleCase(s: string) {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const pageRaw = parseInt(sp.get("page") ?? "1", 10)
    const sizeRaw = parseInt(sp.get("pageSize") ?? "10", 10)

    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
    const pageSize = Number.isFinite(sizeRaw) && sizeRaw > 0 ? Math.min(sizeRaw, 100) : 10

    const qRaw = (sp.get("q") ?? "").trim()
    const qDigits = qRaw.replace(/\D/g, "")

    const whereBase: Prisma.PelangganWhereInput = { deletedAt: null }
    let where: Prisma.PelangganWhereInput = whereBase

    if (qRaw) {
      const variants = Array.from(
        new Set([qRaw, qRaw.toLowerCase(), qRaw.toUpperCase(), toTitleCase(qRaw)])
      ).filter(Boolean) as string[]

      const containsAny = (field: "nama" | "kode" | "alamat" | "wa") =>
        variants.map(v => ({ [field]: { contains: v } })) as Prisma.PelangganWhereInput[]

      const orBase: Prisma.PelangganWhereInput["OR"] = [
        ...containsAny("nama"),
        ...containsAny("kode"),
        ...containsAny("alamat"),
        ...containsAny("wa"),
      ]
      if (qDigits.length >= 3) {
        orBase.push({ wa: { contains: qDigits } })
      }
      where = { AND: [whereBase, { OR: orBase }] }
    }

    console.log("🔎 /api/pelanggan GET", { qRaw, qDigits, page, pageSize, where })

    const total = await prisma.pelanggan.count({ where })
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage = Math.min(page, totalPages)

    const items = await prisma.pelanggan.findMany({
      where,
      orderBy: [
        // zona terisi dulu (null di belakang)
        { zonaId: { sort: "asc", nulls: "last" } as any },
        // dalam zona, urut nama zona biar stabil
        { zona: { nama: "asc" } },
        // urut nomor urut, yang null di belakang
        { noUrutRumah: { sort: "asc", nulls: "last" } as any },
        // penstabil
        { createdAt: "asc" },
        { id: "asc" },
      ],
      skip: (safePage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        kode: true,
        nama: true,
        wa: true,
        alamat: true,
        meterAwal: true,
        statusAktif: true,
        createdAt: true,
        zonaId: true,
        noUrutRumah: true,
        zona: { select: { id: true, nama: true, deskripsi: true } },
      },
    })

    console.log("🔎 result:", { count: items.length, total, safePage, totalPages })

    return NextResponse.json({
      ok: true,
      items,
      pagination: { page: safePage, pageSize, total, totalPages },
    })
  } catch (e: any) {
    console.error("❌ GET /api/pelanggan error:", e)
    return NextResponse.json({ ok: false, message: e?.message ?? "Server error" }, { status: 500 })
  }
}

// ========= UPDATE =========
export async function PUT(req: NextRequest) {
  try {
    const urlId = req.nextUrl.searchParams.get("id") ?? undefined;

    let rawBody: unknown = {};
    try { rawBody = await req.json(); } catch { rawBody = {}; }

    const schema = z.object({
      id: z.string().optional(),
      nama: z.string().min(1).optional(),
      wa: z.string().optional(),
      alamat: z.string().min(1).optional(),
      meterAwal: z.number().int().nonnegative().optional(),
      status: z.enum(["aktif", "nonaktif"]).optional(),
      zonaId: z.string().nullable().optional(),
      noUrutRumah: z.number().int().positive().nullable().optional(),
    });

    const parsed = schema.safeParse(rawBody);
    if (!parsed.success) {
      const msg = parsed.error.issues.map(i => i.message).join(", ");
      return NextResponse.json({ ok: false, message: msg }, { status: 400 });
    }

    const body = parsed.data;
    const id = body.id ?? urlId;
    if (!id) return NextResponse.json({ ok: false, message: "ID wajib disertakan" }, { status: 400 });

    // ✅ Perbaikan penting: preserve null ("" → null; null tetap null; undefined tetap undefined)
    const zonaIdNorm =
      body.zonaId !== undefined
        ? (body.zonaId === "" ? null : body.zonaId)
        : undefined;

    const noUrutNorm =
      body.noUrutRumah === null ? null
        : body.noUrutRumah === undefined ? undefined
        : Number(body.noUrutRumah);

    // Validasi zona hanya bila zonaIdNorm ada & bukan null
    if (zonaIdNorm !== undefined && zonaIdNorm !== null) {
      const existsZona = await prisma.zona.findUnique({ where: { id: zonaIdNorm }, select: { id: true } });
      if (!existsZona) return NextResponse.json({ ok: false, message: "Zona tidak ditemukan" }, { status: 404 });
    }

    const current = await prisma.pelanggan.findUnique({
      where: { id },
      select: { meterAwal: true, zonaId: true, noUrutRumah: true },
    });
    if (!current) return NextResponse.json({ ok: false, message: "Pelanggan tidak ditemukan" }, { status: 404 });

    const data: Prisma.PelangganUpdateInput = {};

    const normalizeWA = (v?: string) => {
      if (!v) return undefined;
      const digits = v.replace(/\D/g, "");
      if (!digits) return "";
      if (digits.startsWith("0")) return `62${digits.slice(1)}`;
      if (digits.startsWith("62")) return digits;
      return digits;
    };

    if (body.nama !== undefined)   data.nama = body.nama;
    if (body.alamat !== undefined) data.alamat = body.alamat;
    if (body.wa !== undefined)     data.wa = normalizeWA(body.wa);
    if (body.status !== undefined) data.statusAktif = body.status === "aktif";

    const wantChangeMeterAwal = body.meterAwal !== undefined && body.meterAwal !== current.meterAwal;
    if (wantChangeMeterAwal) {
      const used = await prisma.catatMeter.findFirst({
        where: { pelangganId: id, deletedAt: null },
        select: { id: true },
      });
      if (used) {
        return NextResponse.json(
          { ok: false, message: "Meter Awal tidak bisa diedit karena pelanggan sudah pernah dicatat di Catat Meter." },
          { status: 409 },
        );
      }
      data.meterAwal = body.meterAwal;
    }

    type Meta = {
      zonaChanged: boolean;
      reordered: boolean;
      from?: number | null;
      to?: number | null;
      clearedZona?: boolean;
      appended?: boolean;
    };

    const { updated, meta } = await prisma.$transaction(async (tx) => {
      const meta: Meta = { zonaChanged: false, reordered: false };

      const zonaChanged = zonaIdNorm !== undefined && zonaIdNorm !== current.zonaId;
      meta.zonaChanged = !!zonaChanged;
      const targetZonaId = zonaIdNorm === undefined ? current.zonaId : zonaIdNorm;

      // Selalu set zonaId kalau dikirim (termasuk null)
      if (zonaIdNorm !== undefined) {
        data.zonaId = zonaIdNorm;
      }

      // A) Reorder dalam zona yang sama
      if (!zonaChanged && targetZonaId && typeof noUrutNorm === "number") {
        const countInZona = await tx.pelanggan.count({
          where: { zonaId: targetZonaId, deletedAt: null, noUrutRumah: { not: null } },
        });

        const from = current.noUrutRumah ?? countInZona + 1;
        const to   = Math.max(1, Math.min(noUrutNorm, Math.max(1, countInZona)));
        meta.from = current.noUrutRumah ?? null;
        meta.to   = to;

        if (from !== to) {
          await tx.pelanggan.update({ where: { id }, data: { noUrutRumah: null } });

          if (from < to) {
            await tx.pelanggan.updateMany({
              where: { zonaId: targetZonaId, deletedAt: null, noUrutRumah: { gte: from + 1, lte: to } },
              data: { noUrutRumah: { decrement: 1 } },
            });
          } else {
            await tx.pelanggan.updateMany({
              where: { zonaId: targetZonaId, deletedAt: null, noUrutRumah: { gte: to, lte: from - 1 } },
              data: { noUrutRumah: { increment: 1 } },
            });
          }
        }

        (data as any).noUrutRumah = to;
        meta.reordered = true;
      }
      // B) Zona tidak berubah & noUrut sebelumnya null → auto-set
      else if (!zonaChanged && current.zonaId && current.noUrutRumah == null && noUrutNorm === undefined) {
        const last = await tx.pelanggan.findFirst({
          where: { zonaId: current.zonaId, deletedAt: null, noUrutRumah: { not: null } },
          orderBy: { noUrutRumah: "desc" },
          select: { noUrutRumah: true },
        });
        (data as any).noUrutRumah = (last?.noUrutRumah ?? 0) + 1;
        meta.appended = true;
      }
      // C) Pindah zona (termasuk ke null)
      else if (zonaChanged) {
        if (current.zonaId && current.noUrutRumah != null) {
          await tx.pelanggan.updateMany({
            where: {
              zonaId: current.zonaId,
              deletedAt: null,
              noUrutRumah: { gt: current.noUrutRumah },
            },
            data: { noUrutRumah: { decrement: 1 } },
          });
        }
        if (targetZonaId === null) {
          (data as any).noUrutRumah = null;
          meta.clearedZona = true;
        } else {
          const last = await tx.pelanggan.findFirst({
            where: { zonaId: targetZonaId, deletedAt: null, noUrutRumah: { not: null } },
            orderBy: { noUrutRumah: "desc" },
            select: { noUrutRumah: true },
          });
          (data as any).noUrutRumah = (last?.noUrutRumah ?? 0) + 1;
          meta.appended = true;
        }
      }
      // D) User kirim null eksplisit (kosongkan)
      else if (noUrutNorm === null) {
        (data as any).noUrutRumah = null;
      }

      const updated = await tx.pelanggan.update({
        where: { id },
        data,
        select: {
          id: true,
          kode: true,
          nama: true,
          wa: true,
          alamat: true,
          meterAwal: true,
          statusAktif: true,
          zonaId: true,
          zona: { select: { id: true, nama: true } },
          noUrutRumah: true,
        },
      });

      return { updated, meta };
    });

    let successMsg = "Pelanggan berhasil diperbarui";
    if (meta.reordered && !meta.zonaChanged && typeof meta.to === "number") {
      successMsg = `Nomor urut pelanggan "${updated.nama}" dipindah ke ${updated.noUrutRumah}.`;
    } else if (meta.zonaChanged && meta.clearedZona) {
      successMsg = `Zona dikosongkan dan nomor urut dihapus.`;
    } else if (meta.zonaChanged && meta.appended) {
      successMsg = `Pelanggan dipindah ke zona baru dan diberi nomor urut ${updated.noUrutRumah}.`;
    }

    return NextResponse.json({
      ok: true,
      item: {
        id: updated.id,
        kodeCustomer: updated.kode,
        nama: updated.nama,
        noWA: updated.wa ?? "",
        alamat: updated.alamat,
        meterAwal: updated.meterAwal,
        status: updated.statusAktif ? ("aktif" as const) : ("nonaktif" as const),
        zonaId: updated.zonaId ?? null,
        zonaNama: updated.zona?.nama ?? null,
        noUrutRumah: updated.noUrutRumah ?? null,
      },
      message: successMsg,
    });
  } catch (e) {
    console.error("❌ PUT /api/pelanggan:", e);
    const err = e as { code?: string; message?: string };
    if (err.code === "P2025") {
      return NextResponse.json({ ok: false, message: "Pelanggan tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ ok: false, message: err.message ?? "Server error" }, { status: 500 });
  }
}
// --- helper JWT untuk DELETE ---
type JwtPayload = { sub?: string }
function getAuthUserId(req: NextRequest): string | null {
  const token = req.cookies.get("tb_token")?.value
  if (!token) return null
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecret") as JwtPayload
    return decoded.sub ?? null
  } catch {
    return null
  }
}

// --- DELETE (soft delete) ---
export async function DELETE(req: NextRequest) {
  try {
    const urlId = req.nextUrl.searchParams.get("id") ?? undefined
    const body = await req.json().catch(() => ({} as unknown))
    const id = (body as { id?: string })?.id ?? urlId
    if (!id) {
      return NextResponse.json({ ok: false, message: "ID wajib disertakan" }, { status: 400 })
    }

    const used = await prisma.catatMeter.findFirst({
      where: { pelangganId: id, deletedAt: null },
      select: { id: true },
    })
    if (used) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Pelanggan tidak bisa dihapus karena sudah pernah dipakai di Catat Meter. " +
            "Hapus data Catat Meter terkait terlebih dahulu jika memang diperlukan.",
        },
        { status: 409 },
      )
    }

    const userId = getAuthUserId(req)

    const result = await prisma.pelanggan.updateMany({
      where: { id, deletedAt: null },
      data: {
        deletedAt: new Date(),
        deletedBy: userId ?? null,
        statusAktif: false,
      },
    })

    if (result.count === 0) {
      return NextResponse.json({ ok: false, message: "Pelanggan tidak ditemukan atau sudah dihapus" }, { status: 404 })
    }

    return NextResponse.json({ ok: true, message: "Pelanggan berhasil dihapus (soft delete)" })
  } catch (e) {
    const err = e as { code?: string; message?: string }
    if (err.code === "P2025") {
      return NextResponse.json({ ok: false, message: "Pelanggan tidak ditemukan" }, { status: 404 })
    }
    return NextResponse.json({ ok: false, message: err.message ?? "Server error" }, { status: 500 })
  }
}
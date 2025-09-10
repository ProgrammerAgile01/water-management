// app/api/zona/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import type { Prisma } from "@prisma/client"

// ===== Helpers =====
function genZonaCode() {
  const ts = Date.now().toString().slice(-5)
  const rnd = Math.floor(Math.random() * 100).toString().padStart(2, "0")
  return `Z${ts}${rnd}`
}
function toVariants(s: string) {
  const t = s.trim()
  const title = t
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(w => (w[0]?.toUpperCase() ?? "") + w.slice(1))
    .join(" ")
  return Array.from(new Set([t, t.toLowerCase(), t.toUpperCase(), title])).filter(Boolean) as string[]
}

// ===================================================================
// POST /api/zona
// body: { nama: string; kode?: string; deskripsi?: string|null; petugasId?: string|null }
// ===================================================================
const postSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi"),
  kode: z.string().trim().optional(),
  deskripsi: z.string().trim().nullable().optional(),
  petugasId: z.string().trim().nullable().optional(), // null = tanpa petugas
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = postSchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.issues.map(i => i.message).join(", ")
      return NextResponse.json({ ok: false, message: msg }, { status: 400 })
    }

    const namaRaw = parsed.data.nama ?? ""
    const deskripsiRaw = parsed.data.deskripsi ?? null
    const kodeRaw = parsed.data.kode ?? ""
    // Normalisasi kode: trim + UPPERCASE; auto-gen jika kosong
    const kode = (kodeRaw.trim().length ? kodeRaw : genZonaCode()).trim().toUpperCase()

    // Normalisasi petugasId: "" | undefined | null -> null
    let petugasId: string | null =
      parsed.data.petugasId === "" || parsed.data.petugasId == null
        ? null
        : String(parsed.data.petugasId)

    // Validasi FK petugasId (jika diisi)
    if (petugasId) {
      const petugas = await prisma.user.findUnique({
        where: { id: petugasId },
        select: { id: true, role: true, isActive: true },
      })
      if (!petugas) {
        return NextResponse.json({ ok: false, message: "Petugas tidak ditemukan" }, { status: 404 })
      }
      // (Opsional tapi disarankan) pastikan role PETUGAS & aktif
      if (petugas.role !== "PETUGAS" || !petugas.isActive) {
        return NextResponse.json(
          { ok: false, message: "User terpilih bukan PETUGAS aktif" },
          { status: 400 },
        )
      }
    }

    const created = await prisma.zona.create({
      data: {
        nama: namaRaw.trim(),
        kode,
        deskripsi: deskripsiRaw ? deskripsiRaw.trim() : null,
        petugasId, // satu zona = satu petugas (boleh null)
      },
      select: {
        id: true,
        kode: true,
        nama: true,
        deskripsi: true,
        petugasId: true,
        petugas: { select: { id: true, name: true, username: true } },
      },
    })

    return NextResponse.json(
      { ok: true, item: created, message: "Zona berhasil dibuat" },
      { status: 201 },
    )
  } catch (e: any) {
    if (e?.code === "P2002") {
      // Unique constraint (kemungkinan: kode)
      return NextResponse.json({ ok: false, message: "Kode zona sudah dipakai" }, { status: 409 })
    }
    if (e?.code === "P2003") {
      // FK invalid
      return NextResponse.json({ ok: false, message: "Petugas tidak valid" }, { status: 400 })
    }
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 },
    )
  }
}

// ===================================================================
// GET /api/zona?page=1&pageSize=10&q=...&petugasId=... — list + pagination
// ===================================================================
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const pageRaw = parseInt(sp.get("page") ?? "1", 10)
    const sizeRaw = parseInt(sp.get("pageSize") ?? "10", 10)
    const q = (sp.get("q") ?? "").trim()
    const filterPetugasId = sp.get("petugasId") ?? undefined

    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
    const pageSize = Number.isFinite(sizeRaw) && sizeRaw > 0 ? Math.min(sizeRaw, 100) : 10

    const whereBase: Prisma.ZonaWhereInput = {
      ...(filterPetugasId ? { petugasId: filterPetugasId } : {}),
    }
    let where: Prisma.ZonaWhereInput = whereBase

    if (q) {
      const variants = toVariants(q)
      const containsAny = (field: "nama" | "kode" | "deskripsi") =>
        variants.map(v => ({ [field]: { contains: v } })) as Prisma.ZonaWhereInput[]
      where = {
        AND: [
          whereBase,
          { OR: [...containsAny("nama"), ...containsAny("kode"), ...containsAny("deskripsi")] },
        ],
      }
    }

    const total = await prisma.zona.count({ where })
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage = Math.min(page, totalPages)

    // ... di dalam GET
    const rows = await prisma.zona.findMany({
      where,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      skip: (safePage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        kode: true,
        nama: true,
        deskripsi: true,
        petugasId: true,                               // ⬅️ WAJIB
        petugas: { select: { id: true, name: true, username: true } }, // ⬅️ WAJIB
        _count: { select: { pelanggan: true } },
      },
    })

    const items = rows.map((r) => ({
      id: r.id,
      kode: r.kode,
      nama: r.nama,
      deskripsi: r.deskripsi ?? "",
      petugasId: r.petugasId ?? null,                 // ⬅️ kirim apa adanya
      petugas: r.petugas
        ? { id: r.petugas.id, name: r.petugas.name, username: r.petugas.username ?? undefined }
        : null,                                       // ⬅️ kirim objek (bukan hanya nama)
      pelangganCount: r._count.pelanggan,             // ⬅️ konsisten dan simple
    }))

    console.log("GET /api/zona -> items:", items)     // ⬅️ TRACE: lihat di terminal

    return NextResponse.json({
      ok: true,
      items,
      pagination: { page: safePage, pageSize, total, totalPages },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "Server error" }, { status: 500 })
  }
}

// ===================================================================
// PUT /api/zona?id=ZONA_ID — update parsial
// body: { nama?, kode?, deskripsi?, petugasId?: string|null }
// ===================================================================
const putSchema = z.object({
  id: z.string().optional(),
  nama: z.string().min(1).optional(),
  kode: z.string().optional(),
  deskripsi: z.string().nullable().optional(),
  petugasId: z.union([z.string(), z.null()]).optional(),
})

export async function PUT(req: NextRequest) {
  // ---- LOG #0: request meta
  console.log("📨 [PUT /api/zona] URL:", req.url)

  try {
    const urlId = req.nextUrl.searchParams.get("id") ?? undefined
    console.log("🔎 query.id =", urlId)

    const raw = await req.json().catch(() => ({}))
    // ---- LOG #1: raw body yang diterima
    console.log("🧾 raw body =", raw)

    const parsed = putSchema.safeParse(raw)
    if (!parsed.success) {
      const msg = parsed.error.issues.map(i => i.message).join(", ")
      console.log("❌ zod error =", parsed.error.issues)
      return NextResponse.json({ ok: false, message: msg }, { status: 400 })
    }

    const body = parsed.data
    const id = body.id ?? urlId
    if (!id) {
      console.log("❗ missing ID (body.id/urlId)")
      return NextResponse.json({ ok: false, message: "ID wajib disertakan" }, { status: 400 })
    }

    // ---- LOG #2: body setelah parse
    console.log("✅ parsed body =", body)

    // Normalisasi petugasId
    let petugasId: string | null | undefined = body.petugasId
    if (petugasId === "") petugasId = null
    console.log("🛠️ normalized petugasId =", petugasId)

    // Validasi FK petugas jika DIISI (bukan null)
    if (petugasId != null) {
      const petugas = await prisma.user.findUnique({
        where: { id: petugasId },
        select: { id: true, role: true, isActive: true },
      })
      console.log("👤 cek petugas =", petugas)

      if (!petugas) {
        return NextResponse.json({ ok: false, message: "Petugas tidak ditemukan" }, { status: 404 })
      }
      if (petugas.role !== "PETUGAS" || !petugas.isActive) {
        return NextResponse.json(
          { ok: false, message: "User terpilih bukan PETUGAS aktif" },
          { status: 400 },
        )
      }
    }

    // Siapkan payload update
    const data: Prisma.ZonaUpdateInput = {}
    if (body.nama !== undefined) data.nama = body.nama.trim()
    if (body.kode !== undefined) data.kode = body.kode.trim().toUpperCase()
    if (body.deskripsi !== undefined) data.deskripsi = body.deskripsi?.trim() || null
    if (petugasId !== undefined) data.petugasId = petugasId // string | null

    // ---- LOG #3: payload update final
    console.log("📦 update data =", data)

    const updated = await prisma.zona.update({
      where: { id },
      data,
      select: {
        id: true,
        kode: true,
        nama: true,
        deskripsi: true,
        petugasId: true,
        petugas: { select: { id: true, name: true, username: true } },
      },
    })

    // ---- LOG #4: hasil update
    console.log("✅ updated zona =", updated)

    return NextResponse.json({
      ok: true,
      item: {
        id: updated.id,
        kode: updated.kode,
        nama: updated.nama,
        deskripsi: updated.deskripsi ?? "",
        petugasId: updated.petugasId ?? null,
        petugasNama: updated.petugas?.name ?? null,
      },
      message: "Zona berhasil diperbarui",
    })
  } catch (e: any) {
    // ---- LOG #5: error prisma/umum
    console.error("💥 PUT /api/zona error =", e)

    if (e?.code === "P2025") {
      return NextResponse.json({ ok: false, message: "Zona tidak ditemukan" }, { status: 404 })
    }
    if (e?.code === "P2002") {
      return NextResponse.json({ ok: false, message: "Kode zona sudah dipakai" }, { status: 409 })
    }
    if (e?.code === "P2003") {
      return NextResponse.json({ ok: false, message: "Petugas tidak valid" }, { status: 400 })
    }
    return NextResponse.json({ ok: false, message: e?.message ?? "Server error" }, { status: 500 })
  }
}

// ===================================================================
// DELETE /api/zona?id=ZONA_ID — tolak bila masih ada pelanggan
// ===================================================================
export async function DELETE(req: NextRequest) {
  try {
    const urlId = req.nextUrl.searchParams.get("id") ?? undefined
    const body = await req.json().catch(() => ({} as unknown))
    const id = (body as { id?: string })?.id ?? urlId
    if (!id) return NextResponse.json({ ok: false, message: "ID wajib disertakan" }, { status: 400 })

    const used = await prisma.pelanggan.count({ where: { zonaId: id } })
    if (used > 0) {
      return NextResponse.json(
        { ok: false, message: "Zona masih memiliki pelanggan. Pindahkan/lepaskan pelanggan terlebih dahulu." },
        { status: 409 }
      )
    }

    await prisma.zona.delete({ where: { id } })
    return NextResponse.json({ ok: true, message: "Zona berhasil dihapus" })
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json({ ok: false, message: "Zona tidak ditemukan" }, { status: 404 })
    }
    return NextResponse.json({ ok: false, message: e?.message ?? "Server error" }, { status: 500 })
  }
}
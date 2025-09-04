// app/api/pelanggan/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { Prisma } from "@prisma/client"  // tambahkan di paling atas
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

// ========= Validasi body =========
const bodySchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi"),
  wa: z.string().trim().optional(),           // nomor WA (opsional)
  alamat: z.string().min(1, "Alamat wajib diisi"),
  meterAwal: z.number().int().nonnegative().optional().default(0),

  // opsional: jika ingin set username/password sendiri
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/i).optional(),
  password: z.string().min(6).max(100).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      const msg = parsed.error.issues.map(i => i.message).join(", ")
      return NextResponse.json({ ok: false, message: msg }, { status: 400 })
    }
    const { nama, wa, alamat, meterAwal, username, password } = parsed.data

    // generate nilai default
    const kode = genCustomerCode(nama)
    const finalUsername = username ?? genUsername(nama)
    const rawPassword = password ?? `tb-${Math.random().toString(36).slice(2, 8)}`
    const passwordHash = await bcrypt.hash(rawPassword, 10)

    // transaksi: buat user -> pelanggan
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: finalUsername,
          passwordHash,
          name: nama,
          phone: wa ?? null,
          role: "WARGA",
          isActive: true,
        },
        select: { id: true, username: true, name: true },
      })

      const pelanggan = await tx.pelanggan.create({
        data: {
          kode,
          nama,
          wa: wa ?? null,
          alamat,
          meterAwal: meterAwal ?? 0,
          userId: user.id,
          statusAktif: true,
        },
        select: { id: true, kode: true, nama: true },
      })

      return { user, pelanggan }
    })

    // TODO: kirim WA sambutan jika perlu
    // await sendWelcomeWA(wa, { nama, username: result.user.username, password: rawPassword })

    return NextResponse.json(
      {
        ok: true,
        data: {
          pelanggan: result.pelanggan,
          user: { username: result.user.username },
          // NOTE: untuk keamanan, JANGAN kirim password di production.
          // Sertakan hanya jika masih fase onboarding via WA.
          tempPassword: password ? undefined : rawPassword,
        },
        message: "Pelanggan & user berhasil dibuat",
      },
      { status: 201 }
    )
  } catch (e) {
    // ketik error Prisma dengan aman
    const err = e as { code?: string; message?: string }
    if (err.code === "P2002") {
      // unique conflict (username atau kode)
      return NextResponse.json(
        { ok: false, message: "Username atau Kode pelanggan sudah dipakai" },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { ok: false, message: err.message ?? "Server error" },
      { status: 500 }
    )
  }
}


export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim()

  // hanya data yang belum soft-deleted
  const whereBase: Prisma.PelangganWhereInput = { deletedAt: null }

  const where: Prisma.PelangganWhereInput = q
    ? {
        AND: [
          whereBase,
          {
            OR: [
              { nama:   { contains: q } },
              { kode:   { contains: q } },
              { alamat: { contains: q } },
              { wa:     { contains: q } },
            ],
          },
        ],
      }
    : whereBase

  const items = await prisma.pelanggan.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true, kode: true, nama: true, wa: true,
      alamat: true, meterAwal: true, statusAktif: true,
    },
  })

  return NextResponse.json({ ok: true, items })
}

// PUT /api/pelanggan?id=<PEL_ID>
// atau kirim { id: "...", ... } di body
export async function PUT(req: NextRequest) {
  try {
    const urlId = req.nextUrl.searchParams.get("id") ?? undefined

    // baca body tanpa any
    let rawBody: unknown = {}
    try {
      rawBody = await req.json()
    } catch {
      rawBody = {}
    }

    // skema validasi body (semua opsional → partial update)
    const schema = z.object({
      id: z.string().optional(),
      nama: z.string().min(1).optional(),
      wa: z.string().optional(),
      alamat: z.string().min(1).optional(),
      meterAwal: z.number().int().nonnegative().optional(),
      status: z.enum(["aktif", "nonaktif"]).optional(),
    })

    const parsed = schema.safeParse(rawBody)
    if (!parsed.success) {
      const msg = parsed.error.issues.map(i => i.message).join(", ")
      return NextResponse.json({ ok: false, message: msg }, { status: 400 })
    }

    const body = parsed.data
    const id = body.id ?? urlId
    if (!id) {
      return NextResponse.json({ ok: false, message: "ID wajib disertakan" }, { status: 400 })
    }

    // normalisasi WA sederhana
    const normalizeWA = (v?: string) => {
      if (!v) return undefined
      const digits = v.replace(/\D/g, "")
      if (!digits) return ""
      if (digits.startsWith("0")) return `62${digits.slice(1)}`
      if (digits.startsWith("62")) return digits
      return digits
    }

    // payload update tanpa any
    const data: Record<string, unknown> = {}
    if (body.nama !== undefined) data.nama = body.nama
    if (body.alamat !== undefined) data.alamat = body.alamat
    if (body.meterAwal !== undefined) data.meterAwal = body.meterAwal
    if (body.wa !== undefined) data.wa = normalizeWA(body.wa)
    if (body.status !== undefined) data.statusAktif = body.status === "aktif"

    const updated = await prisma.pelanggan.update({
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
      },
    })

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
      },
      message: "Pelanggan berhasil diperbarui",
    })
  } catch (e) {
    const err = e as { code?: string; message?: string }
    if (err.code === "P2025") {
      return NextResponse.json({ ok: false, message: "Pelanggan tidak ditemukan" }, { status: 404 })
    }
    return NextResponse.json({ ok: false, message: err.message ?? "Server error" }, { status: 500 })
  }
}


// --- tambahkan helper ini di atas handler DELETE ---
type JwtPayload = { sub?: string }

function getAuthUserId(req: NextRequest): string | null {
  // ambil token dari cookie (samakan nama cookienya dengan yang kamu set saat login)
  const token = req.cookies.get("tb_token")?.value
  if (!token) return null
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecret") as JwtPayload
    return decoded.sub ?? null         // asumsi "sub" berisi userId
  } catch {
    return null
  }
}

// --- handler DELETE (soft delete) ---
export async function DELETE(req: NextRequest) {
  try {
    // dukung ?id=... ATAU { id: "..." } di body
    const urlId = req.nextUrl.searchParams.get("id") ?? undefined
    const body  = await req.json().catch(() => ({} as unknown))
    const id    = (body as { id?: string })?.id ?? urlId
    if (!id) {
      return NextResponse.json({ ok: false, message: "ID wajib disertakan" }, { status: 400 })
    }

    // siapa yang menghapus?
    const userId = getAuthUserId(req)   // bisa null kalau belum login/invalid

    // pakai updateMany agar bisa filter deletedAt: null
    const result = await prisma.pelanggan.updateMany({
      where: { id, deletedAt: null },   // hanya yang belum terhapus
      data: {
        deletedAt: new Date(),
        deletedBy: userId ?? null,      // catat penghapus
        statusAktif: false,
      },
    })

    if (result.count === 0) {
      // tidak ada baris yang ter-update: id tak ada atau sudah terhapus
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

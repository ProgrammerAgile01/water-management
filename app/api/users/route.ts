// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

const userSelect = {
  id: true,
  username: true,
  name: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect

// GET /api/users?role=PETUGAS&q=bud&page=1&pageSize=20
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const roleParam = (sp.get("role") ?? "").trim().toUpperCase() as
    | "ADMIN"
    | "PETUGAS"
    | "WARGA"
    | ""

  const q = (sp.get("q") ?? "").trim()
  const pageRaw = parseInt(sp.get("page") ?? "1", 10)
  const sizeRaw = parseInt(sp.get("pageSize") ?? "50", 10)
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const pageSize = Number.isFinite(sizeRaw) && sizeRaw > 0 ? Math.min(sizeRaw, 100) : 50

  // where dasar: tidak terhapus + aktif saja
  const whereBase: Prisma.UserWhereInput = {
    deletedAt: null,         // jika model User Anda tidak punya deletedAt, hapus baris ini
    isActive: true,
  }

  // filter role (opsional)
  const whereRole: Prisma.UserWhereInput = roleParam
    ? { role: roleParam as any }
    : {}

  // filter pencarian (opsional)
  const whereSearch: Prisma.UserWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { username: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      }
    : {}

  const where: Prisma.UserWhereInput = { AND: [whereBase, whereRole, whereSearch] }

  const total = await prisma.user.count({ where })
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)

  const items = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "asc" },
    skip: (safePage - 1) * pageSize,
    take: pageSize,
    select: userSelect,
  })

  return NextResponse.json({
    ok: true,
    items,                                 // ⬅️ ZonaForm membaca field ini
    pagination: { page: safePage, pageSize, total, totalPages },
  })
}

// POST /api/users
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any))
  const { username, password, name, role, phone } = body as {
    username?: string
    password?: string
    name?: string
    role?: "ADMIN" | "PETUGAS" | "WARGA"
    phone?: string | null
  }

  if (!username || !password || !name) {
    return NextResponse.json({ ok: false, message: "username, password, name wajib diisi" }, { status: 400 })
  }

  const exists = await prisma.user.findUnique({ where: { username } })
  if (exists) {
    return NextResponse.json({ ok: false, message: "Username sudah dipakai" }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const created = await prisma.user.create({
    data: {
      username,
      passwordHash,
      name,
      role: role ?? "WARGA",
      phone: phone ?? null,
      isActive: true,
    },
    select: userSelect,
  })

  return NextResponse.json({ ok: true, item: created }, { status: 201 })
}
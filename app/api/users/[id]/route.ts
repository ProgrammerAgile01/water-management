// app/api/users/[id]/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

const select = {
  id: true, username: true, name: true, phone: true,
  role: true, isActive: true, createdAt: true, updatedAt: true,
}

export async function PUT(_: Request, { params }: { params: { id: string } }) {
  const id = params.id
  const body = await _.json().catch(() => ({} as any))
  const { username, password, name, role, phone } = body as {
    username?: string
    password?: string
    name?: string
    role?: "ADMIN" | "PETUGAS" | "WARGA"
    phone?: string | null
  }

  // cegah edit username 'admin' jadi non-unik/aneh via delete+create
  const current = await prisma.user.findUnique({ where: { id } })
  if (!current) return NextResponse.json({ message: "User tidak ditemukan" }, { status: 404 })

  let passwordHash: string | undefined
  if (typeof password === "string" && password.length > 0) {
    passwordHash = await bcrypt.hash(password, 10)
  }

  // kalau ganti username, pastikan unik
  if (username && username !== current.username) {
    const exists = await prisma.user.findUnique({ where: { username } })
    if (exists) {
      return NextResponse.json({ message: "Username sudah dipakai" }, { status: 400 })
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      username: username ?? undefined,
      passwordHash,
      name: name ?? undefined,
      role: role ?? undefined,
      phone: phone ?? undefined,
    },
    select,
  })

  return NextResponse.json(updated)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = params.id
  const body = await req.json().catch(() => ({} as any))
  const { action, isActive } = body as { action?: "toggle"; isActive?: boolean }

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return NextResponse.json({ message: "User tidak ditemukan" }, { status: 404 })
  if (user.username === "admin" && action === "toggle" && user.isActive && isActive === false) {
    // masih boleh toggle admin? Kalau tidak, batasi:
    // return NextResponse.json({ message: "User admin tidak bisa dinonaktifkan" }, { status: 400 })
  }

  const nextActive = typeof isActive === "boolean" ? isActive : !user.isActive

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: nextActive },
    select,
  })
  return NextResponse.json(updated)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const id = params.id
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return NextResponse.json({ message: "User tidak ditemukan" }, { status: 404 })
  if (user.username === "admin") {
    return NextResponse.json({ message: 'User "admin" tidak boleh dihapus' }, { status: 400 })
  }

  // Soft delete (sesuai schema kamu punya kolom deletedAt)
  const deleted = await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
    select,
  })
  return NextResponse.json(deleted)
}
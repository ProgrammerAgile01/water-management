// app/api/auth/login/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json({ ok: false, message: 'Invalid body' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { username } })
    if (!user || !user.isActive) {
      return NextResponse.json({ ok: false, message: 'User tidak ditemukan / nonaktif' }, { status: 401 })
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      return NextResponse.json({ ok: false, message: 'Password salah' }, { status: 401 })
    }

    // buat token
    const token = jwt.sign(
      { sub: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'supersecret',
      { expiresIn: '1d' }
    )

    // response + set cookie httpOnly
    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, username: user.username, role: user.role, name: user.name },
    })

    res.cookies.set('tb_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 hari
    })

    return res
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, message: e.message ?? 'Server error' }, { status: 500 })
  }
}
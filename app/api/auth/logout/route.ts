// app/api/auth/logout/route.ts
import { NextResponse } from "next/server"

export async function POST() {
  const res = NextResponse.json({ ok: true, message: "Logout berhasil" })
  res.cookies.set("tb_token", "", {
    httpOnly: true,
    path: "/",
    expires: new Date(0), // expired langsung
  })
  return res
}
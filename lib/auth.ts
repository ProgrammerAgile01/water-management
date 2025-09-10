// lib/auth.ts
import type { NextRequest } from "next/server"
import * as jose from "jose" // pastikan terinstal: npm i jose

/**
 * Ambil userId dari request server:
 * - Prioritas 1: JWT httpOnly cookie "tb_token" (payload: { sub | id | userId })
 * - Prioritas 2: cookie "tb_user_id" (fallback kalau pakai id terpisah)
 * - Prioritas 3: Authorization: Bearer <token> (kalau dipakai)
 * Gak ketemu -> return null
 */
export async function getAuthUserId(req: NextRequest): Promise<string | null> {
  try {
    // 1) JWT dari cookie
    const jwt = req.cookies.get("tb_token")?.value
    if (jwt) {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret")
      const { payload } = await jose.jwtVerify(jwt, secret).catch(() => ({ payload: {} as jose.JWTPayload }))
      const id = (payload.sub as string) || (payload["id"] as string) || (payload["userId"] as string)
      if (id) return id
    }

    // 2) Fallback: cookie langsung berisi user id
    const idCookie = req.cookies.get("tb_user_id")?.value
    if (idCookie) return idCookie

    // 3) Fallback: Authorization header
    const auth = req.headers.get("authorization") || ""
    if (auth.toLowerCase().startsWith("bearer ")) {
      const token = auth.slice(7).trim()
      if (token) {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret")
        const { payload } = await jose.jwtVerify(token, secret).catch(() => ({ payload: {} as jose.JWTPayload }))
        const id = (payload.sub as string) || (payload["id"] as string) || (payload["userId"] as string)
        if (id) return id
      }
    }
  } catch {
    // diamkan, fallback ke null
  }
  return null
}
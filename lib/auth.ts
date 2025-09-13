// // lib/auth.ts
// import type { NextRequest } from "next/server"
// import * as jose from "jose" // pastikan terinstal: npm i jose

// /**
//  * Ambil userId dari request server:
//  * - Prioritas 1: JWT httpOnly cookie "tb_token" (payload: { sub | id | userId })
//  * - Prioritas 2: cookie "tb_user_id" (fallback kalau pakai id terpisah)
//  * - Prioritas 3: Authorization: Bearer <token> (kalau dipakai)
//  * Gak ketemu -> return null
//  */
// export async function getAuthUserId(req: NextRequest): Promise<string | null> {
//   try {
//     // 1) JWT dari cookie
//     const jwt = req.cookies.get("tb_token")?.value
//     if (jwt) {
//       const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret")
//       const { payload } = await jose.jwtVerify(jwt, secret).catch(() => ({ payload: {} as jose.JWTPayload }))
//       const id = (payload.sub as string) || (payload["id"] as string) || (payload["userId"] as string)
//       if (id) return id
//     }

//     // 2) Fallback: cookie langsung berisi user id
//     const idCookie = req.cookies.get("tb_user_id")?.value
//     if (idCookie) return idCookie

//     // 3) Fallback: Authorization header
//     const auth = req.headers.get("authorization") || ""
//     if (auth.toLowerCase().startsWith("bearer ")) {
//       const token = auth.slice(7).trim()
//       if (token) {
//         const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret")
//         const { payload } = await jose.jwtVerify(token, secret).catch(() => ({ payload: {} as jose.JWTPayload }))
//         const id = (payload.sub as string) || (payload["id"] as string) || (payload["userId"] as string)
//         if (id) return id
//       }
//     }
//   } catch {
//     // diamkan, fallback ke null
//   }
//   return null
// }

// lib/auth.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import * as jose from "jose";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "session"; // <- cookie untuk magic-link login

/**
 * Ambil userId dari request server dengan prioritas:
 * 1) Session cookie (DB-backed) -> tabel Session
 * 2) JWT httpOnly cookie "tb_token"
 * 3) Cookie "tb_user_id"
 * 4) Authorization: Bearer <token>
 */
export async function getAuthUserId(req: NextRequest): Promise<string | null> {
  try {
    // 1) Session cookie (magic link)
    const sToken = req.cookies.get(SESSION_COOKIE)?.value;
    if (sToken) {
      const s = await prisma.session
        .findUnique({
          where: { token: sToken },
          select: { userId: true, expiresAt: true },
        })
        .catch(() => null);
      if (s && s.expiresAt > new Date()) return s.userId;
    }

    // 2) JWT dari cookie "tb_token"
    const jwt = req.cookies.get("tb_token")?.value;
    if (jwt) {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || "dev-secret"
      );
      const { payload } =
        (await jose
          .jwtVerify(jwt, secret)
          .catch(() => ({ payload: {} as jose.JWTPayload }))) || {};
      const id =
        (payload?.sub as string) ||
        (payload?.["id"] as string) ||
        (payload?.["userId"] as string);
      if (id) return id;
    }

    // 3) Fallback: cookie "tb_user_id"
    const idCookie = req.cookies.get("tb_user_id")?.value;
    if (idCookie) return idCookie;

    // 4) Fallback: Authorization: Bearer <token>
    const auth = req.headers.get("authorization") || "";
    if (auth.toLowerCase().startsWith("bearer ")) {
      const token = auth.slice(7).trim();
      if (token) {
        const secret = new TextEncoder().encode(
          process.env.JWT_SECRET || "dev-secret"
        );
        const { payload } =
          (await jose
            .jwtVerify(token, secret)
            .catch(() => ({ payload: {} as jose.JWTPayload }))) || {};
        const id =
          (payload?.sub as string) ||
          (payload?.["id"] as string) ||
          (payload?.["userId"] as string);
        if (id) return id;
      }
    }
  } catch {
    // diamkan, fallback ke null
  }
  return null;
}

/** Set cookie session pada response (dipakai di /auth/magic setelah verifikasi token) */
export function setSessionCookie(
  res: NextResponse,
  token: string,
  expiresAt: Date
) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** Hapus cookie session dari browser */
export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

/** Utility logout: hapus session di DB + clear cookie + redirect ke /login */
export async function logout(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } }).catch(() => {});
  }
  const res = NextResponse.redirect(new URL("/login", req.url));
  clearSessionCookie(res);
  return res;
}
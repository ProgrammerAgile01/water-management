import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as jose from "jose"; // jose untuk set JWT
// atau jsonwebtoken, tapi jose sudah oke & dipakai di getAuthUserId

const SECRET = process.env.JWT_SECRET!;
if (!SECRET) console.warn("[magic] JWT_SECRET is empty");

function getOrigin(req: NextRequest) {
  const h = req.headers;
  const origin =
    process.env.APP_ORIGIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    h.get("origin") ||
    `${h.get("x-forwarded-proto") || "http"}://${h.get("x-forwarded-host") || h.get("host") || ""}`;
  return origin?.replace(/\/$/, "");
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const fallback = `${getOrigin(req)}/unauthorized`;

  try {
    if (!token) {
      return NextResponse.redirect(`${fallback}?reason=missing_token`);
    }

    // 1) Validasi token di DB: masih berlaku & belum terpakai
    const rec = await prisma.magicLinkToken.findUnique({ where: { token }, include: { user: true }, });
    if (!rec) {
      return NextResponse.redirect(`${fallback}?reason=invalid_token`);
    }
    // if (rec.usedAt) {
    //   return NextResponse.redirect(`${fallback}?reason=used`);
    // }
    if (rec.expiresAt <= new Date()) {
      return NextResponse.redirect(`${fallback}?reason=expired`);
    }

    // 2) Ambil user
    const user = await prisma.user.findUnique({ where: { id: rec.userId } });
    if (!user || !user.isActive) {
      return NextResponse.redirect(`${fallback}?reason=inactive_user`);
    }

    // 3) Generate JWT httpOnly cookie (SAMA secret dengan login biasa)
    const jwt = await new jose.SignJWT({ id: user.id, role: user.role, username: user.username })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode(SECRET));

    // 4) Tandai token sudah dipakai (sekali pakai)
    // await prisma.magicLinkToken.update({
    //   where: { token },
    //   data: { usedAt: new Date() },
    // });

    // 5) Redirect ke pelunasan
    const dest = rec.tagihanId
      ? `${getOrigin(req)}/input-pembayaran/${encodeURIComponent(rec.tagihanId)}`
      : `${getOrigin(req)}/warga-dashboard`;

    const res = NextResponse.redirect(dest);
    res.cookies.set("tb_token", jwt, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });

    // (opsional) cookie ringan untuk UI — bukan untuk auth
    res.cookies.set("tb_user_id", user.id, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (e) {
    return NextResponse.redirect(`${fallback}?reason=server_error`);
  }
}
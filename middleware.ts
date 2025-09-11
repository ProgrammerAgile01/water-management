// middleware.ts (root project)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PROTECTED = [
  "/dashboard",
  "/pelanggan",
  "/catat-meter",
  "/jadwal-pencatatan",
  "/pelunasan",
  "/pengaturan",
  "/warga-dashboard",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!PROTECTED.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get("tb_token")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }

  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "supersecret"
    );
    const { payload } = await jwtVerify(token, secret);

    // contoh aturan: warga hanya boleh ke /warga-dashboard
    if (pathname.startsWith("/warga-dashboard") && payload.role !== "WARGA") {
      const url = req.nextUrl.clone();
      url.pathname = "/unauthorized";
      return NextResponse.redirect(url);
    }

    // admin/petugas tidak boleh ke warga-dashboard
    if (
      !pathname.startsWith("/warga-dashboard") &&
      payload.role === "WARGA" &&
      pathname !== "/warga-dashboard"
    ) {
      const url = req.nextUrl.clone();
      url.pathname = "/warga-dashboard";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth/login|api/auth/logout).*)",
  ],
};

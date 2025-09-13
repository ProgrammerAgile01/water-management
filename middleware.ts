import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PROTECTED = [
  "/dashboard",
  "/pelanggan",
  "/catat-meter",
  "/jadwal-pencatatan",
  "/pelunasan",
  "/tagihan-pembayaran",
  "/reset-meter",
  "/pengaturan",
  "/warga-dashboard",
  "/pelunasan",               // ✅ lindungi juga halaman pelunasan (butuh login)
];

const PUBLIC_PREFIX = [
  "/_next",
  "/api",
  "/auth/magic",              // ✅ biarkan magic-link jalan tanpa token
  "/unauthorized",
  "/login",
  "/",
];

function redirectTo(path: string, req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = path;
  // Hindari ikut membawa query sensitif (mis. tagihanId) saat redirect error
  url.search = "";
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Bypass aset & route publik
  if (PUBLIC_PREFIX.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Hanya guard path yang dilindungi
  if (!PROTECTED.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Perlu token
  const token = req.cookies.get("tb_token")?.value;
  if (!token) return redirectTo("/login", req);

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "supersecret");
    const { payload } = await jwtVerify(token, secret);
    const role = String(payload.role || "").toUpperCase();

    // ✅ Definisikan area yang boleh diakses WARGA
    const wargaAllowed = [
      "/warga-dashboard",
      "/pelunasan"
    ];

    if (role === "WARGA") {
      // Jika WARGA buka halaman selain dua ini → alihkan ke dashboard warga
      const ok = wargaAllowed.some((p) => pathname.startsWith(p));
      if (!ok) return redirectTo("/warga-dashboard", req);
    } else {
      // Opsional: blokir non-WARGA membuka area khusus WARGA
      const isWargaArea = wargaAllowed.some((p) => pathname.startsWith(p));
      if (isWargaArea && role !== "ADMIN" && role !== "PETUGAS") {
        return redirectTo("/unauthorized", req);
      }
    }

    return NextResponse.next();
  } catch {
    return redirectTo("/login", req);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth/login|api/auth/logout|auth/magic).*)",
  ],
};

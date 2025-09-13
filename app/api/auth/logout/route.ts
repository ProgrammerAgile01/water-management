// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

function build() {
  const res = NextResponse.json({ ok: true, message: "Logout berhasil" });

  // sama persis gayanya: set value kosong + expires ke epoch
  res.cookies.set("tb_token", "", {
    httpOnly: true,
    path: "/",
    expires: new Date(0),
  });

  res.cookies.set("tb_user_id", "", {
    httpOnly: true,
    path: "/",
    expires: new Date(0),
  });

  // kalau kamu juga pernah set cookie lain, hapus di sini juga
  // res.cookies.set("tb_magic", "", { httpOnly: true, path: "/", expires: new Date(0) });

  return res;
}

export async function POST() { return build(); }
export async function GET()  { return build(); }

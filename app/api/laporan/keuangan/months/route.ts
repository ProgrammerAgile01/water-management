// //app/api/laporan/keuangan/months/route.ts
// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

// export const runtime = "nodejs";
// export const dynamic = "force-dynamic";

// const ymUTC = (d: Date) =>
//   `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

// export async function GET() {
//   try {
//     // Ambil bulan dari Pembayaran (tanggalBayar real)
//     const pembayarans = await prisma.pembayaran.findMany({
//       where: { deletedAt: null },
//       select: { tanggalBayar: true },
//     });

//     // Ambil bulan dari Pengeluaran (CLOSE, pakai tanggalInput)
//     const pengeluarans = await prisma.pengeluaran.findMany({
//       where: { status: "CLOSE" },
//       select: { tanggalInput: true, tanggalPengeluaran: true, createdAt: true },
//     });

//     // Ambil bulan dari Purchase (CLOSE)
//     const purchases = await prisma.purchase.findMany({
//       where: { deletedAt: null, status: "CLOSE" },
//       select: { tanggal: true },
//     });

//     const set = new Set<string>();

//     for (const p of pembayarans)
//       if (p.tanggalBayar) set.add(ymUTC(new Date(p.tanggalBayar)));
//     for (const p of pengeluarans) {
//       const src = p.tanggalInput ?? p.tanggalPengeluaran ?? p.createdAt;
//       if (src) set.add(ymUTC(new Date(src)));
//     }
//     for (const p of purchases)
//       if (p.tanggal) set.add(ymUTC(new Date(p.tanggal)));

//     const periods = Array.from(set).sort((a, b) => (a < b ? 1 : -1)); // terbaru dulu
//     return NextResponse.json({ ok: true, periods });
//   } catch (e: any) {
//     return NextResponse.json(
//       { ok: false, message: e?.message || "Server error" },
//       { status: 500 }
//     );
//   }
// }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ymUTC = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

export async function GET() {
  try {
    // Pembayaran tagihan → tanggalBayar (real)
    const pembayaran = await prisma.pembayaran.findMany({
      where: { deletedAt: null },
      select: { tanggalBayar: true },
    });

    // Pengeluaran CLOSE → tanggalInput
    const pengeluaran = await prisma.pengeluaran.findMany({
      where: { status: "CLOSE" },
      select: { tanggalInput: true, tanggalPengeluaran: true, createdAt: true },
    });

    // Purchase CLOSE → tanggal
    const purchases = await prisma.purchase.findMany({
      where: { deletedAt: null, status: "CLOSE" },
      select: { tanggal: true },
    });

    // (BARU) Hutang → tanggalInput
    const hutang = await prisma.hutang.findMany({
      select: { tanggalInput: true },
    });

    // (BARU) Pembayaran Hutang → tanggalBayar
    const hutangPays = await prisma.hutangPayment.findMany({
      select: { tanggalBayar: true },
    });

    const set = new Set<string>();
    for (const p of pembayaran)
      if (p.tanggalBayar) set.add(ymUTC(new Date(p.tanggalBayar)));
    for (const p of pengeluaran) {
      const src = p.tanggalInput ?? p.tanggalPengeluaran ?? p.createdAt;
      if (src) set.add(ymUTC(new Date(src)));
    }
    for (const p of purchases)
      if (p.tanggal) set.add(ymUTC(new Date(p.tanggal)));
    for (const h of hutang)
      if (h.tanggalInput) set.add(ymUTC(new Date(h.tanggalInput)));
    for (const hp of hutangPays)
      if (hp.tanggalBayar) set.add(ymUTC(new Date(hp.tanggalBayar)));

    const periods = Array.from(set).sort((a, b) => (a < b ? 1 : -1)); // terbaru dulu
    return NextResponse.json({ ok: true, periods });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

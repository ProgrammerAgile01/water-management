// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

// type P = { id: string };

// export async function POST(
//   _req: NextRequest,
//   ctx: { params: P } | { params: Promise<P> }
// ) {
//   const { id } = await (ctx as any).params;

//   const head = await prisma.hutang.findUnique({
//     where: { id },
//     include: { details: true },
//   });
//   if (!head)
//     return NextResponse.json(
//       { ok: false, error: "NOT_FOUND" },
//       { status: 404 }
//     );
//   if (head.status === "CLOSE") return NextResponse.json({ ok: true }); // idempotent
//   if (!head.details?.length) {
//     return NextResponse.json(
//       { ok: false, error: "DETAIL_REQUIRED" },
//       { status: 400 }
//     );
//   }

//   const total = head.details.reduce((a, b) => a + (b.nominal || 0), 0);
//   await prisma.hutang.update({
//     where: { id },
//     data: { status: "CLOSE", nominal: total },
//   });
//   return NextResponse.json({ ok: true });
// }

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type P = { id: string };

export async function POST(
  _req: NextRequest,
  ctx: { params: P } | { params: Promise<P> }
) {
  const { id } = await (ctx as any).params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // ambil header + detail di dalam transaksi
      const head = await tx.hutang.findUnique({
        where: { id },
        include: { details: true },
      });
      if (!head) {
        return { ok: false, status: 404, error: "NOT_FOUND" } as const;
      }
      if (head.status === "CLOSE") {
        // idempotent
        return { ok: true, status: 200 } as const;
      }

      let total = 0;

      if ((head.details?.length ?? 0) === 0) {
        // MODE TANPA DETAIL
        if (!head.nominal || head.nominal <= 0) {
          return {
            ok: false,
            status: 400,
            error: "NOMINAL_REQUIRED",
          } as const;
        }

        // buat 1 detail otomatis agar modul pembayaran tetap kompatibel
        await tx.hutangDetail.create({
          data: {
            hutangId: head.id,
            no: 1,
            keterangan: head.keterangan || "Hutang utama",
            nominal: head.nominal,
          },
        });
        total = head.nominal;
      } else {
        // MODE DENGAN DETAIL
        total = head.details.reduce((a, b) => a + (b.nominal || 0), 0);
      }

      await tx.hutang.update({
        where: { id: head.id },
        data: { status: "CLOSE", nominal: total },
      });

      return { ok: true, status: 200 } as const;
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.status }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "ERR_POSTING" },
      { status: 500 }
    );
  }
}

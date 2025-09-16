// // app/api/tagihan/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

// export async function GET(req: NextRequest) {
//   try {
//     const user = localStorage.getItem("tb_user");
//     if (!user) {
//       return NextResponse.json({ ok: false, message: "Unauthenticated" }, { status: 401 });
//     }

//     // query params
//     const { searchParams } = new URL(req.url);
//     const periode = searchParams.get("periode") || undefined; // "YYYY-MM"
//     const statusBayar = searchParams.get("status") || undefined; // "PAID"/"UNPAID" dsb.
//     const q = searchParams.get("q") || undefined;

//     // base where
//     const where: any = {
//       deletedAt: null,
//       ...(periode ? { periode } : {}),
//       ...(statusBayar ? { statusBayar } : {}),
//     };

//     // role scope
//     if (user.role === "WARGA") {
//       // cari pelanggan yg terkait user.id
//       const p = await prisma.pelanggan.findUnique({
//         where: { userId: user.id },
//         select: { id: true },
//       });
//       if (!p) {
//         return NextResponse.json({ ok: true, data: [] });
//       }
//       where.pelangganId = p.id;
//     }

//     // pencarian nama/kode/zona
//     if (q) {
//       where.OR = [
//         { pelanggan: { nama: { contains: q, mode: "insensitive" } } },
//         { pelanggan: { kode: { contains: q, mode: "insensitive" } } },
//         { pelanggan: { zona: { nama: { contains: q, mode: "insensitive" } } } },
//       ];
//     }

//     // Ambil tagihan + pelanggan ringkas + pembayaran terakhir (opsional)
//     const tagihans = await prisma.tagihan.findMany({
//       where,
//       orderBy: [{ createdAt: "desc" }],
//       include: {
//         pelanggan: {
//           select: {
//             id: true,
//             kode: true,
//             nama: true,
//             zona: { select: { id: true, nama: true } },
//           },
//         },
//         pembayarans: {
//           orderBy: { tanggalBayar: "desc" },
//           take: 1,
//           select: {
//             id: true,
//             tanggalBayar: true,
//             jumlahBayar: true,
//             buktiUrl: true,
//             metode: true,
//             keterangan: true,
//           },
//         },
//       },
//     });

//     // Opsional: ambil catat meter untuk periode yang sama, lalu merge
//     const needsCatat = tagihans.length > 0;
//     let catatMap = new Map<string, { meterAwal: number; meterAkhir: number; pemakaianM3: number }>();
//     if (needsCatat) {
//       const pairs = tagihans.map(t => ({ pelangganId: t.pelangganId, periode: t.periode }));
//       // ambil unique periode list
//       const periodeSet = Array.from(new Set(pairs.map(p => p.periode)));
//       const pelangganSet = Array.from(new Set(pairs.map(p => p.pelangganId)));

//       const catats = await prisma.catatMeter.findMany({
//         where: {
//           pelangganId: { in: pelangganSet },
//           periode: { // lewat relasi
//             kodePeriode: { in: periodeSet },
//           },
//           deletedAt: null,
//         },
//         select: {
//           pelangganId: true,
//           meterAwal: true,
//           meterAkhir: true,
//           pemakaianM3: true,
//           periode: { select: { kodePeriode: true } },
//         },
//       });

//       for (const c of catats) {
//         catatMap.set(`${c.pelangganId}|${c.periode.kodePeriode}`, {
//           meterAwal: c.meterAwal,
//           meterAkhir: c.meterAkhir,
//           pemakaianM3: c.pemakaianM3,
//         });
//       }
//     }

//     // bentuk payload untuk UI
//     const data = tagihans.map(t => {
//       const cm = catatMap.get(`${t.pelangganId}|${t.periode}`);
//       const lastPay = t.pembayarans[0] || null;

//       return {
//         id: t.id,
//         periode: t.periode,
//         pelangganId: t.pelangganId,
//         namaWarga: t.pelanggan?.nama ?? "-",
//         pelangganKode: t.pelanggan?.kode ?? null,
//         zona: t.pelanggan?.zona?.nama ?? "-",

//         // catat meter (opsional)
//         meterAwal: cm?.meterAwal ?? null,
//         meterAkhir: cm?.meterAkhir ?? null,
//         pemakaian: cm?.pemakaianM3 ?? null,

//         tarifPerM3: t.tarifPerM3,
//         abonemen: t.abonemen,
//         denda: t.denda,
//         totalTagihan: t.totalTagihan,

//         status: t.statusBayar === "PAID" ? "lunas" : "belum-lunas",
//         statusVerif: t.statusVerif, // "VERIFIED"/"UNVERIFIED"
//         tglJatuhTempo: t.tglJatuhTempo,

//         // ringkasan pembayaran terakhir
//         tanggalBayar: lastPay?.tanggalBayar ?? null,
//         buktiPembayaran: lastPay?.buktiUrl ?? null,
//         metode: lastPay?.metode ?? null,
//         keterangan: lastPay?.keterangan ?? null,
//       };
//     });

//     return NextResponse.json({ ok: true, data });
//   } catch (e: any) {
//     console.error(e);
//     return NextResponse.json({ ok: false, message: e?.message ?? "Error" }, { status: 500 });
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const periodeQ = url.searchParams.get("periode") || undefined;
    const statusQ  = url.searchParams.get("status")  || undefined;
    const q        = url.searchParams.get("q")       || undefined;

    // Ambil identitas dari header DAN sediakan fallback query param (buat dev)
    const roleHeader = req.headers.get("x-user-role");
    const uidHeader  = req.headers.get("x-user-id");
    const roleQuery  = url.searchParams.get("role");
    const uidQuery   = url.searchParams.get("uid");

    // ⬇️ DEFAULT = ADMIN (tanpa scoping) kalau tidak ada apa pun
    const role  = (roleHeader || roleQuery || "ADMIN") as "ADMIN"|"PETUGAS"|"WARGA";
    const userId = uidHeader || uidQuery || null;

    const where: any = {
      deletedAt: null,
      ...(periodeQ ? { periode: periodeQ } : {}),
      ...(statusQ  ? { statusBayar: statusQ } : {}),
    };

    // Terapkan scoping HANYA bila role WARGA
    if (role === "WARGA" && userId) {
      const pel = await prisma.pelanggan.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!pel) return NextResponse.json({ ok: true, data: [] });
      where.pelangganId = pel.id;
    }

    if (q) {
      where.OR = [
        { pelanggan: { nama: { contains: q, mode: "insensitive" } } },
        { pelanggan: { kode: { contains: q, mode: "insensitive" } } },
        { pelanggan: { zona: { nama: { contains: q, mode: "insensitive" } } } },
      ];
    }

    const tagihans = await prisma.tagihan.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      include: {
        pelanggan: {
          select: {
            id: true,
            userId: true,
            kode: true,
            nama: true,
            zona: { select: { id: true, nama: true } },
          },
        },
        pembayarans: {
          orderBy: { tanggalBayar: "desc" },
          take: 1,
          select: {
            id: true,
            tanggalBayar: true,
            jumlahBayar: true,
            buktiUrl: true,
            metode: true,
            keterangan: true,
          },
        },
      },
    });

    // (opsional) ambil catat meter; kalau tidak ada, biarkan null
    const periodeSet   = Array.from(new Set(tagihans.map(t => t.periode)));
    const pelangganSet = Array.from(new Set(tagihans.map(t => t.pelangganId)));
    const catats = (periodeSet.length && pelangganSet.length)
      ? await prisma.catatMeter.findMany({
          where: {
            pelangganId: { in: pelangganSet },
            deletedAt: null,
            periode: { kodePeriode: { in: periodeSet } },
          },
          select: {
            pelangganId: true,
            meterAwal: true, meterAkhir: true, pemakaianM3: true,
            periode: { select: { kodePeriode: true } },
          },
        })
      : [];

    const cmMap = new Map<string, { meterAwal:number; meterAkhir:number; pemakaianM3:number }>();
    for (const c of catats) {
      cmMap.set(`${c.pelangganId}|${c.periode.kodePeriode}`, {
        meterAwal: c.meterAwal, meterAkhir: c.meterAkhir, pemakaianM3: c.pemakaianM3,
      });
    }

    const data = tagihans.map(t => {
      const cm = cmMap.get(`${t.pelangganId}|${t.periode}`);
      const last = t.pembayarans[0] || null;

      return {
        id: t.id,
        periode: t.periode,

        pelangganId: t.pelangganId,
        pelangganIdUser: t.pelanggan?.userId ?? null,
        pelangganKode: t.pelanggan?.kode ?? null,
        namaWarga: t.pelanggan?.nama ?? "-",
        zona: t.pelanggan?.zona?.nama ?? "-",

        meterAwal: cm?.meterAwal ?? null,
        meterAkhir: cm?.meterAkhir ?? null,
        pemakaian: cm?.pemakaianM3 ?? null,

        tarifPerM3: t.tarifPerM3,
        abonemen: t.abonemen,
        denda: t.denda,
        totalTagihan: t.totalTagihan,

        status: t.statusBayar === "PAID" ? "lunas" : "belum-lunas",
        statusVerif: t.statusVerif,
        tglJatuhTempo: t.tglJatuhTempo,

        tanggalBayar:    last?.tanggalBayar ?? null,
        buktiPembayaran: last?.buktiUrl ?? null,
        metode:          last?.metode ?? null,
        keterangan:      last?.keterangan ?? null,
      };
    });

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, message: e?.message ?? "Error" }, { status: 500 });
  }
}

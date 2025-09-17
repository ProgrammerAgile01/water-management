// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

// export async function GET(req: NextRequest) {
//   try {
//     const url = new URL(req.url);
//     const periodeQ = url.searchParams.get("periode") || undefined;
//     const statusQRaw = url.searchParams.get("status") || undefined;
//     const q = url.searchParams.get("q") || undefined;

//     // Ambil identitas dari header DAN sediakan fallback query param (buat dev)
//     const roleHeader = req.headers.get("x-user-role");
//     const uidHeader = req.headers.get("x-user-id");
//     const roleQuery = url.searchParams.get("role");
//     const uidQuery = url.searchParams.get("uid");

//     // ⬇️ DEFAULT = ADMIN (tanpa scoping) kalau tidak ada apa pun
//     const role = (roleHeader || roleQuery || "ADMIN") as
//       | "ADMIN"
//       | "PETUGAS"
//       | "WARGA";
//     const userId = uidHeader || uidQuery || null;

//     const where: any = {
//       deletedAt: null,
//       ...(periodeQ ? { periode: periodeQ } : {}),
//     };

//     // terima PAID/UNPAID atau lunas/belum-lunas
//     if (statusQRaw) {
//       const s = statusQRaw.toUpperCase();
//       if (s === "PAID" || s === "LUNAS") {
//         where.statusBayar = "PAID";
//       } else if (s === "UNPAID" || s === "BELUM-LUNAS") {
//         where.statusBayar = { not: "PAID" };
//       }
//     }

//     // Terapkan scoping HANYA bila role WARGA
//     if (role === "WARGA" && userId) {
//       const pel = await prisma.pelanggan.findUnique({
//         where: { userId },
//         select: { id: true },
//       });
//       if (!pel) return NextResponse.json({ ok: true, data: [] });
//       where.pelangganId = pel.id;
//     }

//     if (q) {
//       where.OR = [
//         { pelanggan: { is: { nama: { contains: q } } } },
//         { pelanggan: { is: { kode: { contains: q } } } },
//         { pelanggan: { is: { zona: { is: { nama: { contains: q } } } } } },
//       ];
//     }

//     const tagihans = await prisma.tagihan.findMany({
//       where,
//       orderBy: [{ createdAt: "desc" }],
//       include: {
//         pelanggan: {
//           select: {
//             id: true,
//             userId: true,
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

//     // (opsional) ambil catat meter; kalau tidak ada, biarkan null
//     const periodeSet = Array.from(new Set(tagihans.map((t) => t.periode)));
//     const pelangganSet = Array.from(
//       new Set(tagihans.map((t) => t.pelangganId))
//     );
//     const catats =
//       periodeSet.length && pelangganSet.length
//         ? await prisma.catatMeter.findMany({
//             where: {
//               pelangganId: { in: pelangganSet },
//               deletedAt: null,
//               periode: { is: { kodePeriode: { in: periodeSet } } },
//             },
//             select: {
//               pelangganId: true,
//               meterAwal: true,
//               meterAkhir: true,
//               pemakaianM3: true,
//               periode: { select: { kodePeriode: true } },
//             },
//           })
//         : [];

//     const cmMap = new Map<
//       string,
//       { meterAwal: number; meterAkhir: number; pemakaianM3: number }
//     >();
//     for (const c of catats) {
//       cmMap.set(`${c.pelangganId}|${c.periode.kodePeriode}`, {
//         meterAwal: c.meterAwal,
//         meterAkhir: c.meterAkhir,
//         pemakaianM3: c.pemakaianM3,
//       });
//     }

//     const data = tagihans.map((t) => {
//       const cm = cmMap.get(`${t.pelangganId}|${t.periode}`);
//       const last = t.pembayarans[0] || null;

//       return {
//         id: t.id,
//         periode: t.periode,

//         pelangganId: t.pelangganId,
//         pelangganIdUser: t.pelanggan?.userId ?? null,
//         pelangganKode: t.pelanggan?.kode ?? null,
//         namaWarga: t.pelanggan?.nama ?? "-",
//         zona: t.pelanggan?.zona?.nama ?? "-",

//         meterAwal: cm?.meterAwal ?? null,
//         meterAkhir: cm?.meterAkhir ?? null,
//         pemakaian: cm?.pemakaianM3 ?? null,

//         tarifPerM3: t.tarifPerM3,
//         abonemen: t.abonemen,
//         denda: t.denda,
//         totalTagihan: t.totalTagihan,

//         status: t.statusBayar === "PAID" ? "lunas" : "belum-lunas",
//         statusVerif: t.statusVerif,
//         tglJatuhTempo: t.tglJatuhTempo,

//         tanggalBayar: last?.tanggalBayar ?? null,
//         buktiPembayaran: last?.buktiUrl ?? null,
//         metode: last?.metode ?? null,
//         keterangan: last?.keterangan ?? null,
//       };
//     });

//     return NextResponse.json({ ok: true, data });
//   } catch (e: any) {
//     console.error(e);
//     return NextResponse.json(
//       { ok: false, message: e?.message ?? "Error" },
//       { status: 500 }
//     );
//   }
// }

// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

// export async function GET(req: NextRequest) {
//   try {
//     const url = new URL(req.url);

//     // ===== filters =====
//     const periodeQ = url.searchParams.get("periode") || undefined;
//     const statusQRaw = url.searchParams.get("status") || undefined;
//     const q = url.searchParams.get("q") || undefined;

//     // ===== pagination =====
//     const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10) || 1, 1);
//     const perPageRaw = parseInt(url.searchParams.get("perPage") || "10", 10);
//     const perPage = Math.min(Math.max(perPageRaw || 10, 1), 100);
//     const skip = (page - 1) * perPage;
//     const take = perPage;

//     // ===== scoping by role (header/qs) =====
//     const roleHeader = req.headers.get("x-user-role");
//     const uidHeader = req.headers.get("x-user-id");
//     const roleQuery = url.searchParams.get("role");
//     const uidQuery = url.searchParams.get("uid");
//     const role = (roleHeader || roleQuery || "ADMIN") as "ADMIN" | "PETUGAS" | "WARGA";
//     const userId = uidHeader || uidQuery || null;

//     const where: any = {
//       deletedAt: null,
//       ...(periodeQ ? { periode: periodeQ } : {}),
//     };

//     // map status ui/api → kolom statusBayar
//     if (statusQRaw) {
//       const s = statusQRaw.toUpperCase();
//       if (s === "PAID" || s === "LUNAS") where.statusBayar = "PAID";
//       else if (s === "UNPAID" || s === "BELUM-LUNAS") where.statusBayar = { not: "PAID" };
//     }

//     // scope WARGA
//     if (role === "WARGA" && userId) {
//       const pel = await prisma.pelanggan.findUnique({
//         where: { userId },
//         select: { id: true },
//       });
//       if (!pel) return NextResponse.json({ ok: true, data: [], meta: { page, perPage, total: 0, totalPages: 0 } });
//       where.pelangganId = pel.id;
//     }

//     // pencarian (tanpa 'mode' karena Prisma/DB kamu tidak support)
//     if (q) {
//       where.OR = [
//         { pelanggan: { is: { nama: { contains: q } } } },
//         { pelanggan: { is: { kode: { contains: q } } } },
//         { pelanggan: { is: { zona: { is: { nama: { contains: q } } } } } },
//       ];
//     }

//     // total untuk pagination
//     const total = await prisma.tagihan.count({ where });

//     // data halaman ini
//     const tagihans = await prisma.tagihan.findMany({
//       where,
//       orderBy: [{ createdAt: "desc" }],
//       skip,
//       take,
//       include: {
//         pelanggan: {
//           select: {
//             id: true,
//             userId: true,
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

//     // catat meter (opsional)
//     const periodeSet = Array.from(new Set(tagihans.map((t) => t.periode)));
//     const pelangganSet = Array.from(new Set(tagihans.map((t) => t.pelangganId)));
//     const catats =
//       periodeSet.length && pelangganSet.length
//         ? await prisma.catatMeter.findMany({
//             where: {
//               pelangganId: { in: pelangganSet },
//               deletedAt: null,
//               periode: { is: { kodePeriode: { in: periodeSet } } },
//             },
//             select: {
//               pelangganId: true,
//               meterAwal: true,
//               meterAkhir: true,
//               pemakaianM3: true,
//               periode: { select: { kodePeriode: true } },
//             },
//           })
//         : [];

//     const cmMap = new Map<string, { meterAwal: number; meterAkhir: number; pemakaianM3: number }>();
//     for (const c of catats) {
//       cmMap.set(`${c.pelangganId}|${c.periode.kodePeriode}`, {
//         meterAwal: c.meterAwal,
//         meterAkhir: c.meterAkhir,
//         pemakaianM3: c.pemakaianM3,
//       });
//     }

//     const data = tagihans.map((t) => {
//       const cm = cmMap.get(`${t.pelangganId}|${t.periode}`);
//       const last = t.pembayarans[0] || null;

//       return {
//         id: t.id,
//         periode: t.periode,

//         pelangganId: t.pelangganId,
//         pelangganIdUser: t.pelanggan?.userId ?? null,
//         pelangganKode: t.pelanggan?.kode ?? null,
//         namaWarga: t.pelanggan?.nama ?? "-",
//         zona: t.pelanggan?.zona?.nama ?? "-",

//         meterAwal: cm?.meterAwal ?? null,
//         meterAkhir: cm?.meterAkhir ?? null,
//         pemakaian: cm?.pemakaianM3 ?? null,

//         tarifPerM3: t.tarifPerM3,
//         abonemen: t.abonemen,
//         denda: t.denda,
//         totalTagihan: t.totalTagihan,

//         status: t.statusBayar === "PAID" ? "lunas" : "belum-lunas",
//         statusVerif: t.statusVerif,
//         tglJatuhTempo: t.tglJatuhTempo,

//         tanggalBayar: last?.tanggalBayar ?? null,
//         buktiPembayaran: last?.buktiUrl ?? null,
//         metode: last?.metode ?? null,
//         keterangan: last?.keterangan ?? null,
//       };
//     });

//     return NextResponse.json({
//       ok: true,
//       data,
//       meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
//     });
//   } catch (e: any) {
//     console.error(e);
//     return NextResponse.json({ ok: false, message: e?.message ?? "Error" }, { status: 500 });
//   }
// }

// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

// function getCurrentPeriode() {
//   return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date());
// }

// export async function GET(req: NextRequest) {
//   try {
//     const url = new URL(req.url);

//     // ===== filters & pagination =====
//     const q = url.searchParams.get("q") || undefined;
//     const periodeQ = url.searchParams.get("periode") || undefined; // untuk ADMIN/PETUGAS
//     const statusQRaw = url.searchParams.get("status") || undefined;

//     const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10) || 1, 1);
//     const perPageRaw = parseInt(url.searchParams.get("perPage") || "10", 10);
//     const perPage = Math.min(Math.max(perPageRaw || 10, 1), 100);
//     const skip = (page - 1) * perPage;
//     const take = perPage;

//     // ===== identitas/role =====
//     const roleHeader = req.headers.get("x-user-role");
//     const uidHeader  = req.headers.get("x-user-id");
//     const roleQuery  = url.searchParams.get("role");
//     const uidQuery   = url.searchParams.get("uid");
//     const role  = (roleHeader || roleQuery || "ADMIN") as "ADMIN"|"PETUGAS"|"WARGA";
//     const userId = uidHeader || uidQuery || null;

//     const currentPeriode = getCurrentPeriode();

//     // ===== base where =====
//     const where: any = { deletedAt: null };

//     // PERIOD RULE:
//     // - WARGA => force current periode
//     // - ADMIN/PETUGAS => pakai filter "periode" kalau dikirim, jika tidak ya tampilkan semua
//     if (role === "WARGA") {
//       where.periode = currentPeriode;
//     } else if (periodeQ) {
//       where.periode = periodeQ;
//     }

//     // STATUS map (PAID/UNPAID/LUNAS/BELUM-LUNAS)
//     if (statusQRaw) {
//       const s = statusQRaw.toUpperCase();
//       if (s === "PAID" || s === "LUNAS") where.statusBayar = "PAID";
//       else if (s === "UNPAID" || s === "BELUM-LUNAS") where.statusBayar = { not: "PAID" };
//     }

//     // SCOPE WARGA
//     if (role === "WARGA" && userId) {
//       const pel = await prisma.pelanggan.findUnique({
//         where: { userId },
//         select: { id: true },
//       });
//       if (!pel) {
//         return NextResponse.json({
//           ok: true,
//           data: [],
//           meta: { page, perPage, total: 0, totalPages: 0, currentPeriode, periodes: [currentPeriode] },
//         });
//       }
//       where.pelangganId = pel.id;
//     }

//     // SEARCH (tanpa mode)
//     if (q) {
//       where.OR = [
//         { pelanggan: { is: { nama: { contains: q } } } },
//         { pelanggan: { is: { kode: { contains: q } } } },
//         { pelanggan: { is: { zona: { is: { nama: { contains: q } } } } } },
//       ];
//     }

//     // ==== periode list untuk FILTER (ADMIN/PETUGAS lihat semua, WARGA hanya current) ====
//     const whereForPeriods: any = { ...where };
//     delete whereForPeriods.periode; // supaya dapat semua distinct periode sesuai scope/role + filter lain (status/q)
//     const periodsRaw = await prisma.tagihan.findMany({
//       where: whereForPeriods,
//       distinct: ["periode"],
//       select: { periode: true },
//       orderBy: { createdAt: "desc" },
//     });
//     const periodes = (role === "WARGA")
//       ? [currentPeriode]
//       : Array.from(new Set(periodsRaw.map(p => p.periode))).filter(Boolean);

//     // ==== total + data (dengan pagination) ====
//     const total = await prisma.tagihan.count({ where });

//     const tagihans = await prisma.tagihan.findMany({
//       where,
//       orderBy: [{ createdAt: "desc" }],
//       skip, take,
//       include: {
//         pelanggan: {
//           select: {
//             id: true, userId: true, kode: true, nama: true,
//             zona: { select: { id: true, nama: true } },
//           },
//         },
//         pembayarans: {
//           orderBy: { tanggalBayar: "desc" },
//           take: 1,
//           select: {
//             id: true, tanggalBayar: true, jumlahBayar: true,
//             buktiUrl: true, metode: true, keterangan: true,
//           },
//         },
//       },
//     });

//     // ==== catat meter (opsional) ====
//     const periodeSet   = Array.from(new Set(tagihans.map(t => t.periode)));
//     const pelangganSet = Array.from(new Set(tagihans.map(t => t.pelangganId)));
//     const catats = (periodeSet.length && pelangganSet.length)
//       ? await prisma.catatMeter.findMany({
//           where: {
//             pelangganId: { in: pelangganSet },
//             deletedAt: null,
//             periode: { is: { kodePeriode: { in: periodeSet } } },
//           },
//           select: {
//             pelangganId: true,
//             meterAwal: true, meterAkhir: true, pemakaianM3: true,
//             periode: { select: { kodePeriode: true } },
//           },
//         })
//       : [];

//     const cmMap = new Map<string, { meterAwal:number; meterAkhir:number; pemakaianM3:number }>();
//     for (const c of catats) {
//       cmMap.set(`${c.pelangganId}|${c.periode.kodePeriode}`, {
//         meterAwal: c.meterAwal, meterAkhir: c.meterAkhir, pemakaianM3: c.pemakaianM3,
//       });
//     }

//     const data = tagihans.map(t => {
//       const cm = cmMap.get(`${t.pelangganId}|${t.periode}`);
//       const last = t.pembayarans[0] || null;
//       return {
//         id: t.id,
//         periode: t.periode,
//         pelangganId: t.pelangganId,
//         pelangganIdUser: t.pelanggan?.userId ?? null,
//         pelangganKode: t.pelanggan?.kode ?? null,
//         namaWarga: t.pelanggan?.nama ?? "-",
//         zona: t.pelanggan?.zona?.nama ?? "-",
//         meterAwal: cm?.meterAwal ?? null,
//         meterAkhir: cm?.meterAkhir ?? null,
//         pemakaian: cm?.pemakaianM3 ?? null,
//         tarifPerM3: t.tarifPerM3,
//         abonemen: t.abonemen,
//         denda: t.denda,
//         totalTagihan: t.totalTagihan,
//         status: t.statusBayar === "PAID" ? "lunas" : "belum-lunas",
//         statusVerif: t.statusVerif,
//         tglJatuhTempo: t.tglJatuhTempo,
//         tanggalBayar:    last?.tanggalBayar ?? null,
//         buktiPembayaran: last?.buktiUrl ?? null,
//         metode:          last?.metode ?? null,
//         keterangan:      last?.keterangan ?? null,
//         // hanya periode berjalan
//         canInputPayment: t.periode === currentPeriode,
//       };
//     });

//     return NextResponse.json({
//       ok: true,
//       data,
//       meta: {
//         page, perPage, total, totalPages: Math.ceil(total / perPage),
//         currentPeriode,
//         periodes, // ← kirim semua opsi periode untuk filter (berdasarkan role/scope)
//       },
//     });
//   } catch (e: any) {
//     console.error(e);
//     return NextResponse.json({ ok: false, message: e?.message ?? "Error" }, { status: 500 });
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getCurrentPeriode() {
  // contoh: "September 2025"
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date());
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    // ===== filters & pagination =====
    const q = url.searchParams.get("q") || undefined;
    const periodeQ = url.searchParams.get("periode") || undefined; // ADMIN/PETUGAS only
    const statusQRaw = url.searchParams.get("status") || undefined;

    const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10) || 1, 1);
    const perPageRaw = parseInt(url.searchParams.get("perPage") || "10", 10);
    const perPage = Math.min(Math.max(perPageRaw || 10, 1), 100);
    const skip = (page - 1) * perPage;
    const take = perPage;

    // ===== role identitas (header + fallback query) =====
    const roleHeader = req.headers.get("x-user-role");
    const uidHeader  = req.headers.get("x-user-id");
    const roleQuery  = url.searchParams.get("role");
    const uidQuery   = url.searchParams.get("uid");
    const role  = (roleHeader || roleQuery || "ADMIN") as "ADMIN"|"PETUGAS"|"WARGA";
    const userId = uidHeader || uidQuery || null;

    const currentPeriode = getCurrentPeriode();

    // ===== base where =====
    const where: any = { deletedAt: null };

    // PERIOD RULE:
    // - WARGA => force current periode
    // - ADMIN/PETUGAS => pakai filter "periode" kalau dikirim, jika tidak tampilkan semua
    if (role === "WARGA") {
      where.periode = currentPeriode;
    } else if (periodeQ) {
      where.periode = periodeQ;
    }

    // STATUS map (PAID/UNPAID/LUNAS/BELUM-LUNAS)
    if (statusQRaw) {
      const s = statusQRaw.toUpperCase();
      if (s === "PAID" || s === "LUNAS") where.statusBayar = "PAID";
      else if (s === "UNPAID" || s === "BELUM-LUNAS") where.statusBayar = { not: "PAID" };
    }

    // SCOPE WARGA
    if (role === "WARGA" && userId) {
      const pel = await prisma.pelanggan.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!pel) {
        return NextResponse.json({
          ok: true,
          data: [],
          meta: { page, perPage, total: 0, totalPages: 0, currentPeriode, periodes: [currentPeriode] },
        });
      }
      where.pelangganId = pel.id;
    }

    // SEARCH di relasi (tanpa 'mode')
    if (q) {
      where.OR = [
        { pelanggan: { is: { nama: { contains: q } } } },
        { pelanggan: { is: { kode: { contains: q } } } },
        { pelanggan: { is: { zona: { is: { nama: { contains: q } } } } } },
      ];
    }

    // ==== daftar periode (role-aware) untuk filter di UI ====
    const whereForPeriods: any = { ...where };
    delete whereForPeriods.periode; // ambil semua distinct periode sesuai scope (status/q tetap dihormati)
    const periodsRaw = await prisma.tagihan.findMany({
      where: whereForPeriods,
      distinct: ["periode"],
      select: { periode: true },
    });
    const periodes =
      role === "WARGA"
        ? [currentPeriode]
        : Array.from(new Set(periodsRaw.map((p) => p.periode))).filter(Boolean);

    // ==== total + data (pagination) ====
    const total = await prisma.tagihan.count({ where });

    const tagihans = await prisma.tagihan.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip,
      take,
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

    // ==== catat meter (opsional) ====
    const periodeSet   = Array.from(new Set(tagihans.map((t) => t.periode)));
    const pelangganSet = Array.from(new Set(tagihans.map((t) => t.pelangganId)));
    const catats =
      periodeSet.length && pelangganSet.length
        ? await prisma.catatMeter.findMany({
            where: {
              pelangganId: { in: pelangganSet },
              deletedAt: null,
              periode: { is: { kodePeriode: { in: periodeSet } } }, // pakai is
            },
            select: {
              pelangganId: true,
              meterAwal: true,
              meterAkhir: true,
              pemakaianM3: true,
              periode: { select: { kodePeriode: true } },
            },
          })
        : [];

    const cmMap = new Map<string, { meterAwal:number; meterAkhir:number; pemakaianM3:number }>();
    for (const c of catats) {
      cmMap.set(`${c.pelangganId}|${c.periode.kodePeriode}`, {
        meterAwal: c.meterAwal,
        meterAkhir: c.meterAkhir,
        pemakaianM3: c.pemakaianM3,
      });
    }

    const data = tagihans.map((t) => {
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

        // hanya periode berjalan & belum lunas yang bisa input
        canInputPayment: t.periode === currentPeriode && t.statusBayar !== "PAID",
      };
    });

    return NextResponse.json({
      ok: true,
      data,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
        currentPeriode,
        periodes,
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, message: e?.message ?? "Error" }, { status: 500 });
  }
}

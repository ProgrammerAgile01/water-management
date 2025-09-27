// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { getAuthUserWithRole } from "@/lib/auth-user-server";

// export const dynamic = "force-dynamic";

// function isYm(x?: string | null) {
//   return !!x && /^\d{4}-\d{2}$/.test(x);
// }

// type Row = {
//   id: string;
//   periode: string;
//   pelangganId: string;
//   pelangganNama: string;
//   pelangganKode: string;
//   zonaId?: string | null;
//   zonaNama?: string | null;
//   tglJatuhTempo: string;
//   totalTagihanBulanIni: number;
//   tagihanLalu: number;
//   totalTagihanNett: number;
//   totalBayar: number;
//   piutang: number;
//   overdueDays: number;
// };

// export async function GET(req: NextRequest) {
//   try {
//     const me = await getAuthUserWithRole(req);
//     if (!me) {
//       return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
//     }
//     if (me.role !== "ADMIN" && me.role !== "PETUGAS") {
//       return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
//     }

//     const sp = req.nextUrl.searchParams;
//     const month = sp.get("month") || "";                  // "YYYY-MM"
//     const zoneId = sp.get("zoneId") || "";
//     const q = (sp.get("q") || "").trim();
//     const page = Math.max(parseInt(sp.get("page") || "1", 10), 1);
//     const pageSize = Math.min(Math.max(parseInt(sp.get("pageSize") || "50", 10), 1), 200);
//     const sort = sp.get("sort") || "overdue_desc,piutang_desc"; // default
//     const wantMeta = sp.get("meta") === "1";

//     // ==== ambil kandidat tagihan ====
//     const whereClause: any = {
//       deletedAt: null,
//       ...(isYm(month) ? { periode: month.slice(0, 7) } : {}),
//       pelanggan: {
//         deletedAt: null,
//         ...(zoneId ? { zonaId: zoneId } : {}),
//         ...(q
//           ? {
//               OR: [
//                 { nama: { contains: q } },
//                 { kode: { contains: q } },
//                 { wa: { contains: q } },
//                 { alamat: { contains: q } },
//               ],
//             }
//           : {}),
//       },
//     };

//     const items = await prisma.tagihan.findMany({
//       where: whereClause,
//       include: {
//         pelanggan: {
//           select: {
//             id: true,
//             nama: true,
//             kode: true,
//             zonaId: true,
//             zona: { select: { id: true, nama: true } },
//           },
//         },
//         pembayarans: {
//           where: { deletedAt: null },
//           select: { jumlahBayar: true },
//         },
//       },
//       orderBy: { createdAt: "desc" }, // pre-order; nanti kita sort di memory sesuai 'sort'
//     });

//     const now = new Date();
//     const rows: Row[] = items.map((t) => {
//       const sumBayar = t.pembayarans.reduce((a, b) => a + (b.jumlahBayar || 0), 0);
//       const nett = (t.totalTagihan || 0) + (t.tagihanLalu || 0);
//       const piutang = Math.max(nett - sumBayar, 0);
//       const jt = new Date(t.tglJatuhTempo);
//       const overdueDays = Math.max(Math.floor((+now - +jt) / (1000 * 60 * 60 * 24)), 0);

//       return {
//         id: t.id,
//         periode: t.periode,
//         pelangganId: t.pelangganId,
//         pelangganNama: t.pelanggan?.nama || "-",
//         pelangganKode: t.pelanggan?.kode || "-",
//         zonaId: t.pelanggan?.zonaId || null,
//         zonaNama: t.pelanggan?.zona?.nama || null,
//         tglJatuhTempo: t.tglJatuhTempo.toISOString(),
//         totalTagihanBulanIni: t.totalTagihan || 0,
//         tagihanLalu: t.tagihanLalu || 0,
//         totalTagihanNett: nett,
//         totalBayar: sumBayar,
//         piutang,
//         overdueDays,
//       };
//     });

//     // hanya yang benar2 punya piutang
//     let filtered = rows.filter((r) => r.piutang > 0);

//     // ==== sorting ====
//     const sortKeys = sort.split(",").map((s) => s.trim().toLowerCase());
//     filtered.sort((a, b) => {
//       for (const key of sortKeys) {
//         switch (key) {
//           case "piutang_desc":
//             if (b.piutang !== a.piutang) return b.piutang - a.piutang;
//             break;
//           case "piutang_asc":
//             if (a.piutang !== b.piutang) return a.piutang - b.piutang;
//             break;
//           case "overdue_desc":
//             if (b.overdueDays !== a.overdueDays) return b.overdueDays - a.overdueDays;
//             break;
//           case "overdue_asc":
//             if (a.overdueDays !== b.overdueDays) return a.overdueDays - b.overdueDays;
//             break;
//           case "nama_asc":
//             if (a.pelangganNama !== b.pelangganNama) return a.pelangganNama.localeCompare(b.pelangganNama);
//             break;
//           case "nama_desc":
//             if (a.pelangganNama !== b.pelangganNama) return b.pelangganNama.localeCompare(a.pelangganNama);
//             break;
//         }
//       }
//       return 0;
//     });

//     // summary
//     const totalCount = filtered.length;
//     const totalPiutang = filtered.reduce((s, r) => s + r.piutang, 0);
//     const totalBayar = filtered.reduce((s, r) => s + r.totalBayar, 0);
//     const totalTagihanNett = filtered.reduce((s, r) => s + r.totalTagihanNett, 0);
//     const avgOverdue =
//       filtered.length > 0 ? Math.round(filtered.reduce((s, r) => s + r.overdueDays, 0) / filtered.length) : 0;

//     // pagination (setelah filter+sort supaya konsisten di UI)
//     const start = (page - 1) * pageSize;
//     const end = start + pageSize;
//     const pageRows = filtered.slice(start, end);

//     // meta (bulan final & zona)
//     let months: { kodePeriode: string }[] = [];
//     let zones: { id: string; nama: string }[] = [];
//     if (wantMeta) {
//       months = await prisma.catatPeriode.findMany({
//         where: { status: "FINAL", deletedAt: null },
//         select: { kodePeriode: true },
//         orderBy: { kodePeriode: "desc" },
//       });
//       const z = await prisma.zona.findMany({
//         select: { id: true, nama: true },
//         orderBy: { nama: "asc" },
//       });
//       zones = z;
//     }

//     return NextResponse.json({
//       ok: true,
//       data: {
//         rows: pageRows,
//         summary: {
//           totalCount,
//           totalPiutang,
//           totalBayar,
//           totalTagihanNett,
//           avgOverdueDays: avgOverdue,
//         },
//         page,
//         pageSize,
//         totalAll: totalCount,
//         meta: wantMeta ? { months, zones } : undefined,
//       },
//     });
//   } catch (e: any) {
//     console.error("ERR /api/laporan/piutang", e);
//     return NextResponse.json(
//       { ok: false, error: "INTERNAL_ERROR", detail: e?.message || String(e) },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserWithRole } from "@/lib/auth-user-server";

export const dynamic = "force-dynamic";

function isYm(x?: string | null) {
  return !!x && /^\d{4}-\d{2}$/.test(x);
}

type Row = {
  id: string;
  periode: string;
  pelangganId: string;
  pelangganNama: string;
  pelangganKode: string;
  zonaId?: string | null;
  zonaNama?: string | null;
  tglJatuhTempo: string;
  totalTagihanBulanIni: number;
  tagihanLalu: number;
  totalTagihanNett: number;
  totalBayar: number;
  piutang: number;
  overdueDays: number;
  status: "BELUM_BAYAR" | "BELUM_LUNAS";
  meta?: {
    closedByPeriods?: string[]; // dari [CLOSED_BY:YYYY-MM]
    credit?: number;
    paidCount?: number;
    lastPaidAt?: string; // ISO
  };
};

function parseInfoTags(info?: string | null) {
  const meta: { closedByPeriods?: string[]; credit?: number } = {};
  if (!info) return meta;

  // Ambil semua CLOSED_BY
  const closed = Array.from(info.matchAll(/\[CLOSED_BY:([0-9]{4}-[0-9]{2})\]/gi)).map((m) => m[1]);
  if (closed.length) meta.closedByPeriods = closed;

  // Kredit (opsional, jika dipakai)
  const credit = info.match(/\[CREDIT:(-?\d+)\]/i);
  if (credit?.[1]) meta.credit = Number(credit[1]);

  return meta;
}

export async function GET(req: NextRequest) {
  try {
    const me = await getAuthUserWithRole(req);
    if (!me) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    if (me.role !== "ADMIN" && me.role !== "PETUGAS") {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;
    const month = sp.get("month") || "";
    const zoneIdRaw = sp.get("zoneId") || "";
    const zoneId = zoneIdRaw === "ALL" ? "" : zoneIdRaw;
    const q = (sp.get("q") || "").trim();
    const page = Math.max(parseInt(sp.get("page") || "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(sp.get("pageSize") || "50", 10), 1), 200);
    const sort = sp.get("sort") || "overdue_desc,piutang_desc";
    const wantMeta = sp.get("meta") === "1";

    const whereClause: any = {
      deletedAt: null,
      ...(isYm(month) ? { periode: month.slice(0, 7) } : {}),
      pelanggan: {
        deletedAt: null,
        ...(zoneId ? { zonaId: zoneId } : {}),
        ...(q
          ? {
              OR: [
                { nama: { contains: q } },
                { kode: { contains: q } },
                { wa: { contains: q } },
                { alamat: { contains: q } },
              ],
            }
          : {}),
      },
    };

    const items = await prisma.tagihan.findMany({
      where: whereClause,
      select: {
        id: true,
        periode: true,
        pelangganId: true,
        tglJatuhTempo: true,
        totalTagihan: true,
        tagihanLalu: true,
        denda: true,
        info: true,
        createdAt: true,
        pelanggan: {
          select: {
            id: true,
            nama: true,
            kode: true,
            zonaId: true,
            zona: { select: { id: true, nama: true } },
          },
        },
        pembayarans: {
          where: { deletedAt: null },
          select: { jumlahBayar: true, tanggalBayar: true },
          orderBy: { tanggalBayar: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();

    const rowsAll: Row[] = items.map((t) => {
      const sumBayar = t.pembayarans.reduce((a, b) => a + (b.jumlahBayar || 0), 0);
      const nett = (t.totalTagihan || 0) + (t.tagihanLalu || 0);
      const piutang = Math.max(nett - sumBayar, 0);

      const jt = new Date(t.tglJatuhTempo);
      const overdueDays = Math.max(Math.floor((+now - +jt) / 86400000), 0);

      const tags = parseInfoTags(t.info);
      const paidCount = t.pembayarans.length;
      const lastPaidAt = t.pembayarans[0]?.tanggalBayar?.toISOString();

      const status: Row["status"] = sumBayar <= 0 ? "BELUM_BAYAR" : "BELUM_LUNAS";

      return {
        id: t.id,
        periode: t.periode,
        pelangganId: t.pelangganId,
        pelangganNama: t.pelanggan?.nama || "-",
        pelangganKode: t.pelanggan?.kode || "-",
        zonaId: t.pelanggan?.zonaId || null,
        zonaNama: t.pelanggan?.zona?.nama || null,
        tglJatuhTempo: t.tglJatuhTempo.toISOString(),
        totalTagihanBulanIni: t.totalTagihan || 0,
        tagihanLalu: t.tagihanLalu || 0,
        totalTagihanNett: nett,
        totalBayar: sumBayar,
        piutang,
        overdueDays,
        status,
        meta:
          paidCount > 0 || Object.keys(tags).length
            ? { ...tags, paidCount, lastPaidAt }
            : undefined,
      };
    });

    // === Filter final ===
    // 1) Hanya yang piutang > 0 (belum lunas/bayar)
    // 2) TIDAK memiliki CLOSED_BY (baris yang sudah ditutup tidak ditampilkan)
    let filtered = rowsAll.filter(
      (r) => r.piutang > 0 && !(r.meta?.closedByPeriods && r.meta.closedByPeriods.length > 0)
    );

    // sorting
    const sortKeys = sort.split(",").map((s) => s.trim().toLowerCase());
    filtered.sort((a, b) => {
      for (const key of sortKeys) {
        switch (key) {
          case "piutang_desc":
            if (b.piutang !== a.piutang) return b.piutang - a.piutang;
            break;
          case "piutang_asc":
            if (a.piutang !== b.piutang) return a.piutang - b.piutang;
            break;
          case "overdue_desc":
            if (b.overdueDays !== a.overdueDays) return b.overdueDays - a.overdueDays;
            break;
          case "overdue_asc":
            if (a.overdueDays !== b.overdueDays) return a.overdueDays - b.overdueDays;
            break;
          case "nama_asc":
            if (a.pelangganNama !== b.pelangganNama) return a.pelangganNama.localeCompare(b.pelangganNama);
            break;
          case "nama_desc":
            if (a.pelangganNama !== b.pelangganNama) return b.pelangganNama.localeCompare(a.pelangganNama);
            break;
        }
      }
      return 0;
    });

    // summary
    const totalCount = filtered.length;
    const totalPiutang = filtered.reduce((s, r) => s + r.piutang, 0);
    const totalBayar = filtered.reduce((s, r) => s + r.totalBayar, 0);
    const totalTagihanNett = filtered.reduce((s, r) => s + r.totalTagihanNett, 0);
    const avgOverdue =
      filtered.length > 0 ? Math.round(filtered.reduce((s, r) => s + r.overdueDays, 0) / filtered.length) : 0;

    // pagination
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageRows = filtered.slice(start, end);

    // meta
    let months: { kodePeriode: string }[] = [];
    let zones: { id: string; nama: string }[] = [];
    if (wantMeta) {
      months = await prisma.catatPeriode.findMany({
        where: { status: "FINAL", deletedAt: null },
        select: { kodePeriode: true },
        orderBy: { kodePeriode: "desc" },
      });
      zones = await prisma.zona.findMany({
        select: { id: true, nama: true },
        orderBy: { nama: "asc" },
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        rows: pageRows,
        summary: {
          totalCount,
          totalPiutang,
          totalBayar,
          totalTagihanNett,
          avgOverdueDays: avgOverdue,
        },
        page,
        pageSize,
        totalAll: totalCount,
        meta: wantMeta ? { months, zones } : undefined,
      },
    });
  } catch (e: any) {
    console.error("ERR /api/laporan/piutang", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR", detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}

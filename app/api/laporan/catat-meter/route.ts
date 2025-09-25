// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { getAuthUserWithRole } from "@/lib/auth-user-server";

// export const dynamic = "force-dynamic";

// function isYm(x?: string | null) {
//   return !!x && /^\d{4}-\d{2}$/.test(x);
// }

// export async function GET(req: NextRequest) {
//   try {
//     // === AUTH (cookie/session via getAuthUserId) ===
//     const me = await getAuthUserWithRole(req);
//     if (!me) {
//       return NextResponse.json(
//         { ok: false, error: "UNAUTHORIZED" },
//         { status: 401 }
//       );
//     }
//     if (me.role !== "ADMIN" && me.role !== "PETUGAS") {
//       return NextResponse.json(
//         { ok: false, error: "FORBIDDEN" },
//         { status: 403 }
//       );
//     }

//     const sp = req.nextUrl.searchParams;

//     // Periode
//     let month = sp.get("month")?.slice(0, 7) || "";
//     if (!isYm(month)) {
//       const latestFinal = await prisma.catatPeriode.findFirst({
//         where: { status: "FINAL" },
//         select: { kodePeriode: true },
//         orderBy: { kodePeriode: "desc" },
//       });
//       month = latestFinal?.kodePeriode ?? "";
//     }

//     // Filter opsional
//     const zonaId = (sp.get("zonaId") || "").trim() || undefined;
//     const petugasIdFilter = (sp.get("petugasId") || "").trim() || undefined; // opsional

//     // Pagination
//     const page = Math.max(parseInt(sp.get("page") || "1", 10), 1);
//     const limit = Math.min(
//       Math.max(parseInt(sp.get("limit") || "50", 10), 1),
//       200
//     );
//     const skip = (page - 1) * limit;

//     // Zona yang ditugaskan ke PETUGAS (untuk prioritas default)
//     let assignedZones: { id: string; nama: string }[] = [];
//     if (me.role === "PETUGAS") {
//       assignedZones = await prisma.zona.findMany({
//         where: { petugasId: me.id },
//         select: { id: true, nama: true },
//         orderBy: { nama: "asc" },
//       });
//     }

//     // === WHERE dasar: hanya FINAL + DONE ===
//     const where: any = {
//       deletedAt: null,
//       status: "DONE",
//       periode: {
//         status: "FINAL",
//         ...(isYm(month) ? { kodePeriode: month } : {}),
//         ...(petugasIdFilter ? { petugasId: petugasIdFilter } : {}), // opsional
//       },
//       ...(zonaId ? { zonaIdSnapshot: zonaId } : {}),
//     };

//     // === Prioritas default PETUGAS bila tidak pilih zona (seperti permintaanmu) ===
//     if (me.role === "PETUGAS" && !zonaId && !petugasIdFilter) {
//       const zoneIds = assignedZones.map((z) => z.id);
//       where.OR = [
//         { periode: { petugasId: me.id } }, // periode yang dia catat
//         ...(zoneIds.length ? [{ zonaIdSnapshot: { in: zoneIds } }] : []), // atau zona tugas
//       ];
//     }
//     // Catatan: bila zonaId dipilih → petugas bisa melihat zona lain. Bila petugasId dipilih → filter sesuai itu.

//     // === Ambil rows: ikutkan periode.petugasNama & periode.petugas.name ===
//     const rowsRaw = await prisma.catatMeter.findMany({
//       where,
//       select: {
//         id: true,
//         meterAwal: true,
//         meterAkhir: true,
//         pemakaianM3: true,
//         zonaIdSnapshot: true,
//         zonaNamaSnapshot: true,
//         periode: {
//           select: {
//             petugasId: true,
//             petugasNama: true,
//             petugas: { select: { id: true, name: true } },
//           },
//         },
//         pelanggan: {
//           select: {
//             id: true,
//             nama: true,
//             zona: { select: { id: true, nama: true } }, // fallback terakhir untuk nama zona
//           },
//         },
//       },
//       orderBy: [
//         { zonaIdSnapshot: "asc" }, // jaga-jaga (cluster per zona)
//         { pelanggan: { zona: { nama: "asc" } } }, // fallback ke relasi zona
//         // { pelanggan: { nama: "asc" } }, // terakhir sort nama pelanggan
//       ],
//       skip,
//       take: limit,
//     });

//     const total = await prisma.catatMeter.count({ where });

//     // === Peta nama zona dari zonaIdSnapshot (untuk fallback) ===
//     const uniqueZonaIds = Array.from(
//       new Set(rowsRaw.map((r) => r.zonaIdSnapshot).filter(Boolean))
//     ) as string[];

//     let zonaNameMap: Record<string, string> = {};
//     if (uniqueZonaIds.length) {
//       const zonas = await prisma.zona.findMany({
//         where: { id: { in: uniqueZonaIds } },
//         select: { id: true, nama: true },
//       });
//       zonaNameMap = Object.fromEntries(zonas.map((z) => [z.id, z.nama]));
//     }

//     // === Semua zona (dropdown) ===
//     const allZones = await prisma.zona.findMany({
//       select: { id: true, nama: true },
//       orderBy: { nama: "asc" },
//     });

//     // === Daftar semua petugas aktif (untuk UI filter/list) ===
//     const allPetugas = await prisma.user.findMany({
//       where: { role: "PETUGAS", isActive: true, deletedAt: null },
//       select: { id: true, name: true },
//       orderBy: { name: "asc" },
//     });

//     // === Mapping final (zona name fallback + nama petugas snapshot) ===
//     const data = rowsRaw.map((r) => {
//       const namaSnapshot = r.zonaNamaSnapshot || "";
//       const namaFromMap = r.zonaIdSnapshot
//         ? zonaNameMap[r.zonaIdSnapshot] || ""
//         : "";
//       const namaFromRel = r.pelanggan?.zona?.nama || "";
//       const zonaName = namaSnapshot || namaFromMap || namaFromRel || "-";

//       const namaPetugas =
//         r.periode?.petugasNama || r.periode?.petugas?.name || "-";

//       return {
//         id: r.id,
//         namaPelanggan: r.pelanggan?.nama ?? "-",
//         meterAwal: r.meterAwal,
//         meterAkhir: r.meterAkhir,
//         pemakaian: r.pemakaianM3,
//         zona: zonaName,
//         namaPetugas, // <— NEW
//       };
//     });

//     return NextResponse.json({
//       ok: true,
//       month,
//       pagination: { page, limit, total },
//       zones: { assigned: assignedZones, all: allZones },
//       staff: { all: allPetugas }, // <— NEW (list petugas aktif)
//       rows: data,
//     });
//   } catch (e: any) {
//     console.error("ERR /api/laporan/catat-meter:", e);
//     return NextResponse.json(
//       { ok: false, error: e?.message || "INTERNAL_ERROR" },
//       { status: 500 }
//     );
//   }
// }

// app/api/laporan/catat-meter/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserWithRole } from "@/lib/auth-user-server";

export const dynamic = "force-dynamic";

function isYm(x?: string | null) {
  return !!x && /^\d{4}-\d{2}$/.test(x);
}

export async function GET(req: NextRequest) {
  try {
    // === AUTH ===
    const me = await getAuthUserWithRole(req);
    if (!me) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (me.role !== "ADMIN" && me.role !== "PETUGAS") {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;

    // Periode
    let month = sp.get("month")?.slice(0, 7) || "";
    if (!isYm(month)) {
      const latest = await prisma.catatPeriode.findFirst({
        where: { deletedAt: null },
        select: { kodePeriode: true },
        orderBy: { kodePeriode: "desc" },
      });
      month = latest?.kodePeriode ?? "";
    }

    // Ambil periode terpilih (boleh DRAFT/FINAL)
    const periode = isYm(month)
      ? await prisma.catatPeriode.findFirst({
          where: { kodePeriode: month, deletedAt: null },
          select: { id: true, isLocked: true, status: true, petugasId: true, petugasNama: true, petugas: { select: { name: true } } },
        })
      : null;

    // Filter opsional
    const zonaId = (sp.get("zonaId") || "").trim() || undefined;

    // Pagination
    const page = Math.max(parseInt(sp.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(sp.get("limit") || "50", 10), 1), 200);
    const skip = (page - 1) * limit;

    // Zona yang ditugaskan ke PETUGAS
    let assignedZones: { id: string; nama: string }[] = [];
    if (me.role === "PETUGAS") {
      assignedZones = await prisma.zona.findMany({
        where: { petugasId: me.id },
        select: { id: true, nama: true },
        orderBy: { nama: "asc" },
      });
    }

    // === Basis data = daftar PELANGGAN (agar yang belum dicatat ikut tampil) ===
    // Default PETUGAS (tanpa pilih zona) -> batasi ke zona yang ditugaskan
    const pelangganWhere: any = {
      deletedAt: null,
      statusAktif: true,
      ...(zonaId ? { zonaId } : me.role === "PETUGAS" && !zonaId && assignedZones.length
        ? { zonaId: { in: assignedZones.map((z) => z.id) } }
        : {}),
    };

    const total = await prisma.pelanggan.count({ where: pelangganWhere });

    const pelangganList = await prisma.pelanggan.findMany({
      where: pelangganWhere,
      select: {
        id: true,
        nama: true,
        meterAwal: true,
        zona: { select: { id: true, nama: true } },
      },
      orderBy: [{ zona: { nama: "asc" } }, { nama: "asc" }],
      skip,
      take: limit,
    });

    const pelangganIds = pelangganList.map((p) => p.id);

    // Ambil entri CATAT untuk periode ini (kalau periodenya ada)
    const catatList = periode
      ? await prisma.catatMeter.findMany({
          where: {
            deletedAt: null,
            periodeId: periode.id,
            pelangganId: { in: pelangganIds },
          },
          select: {
            id: true,
            pelangganId: true,
            meterAwal: true,
            meterAkhir: true,
            pemakaianM3: true,
            isLocked: true,
            status: true, // PENDING / DONE
            zonaIdSnapshot: true,
            zonaNamaSnapshot: true,
            periode: {
              select: {
                isLocked: true,
                petugasNama: true,
                petugas: { select: { name: true } },
              },
            },
          },
        })
      : [];

    const catatByPelanggan: Record<string, (typeof catatList)[number]> =
      Object.fromEntries(catatList.map((c) => [c.pelangganId, c]));

    // Semua zona (dropdown)
    const allZones = await prisma.zona.findMany({
      select: { id: true, nama: true },
      orderBy: { nama: "asc" },
    });

    // Petugas aktif (untuk referensi ke UI bila perlu)
    const allPetugas = await prisma.user.findMany({
      where: { role: "PETUGAS", isActive: true, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    // Mapping final
    const rows = pelangganList.map((p) => {
      const c = catatByPelanggan[p.id];
      const zonaName = c?.zonaNamaSnapshot || p.zona?.nama || "-";
      const namaPetugas =
        c?.periode?.petugasNama || c?.periode?.petugas?.name || periode?.petugasNama || periode?.petugas?.name || "-";

      return {
        id: c?.id || `pelanggan:${p.id}`,
        namaPelanggan: p.nama,
        meterAwal: c?.meterAwal ?? p.meterAwal ?? 0,
        meterAkhir: c?.meterAkhir ?? 0,
        pemakaian: c?.pemakaianM3 ?? 0,
        zona: zonaName,
        namaPetugas,
        // === Kolom status baru ===
        isSaved: !!c,               // ada entri catat?
        isLocked: !!c?.isLocked,    // lock per-ENTRI
        entryStatus: c?.status || "BELUM", // PENDING/DONE/BELUM
        periodeLocked: !!periode?.isLocked,
        periodeStatus: periode?.status || null,
      };
    });

    return NextResponse.json({
      ok: true,
      month,
      pagination: { page, limit, total },
      zones: { assigned: assignedZones, all: allZones },
      staff: { all: allPetugas },
      rows,
    });
  } catch (e: any) {
    console.error("ERR /api/laporan/catat-meter:", e);
    return NextResponse.json({ ok: false, error: e?.message || "INTERNAL_ERROR" }, { status: 500 });
  }
}

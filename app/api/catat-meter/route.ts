// // app/api/catat-meter/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { CatatStatus, JadwalUiStatus } from "@prisma/client";
// import { getAuthUserId } from "@/lib/auth";
// import { startOfMonth, endOfMonth, parseISO, isValid } from "date-fns";

// // ===== Helpers umum =====
// function isPeriodStr(p: string) {
//   return /^\d{4}-(0[1-9]|1[0-2])$/.test(p);
// }
// function parsePeriod(p: string) {
//   const [y, m] = p.split("-").map(Number);
//   return { tahun: y, bulan: m };
// }
// function toKodePeriode(y: number, m: number) {
//   return `${y}-${String(m).padStart(2, "0")}`;
// }
// function prevPeriodStr(p: string) {
//   const { tahun, bulan } = parsePeriod(p);
//   const d = new Date(tahun, bulan - 1, 1);
//   d.setMonth(d.getMonth() - 1);
//   return toKodePeriode(d.getFullYear(), d.getMonth() + 1);
// }
// function nextPeriodStr(p: string) {
//   const { tahun, bulan } = parsePeriod(p);
//   const d = new Date(tahun, bulan - 1, 1);
//   d.setMonth(d.getMonth() + 1);
//   return toKodePeriode(d.getFullYear(), d.getMonth() + 1);
// }
// async function getLatestPeriode() {
//   return prisma.catatPeriode.findFirst({
//     where: { deletedAt: null },
//     orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
//     select: {
//       id: true,
//       kodePeriode: true,
//       tahun: true,
//       bulan: true,
//       isLocked: true,
//       status: true,
//     },
//   });
// }
// async function recalcProgress(periodeId: string) {
//   const agg = await prisma.catatMeter.groupBy({
//     by: ["status"],
//     where: { periodeId, deletedAt: null },
//     _count: { _all: true },
//   });
//   const selesai =
//     agg.find((a) => a.status === CatatStatus.DONE)?._count._all ?? 0;
//   const pending =
//     agg.find((a) => a.status === CatatStatus.PENDING)?._count._all ?? 0;
//   const total = selesai + pending;

//   await prisma.catatPeriode.update({
//     where: { id: periodeId },
//     data: { totalPelanggan: total, selesai, pending },
//   });
// }

// // ===== Sinkron progres jadwal per zona =====
// async function syncJadwalForZona(periodeId: string, zonaId?: string | null) {
//   if (!zonaId) return;

//   const periode = await prisma.catatPeriode.findUnique({
//     where: { id: periodeId },
//     select: { kodePeriode: true, tanggalCatat: true },
//   });
//   if (!periode) return;

//   const bulan = periode.kodePeriode;

//   // Hitung target & progress untuk zona tsb
//   const [target, progress] = await Promise.all([
//     prisma.pelanggan.count({
//       where: { statusAktif: true, deletedAt: null, zonaId },
//     }),
//     prisma.catatMeter.count({
//       where: {
//         periodeId,
//         deletedAt: null,
//         zonaIdSnapshot: zonaId,
//         status: CatatStatus.DONE,
//       },
//     }),
//   ]);

//   // Tentukan status UI
//   let uiStatus: JadwalUiStatus = JadwalUiStatus.WAITING;
//   if (progress > 0 && progress < target) uiStatus = JadwalUiStatus.IN_PROGRESS;
//   if (target > 0 && progress >= target) uiStatus = JadwalUiStatus.DONE;

//   const existing = await prisma.jadwalPencatatan.findFirst({
//     where: { bulan, zonaId },
//     select: { id: true },
//   });

//   if (existing) {
//     await prisma.jadwalPencatatan.update({
//       where: { id: existing.id },
//       data: { target, progress, status: uiStatus },
//     });
//   } else {
//     const zona = await prisma.zona.findUnique({
//       where: { id: zonaId },
//       select: { petugasId: true, deskripsi: true },
//     });
//     await prisma.jadwalPencatatan.create({
//       data: {
//         bulan,
//         zonaId,
//         petugasId: zona?.petugasId ?? null,
//         alamat: zona?.deskripsi ?? null,
//         tanggalRencana: periode.tanggalCatat ?? new Date(),
//         target,
//         progress,
//         status: uiStatus,
//       },
//     });
//   }
// }

// // ===== INIT (POST) =====
// export async function POST(req: NextRequest) {
//   const kodePeriode = req.nextUrl.searchParams.get("periode") ?? "";
//   if (!isPeriodStr(kodePeriode)) {
//     return NextResponse.json(
//       { ok: false, message: "Periode wajib format YYYY-MM" },
//       { status: 400 }
//     );
//   }

//   try {
//     const body = await req.json().catch(() => ({} as any));
//     const readingDateFromBody: string | undefined = body?.readingDate; // "YYYY-MM-DD"
//     const officerNameFromBody: string | null =
//       (body?.officerName ?? "").toString().trim() || null;

//     // identitas petugas (opsional)
//     const userId = await getAuthUserId(req);
//     let userName: string | null = null;
//     if (userId) {
//       const u = await prisma.user.findUnique({
//         where: { id: userId },
//         select: { name: true },
//       });
//       userName = u?.name ?? null;
//     }

//     // 1) Idempotent periode
//     let periode = await prisma.catatPeriode.findUnique({
//       where: { kodePeriode },
//     });
//     if (!periode) {
//       // 2) Validasi “tidak boleh lompat” & “harus final dulu”
//       const latest = await getLatestPeriode();

//       if (latest) {
//         const hanyaBoleh = nextPeriodStr(latest.kodePeriode);
//         if (kodePeriode !== hanyaBoleh) {
//           return NextResponse.json(
//             {
//               ok: false,
//               message: `Tidak boleh lompat bulan. Periode berikutnya yang valid: ${hanyaBoleh}`,
//             },
//             { status: 400 }
//           );
//         }
//         if (!latest.isLocked) {
//           return NextResponse.json(
//             {
//               ok: false,
//               message: `Periode ${latest.kodePeriode} belum difinalkan. Finalisasi dulu sebelum membuat periode berikutnya.`,
//             },
//             { status: 409 }
//           );
//         }
//       }

//       // snapshot Setting sekaligus isi tanggal & petugas
//       const setting = await prisma.setting.findUnique({ where: { id: 1 } });
//       if (!setting) throw new Error("Setting (id=1) belum ada");

//       const { tahun, bulan } = parsePeriod(kodePeriode);
//       const tanggalCatat =
//         readingDateFromBody && /^\d{4}-\d{2}-\d{2}$/.test(readingDateFromBody)
//           ? new Date(readingDateFromBody)
//           : new Date();

//       periode = await prisma.catatPeriode.create({
//         data: {
//           kodePeriode,
//           bulan,
//           tahun,
//           tarifPerM3: setting.tarifPerM3,
//           abonemen: setting.abonemen,
//           totalPelanggan: 0,
//           selesai: 0,
//           pending: 0,
//           isLocked: false,
//           tanggalCatat,
//           petugasId: userId ?? null,
//           petugasNama: officerNameFromBody ?? userName ?? null,
//         },
//       });
//     } else {
//       // backfill metadata jika kosong
//       if (!periode.tanggalCatat || !periode.petugasId || !periode.petugasNama) {
//         const tanggalCatat =
//           periode.tanggalCatat ??
//           (readingDateFromBody &&
//           /^\d{4}-\d{2}-\d{2}$/.test(readingDateFromBody)
//             ? new Date(readingDateFromBody)
//             : new Date());
//         periode = await prisma.catatPeriode.update({
//           where: { id: periode.id },
//           data: {
//             tanggalCatat,
//             petugasId: periode.petugasId ?? userId ?? null,
//             petugasNama:
//               periode.petugasNama ?? officerNameFromBody ?? userName ?? null,
//           },
//         });
//       }
//     }

//     // 3) Generate entri pelanggan (idempotent) + snapshot zona
//     const aktif = await prisma.pelanggan.findMany({
//       where: { statusAktif: true, deletedAt: null },
//       select: {
//         id: true,
//         meterAwal: true,
//         zonaId: true,
//         zona: { select: { id: true, nama: true } },
//       },
//       orderBy: { createdAt: "asc" },
//     });

//     if (aktif.length === 0) {
//       await recalcProgress(periode.id);
//       return NextResponse.json({ ok: true, created: 0, skipped: 0 });
//     }

//     // bersihkan soft-delete agar unique tidak bentrok
//     await prisma.catatMeter.deleteMany({
//       where: { periodeId: periode.id, deletedAt: { not: null } },
//     });

//     // entri yang sudah ada
//     const existing = await prisma.catatMeter.findMany({
//       where: { periodeId: periode.id, deletedAt: null },
//       select: { pelangganId: true },
//     });
//     const existSet = new Set(existing.map((r) => r.pelangganId));

//     // meter awal default dari periode sebelumnya
//     const prevKode = prevPeriodStr(kodePeriode);
//     const prevPeriode = await prisma.catatPeriode.findUnique({
//       where: { kodePeriode: prevKode },
//     });

//     let lastMap = new Map<string, number>();
//     if (prevPeriode) {
//       const hist = await prisma.catatMeter.findMany({
//         where: { periodeId: prevPeriode.id, deletedAt: null },
//         select: { pelangganId: true, meterAkhir: true },
//       });
//       lastMap = new Map(hist.map((h) => [h.pelangganId, h.meterAkhir]));
//     }

//     const payload = aktif
//       .filter((p) => !existSet.has(p.id))
//       .map((p) => {
//         const zId = p.zonaId ?? p.zona?.id ?? null;
//         return {
//           periodeId: periode.id,
//           pelangganId: p.id,
//           meterAwal: lastMap.get(p.id) ?? p.meterAwal ?? 0,
//           meterAkhir: 0,
//           pemakaianM3: 0,
//           tarifPerM3: periode.tarifPerM3,
//           abonemen: periode.abonemen,
//           total: 0,
//           status: CatatStatus.PENDING,
//           isLocked: false,
//           zonaIdSnapshot: zId,
//           zonaNamaSnapshot: null as string | null,
//         };
//       });

//     let createdCount = 0;
//     if (payload.length > 0) {
//       const res = await prisma.catatMeter.createMany({
//         data: payload,
//         skipDuplicates: true,
//       });
//       createdCount = res.count;
//     }

//     // Recalc agregat periode
//     await recalcProgress(periode.id);

//     // Sinkronkan jadwal untuk seluruh zona yang tersentuh
//     const zonaUnique = Array.from(
//       new Set(payload.map((p) => p.zonaIdSnapshot).filter(Boolean) as string[])
//     );
//     await Promise.all(
//       zonaUnique.map((zid) => syncJadwalForZona(periode.id, zid))
//     );

//     return NextResponse.json({
//       ok: true,
//       created: createdCount,
//       skipped: existSet.size,
//     });
//   } catch (e: any) {
//     return NextResponse.json(
//       { ok: false, message: e.message ?? "Server error" },
//       { status: 500 }
//     );
//   }
// }

// // ===== LIST (GET) =====
// export async function GET(req: NextRequest) {
//   const kodePeriode = req.nextUrl.searchParams.get("periode") ?? "";
//   const zonaParamRaw = (req.nextUrl.searchParams.get("zona") ?? "").trim();
//   const zonaParam = zonaParamRaw ? zonaParamRaw : "";

//   if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(kodePeriode)) {
//     return NextResponse.json(
//       { ok: false, message: "Periode wajib format YYYY-MM" },
//       { status: 400 }
//     );
//   }

//   try {
//     const periode = await prisma.catatPeriode.findUnique({
//       where: { kodePeriode },
//     });

//     if (!periode) {
//       return NextResponse.json({
//         ok: true,
//         period: kodePeriode,
//         tarifPerM3: null,
//         abonemen: null,
//         locked: false,
//         progress: { total: 0, selesai: 0, pending: 0, percent: 0 },
//         items: [],
//       });
//     }

//     // range tanggal (untuk filter reset bulan yang sama)
//     const periodDate = parseISO(`${kodePeriode}-01`);
//     const monthRangeObj = isValid(periodDate)
//       ? { gte: startOfMonth(periodDate), lte: endOfMonth(periodDate) }
//       : null;

//     // filter zona opsional (nama)
//     const zonaWhere = zonaParam
//       ? {
//           OR: [
//             { zonaNamaSnapshot: { equals: zonaParam } as any },
//             {
//               pelanggan: {
//                 zona: { is: { nama: { equals: zonaParam } as any } },
//               },
//             },
//           ],
//         }
//       : {};

//     // Ambil entri catat + pelanggan
//     const rows = await prisma.catatMeter.findMany({
//       where: {
//         periodeId: periode.id,
//         deletedAt: null,
//         ...(zonaWhere as any),
//       },
//       orderBy: [{ pelanggan: { createdAt: "asc" } }, { id: "asc" }],
//       select: {
//         id: true,
//         pelangganId: true,
//         meterAwal: true,
//         meterAkhir: true,
//         pemakaianM3: true,
//         tarifPerM3: true,
//         abonemen: true,
//         total: true,
//         status: true,
//         kendala: true,
//         isLocked: true,
//         zonaIdSnapshot: true,
//         zonaNamaSnapshot: true,
//         pelanggan: {
//           select: {
//             kode: true,
//             nama: true,
//             alamat: true,
//             wa: true,
//             zona: { select: { nama: true, kode: true } },
//             // ⬇️ penting untuk override hasil reset lintas-bulan
//             isResetMeter: true,
//             meterAwal: true, // angka terbaru dari master pelanggan
//           },
//         },
//       },
//     });

//     // Map reset bulan ini → override meterAwal (fallback)
//     let resetMap = new Map<string, number>();
//     if (monthRangeObj && rows.length) {
//       const ids = Array.from(new Set(rows.map((r) => r.pelangganId)));
//       const resets = await prisma.resetMeter.findMany({
//         where: {
//           pelangganId: { in: ids },
//           ...(monthRangeObj ? { tanggalReset: monthRangeObj } : {}),
//         },
//         select: { pelangganId: true, meterAwalBaru: true, tanggalReset: true },
//         orderBy: [{ pelangganId: "asc" }, { tanggalReset: "desc" }],
//       });
//       for (const r of resets) {
//         if (!resetMap.has(r.pelangganId)) {
//           resetMap.set(r.pelangganId, r.meterAwalBaru);
//         }
//       }
//     }

//     // Susun items (override jika isResetMeter = true)
//     const items = rows.map((r) => {
//       let meterAwal = r.meterAwal;
//       let meterAkhir = r.meterAkhir ?? null;

//       if (r.pelanggan?.isResetMeter) {
//         // pakai angka terbaru dari master pelanggan (hasil reset)
//         meterAwal = r.pelanggan.meterAwal ?? r.meterAwal ?? 0;
//         meterAkhir = 0;
//       } else {
//         // fallback: kalau ada reset di bulan yang sama
//         const m = resetMap.get(r.pelangganId);
//         if (typeof m === "number") meterAwal = m;
//       }

//       const pemakaian = Math.max((meterAkhir ?? 0) - meterAwal, 0);
//       const total = (r.tarifPerM3 ?? 0) * pemakaian + (r.abonemen ?? 0);

//       return {
//         id: r.id,
//         kodeCustomer: r.pelanggan.kode,
//         nama: r.pelanggan.nama,
//         alamat: r.pelanggan.alamat,
//         phone: r.pelanggan.wa ?? "",
//         meterAwal,
//         meterAkhir,
//         pemakaian,
//         total,
//         kendala: r.kendala ?? "",
//         tarifPerM3: r.tarifPerM3,
//         abonemen: r.abonemen,
//         status: r.status === CatatStatus.DONE ? "completed" : "pending",
//         locked: !!r.isLocked,
//       };
//     });

//     const totalCount = items.length;
//     const selesai = items.filter((x) => x.status === "completed").length;
//     const pending = Math.max(0, totalCount - selesai);
//     const percent = totalCount ? Math.round((selesai / totalCount) * 100) : 0;

//     return NextResponse.json({
//       ok: true,
//       period: kodePeriode,
//       tarifPerM3: periode.tarifPerM3,
//       abonemen: periode.abonemen,
//       locked: periode.isLocked,
//       progress: { total: totalCount, selesai, pending, percent },
//       items,
//     });
//   } catch (e: any) {
//     return NextResponse.json(
//       { ok: false, message: e?.message ?? "Server error" },
//       { status: 500 }
//     );
//   }
// }

// // ===== UPDATE (PUT) =====
// export async function PUT(req: NextRequest) {
//   try {
//     const body = await req.json();
//     const id: string | undefined = body?.id;
//     const endRaw = body?.meterAkhir;
//     const end: number = typeof endRaw === "number" ? endRaw : Number(endRaw);
//     const note: string | null = (body?.kendala ?? "").toString().trim() || null;

//     if (!id || !Number.isFinite(end)) {
//       return NextResponse.json(
//         { ok: false, message: "id & meterAkhir wajib ada" },
//         { status: 400 }
//       );
//     }

//     const row = await prisma.catatMeter.findUnique({
//       where: { id },
//       select: {
//         pelangganId: true, // ⬅️ diperlukan untuk mematikan flag reset
//         meterAwal: true,
//         tarifPerM3: true,
//         abonemen: true,
//         periodeId: true,
//         deletedAt: true,
//         isLocked: true,
//         zonaIdSnapshot: true, // ➜ penting untuk sync jadwal
//         periode: { select: { isLocked: true } },
//       },
//     });
//     if (!row || row.deletedAt)
//       return NextResponse.json(
//         { ok: false, message: "Data tidak ditemukan" },
//         { status: 404 }
//       );
//     if (row.periode.isLocked || row.isLocked) {
//       return NextResponse.json(
//         { ok: false, message: "Data pelanggan ini sudah dikunci." },
//         { status: 423 }
//       );
//     }
//     if (end < row.meterAwal)
//       return NextResponse.json(
//         { ok: false, message: "Meter akhir tidak boleh < meter awal" },
//         { status: 400 }
//       );

//     const pemakaian = Math.max(0, end - row.meterAwal);
//     const total = row.tarifPerM3 * pemakaian + row.abonemen;

//     await prisma.$transaction([
//       prisma.catatMeter.update({
//         where: { id },
//         data: {
//           meterAkhir: end,
//           pemakaianM3: pemakaian,
//           total,
//           status: CatatStatus.DONE,
//           kendala: note,
//         },
//       }),
//       // Matikan flag reset setelah benar-benar dicatat
//       prisma.pelanggan.update({
//         where: { id: row.pelangganId },
//         data: { isResetMeter: false },
//       }),
//     ]);

//     await recalcProgress(row.periodeId);
//     await syncJadwalForZona(row.periodeId, row.zonaIdSnapshot); // ➜ update status jadwal

//     return NextResponse.json({
//       ok: true,
//       data: {
//         pemakaianM3: pemakaian,
//         total,
//         status: CatatStatus.DONE,
//         kendala: note,
//       },
//     });
//   } catch (e: any) {
//     return NextResponse.json(
//       { ok: false, message: e.message ?? "Server error" },
//       { status: 500 }
//     );
//   }
// }

// // ===== DELETE (hard) =====
// export async function DELETE(req: NextRequest) {
//   try {
//     const urlId = req.nextUrl.searchParams.get("id") ?? undefined;
//     const body = await req.json().catch(() => ({} as unknown));
//     const id = (body as { id?: string })?.id ?? urlId;
//     if (!id) {
//       return NextResponse.json(
//         { ok: false, message: "ID wajib disertakan" },
//         { status: 400 }
//       );
//     }

//     // Ambil dulu zona untuk sync setelah delete
//     const before = await prisma.catatMeter.findUnique({
//       where: { id },
//       select: {
//         id: true,
//         periodeId: true,
//         zonaIdSnapshot: true,
//         deletedAt: true,
//         isLocked: true,
//         periode: { select: { isLocked: true } },
//       },
//     });
//     if (!before || before.deletedAt) {
//       return NextResponse.json(
//         { ok: false, message: "Data tidak ditemukan atau sudah dihapus" },
//         { status: 404 }
//       );
//     }
//     if (before.periode.isLocked || before.isLocked) {
//       return NextResponse.json(
//         {
//           ok: false,
//           message: "Periode/baris sudah dikunci. Tidak bisa dihapus.",
//         },
//         { status: 423 }
//       );
//     }

//     // HARD DELETE supaya bisa dibuat ulang tanpa bentrok unique
//     await prisma.catatMeter.delete({ where: { id } });

//     await recalcProgress(before.periodeId);
//     await syncJadwalForZona(before.periodeId, before.zonaIdSnapshot); // ➜ sync jadwal pasca hapus

//     return NextResponse.json({ ok: true, message: "Inputan berhasil dihapus" });
//   } catch (e: any) {
//     return NextResponse.json(
//       { ok: false, message: e?.message ?? "Server error" },
//       { status: 500 }
//     );
//   }
// }

// app/api/catat-meter/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CatatStatus, JadwalUiStatus } from "@prisma/client";
import { getAuthUserId } from "@/lib/auth";
import { startOfMonth, endOfMonth, parseISO, isValid } from "date-fns";

// ===== Helpers umum =====
function isPeriodStr(p: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(p);
}
function parsePeriod(p: string) {
  const [y, m] = p.split("-").map(Number);
  return { tahun: y, bulan: m };
}
function toKodePeriode(y: number, m: number) {
  return `${y}-${String(m).padStart(2, "0")}`;
}
function prevPeriodStr(p: string) {
  const { tahun, bulan } = parsePeriod(p);
  const d = new Date(tahun, bulan - 1, 1);
  d.setMonth(d.getMonth() - 1);
  return toKodePeriode(d.getFullYear(), d.getMonth() + 1);
}
function nextPeriodStr(p: string) {
  const { tahun, bulan } = parsePeriod(p);
  const d = new Date(tahun, bulan - 1, 1);
  d.setMonth(d.getMonth() + 1);
  return toKodePeriode(d.getFullYear(), d.getMonth() + 1);
}
async function getLatestPeriode() {
  return prisma.catatPeriode.findFirst({
    where: { deletedAt: null },
    orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
    select: {
      id: true,
      kodePeriode: true,
      tahun: true,
      bulan: true,
      isLocked: true,
      status: true,
    },
  });
}
async function recalcProgress(periodeId: string) {
  const agg = await prisma.catatMeter.groupBy({
    by: ["status"],
    where: { periodeId, deletedAt: null },
    _count: { _all: true },
  });
  const selesai =
    agg.find((a) => a.status === CatatStatus.DONE)?._count._all ?? 0;
  const pending =
    agg.find((a) => a.status === CatatStatus.PENDING)?._count._all ?? 0;
  const total = selesai + pending;

  await prisma.catatPeriode.update({
    where: { id: periodeId },
    data: { totalPelanggan: total, selesai, pending },
  });
}

// ===== Sinkron progres jadwal per zona =====
async function syncJadwalForZona(periodeId: string, zonaId?: string | null) {
  if (!zonaId) return;

  const periode = await prisma.catatPeriode.findUnique({
    where: { id: periodeId },
    select: { kodePeriode: true, tanggalCatat: true },
  });
  if (!periode) return;

  const bulan = periode.kodePeriode;

  // Hitung target & progress untuk zona tsb
  const [target, progress] = await Promise.all([
    prisma.pelanggan.count({
      where: { statusAktif: true, deletedAt: null, zonaId },
    }),
    prisma.catatMeter.count({
      where: {
        periodeId,
        deletedAt: null,
        zonaIdSnapshot: zonaId,
        status: CatatStatus.DONE,
      },
    }),
  ]);

  // Tentukan status UI
  let uiStatus: JadwalUiStatus = JadwalUiStatus.WAITING;
  if (progress > 0 && progress < target) uiStatus = JadwalUiStatus.IN_PROGRESS;
  if (target > 0 && progress >= target) uiStatus = JadwalUiStatus.DONE;

  const existing = await prisma.jadwalPencatatan.findFirst({
    where: { bulan, zonaId },
    select: { id: true },
  });

  if (existing) {
    await prisma.jadwalPencatatan.update({
      where: { id: existing.id },
      data: { target, progress, status: uiStatus },
    });
  } else {
    const zona = await prisma.zona.findUnique({
      where: { id: zonaId },
      select: { petugasId: true, deskripsi: true },
    });
    await prisma.jadwalPencatatan.create({
      data: {
        bulan,
        zonaId,
        petugasId: zona?.petugasId ?? null,
        alamat: zona?.deskripsi ?? null,
        tanggalRencana: periode.tanggalCatat ?? new Date(),
        target,
        progress,
        status: uiStatus,
      },
    });
  }
}

// Helper: format YYYY-MM-DD dari Date tanpa masalah timezone
function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ===== INIT (POST) =====
export async function POST(req: NextRequest) {
  const kodePeriode = req.nextUrl.searchParams.get("periode") ?? "";
  if (!isPeriodStr(kodePeriode)) {
    return NextResponse.json(
      { ok: false, message: "Periode wajib format YYYY-MM" },
      { status: 400 }
    );
  }

  try {
    const body = await req.json().catch(() => ({} as any));
    const readingDateFromBody: string | undefined = body?.readingDate; // "YYYY-MM-DD"
    const officerNameFromBody: string | null =
      (body?.officerName ?? "").toString().trim() || null;

    // identitas petugas (opsional)
    const userId = await getAuthUserId(req);
    let userName: string | null = null;
    if (userId) {
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      userName = u?.name ?? null;
    }

    // 1) Idempotent periode
    let periode = await prisma.catatPeriode.findUnique({
      where: { kodePeriode },
    });
    if (!periode) {
      // 2) Validasi “tidak boleh lompat” & “harus final dulu”
      const latest = await getLatestPeriode();

      if (latest) {
        const hanyaBoleh = nextPeriodStr(latest.kodePeriode);
        if (kodePeriode !== hanyaBoleh) {
          return NextResponse.json(
            {
              ok: false,
              message: `Tidak boleh lompat bulan. Periode berikutnya yang valid: ${hanyaBoleh}`,
            },
            { status: 400 }
          );
        }
        if (!latest.isLocked) {
          return NextResponse.json(
            {
              ok: false,
              message: `Periode ${latest.kodePeriode} belum difinalkan. Finalisasi dulu sebelum membuat periode berikutnya.`,
            },
            { status: 409 }
          );
        }
      }

      // snapshot Setting sekaligus isi tanggal & petugas
      const setting = await prisma.setting.findUnique({ where: { id: 1 } });
      if (!setting) throw new Error("Setting (id=1) belum ada");

      const { tahun, bulan } = parsePeriod(kodePeriode);

      // ==== REVISI: fallback ke setting.tanggalCatatDefault (integer hari) ====
      let tanggalCatat: Date;
      if (
        readingDateFromBody &&
        /^\d{4}-\d{2}-\d{2}$/.test(readingDateFromBody)
      ) {
        tanggalCatat = new Date(readingDateFromBody);
      } else if (setting.tanggalCatatDefault) {
        const hari = Math.max(1, Math.min(31, setting.tanggalCatatDefault));
        tanggalCatat = new Date(tahun, bulan - 1, hari);
      } else {
        tanggalCatat = new Date();
      }

      periode = await prisma.catatPeriode.create({
        data: {
          kodePeriode,
          bulan,
          tahun,
          tarifPerM3: setting.tarifPerM3,
          abonemen: setting.abonemen,
          totalPelanggan: 0,
          selesai: 0,
          pending: 0,
          isLocked: false,
          tanggalCatat,
          petugasId: userId ?? null,
          petugasNama: officerNameFromBody ?? userName ?? null,
        },
      });
    } else {
      // backfill metadata jika kosong
      if (!periode.tanggalCatat || !periode.petugasId || !periode.petugasNama) {
        const setting = await prisma.setting.findUnique({ where: { id: 1 } });
        const { tahun, bulan } = parsePeriod(periode.kodePeriode);

        let tanggalCatat: Date =
          periode.tanggalCatat ??
          (readingDateFromBody &&
          /^\d{4}-\d{2}-\d{2}$/.test(readingDateFromBody)
            ? new Date(readingDateFromBody)
            : setting?.tanggalCatatDefault
            ? new Date(
                tahun,
                bulan - 1,
                Math.max(1, Math.min(31, setting.tanggalCatatDefault))
              )
            : new Date());

        periode = await prisma.catatPeriode.update({
          where: { id: periode.id },
          data: {
            tanggalCatat,
            petugasId: periode.petugasId ?? userId ?? null,
            petugasNama:
              periode.petugasNama ?? officerNameFromBody ?? userName ?? null,
          },
        });
      }
    }

    // 3) Generate entri pelanggan (idempotent) + snapshot zona
    const aktif = await prisma.pelanggan.findMany({
      where: { statusAktif: true, deletedAt: null },
      select: {
        id: true,
        meterAwal: true,
        zonaId: true,
        zona: { select: { id: true, nama: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    if (aktif.length === 0) {
      await recalcProgress(periode.id);
      return NextResponse.json({ ok: true, created: 0, skipped: 0 });
    }

    // bersihkan soft-delete agar unique tidak bentrok
    await prisma.catatMeter.deleteMany({
      where: { periodeId: periode.id, deletedAt: { not: null } },
    });

    // entri yang sudah ada
    const existing = await prisma.catatMeter.findMany({
      where: { periodeId: periode.id, deletedAt: null },
      select: { pelangganId: true },
    });
    const existSet = new Set(existing.map((r) => r.pelangganId));

    // meter awal default dari periode sebelumnya
    const prevKode = prevPeriodStr(kodePeriode);
    const prevPeriode = await prisma.catatPeriode.findUnique({
      where: { kodePeriode: prevKode },
    });

    let lastMap = new Map<string, number>();
    if (prevPeriode) {
      const hist = await prisma.catatMeter.findMany({
        where: { periodeId: prevPeriode.id, deletedAt: null },
        select: { pelangganId: true, meterAkhir: true },
      });
      lastMap = new Map(hist.map((h) => [h.pelangganId, h.meterAkhir]));
    }

    const payload = aktif
      .filter((p) => !existSet.has(p.id))
      .map((p) => {
        const zId = p.zonaId ?? p.zona?.id ?? null;
        return {
          periodeId: periode.id,
          pelangganId: p.id,
          meterAwal: lastMap.get(p.id) ?? p.meterAwal ?? 0,
          meterAkhir: 0,
          pemakaianM3: 0,
          tarifPerM3: periode.tarifPerM3,
          abonemen: periode.abonemen,
          total: 0,
          status: CatatStatus.PENDING,
          isLocked: false,
          zonaIdSnapshot: zId,
          zonaNamaSnapshot: null as string | null,
        };
      });

    let createdCount = 0;
    if (payload.length > 0) {
      const res = await prisma.catatMeter.createMany({
        data: payload,
        skipDuplicates: true,
      });
      createdCount = res.count;
    }

    // Recalc agregat periode
    await recalcProgress(periode.id);

    // Sinkronkan jadwal untuk seluruh zona yang tersentuh
    const zonaUnique = Array.from(
      new Set(payload.map((p) => p.zonaIdSnapshot).filter(Boolean) as string[])
    );
    await Promise.all(
      zonaUnique.map((zid) => syncJadwalForZona(periode.id, zid))
    );

    return NextResponse.json({
      ok: true,
      created: createdCount,
      skipped: existSet.size,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e.message ?? "Server error" },
      { status: 500 }
    );
  }
}

// ===== LIST (GET) =====
export async function GET(req: NextRequest) {
  const kodePeriode = req.nextUrl.searchParams.get("periode") ?? "";
  const zonaParamRaw = (req.nextUrl.searchParams.get("zona") ?? "").trim();
  const zonaParam = zonaParamRaw ? zonaParamRaw : "";

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(kodePeriode)) {
    return NextResponse.json(
      { ok: false, message: "Periode wajib format YYYY-MM" },
      { status: 400 }
    );
  }

  try {
    const periode = await prisma.catatPeriode.findUnique({
      where: { kodePeriode },
    });

    if (!periode) {
      return NextResponse.json({
        ok: true,
        period: kodePeriode,
        tarifPerM3: null,
        abonemen: null,
        locked: false,
        tanggalCatat: null, // ⬅️ tambahan agar frontend tahu tidak ada
        petugas: null, // ⬅️ tambahan
        progress: { total: 0, selesai: 0, pending: 0, percent: 0 },
        items: [],
      });
    }

    // range tanggal (untuk filter reset bulan yang sama)
    const periodDate = parseISO(`${kodePeriode}-01`);
    const monthRangeObj = isValid(periodDate)
      ? { gte: startOfMonth(periodDate), lte: endOfMonth(periodDate) }
      : null;

    // filter zona opsional (nama)
    const zonaWhere = zonaParam
      ? {
          OR: [
            { zonaNamaSnapshot: { equals: zonaParam } as any },
            {
              pelanggan: {
                zona: { is: { nama: { equals: zonaParam } as any } },
              },
            },
          ],
        }
      : {};

    // Ambil entri catat + pelanggan
    const rows = await prisma.catatMeter.findMany({
      where: {
        periodeId: periode.id,
        deletedAt: null,
        ...(zonaWhere as any),
      },
      orderBy: [{ pelanggan: { createdAt: "asc" } }, { id: "asc" }],
      select: {
        id: true,
        pelangganId: true,
        meterAwal: true,
        meterAkhir: true,
        pemakaianM3: true,
        tarifPerM3: true,
        abonemen: true,
        total: true,
        status: true,
        kendala: true,
        isLocked: true,
        zonaIdSnapshot: true,
        zonaNamaSnapshot: true,
        pelanggan: {
          select: {
            kode: true,
            nama: true,
            alamat: true,
            wa: true,
            zona: { select: { nama: true, kode: true } },
            isResetMeter: true,
            meterAwal: true,
          },
        },
      },
    });

    // Map reset bulan ini → override meterAwal (fallback)
    let resetMap = new Map<string, number>();
    if (monthRangeObj && rows.length) {
      const ids = Array.from(new Set(rows.map((r) => r.pelangganId)));
      const resets = await prisma.resetMeter.findMany({
        where: {
          pelangganId: { in: ids },
          ...(monthRangeObj ? { tanggalReset: monthRangeObj } : {}),
        },
        select: { pelangganId: true, meterAwalBaru: true, tanggalReset: true },
        orderBy: [{ pelangganId: "asc" }, { tanggalReset: "desc" }],
      });
      for (const r of resets) {
        if (!resetMap.has(r.pelangganId)) {
          resetMap.set(r.pelangganId, r.meterAwalBaru);
        }
      }
    }

    // Susun items (override jika isResetMeter = true)
    const items = rows.map((r) => {
      let meterAwal = r.meterAwal;
      let meterAkhir = r.meterAkhir ?? null;

      if (r.pelanggan?.isResetMeter) {
        meterAwal = r.pelanggan.meterAwal ?? r.meterAwal ?? 0;
        meterAkhir = 0;
      } else {
        const m = resetMap.get(r.pelangganId);
        if (typeof m === "number") meterAwal = m;
      }

      const pemakaian = Math.max((meterAkhir ?? 0) - meterAwal, 0);
      const total = (r.tarifPerM3 ?? 0) * pemakaian + (r.abonemen ?? 0);

      return {
        id: r.id,
        kodeCustomer: r.pelanggan.kode,
        nama: r.pelanggan.nama,
        alamat: r.pelanggan.alamat,
        phone: r.pelanggan.wa ?? "",
        meterAwal,
        meterAkhir,
        pemakaian,
        total,
        kendala: r.kendala ?? "",
        tarifPerM3: r.tarifPerM3,
        abonemen: r.abonemen,
        status: r.status === CatatStatus.DONE ? "completed" : "pending",
        locked: !!r.isLocked,
      };
    });

    const totalCount = items.length;
    const selesai = items.filter((x) => x.status === "completed").length;
    const pending = Math.max(0, totalCount - selesai);
    const percent = totalCount ? Math.round((selesai / totalCount) * 100) : 0;

    return NextResponse.json({
      ok: true,
      period: kodePeriode,
      tarifPerM3: periode.tarifPerM3,
      abonemen: periode.abonemen,
      locked: periode.isLocked,
      // ⬇️ kirim ke frontend agar form auto-terisi
      tanggalCatat: periode.tanggalCatat ? ymd(periode.tanggalCatat) : null,
      petugas: periode.petugasNama ?? null,
      progress: { total: totalCount, selesai, pending, percent },
      items,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

// ===== UPDATE (PUT) =====
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const id: string | undefined = body?.id;
    const endRaw = body?.meterAkhir;
    const end: number = typeof endRaw === "number" ? endRaw : Number(endRaw);
    const note: string | null = (body?.kendala ?? "").toString().trim() || null;

    if (!id || !Number.isFinite(end)) {
      return NextResponse.json(
        { ok: false, message: "id & meterAkhir wajib ada" },
        { status: 400 }
      );
    }

    const row = await prisma.catatMeter.findUnique({
      where: { id },
      select: {
        pelangganId: true,
        meterAwal: true,
        tarifPerM3: true,
        abonemen: true,
        periodeId: true,
        deletedAt: true,
        isLocked: true,
        zonaIdSnapshot: true,
        periode: { select: { isLocked: true } },
      },
    });
    if (!row || row.deletedAt)
      return NextResponse.json(
        { ok: false, message: "Data tidak ditemukan" },
        { status: 404 }
      );
    if (row.periode.isLocked || row.isLocked) {
      return NextResponse.json(
        { ok: false, message: "Data pelanggan ini sudah dikunci." },
        { status: 423 }
      );
    }
    if (end < row.meterAwal)
      return NextResponse.json(
        { ok: false, message: "Meter akhir tidak boleh < meter awal" },
        { status: 400 }
      );

    const pemakaian = Math.max(0, end - row.meterAwal);
    const total = row.tarifPerM3 * pemakaian + row.abonemen;

    await prisma.$transaction([
      prisma.catatMeter.update({
        where: { id },
        data: {
          meterAkhir: end,
          pemakaianM3: pemakaian,
          total,
          status: CatatStatus.DONE,
          kendala: note,
        },
      }),
      prisma.pelanggan.update({
        where: { id: row.pelangganId },
        data: { isResetMeter: false },
      }),
    ]);

    await recalcProgress(row.periodeId);
    await syncJadwalForZona(row.periodeId, row.zonaIdSnapshot);

    return NextResponse.json({
      ok: true,
      data: {
        pemakaianM3: pemakaian,
        total,
        status: CatatStatus.DONE,
        kendala: note,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e.message ?? "Server error" },
      { status: 500 }
    );
  }
}

// ===== DELETE (hard) =====
export async function DELETE(req: NextRequest) {
  try {
    const urlId = req.nextUrl.searchParams.get("id") ?? undefined;
    const body = await req.json().catch(() => ({} as unknown));
    const id = (body as { id?: string })?.id ?? urlId;
    if (!id) {
      return NextResponse.json(
        { ok: false, message: "ID wajib disertakan" },
        { status: 400 }
      );
    }

    const before = await prisma.catatMeter.findUnique({
      where: { id },
      select: {
        id: true,
        periodeId: true,
        zonaIdSnapshot: true,
        deletedAt: true,
        isLocked: true,
        periode: { select: { isLocked: true } },
      },
    });
    if (!before || before.deletedAt) {
      return NextResponse.json(
        { ok: false, message: "Data tidak ditemukan atau sudah dihapus" },
        { status: 404 }
      );
    }
    if (before.periode.isLocked || before.isLocked) {
      return NextResponse.json(
        {
          ok: false,
          message: "Periode/baris sudah dikunci. Tidak bisa dihapus.",
        },
        { status: 423 }
      );
    }

    await prisma.catatMeter.delete({ where: { id } });

    await recalcProgress(before.periodeId);
    await syncJadwalForZona(before.periodeId, before.zonaIdSnapshot);

    return NextResponse.json({ ok: true, message: "Inputan berhasil dihapus" });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

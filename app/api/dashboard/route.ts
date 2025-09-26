// // app/api/dashboard/route.ts
// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

// const IMONTHS = [
//   "Jan",
//   "Feb",
//   "Mar",
//   "Apr",
//   "Mei",
//   "Jun",
//   "Jul",
//   "Agu",
//   "Sep",
//   "Okt",
//   "Nov",
//   "Des",
// ];
// const pad2 = (n: number) => n.toString().padStart(2, "0");

// // safe percent change: bila prev = 0 → 0 (hindari Infinity)
// function pctChange(curr: number, prev: number) {
//   if (!prev) return 0;
//   return ((curr - prev) / prev) * 100;
// }

// function prevYM(year: number, month1to12: number) {
//   const d = new Date(Date.UTC(year, month1to12 - 1, 1));
//   d.setUTCMonth(d.getUTCMonth() - 1);
//   return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
// }

// export async function GET(req: Request) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const now = new Date();
//     const year = Number(searchParams.get("year") ?? now.getFullYear());

//     // ==== CHART: Pemakaian (CatatMeter by tahun CatatPeriode) ====
//     const catats = await prisma.catatMeter.findMany({
//       where: { deletedAt: null, periode: { tahun: year } },
//       select: { pemakaianM3: true, periode: { select: { bulan: true } } },
//     });
//     const usageByMonth: number[] = Array(12).fill(0);
//     for (const r of catats) {
//       const idx = Math.max(0, Math.min(11, (r.periode?.bulan ?? 1) - 1));
//       usageByMonth[idx] += r.pemakaianM3 ?? 0;
//     }
//     const usageData = IMONTHS.map((m, i) => ({
//       month: m,
//       usage: usageByMonth[i],
//     }));

//     // ==== CHART: Tagihan per bulan (pakai Tagihan.periode 'YYYY-MM') ====
//     const tagihanTahun = await prisma.tagihan.findMany({
//       where: { deletedAt: null, periode: { startsWith: `${year}-` } },
//       select: { periode: true, totalTagihan: true },
//     });
//     const billingByMonth: number[] = Array(12).fill(0);
//     for (const t of tagihanTahun) {
//       const [yStr, mStr] = (t.periode ?? "").split("-");
//       if (Number(yStr) !== year) continue;
//       const midx = Math.max(0, Math.min(11, Number(mStr) - 1));
//       billingByMonth[midx] += t.totalTagihan ?? 0;
//     }
//     const billingData = IMONTHS.map((m, i) => ({
//       month: m,
//       amount: billingByMonth[i],
//     }));

//     // helper kecil
//     function nextYM(year: number, month1to12: number) {
//       const d = new Date(Date.UTC(year, month1to12 - 1, 1));
//       d.setUTCMonth(d.getUTCMonth() + 1);
//       return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
//     }

//     // ==== TABLE: 5 periode terakhir tahun ini ====
//     const periods = await prisma.catatPeriode.findMany({
//       where: { deletedAt: null, tahun: year },
//       orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
//       take: 5,
//       select: { kodePeriode: true, bulan: true, tahun: true },
//     });
//     const kode = (y: number, m: number) => `${y}-${pad2(m)}`;
//     const tableData: any[] = [];

//     for (const p of periods) {
//       // periode catat (mis. Juli 2025)
//       const kPeriodeCatat = p.kodePeriode || kode(p.tahun, p.bulan);

//       // 🔁 periode TAGIHAN = bulan berikutnya (mis. Agustus 2025)
//       const { y: billY, m: billM } = nextYM(p.tahun, p.bulan);
//       const kPeriodeTagihan = kode(billY, billM);

//       // total m³ tetap dari CATAT bulan ini (Juli)
//       const cmRows = await prisma.catatMeter.findMany({
//         where: { deletedAt: null, periode: { tahun: p.tahun, bulan: p.bulan } },
//         select: { pemakaianM3: true },
//       });
//       const totalM3 = cmRows.reduce((s, r) => s + (r.pemakaianM3 || 0), 0);

//       // ⬇️ Tagihan & pembayaran untuk PERIODE TAGIHAN (Agustus)
//       const tg = await prisma.tagihan.findMany({
//         where: { deletedAt: null, periode: kPeriodeTagihan },
//         select: { totalTagihan: true, statusBayar: true, id: true },
//       });
//       const tagihan = tg.reduce((s, r) => s + (r.totalTagihan || 0), 0);

//       const paidRows = await prisma.pembayaran.findMany({
//         where: {
//           deletedAt: null,
//           tagihan: { periode: kPeriodeTagihan, deletedAt: null },
//         },
//         select: { jumlahBayar: true },
//       });
//       const sudahBayar = paidRows.reduce((s, r) => s + (r.jumlahBayar || 0), 0);
//       const belumBayar = Math.max(0, tagihan - sudahBayar);

//       const status =
//         belumBayar <= 0
//           ? ("paid" as const)
//           : sudahBayar > 0
//           ? ("partial" as const)
//           : ("unpaid" as const);

//       // 🏷️ Tampilkan label bulan PENAGIHAN (Agustus), bukan bulan catat (Juli)
//       const periodeLabel = new Date(billY, billM - 1, 1).toLocaleDateString(
//         "id-ID",
//         {
//           month: "long",
//           year: "numeric",
//         }
//       );

//       tableData.push({
//         id: kPeriodeTagihan, // id baris = kode periode TAGIHAN
//         periode: periodeLabel, // contoh: "Agustus 2025"
//         totalM3, // dari catat Juli
//         tagihan, // total tagihan Agustus
//         sudahBayar,
//         belumBayar,
//         status,
//       });
//     }

//     // ==== LISTS ====
//     // Top 5 pemakai (periode terbaru tahun ini)
//     const latestPeriod = await prisma.catatPeriode.findFirst({
//       where: { deletedAt: null, tahun: year },
//       orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
//       select: { id: true },
//     });
//     let topUsers: Array<{ name: string; usage: number; address: string }> = [];
//     if (latestPeriod) {
//       const tops = await prisma.catatMeter.findMany({
//         where: { deletedAt: null, periodeId: latestPeriod.id },
//         orderBy: { pemakaianM3: "desc" },
//         take: 5,
//         select: {
//           pemakaianM3: true,
//           pelanggan: { select: { nama: true, alamat: true } },
//         },
//       });
//       topUsers = tops.map((r) => ({
//         name: r.pelanggan?.nama ?? "-",
//         address: r.pelanggan?.alamat ?? "-",
//         usage: r.pemakaianM3 ?? 0,
//       }));
//     }

//     // Unpaid list (10 terbaru)
//     const unpaidTagihans = await prisma.tagihan.findMany({
//       where: { deletedAt: null, statusBayar: { not: "PAID" } },
//       orderBy: { createdAt: "desc" },
//       take: 10,
//       select: {
//         totalTagihan: true,
//         periode: true,
//         pelanggan: { select: { nama: true } },
//       },
//     });
//     const unpaidList = unpaidTagihans.map((t) => ({
//       name: t.pelanggan?.nama ?? "-",
//       amount: t.totalTagihan ?? 0,
//       period: t.periode ?? "-",
//     }));

//     // Water issues (CatatMeter.kendala terbaru)
//     const issues = await prisma.catatMeter.findMany({
//       where: { deletedAt: null, kendala: { not: null } },
//       orderBy: { updatedAt: "desc" },
//       take: 10,
//       select: {
//         kendala: true,
//         updatedAt: true,
//         pelanggan: { select: { nama: true } },
//       },
//     });
//     const waterIssues = issues.map((i) => ({
//       issue: `${i.kendala} - ${i.pelanggan?.nama ?? "Pelanggan"}`,
//       status: "unresolved",
//       date: i.updatedAt.toISOString().slice(0, 10),
//     }));

//     // ==== STAT CARDS + TREND ====

//     // ambil 2 periode catat terakhir di tahun ini
//     const lastTwo = await prisma.catatPeriode.findMany({
//       where: { deletedAt: null, tahun: year },
//       orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
//       take: 2,
//       select: { tahun: true, bulan: true },
//     });

//     // periode tagihan = next dari periode catat
//     let periodeNow: string, periodePrev: string;
//     if (lastTwo.length) {
//       const { y: cy, m: cm } = nextYM(lastTwo[0].tahun, lastTwo[0].bulan);
//       periodeNow = `${cy}-${pad2(cm)}`;
//       if (lastTwo[1]) {
//         const { y: py, m: pm } = nextYM(lastTwo[1].tahun, lastTwo[1].bulan);
//         periodePrev = `${py}-${pad2(pm)}`;
//       } else {
//         const { y: py, m: pm } = prevYM(cy, cm);
//         periodePrev = `${py}-${pad2(pm)}`;
//       }
//     } else {
//       // fallback ke bulan kalender (kalau belum ada data catat)
//       const now = new Date();
//       const cy = now.getFullYear(),
//         cm = now.getMonth() + 1;
//       const { y: py, m: pm } = prevYM(cy, cm);
//       periodeNow = `${cy}-${pad2(cm)}`;
//       periodePrev = `${py}-${pad2(pm)}`;
//     }

//     // 1) Tagihan periodeNow & periodePrev
//     const tagihanCurr = await prisma.tagihan.aggregate({
//       where: { deletedAt: null, periode: periodeNow },
//       _sum: { totalTagihan: true },
//       _count: true,
//     });
//     const tagihanPrev = await prisma.tagihan.aggregate({
//       where: { deletedAt: null, periode: periodePrev },
//       _sum: { totalTagihan: true },
//       _count: true,
//     });

//     // 2) Belum bayar per-periode
//     const belumBayarCurr = await prisma.tagihan.aggregate({
//       where: {
//         deletedAt: null,
//         periode: periodeNow,
//         statusBayar: { not: "PAID" },
//       },
//       _sum: { totalTagihan: true },
//       _count: true,
//     });
//     const belumBayarPrev = await prisma.tagihan.aggregate({
//       where: {
//         deletedAt: null,
//         periode: periodePrev,
//         statusBayar: { not: "PAID" },
//       },
//       _sum: { totalTagihan: true },
//       _count: true,
//     });

//     // 3) Total pelanggan aktif (tetap)
//     const totalPelangganNow = await prisma.pelanggan.count({
//       where: { deletedAt: null, statusAktif: true },
//     });
//     const totalPelangganPrev = totalPelangganNow;

//     // 4) Paying rate per-periode (pakai periodeNow/Prev di atas)
//     const paidCurr = await prisma.pembayaran.aggregate({
//       where: {
//         deletedAt: null,
//         tagihan: { deletedAt: null, periode: periodeNow },
//       },
//       _sum: { jumlahBayar: true },
//     });
//     const totalTagCurr = tagihanCurr._sum.totalTagihan ?? 0;
//     const payingRateCurr = totalTagCurr
//       ? (paidCurr._sum.jumlahBayar ?? 0) / totalTagCurr
//       : 0;

//     const paidPrev = await prisma.pembayaran.aggregate({
//       where: {
//         deletedAt: null,
//         tagihan: { deletedAt: null, periode: periodePrev },
//       },
//       _sum: { jumlahBayar: true },
//     });
//     const totalTagPrev = tagihanPrev._sum.totalTagihan ?? 0;
//     const payingRatePrev = totalTagPrev
//       ? (paidPrev._sum.jumlahBayar ?? 0) / totalTagPrev
//       : 0;

//     const trends = {
//       totalTagihan: {
//         value: Math.round(
//           pctChange(
//             tagihanCurr._sum.totalTagihan ?? 0,
//             tagihanPrev._sum.totalTagihan ?? 0
//           )
//         ),
//         isPositive:
//           (tagihanCurr._sum.totalTagihan ?? 0) >=
//           (tagihanPrev._sum.totalTagihan ?? 0),
//       },
//       totalBelumBayar: {
//         value: Math.round(
//           pctChange(
//             belumBayarCurr._sum.totalTagihan ?? 0,
//             belumBayarPrev._sum.totalTagihan ?? 0
//           )
//         ),
//         isPositive:
//           (belumBayarCurr._sum.totalTagihan ?? 0) <=
//           (belumBayarPrev._sum.totalTagihan ?? 0),
//       },
//       pelanggan: {
//         value: Math.round(pctChange(totalPelangganNow, totalPelangganPrev)),
//         isPositive: totalPelangganNow >= totalPelangganPrev,
//       },
//       payingRate: {
//         value: Math.round(pctChange(payingRateCurr, payingRatePrev)),
//         isPositive: payingRateCurr >= payingRatePrev,
//       },
//     };

//     return NextResponse.json({
//       usageData,
//       billingData,
//       tableData,
//       topUsers,
//       unpaidList,
//       waterIssues,
//       statCards: {
//         totalTagihanBulanIni: tagihanCurr._sum.totalTagihan ?? 0,
//         totalTagihanCount: tagihanCurr._count ?? 0,
//         totalBelumBayarAmount: belumBayarCurr._sum.totalTagihan ?? 0,
//         totalBelumBayarCount: belumBayarCurr._count ?? 0,
//         totalPelanggan: totalPelangganNow,
//         payingRate: payingRateCurr,
//         trends,
//       },
//     });
//   } catch (e: any) {
//     console.error(e);
//     return NextResponse.json(
//       { error: e?.message ?? "Server error" },
//       { status: 500 }
//     );
//   }
// }

// app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const IMONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
const pad2 = (n: number) => n.toString().padStart(2, "0");

// safe percent change: bila prev = 0 → 0 (hindari Infinity)
function pctChange(curr: number, prev: number) {
  if (!prev) return 0;
  return ((curr - prev) / prev) * 100;
}

function prevYM(year: number, month1to12: number) {
  const d = new Date(Date.UTC(year, month1to12 - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
}
function nextYM(year: number, month1to12: number) {
  const d = new Date(Date.UTC(year, month1to12 - 1, 1));
  d.setUTCMonth(d.getUTCMonth() + 1);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = Number(searchParams.get("year") ?? now.getFullYear());

    // ==== CHART: Pemakaian (CatatMeter by tahun CatatPeriode) ====
    const catats = await prisma.catatMeter.findMany({
      where: { deletedAt: null, periode: { tahun: year } },
      select: { pemakaianM3: true, periode: { select: { bulan: true } } },
    });
    const usageByMonth: number[] = Array(12).fill(0);
    for (const r of catats) {
      const idx = Math.max(0, Math.min(11, (r.periode?.bulan ?? 1) - 1));
      usageByMonth[idx] += r.pemakaianM3 ?? 0;
    }
    const usageData = IMONTHS.map((m, i) => ({
      month: m,
      usage: usageByMonth[i],
    }));

    // ==== CHART: Tagihan per bulan (pakai Tagihan.periode 'YYYY-MM') ====
    const tagihanTahun = await prisma.tagihan.findMany({
      where: { deletedAt: null, periode: { startsWith: `${year}-` } },
      select: { periode: true, totalTagihan: true },
    });
    const billingByMonth: number[] = Array(12).fill(0);
    for (const t of tagihanTahun) {
      const [yStr, mStr] = (t.periode ?? "").split("-");
      if (Number(yStr) !== year) continue;
      const midx = Math.max(0, Math.min(11, Number(mStr) - 1));
      billingByMonth[midx] += t.totalTagihan ?? 0;
    }
    const billingData = IMONTHS.map((m, i) => ({
      month: m,
      amount: billingByMonth[i],
    }));

    // ==== TABLE: 5 periode catat terakhir tahun ini (label = periode tagihan) ====
    const periods = await prisma.catatPeriode.findMany({
      where: { deletedAt: null, tahun: year },
      orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
      take: 5,
      select: { kodePeriode: true, bulan: true, tahun: true },
    });
    const kode = (y: number, m: number) => `${y}-${pad2(m)}`;
    const tableData: any[] = [];

    for (const p of periods) {
      // periode catat
      const kPeriodeCatat = p.kodePeriode || kode(p.tahun, p.bulan);

      // periode TAGIHAN = bulan berikutnya
      const { y: billY, m: billM } = nextYM(p.tahun, p.bulan);
      const kPeriodeTagihan = kode(billY, billM);

      // total m³ dari catat periode ini
      const cmRows = await prisma.catatMeter.findMany({
        where: { deletedAt: null, periode: { tahun: p.tahun, bulan: p.bulan } },
        select: { pemakaianM3: true },
      });
      const totalM3 = cmRows.reduce((s, r) => s + (r.pemakaianM3 || 0), 0);

      // tagihan dan pembayaran di periode TAGIHAN
      const tg = await prisma.tagihan.findMany({
        where: { deletedAt: null, periode: kPeriodeTagihan },
        select: {
          totalTagihan: true,
          sisaKurang: true,
          id: true,
          pembayarans: { select: { jumlahBayar: true } },
        },
      });
      const tagihan = tg.reduce((s, r) => s + (r.totalTagihan || 0), 0);

      let sudahBayar = 0;
      let belumBayar = 0;
      for (const r of tg) {
        const paid = r.pembayarans.reduce(
          (a, b) => a + (b.jumlahBayar || 0),
          0
        );
        const remainingRaw = (r.totalTagihan || 0) - paid;
        const remaining = Math.max(0, r.sisaKurang ?? remainingRaw);
        sudahBayar += paid;
        belumBayar += remaining;
      }

      const status =
        belumBayar <= 0
          ? ("paid" as const)
          : sudahBayar > 0
          ? ("partial" as const)
          : ("unpaid" as const);

      // label bulan PENAGIHAN
      const periodeLabel = new Date(billY, billM - 1, 1).toLocaleDateString(
        "id-ID",
        {
          month: "long",
          year: "numeric",
        }
      );

      tableData.push({
        id: kPeriodeTagihan,
        periode: periodeLabel,
        totalM3,
        tagihan,
        sudahBayar,
        belumBayar,
        status,
      });
    }

    // ==== LISTS ====

    // Top 5 pemakai (periode catat terbaru tahun ini)
    const latestPeriod = await prisma.catatPeriode.findFirst({
      where: { deletedAt: null, tahun: year },
      orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
      select: { id: true },
    });
    let topUsers: Array<{ name: string; usage: number; address: string }> = [];
    if (latestPeriod) {
      const tops = await prisma.catatMeter.findMany({
        where: { deletedAt: null, periodeId: latestPeriod.id },
        orderBy: { pemakaianM3: "desc" },
        take: 5,
        select: {
          pemakaianM3: true,
          pelanggan: { select: { nama: true, alamat: true } },
        },
      });
      topUsers = tops.map((r) => ({
        name: r.pelanggan?.nama ?? "-",
        address: r.pelanggan?.alamat ?? "-",
        usage: r.pemakaianM3 ?? 0,
      }));
    }

    // Unpaid list (10 terbaru) — gunakan remaining (sisa)
    const unpaidTagihans = await prisma.tagihan.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        totalTagihan: true,
        sisaKurang: true,
        periode: true,
        pembayarans: { select: { jumlahBayar: true } },
        pelanggan: { select: { nama: true } },
      },
    });
    const unpaidList = unpaidTagihans
      .map((t) => {
        const paid = t.pembayarans.reduce(
          (s, p) => s + (p.jumlahBayar || 0),
          0
        );
        const remainingRaw = (t.totalTagihan || 0) - paid;
        const amount = Math.max(0, t.sisaKurang ?? remainingRaw);
        return {
          name: t.pelanggan?.nama ?? "-",
          amount,
          period: t.periode ?? "-",
        };
      })
      .filter((x) => x.amount > 0);

    // Water issues (CatatMeter.kendala terbaru)
    const issues = await prisma.catatMeter.findMany({
      where: { deletedAt: null, kendala: { not: null } },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        kendala: true,
        updatedAt: true,
        pelanggan: { select: { nama: true } },
      },
    });
    const waterIssues = issues.map((i) => ({
      issue: `${i.kendala} - ${i.pelanggan?.nama ?? "Pelanggan"}`,
      status: "unresolved",
      date: i.updatedAt.toISOString().slice(0, 10),
    }));

    // ==== STAT CARDS + TRENDS ====

    // dua periode catat terakhir
    const lastTwo = await prisma.catatPeriode.findMany({
      where: { deletedAt: null, tahun: year },
      orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
      take: 2,
      select: { tahun: true, bulan: true },
    });

    let periodeNow: string, periodePrev: string;
    if (lastTwo.length) {
      const { y: cy, m: cm } = nextYM(lastTwo[0].tahun, lastTwo[0].bulan);
      periodeNow = `${cy}-${pad2(cm)}`;
      if (lastTwo[1]) {
        const { y: py, m: pm } = nextYM(lastTwo[1].tahun, lastTwo[1].bulan);
        periodePrev = `${py}-${pad2(pm)}`;
      } else {
        const { y: py, m: pm } = prevYM(cy, cm);
        periodePrev = `${py}-${pad2(pm)}`;
      }
    } else {
      const now = new Date();
      const cy = now.getFullYear(),
        cm = now.getMonth() + 1;
      const { y: py, m: pm } = prevYM(cy, cm);
      periodeNow = `${cy}-${pad2(cm)}`;
      periodePrev = `${py}-${pad2(pm)}`;
    }

    // total tagihan (sum nominal)
    const tagihanCurr = await prisma.tagihan.aggregate({
      where: { deletedAt: null, periode: periodeNow },
      _sum: { totalTagihan: true },
      _count: true,
    });
    const tagihanPrev = await prisma.tagihan.aggregate({
      where: { deletedAt: null, periode: periodePrev },
      _sum: { totalTagihan: true },
      _count: true,
    });

    // helper: sum remaining by periode
    async function sumRemainingByPeriode(periode: string) {
      const rows = await prisma.tagihan.findMany({
        where: { deletedAt: null, periode },
        select: {
          totalTagihan: true,
          sisaKurang: true,
          pembayarans: { select: { jumlahBayar: true } },
        },
      });
      let amount = 0;
      let count = 0;
      for (const r of rows) {
        const paid = r.pembayarans.reduce(
          (s, p) => s + (p.jumlahBayar || 0),
          0
        );
        const remainingRaw = (r.totalTagihan || 0) - paid;
        const remaining = Math.max(0, r.sisaKurang ?? remainingRaw);
        if (remaining > 0) {
          amount += remaining;
          count += 1;
        }
      }
      return { amount, count };
    }

    const belumBayarCurr = await sumRemainingByPeriode(periodeNow);
    const belumBayarPrev = await sumRemainingByPeriode(periodePrev);

    // paying rate
    const paidCurr = await prisma.pembayaran.aggregate({
      where: {
        deletedAt: null,
        tagihan: { deletedAt: null, periode: periodeNow },
      },
      _sum: { jumlahBayar: true },
    });
    const totalTagCurr = tagihanCurr._sum.totalTagihan ?? 0;
    const payingRateCurr = totalTagCurr
      ? (paidCurr._sum.jumlahBayar ?? 0) / totalTagCurr
      : 0;

    const paidPrev = await prisma.pembayaran.aggregate({
      where: {
        deletedAt: null,
        tagihan: { deletedAt: null, periode: periodePrev },
      },
      _sum: { jumlahBayar: true },
    });
    const totalTagPrev = tagihanPrev._sum.totalTagihan ?? 0;
    const payingRatePrev = totalTagPrev
      ? (paidPrev._sum.jumlahBayar ?? 0) / totalTagPrev
      : 0;

    // total pelanggan aktif
    const totalPelangganNow = await prisma.pelanggan.count({
      where: { deletedAt: null, statusAktif: true },
    });

    const trends = {
      totalTagihan: {
        value: Math.round(
          pctChange(
            tagihanCurr._sum.totalTagihan ?? 0,
            tagihanPrev._sum.totalTagihan ?? 0
          )
        ),
        isPositive:
          (tagihanCurr._sum.totalTagihan ?? 0) >=
          (tagihanPrev._sum.totalTagihan ?? 0),
      },
      totalBelumBayar: {
        value: Math.round(
          pctChange(belumBayarCurr.amount, belumBayarPrev.amount)
        ),
        isPositive: belumBayarCurr.amount <= belumBayarPrev.amount,
      },
      pelanggan: {
        value: Math.round(pctChange(totalPelangganNow, totalPelangganNow)),
        isPositive: true,
      },
      payingRate: {
        value: Math.round(pctChange(payingRateCurr, payingRatePrev)),
        isPositive: payingRateCurr >= payingRatePrev,
      },
    };

    return NextResponse.json({
      usageData,
      billingData,
      tableData,
      topUsers,
      unpaidList,
      waterIssues,
      statCards: {
        totalTagihanBulanIni: tagihanCurr._sum.totalTagihan ?? 0,
        totalTagihanCount: tagihanCurr._count ?? 0,
        totalBelumBayarAmount: belumBayarCurr.amount,
        totalBelumBayarCount: belumBayarCurr.count,
        totalPelanggan: totalPelangganNow,
        payingRate: payingRateCurr,
        trends,
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

// app/api/laporan-summary/route.ts
// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

// // ── Helpers (tetap)
// const MONTHS = [
//   "Jan",
//   "Feb",
//   "Mar",
//   "Apr",
//   "May",
//   "Jun",
//   "Jul",
//   "Aug",
//   "Sep",
//   "Oct",
//   "Nov",
//   "Dec",
// ];
// const idOperasionalKeys = [
//   "operasional",
//   "gaji",
//   "utilitas",
//   "listrik",
//   "transport",
//   "administrasi",
//   "maintenance",
//   "material",
// ];

// const emptyWater = () =>
//   MONTHS.map((m) => ({
//     month: m,
//     total: 0,
//     blokA: 0,
//     blokB: 0,
//     blokC: 0,
//     blokD: 0,
//     blokE: 0,
//     blokF: 0,
//   }));
// const emptyRevenue = () => MONTHS.map((m) => ({ month: m, amount: 0 }));
// const emptyExpenses = () =>
//   MONTHS.map((m) => ({ month: m, operasional: 0, lainnya: 0 }));

// function toMonthIdx(d: Date) {
//   return new Date(d).getMonth();
// } // 0..11
// function monthIdxFromPeriode(periode?: string | null) {
//   if (!periode) return null;
//   const m = /^(\d{4})-(\d{2})$/.exec(periode);
//   if (!m) return null;
//   const mm = Number(m[2]);
//   if (mm < 1 || mm > 12) return null;
//   return mm - 1;
// }
// function isOperasional(name?: string) {
//   if (!name) return false;
//   const n = name.toLowerCase();
//   return idOperasionalKeys.some((k) => n.includes(k));
// }
// const toNum = (v: any): number | null => {
//   if (v === null || v === undefined) return null;
//   if (typeof v === "object" && typeof (v as any)?.toNumber === "function") {
//     try {
//       return (v as any).toNumber();
//     } catch {
//       return Number(v as any);
//     }
//   }
//   return Number(v);
// };
// const hasPaidMarker = (info?: string | null) =>
//   !!(
//     info &&
//     (/\[CLOSED_BY:\d{4}-\d{2}\]/.test(info) || /\[PAID_BY:/.test(info))
//   );
// const isLunasByRules = (sisaKurang: number | null, info?: string | null) => {
//   if (hasPaidMarker(info)) return true;
//   if (sisaKurang === null) return false;
//   return sisaKurang <= 0;
// };

// export async function GET(req: Request) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const year = Number(searchParams.get("year") ?? new Date().getFullYear());

//     // ============== 1) WATER USAGE (CatatMeter) ==============
//     const cm = await prisma.catatMeter.findMany({
//       where: { deletedAt: null, periode: { tahun: year } },
//       select: {
//         pemakaianM3: true,
//         zonaNamaSnapshot: true,
//         periode: { select: { bulan: true } },
//         pelanggan: { select: { zona: { select: { nama: true } } } },
//       },
//     });

//     const water = emptyWater();
//     const zonaOrder: string[] = [];
//     for (const row of cm) {
//       const monthIdx = (row.periode.bulan ?? 1) - 1;
//       const val = row.pemakaianM3 ?? 0;
//       water[monthIdx].total += val;

//       const z =
//         row.zonaNamaSnapshot?.trim() || row.pelanggan?.zona?.nama?.trim() || "";
//       if (z && !zonaOrder.includes(z) && zonaOrder.length < 6)
//         zonaOrder.push(z);
//     }
//     for (const row of cm) {
//       const monthIdx = (row.periode.bulan ?? 1) - 1;
//       const val = row.pemakaianM3 ?? 0;
//       const z =
//         row.zonaNamaSnapshot?.trim() ||
//         row.pelanggan?.zona?.nama?.trim() ||
//         zonaOrder[5];
//       let idx = zonaOrder.indexOf(z);
//       if (idx < 0) idx = 5;
//       if (idx === 0) water[monthIdx].blokA += val;
//       else if (idx === 1) water[monthIdx].blokB += val;
//       else if (idx === 2) water[monthIdx].blokC += val;
//       else if (idx === 3) water[monthIdx].blokD += val;
//       else if (idx === 4) water[monthIdx].blokE += val;
//       else water[monthIdx].blokF += val;
//     }

//     // ============== 2) REVENUE (Pembayaran yang LUNAS) ==============
//     const pays = await prisma.pembayaran.findMany({
//       where: {
//         deletedAt: null,
//         tanggalBayar: {
//           gte: new Date(Date.UTC(year, 0, 1)),
//           lt: new Date(Date.UTC(year + 1, 0, 1)),
//         },
//         tagihan: { statusBayar: "PAID", deletedAt: null },
//       },
//       select: { tanggalBayar: true, jumlahBayar: true },
//     });

//     const revenue = emptyRevenue();
//     for (const p of pays) {
//       const idx = toMonthIdx(p.tanggalBayar);
//       revenue[idx].amount += p.jumlahBayar ?? 0;
//     }

//     // ============== 3) EXPENSES ==============
//     const details = await prisma.pengeluaranDetail.findMany({
//       where: {
//         pengeluaran: {
//           tanggalPengeluaran: {
//             gte: new Date(Date.UTC(year, 0, 1)),
//             lt: new Date(Date.UTC(year + 1, 0, 1)),
//           },
//         },
//       },
//       select: {
//         nominal: true,
//         pengeluaran: { select: { tanggalPengeluaran: true } },
//         masterBiaya: { select: { nama: true } },
//       },
//     });

//     const expenses = emptyExpenses();
//     for (const d of details) {
//       const idx = toMonthIdx(d.pengeluaran.tanggalPengeluaran);
//       const amt = d.nominal ?? 0;
//       if (isOperasional(d.masterBiaya?.nama)) expenses[idx].operasional += amt;
//       else expenses[idx].lainnya += amt;
//     }

//     // ============== 4) PROFIT/LOSS ==============
//     const profitLoss = MONTHS.map((m, i) => ({
//       month: m,
//       profit:
//         revenue[i].amount - (expenses[i].operasional + expenses[i].lainnya),
//     }));

//     // ============== 5) OUTSTANDING & UNPAID LIST (logika = /api/tagihan) ==============
//     // === OUTSTANDING & UNPAID LIST ===
//     const tagihans = await prisma.tagihan.findMany({
//       where: {
//         deletedAt: null,
//         OR: [
//           { periode: { startsWith: `${year}-` } },
//           { periode: { endsWith: ` ${year}` } },
//         ],
//       },
//       orderBy: { createdAt: "desc" }, // terbaru duluan
//       select: {
//         id: true,
//         periode: true,
//         totalTagihan: true,
//         tagihanLalu: true,
//         sisaKurang: true,
//         info: true,
//         createdAt: true,
//         pelangganId: true,
//         pelanggan: { select: { nama: true, zona: { select: { nama: true } } } },
//       },
//     });

//     // helper: parse daftar periode yang di-clearkan pada tagihan ini
//     const parsePrevCleared = (info?: string | null): string[] => {
//       if (!info) return [];
//       const m = info.match(/\[PREV_CLEARED:([0-9,\-\s]+)\]/);
//       if (!m) return [];
//       return m[1]
//         .split(",")
//         .map((s) => s.trim())
//         .filter(Boolean);
//     };

//     // set periode yang dianggap CLEARED untuk (pelangganId, periode)
//     const clearedSet = new Set<string>();
//     for (const t of tagihans) {
//       const clears = parsePrevCleared(t.info);
//       if (clears.length && t.pelangganId) {
//         for (const p of clears) {
//           clearedSet.add(`${t.pelangganId}|${p}`);
//         }
//       }
//     }

//     const outstandingData = MONTHS.map((m) => ({ month: m, amount: 0 }));
//     const unpaidBills: {
//       id: string;
//       nama: string;
//       blok: string;
//       periode: string | null;
//       nominal: number; // totalDue
//       sisaKurang: number; // sisa/kurang aktual
//       status: "unpaid";
//     }[] = [];

//     // pastikan hanya satu (terbaru) per pelanggan
//     const firstUnpaidByCustomer = new Set<string>();

//     for (const t of tagihans) {
//       const bulanIni = toNum(t.totalTagihan) ?? 0;
//       const tagihanLalu = toNum(t.tagihanLalu) ?? 0;
//       const totalDue = bulanIni + tagihanLalu;

//       const sisaKurangNum = toNum(t.sisaKurang);
//       const lunas = isLunasByRules(sisaKurangNum, t.info);

//       // jika tagihan periode ini sudah dinyatakan CLEARED oleh bulan berikutnya → skip
//       if (
//         t.pelangganId &&
//         t.periode &&
//         clearedSet.has(`${t.pelangganId}|${t.periode}`)
//       ) {
//         continue;
//       }

//       // outstanding yang dihitung
//       const outstandingAmount = lunas ? 0 : sisaKurangNum ?? totalDue;
//       const mIdx = monthIdxFromPeriode(t.periode);
//       if (mIdx !== null && outstandingAmount > 0) {
//         outstandingData[mIdx].amount += outstandingAmount;
//       }

//       // kumpulkan unpaid (hanya 1 paling baru per pelanggan)
//       if (
//         !lunas &&
//         outstandingAmount > 0 &&
//         t.pelangganId &&
//         !firstUnpaidByCustomer.has(t.pelangganId)
//       ) {
//         firstUnpaidByCustomer.add(t.pelangganId);
//         if (unpaidBills.length < 50) {
//           unpaidBills.push({
//             id: t.id,
//             nama: t.pelanggan?.nama ?? "-",
//             blok: t.pelanggan?.zona?.nama ?? "-",
//             periode: t.periode ?? "-",
//             nominal: totalDue,
//             sisaKurang: outstandingAmount,
//             status: "unpaid",
//           });
//         }
//       }
//     }

//     const outstandingTotal = outstandingData.reduce((a, b) => a + b.amount, 0);

//     // Kirim juga label zona (maks 6) agar legend FE sesuai
//     const zoneNames = zonaOrder;

//     return NextResponse.json({
//       waterUsageData: water,
//       revenueData: revenue,
//       expenseData: expenses,
//       profitLossData: profitLoss,
//       zoneNames,
//       unpaidBills, // sudah membawa sisaKurang
//       outstandingData, // [{month, amount}]
//       outstandingTotal, // total setahun
//     });
//   } catch (e: any) {
//     console.error(e);
//     return NextResponse.json(
//       { error: e?.message ?? "Server error" },
//       { status: 500 }
//     );
//   }
// }

// app/api/laporan-summary/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ── Helpers
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const idOperasionalKeys = [
  "operasional",
  "gaji",
  "utilitas",
  "listrik",
  "transport",
  "administrasi",
  "maintenance",
  "material",
];

const emptyWater = () =>
  MONTHS.map((m) => ({
    month: m,
    total: 0,
    blokA: 0,
    blokB: 0,
    blokC: 0,
    blokD: 0,
    blokE: 0,
    blokF: 0,
  }));
const emptyRevenue = () => MONTHS.map((m) => ({ month: m, amount: 0 }));
const emptyExpenses = () =>
  MONTHS.map((m) => ({ month: m, operasional: 0, lainnya: 0 }));

function toMonthIdx(d: Date) {
  return new Date(d).getMonth();
} // 0..11
function monthIdxFromPeriode(periode?: string | null) {
  if (!periode) return null;
  const m = /^(\d{4})-(\d{2})$/.exec(periode);
  if (!m) return null;
  const mm = Number(m[2]);
  if (mm < 1 || mm > 12) return null;
  return mm - 1;
}
function isOperasional(name?: string) {
  if (!name) return false;
  const n = name.toLowerCase();
  return idOperasionalKeys.some((k) => n.includes(k));
}
const toNum = (v: any): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "object" && typeof (v as any)?.toNumber === "function") {
    try {
      return (v as any).toNumber();
    } catch {
      return Number(v as any);
    }
  }
  return Number(v);
};

// marker lunas akhir (closed)
const hasPaidMarker = (info?: string | null) =>
  !!(
    info &&
    (/\[CLOSED_BY:\d{4}-\d{2}\]/.test(info) || /\[PAID_BY:/.test(info))
  );

const isLunasByRules = (sisaKurang: number | null, info?: string | null) => {
  if (hasPaidMarker(info)) return true;
  if (sisaKurang === null) return false;
  return sisaKurang <= 0;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year") ?? new Date().getFullYear());

    // ============== 1) WATER USAGE ==============
    const cm = await prisma.catatMeter.findMany({
      where: { deletedAt: null, periode: { tahun: year } },
      select: {
        pemakaianM3: true,
        zonaNamaSnapshot: true,
        periode: { select: { bulan: true } },
        pelanggan: { select: { zona: { select: { nama: true } } } },
      },
    });

    const water = emptyWater();
    const zonaOrder: string[] = [];
    for (const row of cm) {
      const monthIdx = (row.periode.bulan ?? 1) - 1;
      const val = row.pemakaianM3 ?? 0;
      water[monthIdx].total += val;

      const z =
        row.zonaNamaSnapshot?.trim() || row.pelanggan?.zona?.nama?.trim() || "";
      if (z && !zonaOrder.includes(z) && zonaOrder.length < 6)
        zonaOrder.push(z);
    }
    for (const row of cm) {
      const monthIdx = (row.periode.bulan ?? 1) - 1;
      const val = row.pemakaianM3 ?? 0;
      const z =
        row.zonaNamaSnapshot?.trim() ||
        row.pelanggan?.zona?.nama?.trim() ||
        zonaOrder[5];
      let idx = zonaOrder.indexOf(z);
      if (idx < 0) idx = 5;
      if (idx === 0) water[monthIdx].blokA += val;
      else if (idx === 1) water[monthIdx].blokB += val;
      else if (idx === 2) water[monthIdx].blokC += val;
      else if (idx === 3) water[monthIdx].blokD += val;
      else if (idx === 4) water[monthIdx].blokE += val;
      else water[monthIdx].blokF += val;
    }

    // ============== 2) REVENUE (hanya tagihan status PAID) ==============
    const pays = await prisma.pembayaran.findMany({
      where: {
        deletedAt: null,
        tanggalBayar: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        },
        tagihan: { statusBayar: "PAID", deletedAt: null },
      },
      select: { tanggalBayar: true, jumlahBayar: true },
    });

    const revenue = emptyRevenue();
    for (const p of pays) {
      const idx = toMonthIdx(p.tanggalBayar);
      revenue[idx].amount += p.jumlahBayar ?? 0;
    }

    // ============== 3) EXPENSES ==============
    const details = await prisma.pengeluaranDetail.findMany({
      where: {
        pengeluaran: {
          tanggalPengeluaran: {
            gte: new Date(Date.UTC(year, 0, 1)),
            lt: new Date(Date.UTC(year + 1, 0, 1)),
          },
        },
      },
      select: {
        nominal: true,
        pengeluaran: { select: { tanggalPengeluaran: true } },
        masterBiaya: { select: { nama: true } },
      },
    });

    const expenses = emptyExpenses();
    for (const d of details) {
      const idx = toMonthIdx(d.pengeluaran.tanggalPengeluaran);
      const amt = d.nominal ?? 0;
      if (isOperasional(d.masterBiaya?.nama)) expenses[idx].operasional += amt;
      else expenses[idx].lainnya += amt;
    }

    // ============== 4) PROFIT/LOSS ==============
    const profitLoss = MONTHS.map((m, i) => ({
      month: m,
      profit:
        revenue[i].amount - (expenses[i].operasional + expenses[i].lainnya),
    }));

    // ============== 5) OUTSTANDING & TABLE (Belum Bayar + Belum Lunas) ==============
    const tagihans = await prisma.tagihan.findMany({
      where: {
        deletedAt: null,
        OR: [
          { periode: { startsWith: `${year}-` } },
          { periode: { endsWith: ` ${year}` } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        periode: true,
        totalTagihan: true,
        tagihanLalu: true,
        sisaKurang: true,
        info: true,
        createdAt: true,
        pelangganId: true,
        pelanggan: { select: { nama: true, zona: { select: { nama: true } } } },
        // ambil pembayaran untuk deteksi "parsial"
        pembayarans: {
          where: { deletedAt: null },
          select: { jumlahBayar: true },
        },
      },
    });

    // periode yg diclearkan oleh bulan berikutnya
    const parsePrevCleared = (info?: string | null): string[] => {
      if (!info) return [];
      const m = info.match(/\[PREV_CLEARED:([0-9,\-\s]+)\]/);
      if (!m) return [];
      return m[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    };
    const clearedSet = new Set<string>();
    for (const t of tagihans) {
      const clears = parsePrevCleared(t.info);
      if (clears.length && t.pelangganId) {
        for (const p of clears) clearedSet.add(`${t.pelangganId}|${p}`);
      }
    }

    const outstandingData = MONTHS.map((m) => ({ month: m, amount: 0 }));
    const unpaidBills: {
      id: string;
      nama: string;
      blok: string;
      periode: string | null;
      nominal: number;
      sisaKurang: number;
      status: "BELUM_LUNAS" | "BELUM_BAYAR";
    }[] = [];

    for (const t of tagihans) {
      const bulanIni = toNum(t.totalTagihan) ?? 0;
      const tagihanLaluNum = toNum(t.tagihanLalu) ?? 0; // >0: kurang, <0: sisa
      const totalDue = bulanIni + tagihanLaluNum;

      const sisaKurangNum = toNum(t.sisaKurang);
      const lunas = isLunasByRules(sisaKurangNum, t.info);

      // skip bila periode ini sudah diclearkan
      if (
        t.pelangganId &&
        t.periode &&
        clearedSet.has(`${t.pelangganId}|${t.periode}`)
      ) {
        continue;
      }

      const outstandingAmount = lunas ? 0 : sisaKurangNum ?? totalDue;

      // ke grafik
      const mIdx = monthIdxFromPeriode(t.periode);
      if (mIdx !== null && outstandingAmount > 0) {
        outstandingData[mIdx].amount += outstandingAmount;
      }

      // ===== tentukan status yang benar =====
      if (!lunas && outstandingAmount > 0) {
        const totalBayar = (t.pembayarans || []).reduce(
          (s, p) => s + (p.jumlahBayar || 0),
          0
        );

        // ⬇️ perbaikan utama: partial hanya jika sudah ada pembayaran DAN masih ada sisa
        const isPartial = totalBayar > 0 && outstandingAmount > 0;

        const status: "BELUM_LUNAS" | "BELUM_BAYAR" =
          tagihanLaluNum < 0 || isPartial ? "BELUM_LUNAS" : "BELUM_BAYAR";

        if (unpaidBills.length < 50) {
          unpaidBills.push({
            id: t.id,
            nama: t.pelanggan?.nama ?? "-",
            blok: t.pelanggan?.zona?.nama ?? "-",
            periode: t.periode ?? "-",
            nominal: totalDue,
            sisaKurang: Math.max(0, outstandingAmount),
            status,
          });
        }
      }
    }

    const outstandingTotal = outstandingData.reduce((a, b) => a + b.amount, 0);
    const zoneNames = zonaOrder;

    return NextResponse.json({
      waterUsageData: water,
      revenueData: revenue,
      expenseData: expenses,
      profitLossData: profitLoss,
      zoneNames,
      unpaidBills, // ← sekarang: EFDAL & SUDIYONO (Sep) = BELUM_LUNAS; lainnya = BELUM_BAYAR
      outstandingData,
      outstandingTotal,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

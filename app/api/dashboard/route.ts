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

// // // safe percent change: bila prev = 0 → 0 (hindari Infinity)
// function pctChange(curr: number, prev: number) {
//   if (!prev) return 0;
//   return ((curr - prev) / prev) * 100;
// }

/**
 * pctChange(curr, prev)
 * - jika prev === 0:
 *    - jika curr === 0 => 0
 *    - jika curr > 0   => 100   (treat as "naik dari 0")
 *    - jika curr < 0   => -100  (jarang, tapi aman)
 * - normal case: ((curr - prev) / Math.abs(prev)) * 100
 */
function pctChange(curr: number, prev: number) {
  const c = Number(curr || 0);
  const p = Number(prev || 0);
  if (p === 0) {
    if (c === 0) return 0;
    return c > 0 ? 100 : -100;
  }
  return ((c - p) / Math.abs(p)) * 100;
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

// ===== helper saldo akhir (piutang/kredit) dengan fallback =====
function hitungSaldoAkhir(
  totalTagihan: number,
  tagihanLalu: number | null | undefined,
  totalBayar: number,
  sisaKurang: number | null | undefined
) {
  const fallback = (totalTagihan || 0) + (tagihanLalu || 0) - (totalBayar || 0);
  return sisaKurang ?? fallback;
}

// ===== NEW: parser CLOSED_BY dari kolom info =====
function parseClosedBy(info?: string | null): string | null {
  if (!info) return null;
  const m = info.match(/\[CLOSED_BY:(\d{4}-\d{2})\]/);
  return m ? m[1] : null;
}

// ===== NEW: sum saldo per periode (piutang & kredit terpisah) — hormati CLOSED_BY =====
async function sumSaldoByPeriode(periode: string) {
  const rows = await prisma.tagihan.findMany({
    where: { deletedAt: null, periode },
    select: {
      totalTagihan: true,
      tagihanLalu: true,
      sisaKurang: true,
      info: true, // NEW
      pembayarans: { select: { jumlahBayar: true } },
    },
  });

  let piutangAmount = 0,
    piutangCount = 0;
  let kreditAmount = 0,
    kreditCount = 0;

  for (const r of rows) {
    const paid = r.pembayarans.reduce((s, p) => s + (p.jumlahBayar || 0), 0);
    let saldo = hitungSaldoAkhir(
      r.totalTagihan || 0,
      r.tagihanLalu,
      paid,
      r.sisaKurang
    );

    // NEW: hormati CLOSED_BY → untuk periode ini dianggap sudah ditutup
    const closedBy = parseClosedBy(r.info);
    if (closedBy) saldo = 0;

    if (saldo > 0) {
      piutangAmount += saldo;
      piutangCount++;
    } else if (saldo < 0) {
      kreditAmount += Math.abs(saldo);
      kreditCount++;
    }
  }
  return { piutangAmount, piutangCount, kreditAmount, kreditCount };
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
      select: { periode: true, totalTagihan: true, tagihanLalu: true }, // <-- include carry
    });
    const billingByMonth: number[] = Array(12).fill(0);
    for (const t of tagihanTahun) {
      const [yStr, mStr] = (t.periode ?? "").split("-");
      if (Number(yStr) !== year) continue;
      const midx = Math.max(0, Math.min(11, Number(mStr) - 1));
      const net = Math.max((t.totalTagihan || 0) + (t.tagihanLalu || 0), 0); // <-- incl. carry, no minus
      billingByMonth[midx] += net;
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

      // ===== ringkas tagihan periode TAGIHAN dengan carry & kredit =====
      const tg = await prisma.tagihan.findMany({
        where: { deletedAt: null, periode: kPeriodeTagihan },
        select: {
          totalTagihan: true,
          tagihanLalu: true,
          sisaKurang: true,
          info: true, // NEW
          pembayarans: { select: { jumlahBayar: true } },
        },
      });

      let tagihanBulanIni = 0;
      let totalTagihanLalu = 0;
      let totalSudahBayar = 0;
      let sisaAkhirKurang = 0; // piutang (+)
      let sisaAkhirLebih = 0; // kredit (+)

      for (const r of tg) {
        tagihanBulanIni += r.totalTagihan ?? 0;
        totalTagihanLalu += r.tagihanLalu ?? 0;

        const paid = r.pembayarans.reduce(
          (a, b) => a + (b.jumlahBayar || 0),
          0
        );
        totalSudahBayar += paid;

        let saldo = hitungSaldoAkhir(
          r.totalTagihan || 0,
          r.tagihanLalu,
          paid,
          r.sisaKurang
        );

        // NEW: jika ada CLOSED_BY, saldo periode ini di-nolkan
        const closedBy = parseClosedBy(r.info);
        if (closedBy) saldo = 0;

        if (saldo > 0) sisaAkhirKurang += saldo;
        else if (saldo < 0) sisaAkhirLebih += Math.abs(saldo);
      }

      const status =
        sisaAkhirKurang <= 0
          ? ("paid" as const)
          : totalSudahBayar > 0
          ? ("partial" as const)
          : ("unpaid" as const);

      // label bulan PENAGIHAN
      const periodeLabel = new Date(billY, billM - 1, 1).toLocaleDateString(
        "id-ID",
        { month: "long", year: "numeric" }
      );

      // badge info

      let infoBadge: string | null = null;
      if ((totalTagihanLalu || 0) > 0) {
        infoBadge = `Termasuk tagihan bulan lalu ${Intl.NumberFormat(
          "id-ID"
        ).format(totalTagihanLalu)}`;
      } else if ((totalTagihanLalu || 0) < 0) {
        infoBadge = `Terpakai saldo kredit ${Intl.NumberFormat("id-ID").format(
          Math.abs(totalTagihanLalu)
        )}`;
      }
      if (sisaAkhirLebih > 0) {
        infoBadge = `Lebih bayar ${Intl.NumberFormat("id-ID").format(
          sisaAkhirLebih
        )}`;
      }

      tableData.push({
        id: kPeriodeTagihan,
        periode: periodeLabel,
        totalM3,
        tagihan: tagihanBulanIni, // bulan ini saja (compatible dgn UI lama)
        sudahBayar: totalSudahBayar,
        // === NEW fields (opsional dipakai UI baru) ===
        tagihanLalu: totalTagihanLalu, // carry-in (±)
        sisaKurang: sisaAkhirKurang, // saldo akhir piutang (+)
        sisaLebih: sisaAkhirLebih, // saldo akhir kredit  (+)
        // === Nilai final untuk UI (sudah hormati CLOSED_BY) ===
        belumBayar: sisaAkhirKurang, // **FINAL** untuk tampilan
        status,
        infoBadge,
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

    // === Unpaid list — per pelanggan, ambil saldo dari periode TERBARU (hindari double-count carry) ===
    const openTagihans = await prisma.tagihan.findMany({
      where: { deletedAt: null },
      select: {
        totalTagihan: true,
        tagihanLalu: true,
        sisaKurang: true,
        info: true,
        periode: true, // "YYYY-MM"
        pelangganId: true,
        pelanggan: { select: { nama: true } },
        pembayarans: { select: { jumlahBayar: true } },
      },
    });

    type RowAgg = {
      name: string;
      latestPeriode: string;
      amount: number; // saldo periode terbaru (>0)
      periods: Set<string>;
      latestTagihanLalu: number; // carry periode terbaru (boleh + atau -)
    };
    const perCustomer = new Map<string, RowAgg>();

    for (const t of openTagihans) {
      const paid = t.pembayarans.reduce((s, p) => s + (p.jumlahBayar || 0), 0);
      let saldo = hitungSaldoAkhir(
        t.totalTagihan || 0,
        t.tagihanLalu,
        paid,
        t.sisaKurang
      );

      // CLOSED_BY → nolkan saldo periode ini
      const closedBy = parseClosedBy(t.info);
      if (closedBy) saldo = 0;

      if (saldo <= 0) continue;

      const key = t.pelangganId ?? `unknown:${t.pelanggan?.nama ?? "-"}`;
      const name = t.pelanggan?.nama ?? "-";
      const periode = t.periode ?? "0000-00";
      const carry = t.tagihanLalu || 0;

      const curr = perCustomer.get(key);
      if (!curr) {
        perCustomer.set(key, {
          name,
          latestPeriode: periode,
          amount: saldo,
          periods: new Set([periode]),
          latestTagihanLalu: carry,
        });
      } else {
        curr.periods.add(periode);
        if (periode > curr.latestPeriode) {
          curr.latestPeriode = periode;
          curr.amount = saldo;
          curr.latestTagihanLalu = carry;
        }
      }
    }

    const unpaidList = Array.from(perCustomer.values())
      .map((v) => ({
        name: v.name,
        amount: v.amount,
        period: Array.from(v.periods).sort().join(", "),
        carry: v.latestTagihanLalu, // + = bawa tunggakan, - = bawa kredit (sesuai kebijakan badge di UI)
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

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
      const nowD = new Date();
      const cy = nowD.getFullYear(),
        cm = nowD.getMonth() + 1;
      const { y: py, m: pm } = prevYM(cy, cm);
      periodeNow = `${cy}-${pad2(cm)}`;
      periodePrev = `${py}-${pad2(pm)}`;
    }

    // total tagihan (sum nominal — bulan ini saja) + carry untuk tampilan
    async function sumTagihanInclCarry(periode: string) {
      const rows = await prisma.tagihan.findMany({
        where: { deletedAt: null, periode },
        select: { totalTagihan: true, tagihanLalu: true },
      });
      return rows.reduce((sum, r) => {
        const net = (r.totalTagihan || 0) + (r.tagihanLalu || 0);
        return sum + Math.max(net, 0); // tampilan, jangan minus
      }, 0);
    }

    const totalInclCarryNow = await sumTagihanInclCarry(periodeNow);
    const totalInclCarryPrev = await sumTagihanInclCarry(periodePrev);

    // (biarkan aggregate lama untuk _count pelanggan & payingRate)
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

    // paying rate tetap pakai "bulan ini saja"
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

    // saldo (piutang & kredit) per periode – sudah hormati CLOSED_BY
    const saldoCurr = await sumSaldoByPeriode(periodeNow);
    const saldoPrev = await sumSaldoByPeriode(periodePrev);

    const trends = {
      // pakai metrik incl. carry untuk konsistensi dengan kartu
      totalTagihan: {
        value: Math.round(pctChange(totalInclCarryNow, totalInclCarryPrev)),
        isPositive: totalInclCarryNow >= totalInclCarryPrev,
      },
      totalBelumBayar: {
        value: Math.round(
          pctChange(saldoCurr.piutangAmount, saldoPrev.piutangAmount)
        ),
        isPositive: saldoCurr.piutangAmount <= saldoPrev.piutangAmount,
      },
      pelanggan: {
        value: Math.round(pctChange(totalPelangganNow, totalPelangganNow)),
        isPositive: true,
      },
      payingRate: {
        value: Math.round(pctChange(payingRateCurr, payingRatePrev)),
        isPositive: payingRateCurr >= payingRatePrev,
      },
      // NEW: trend kredit (lebih bayar)
      totalLebihBayar: {
        value: Math.round(
          pctChange(saldoCurr.kreditAmount, saldoPrev.kreditAmount)
        ),
        isPositive: saldoCurr.kreditAmount >= saldoPrev.kreditAmount,
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
        totalTagihanBulanIni: totalInclCarryNow,
        totalTagihanCount: tagihanCurr._count ?? 0,
        totalTagihanBulanLalu: totalInclCarryPrev,
        totalTagihanBulanLaluCount: tagihanPrev._count ?? 0,
        totalBelumBayarAmount: saldoCurr.piutangAmount,
        totalBelumBayarCount: saldoCurr.piutangCount,
        totalPelanggan: totalPelangganNow,
        payingRate: payingRateCurr,
        trends,

        // NEW: kredit/lebih bayar (tambahan, tidak wajib dipakai UI)
        totalLebihBayarAmount: saldoCurr.kreditAmount,
        totalLebihBayarCount: saldoCurr.kreditCount,
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

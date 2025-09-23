// app/api/warga/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

/* ===== Helper label bulan (id-ID) ===== */
const BULAN = [
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
const monthShort = (m: number) => BULAN[(m - 1 + 12) % 12];

/* ===== Helpers periode ===== */
function nextOfPeriode(tahun: number, bulan1to12: number) {
  const d = new Date(Date.UTC(tahun, bulan1to12 - 1, 1));
  d.setUTCMonth(d.getUTCMonth() + 1);
  return {
    tahun: d.getUTCFullYear(),
    bulan: d.getUTCMonth() + 1,
    kode: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
      2,
      "0"
    )}`,
  };
}
function prevOfPeriode(tahun: number, bulan1to12: number) {
  const d = new Date(Date.UTC(tahun, bulan1to12 - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return {
    tahun: d.getUTCFullYear(),
    bulan: d.getUTCMonth() + 1,
    kode: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
      2,
      "0"
    )}`,
  };
}

/* ===== Helper tanggal ID (DD-MM-YYYY) ===== */
function formatTanggalID(d: Date | string | null) {
  if (!d) return "-";
  const dt = typeof d === "string" ? new Date(d) : d;
  const day = String(dt.getUTCDate()).padStart(2, "0");
  const month = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const year = dt.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

/* ===== Jatuh tempo default ===== */
function buildDueDate(tahun: number, bulan1to12: number, defaultDay: number) {
  const lastDay = new Date(Date.UTC(tahun, bulan1to12, 0)).getUTCDate();
  const day = Math.max(1, Math.min(defaultDay || 15, lastDay));
  const d = new Date(Date.UTC(tahun, bulan1to12 - 1, day));
  return d.toISOString().slice(0, 10);
}

/* ===== Debug wrapper ===== */
async function q<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e: any) {
    const msg = `${label} failed: ${e?.message || e}`;
    e && e.stack ? console.error(msg, "\n", e.stack) : console.error(msg);
    throw new Error(msg);
  }
}

export async function GET(req: NextRequest) {
  const debugMode = req.nextUrl.searchParams.get("debug") === "1";

  try {
    const userId = await getAuthUserId(req);
    if (!userId)
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );

    const user = await q("get user+pelanggan", () =>
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          name: true,
          pelanggan: {
            select: {
              id: true,
              kode: true,
              nama: true,
              alamat: true,
              wa: true,
            },
          },
        },
      })
    );

    if (!user)
      return NextResponse.json(
        { ok: false, message: "Akun tidak ditemukan." },
        { status: 404 }
      );
    if (user.role !== "WARGA")
      return NextResponse.json(
        { ok: false, message: "Akses ditolak. Hanya WARGA." },
        { status: 403 }
      );
    if (!user.pelanggan) {
      const resp: any = {
        ok: false,
        message:
          "Akun tidak memiliki data pelanggan. Pastikan Pelanggan.userId terisi dengan User.id yang login.",
      };
      if (debugMode)
        resp.debug = {
          userId: user.id,
          pelangganId: null,
          pelangganKode: null,
        };
      return NextResponse.json(resp, { status: 403 });
    }

    const pelanggan = user.pelanggan;

    const setting = await q("get setting(1)", () =>
      prisma.setting.findUnique({ where: { id: 1 } })
    );
    const defaultDueDay = setting?.tglJatuhTempo ?? 15;

    const latestPeriode = await q("get latest catatPeriode", () =>
      prisma.catatPeriode.findFirst({
        where: { deletedAt: null },
        orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
        select: {
          id: true,
          kodePeriode: true,
          bulan: true,
          tahun: true,
          tarifPerM3: true,
          abonemen: true,
        },
      })
    );

    /* ===== CURRENT USAGE (hanya jika Tagihan M+1 ada) ===== */
    let currentUsage: {
      period: string;
      meterAwal: number;
      meterAkhir: number;
      pemakaian: number;
      totalTagihan: number;
      status: "lunas" | "belum_bayar";
      jatuhTempo: string | null;
    } | null = null;

    if (latestPeriode) {
      const cm = await q("get catatMeter (latest, pelanggan)", () =>
        prisma.catatMeter.findUnique({
          where: {
            periodeId_pelangganId: {
              periodeId: latestPeriode.id,
              pelangganId: pelanggan.id,
            },
          },
          select: {
            meterAwal: true,
            meterAkhir: true,
            pemakaianM3: true,
            total: true,
          },
        })
      );

      const next = nextOfPeriode(latestPeriode.tahun, latestPeriode.bulan);
      const tagihanNext = await q("get tagihan M+1", () =>
        prisma.tagihan.findUnique({
          where: {
            pelangganId_periode: {
              pelangganId: pelanggan.id,
              periode: next.kode,
            },
          },
          select: {
            totalTagihan: true,
            statusBayar: true,
            tglJatuhTempo: true,
          },
        })
      );

      if (tagihanNext) {
        const jatuhTempo = tagihanNext.tglJatuhTempo
          ? formatTanggalID(tagihanNext.tglJatuhTempo)
          : formatTanggalID(
              buildDueDate(next.tahun, next.bulan, defaultDueDay)
            );

        currentUsage = {
          period: `${BULAN[latestPeriode.bulan - 1]} ${latestPeriode.tahun}`,
          meterAwal: cm?.meterAwal ?? 0,
          meterAkhir: cm?.meterAkhir ?? 0,
          pemakaian:
            cm?.pemakaianM3 ??
            Math.max((cm?.meterAkhir ?? 0) - (cm?.meterAwal ?? 0), 0),
          totalTagihan: tagihanNext.totalTagihan,
          status: ["paid", "lunas"].includes(
            (tagihanNext.statusBayar || "").toLowerCase()
          )
            ? "lunas"
            : "belum_bayar",
          jatuhTempo,
        };
      }
    }

    /* ===== YEARLY USAGE (ambil dari Tagihan; usage dari CatatMeter P atau fallback P-1) ===== */
    /* ===== YEARLY USAGE (map Tagihan P -> Catat (P-1)) ===== */
    const now = new Date();
    const thisYear = now.getFullYear();
    const yearStart = `${thisYear}-01`;
    const yearEnd = `${thisYear}-12`;

    const tagihanTahunIni = await q("get tagihan tahun ini", () =>
      prisma.tagihan.findMany({
        where: {
          pelangganId: pelanggan.id,
          deletedAt: null,
          periode: { gte: yearStart, lte: yearEnd },
        },
        orderBy: [{ periode: "asc" }],
        select: { periode: true, totalTagihan: true, statusBayar: true },
      })
    );

    // cache id catatPeriode
    const periodeIdCache = new Map<string, string | null>();
    async function getPeriodeId(kode: string): Promise<string | null> {
      if (periodeIdCache.has(kode)) return periodeIdCache.get(kode)!;
      const p = await q(`get catatPeriode ${kode}`, () =>
        prisma.catatPeriode.findUnique({
          where: { kodePeriode: kode },
          select: { id: true },
        })
      );
      const id = p?.id ?? null;
      periodeIdCache.set(kode, id);
      return id;
    }

    const yearlyUsage: Array<{
      month: string;
      usage: number;
      bill: number;
      status: "paid" | "unpaid" | "pending";
    }> = [];

    for (const t of tagihanTahunIni) {
      const y = Number(t.periode.slice(0, 4));
      const m = Number(t.periode.slice(5, 7));
      const billMonth = Math.min(Math.max(m, 1), 12);

      // === SELALU ambil dari Catat (P-1) ===
      let usageM3 = 0;
      const prev = prevOfPeriode(y, m); // P-1
      const periodeIdPrev = await getPeriodeId(prev.kode);
      if (periodeIdPrev) {
        const cmPrev = await q(`get catatMeter ${prev.kode} pelanggan`, () =>
          prisma.catatMeter.findUnique({
            where: {
              periodeId_pelangganId: {
                periodeId: periodeIdPrev!,
                pelangganId: pelanggan.id,
              },
            },
            select: { pemakaianM3: true },
          })
        );
        usageM3 = cmPrev?.pemakaianM3 ?? 0;
      }

      // Fallback terakhir: coba Catat P (kalau P-1 kosong)
      if (!usageM3) {
        const periodeIdP = await getPeriodeId(t.periode);
        if (periodeIdP) {
          const cmP = await q(`get catatMeter ${t.periode} pelanggan`, () =>
            prisma.catatMeter.findUnique({
              where: {
                periodeId_pelangganId: {
                  periodeId: periodeIdP!,
                  pelangganId: pelanggan.id,
                },
              },
              select: { pemakaianM3: true },
            })
          );
          usageM3 = cmP?.pemakaianM3 ?? 0;
        }
      }

      yearlyUsage.push({
        month: monthShort(billMonth), // label bulan TAGIHAN (P)
        usage: usageM3, // pemakaian dari CATAT (P-1)
        bill: t.totalTagihan,
        status: ["paid", "lunas"].includes((t.statusBayar || "").toLowerCase())
          ? "paid"
          : "unpaid",
      });
    }

    /* ===== PAYMENT HISTORY ===== */
    const pembayaran = await q("get pembayaran terakhir", () =>
      prisma.pembayaran.findMany({
        where: { deletedAt: null, tagihan: { pelangganId: pelanggan.id } },
        orderBy: [{ tanggalBayar: "desc" }],
        take: 12,
        select: {
          id: true,
          tanggalBayar: true,
          jumlahBayar: true,
          metode: true,
          tagihan: { select: { periode: true } },
        },
      })
    );

    const paymentHistory = pembayaran.map((p) => ({
      id: p.id,
      period: p.tagihan.periode,
      amount: p.jumlahBayar,
      paymentDate: p.tanggalBayar.toISOString().slice(0, 10),
      status: "lunas" as const,
      method: p.metode,
    }));

    const body: any = {
      ok: true,
      data: {
        resident: {
          customerId: pelanggan.kode,
          name: pelanggan.nama,
          address: pelanggan.alamat,
          phone: pelanggan.wa ?? "",
        },
        currentUsage,
        yearlyUsage,
        paymentHistory,
      },
    };
    if (debugMode) {
      body.debug = {
        userId: user.id,
        pelangganId: pelanggan.id,
        pelangganKode: pelanggan.kode,
        tagihanCount: tagihanTahunIni.length,
      };
    }

    return NextResponse.json(body);
  } catch (e: any) {
    const resp: any = { ok: false, message: e?.message ?? "Server error" };
    if (debugMode && e?.stack) resp.stack = String(e.stack);
    console.error("GET /api/warga/dashboard error:", e);
    return NextResponse.json(resp, { status: 500 });
  }
}

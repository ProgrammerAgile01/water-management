// app/api/billing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// utils konversi bulan
const bulanId = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
function yyyymmToLabel(yyyyMM: string) {
  const m = Number(yyyyMM.slice(5, 7));
  const y = Number(yyyyMM.slice(0, 4));
  if (!m || !y) return yyyyMM;
  return `${bulanId[m - 1]} ${y}`;
}
function labelToYYYYMM(label: string): string | null {
  // "Juli 2025" -> "2025-07"
  const parts = label.trim().split(/\s+/);
  if (parts.length !== 2) return null;
  const m =
    bulanId.findIndex((b) => b.toLowerCase() === parts[0].toLowerCase()) + 1;
  const y = Number(parts[1]);
  if (!m || !y) return null;
  return `${y}-${String(m).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const periodeParam = (sp.get("periode") ?? "semua").trim(); // "Juli 2025" | "YYYY-MM" | "semua"
    const statusParam = (sp.get("status") ?? "semua").trim(); // "lunas" | "belum-lunas" | "semua"
    const q = (sp.get("q") ?? "").trim();

    // normalisasi periode -> "YYYY-MM" | ""
    let periodeFilter = "";
    if (periodeParam && periodeParam.toLowerCase() !== "semua") {
      if (/^\d{4}-(0[1-9]|1[0-2])$/.test(periodeParam)) {
        periodeFilter = periodeParam;
      } else {
        const mm = labelToYYYYMM(periodeParam);
        if (mm) periodeFilter = mm;
      }
    }

    // bangun WHERE untuk Tagihan
    const whereTagihan: any = { deletedAt: null };
    if (periodeFilter) whereTagihan.periode = periodeFilter;

    if (statusParam !== "semua") {
      // mapping UI -> Tagihan.statusBayar
      // UI "lunas" => PAID, "belum-lunas" => UNPAID
      whereTagihan.statusBayar = statusParam === "lunas" ? "PAID" : "UNPAID";
    }

    if (q) {
      whereTagihan.OR = [
        { pelanggan: { nama: { contains: q } } }, // MySQL biasanya case-insensitive
        { pelanggan: { zona: { is: { nama: { contains: q } } } } },
        { pelanggan: { zonaNama: { contains: q } } }, // kalau kamu punya kolom string zonaNama di Pelanggan (opsional)
      ];
    }

    // ambil semua tagihan sesuai filter + relasi dasar
    const tagihans = await prisma.tagihan.findMany({
      where: whereTagihan,
      orderBy: [{ createdAt: "desc" }],
      include: {
        pelanggan: {
          select: {
            id: true,
            nama: true,
            zona: { select: { nama: true, kode: true } },
          },
        },
        pembayarans: {
          orderBy: { tanggalBayar: "desc" },
          take: 1, // ambil bukti terakhir
        },
      },
    });

    if (tagihans.length === 0) {
      return NextResponse.json({ ok: true, data: [] });
    }

    // Siapkan bantuan untuk mengambil angka meter dari CatatMeter
    // 1) Kumpulkan periode unik (YYYY-MM) dari tagihan -> cari CatatPeriode.id
    const periodeSet = Array.from(new Set(tagihans.map((t) => t.periode)));
    const periodeRows = await prisma.catatPeriode.findMany({
      where: { kodePeriode: { in: periodeSet } },
      select: { id: true, kodePeriode: true },
    });
    const mapPeriodeIdByKode = new Map(
      periodeRows.map((p) => [p.kodePeriode, p.id])
    );

    // 2) Kumpulkan pasangan (periodeId, pelangganId)
    const pairs = tagihans
      .map((t) => ({
        periodeId: mapPeriodeIdByKode.get(t.periode),
        pelangganId: t.pelangganId,
      }))
      .filter((x) => !!x.periodeId) as {
      periodeId: string;
      pelangganId: string;
    }[];

    // 3) Ambil CatatMeter untuk pasangan tsb
    let catat: {
      id: string;
      periodeId: string;
      pelangganId: string;
      meterAwal: number;
      meterAkhir: number;
      pemakaianM3: number;
      tarifPerM3: number;
      abonemen: number;
      total: number;
    }[] = [];
    if (pairs.length) {
      catat = await prisma.catatMeter.findMany({
        where: {
          deletedAt: null,
          OR: pairs.map((p) => ({
            periodeId: p.periodeId,
            pelangganId: p.pelangganId,
          })),
        },
        select: {
          id: true,
          periodeId: true,
          pelangganId: true,
          meterAwal: true,
          meterAkhir: true,
          pemakaianM3: true,
          tarifPerM3: true,
          abonemen: true,
          total: true,
        },
      });
    }
    const key = (periodeId: string, pelangganId: string) =>
      `${periodeId}__${pelangganId}`;
    const mapCatat = new Map(
      catat.map((c) => [key(c.periodeId, c.pelangganId), c])
    );

    // 4) Bentuk response sesuai BillingItem UI
    const data = tagihans.map((t) => {
      const periodeId = mapPeriodeIdByKode.get(t.periode) ?? "";
      const cm = periodeId
        ? mapCatat.get(key(periodeId, t.pelangganId))
        : undefined;
      const latestPay = t.pembayarans[0];

      return {
        id: t.id,
        periode: yyyymmToLabel(t.periode), // UI minta label "Juli 2025"
        namaWarga: t.pelanggan?.nama ?? "-",
        zona: t.pelanggan?.zona?.nama ?? t.pelanggan?.zona?.kode ?? "-",
        meterAwal: cm?.meterAwal ?? 0,
        meterAkhir: cm?.meterAkhir ?? 0,
        pemakaian: cm?.pemakaianM3 ?? 0,
        tarifPerM3: cm?.tarifPerM3 ?? t.tarifPerM3 ?? 0,
        totalPemakaian:
          (cm?.pemakaianM3 ?? 0) * (cm?.tarifPerM3 ?? t.tarifPerM3 ?? 0),
        abonemen: cm?.abonemen ?? t.abonemen ?? 0,
        totalTagihan: cm?.total ?? t.totalTagihan ?? 0,
        status:
          t.statusBayar === "PAID"
            ? ("lunas" as const)
            : ("belum-lunas" as const),
        buktiPembayaran: latestPay?.buktiUrl ?? undefined,
        tanggalBayar: latestPay
          ? latestPay.tanggalBayar.toISOString().slice(0, 10)
          : undefined,
        verifiedBy:
          t.statusVerif === "VERIFIED"
            ? latestPay?.adminBayar ?? "System"
            : undefined,
      };
    });

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    console.error("GET /api/billing error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

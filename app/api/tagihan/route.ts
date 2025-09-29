import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// parse periode ke (y,m) agar bisa di-sort benar
function parsePeriodeYM(p?: string | null): { y: number; m: number } | null {
  if (!p) return null;
  const s = String(p).trim().toLowerCase();
  const ym = /^(\d{4})-(\d{1,2})$/.exec(s);
  if (ym) {
    const y = Number(ym[1]);
    const m = Number(ym[2]);
    if (y > 1900 && m >= 1 && m <= 12) return { y, m };
  }
  const idMonths: Record<string, number> = {
    januari: 1,
    februari: 2,
    maret: 3,
    april: 4,
    mei: 5,
    juni: 6,
    juli: 7,
    agustus: 8,
    september: 9,
    oktober: 10,
    november: 11,
    desember: 12,
  };
  const parts = s.replace("-", " ").split(" ");
  if (parts.length >= 2) {
    const mm = idMonths[parts[0]];
    const yy = Number(parts[1]);
    if (mm && yy > 1900) return { y: yy, m: mm };
  }
  return null;
}

function comparePeriodeDesc(a: string, b: string) {
  const pa = parsePeriodeYM(a);
  const pb = parsePeriodeYM(b);
  if (pa && pb) {
    if (pa.y !== pb.y) return pb.y - pa.y;
    return pb.m - pa.m;
  }
  return String(b).localeCompare(String(a));
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    // ===== filters & pagination =====
    const q = url.searchParams.get("q") || undefined;
    const periodeQ = url.searchParams.get("periode") || undefined; // jika tidak ada → pakai latest
    const statusQRaw = url.searchParams.get("status") || undefined;

    const page = Math.max(
      parseInt(url.searchParams.get("page") || "1", 10) || 1,
      1
    );
    const perPageRaw = parseInt(url.searchParams.get("perPage") || "10", 10);
    const perPage = Math.min(Math.max(perPageRaw || 10, 1), 100);
    const skip = (page - 1) * perPage;
    const take = perPage;

    // ===== role info (header + fallback query) =====
    const roleHeader = req.headers.get("x-user-role");
    const uidHeader = req.headers.get("x-user-id");
    const roleQuery = url.searchParams.get("role");
    const uidQuery = url.searchParams.get("uid");
    const role = (roleHeader || roleQuery || "ADMIN") as
      | "ADMIN"
      | "PETUGAS"
      | "WARGA";
    const userId = uidHeader || uidQuery || null;

    // ===== 1) scope periode & latestPeriode =====
    const wherePeriodsScope: any = { deletedAt: null };
    if (role === "WARGA" && userId) {
      const pel = await prisma.pelanggan.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (pel) wherePeriodsScope.pelangganId = pel.id;
      else wherePeriodsScope.pelangganId = "__none__"; // supaya kosong
    }

    const periodsRaw = await prisma.tagihan.findMany({
      where: wherePeriodsScope,
      select: { periode: true },
    });

    const periodesUnique = Array.from(
      new Set(periodsRaw.map((p) => p.periode))
    ).filter(Boolean) as string[];
    periodesUnique.sort(comparePeriodeDesc);
    const latestPeriode = periodesUnique[0] ?? "";

    // ===== 2) build where (default ke latestPeriode bila tidak kirim "periode") =====
    const where: any = { deletedAt: null };

    // Status by sisaKurang
    if (statusQRaw) {
      const s = statusQRaw.toUpperCase();
      // if (s === "PAID" || s === "LUNAS") where.sisaKurang = { lte: 0 };
      // else if (s === "UNPAID" || s === "BELUM-LUNAS")
      //   where.sisaKurang = { gt: 0 };
      const paidMarker = {
        OR: [
          { info: { contains: "[CLOSED_BY:" } },
          { info: { contains: "[PAID_BY:" } }, // kalau masih ada marker lama
        ],
      };

      if (s === "PAID" || s === "LUNAS") {
        // Lunas jika angka <= 0 ATAU ada marker closed/paid-by
        (where.OR ??= []).push({ sisaKurang: { lte: 0 } }, paidMarker);
      } else if (s === "UNPAID" || s === "BELUM-LUNAS") {
        // Belum lunas = (sisaKurang > 0 ATAU NULL) DAN tidak ada marker closed/paid-by
        (where.AND ??= []).push(
          { OR: [{ sisaKurang: { gt: 0 } }, { sisaKurang: null }] },
          { NOT: paidMarker }
        );
      }
    }

    if (periodeQ) where.periode = periodeQ;
    else if (latestPeriode) where.periode = latestPeriode;

    if (role === "WARGA" && userId) {
      const pel = await prisma.pelanggan.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!pel) {
        return NextResponse.json({
          ok: true,
          data: [],
          meta: {
            page,
            perPage,
            total: 0,
            totalPages: 0,
            latestPeriode,
            periodes: periodesUnique,
          },
        });
      }
      where.pelangganId = pel.id;
    }

    if (q) {
      const searchOr = [
        { pelanggan: { is: { nama: { contains: q } } } },
        { pelanggan: { is: { kode: { contains: q } } } },
        { pelanggan: { is: { zona: { is: { nama: { contains: q } } } } } },
      ];
      // gabungkan sebagai AND dari sebuah OR block
      (where.AND ??= []).push({ OR: searchOr });
    }

    // ===== total & data (pagination) =====
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
            wa: true,
            zona: { select: { id: true, nama: true } },
          },
        },
        pembayarans: {
          where: { deletedAt: null },
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
        // ★ ambil angka meter langsung dari relasi 1:1
        catatMeter: {
          select: { meterAwal: true, meterAkhir: true, pemakaianM3: true },
        },
      },
    });

    // NOTE: karena kita pakai include di atas, field top-level `info` tidak otomatis ikut.
    // Solusi: fetch id->info dalam batch kecil (supaya tetap minimal perubahan)
    const infos = await prisma.tagihan.findMany({
      where: { id: { in: tagihans.map((t) => t.id) } },
      select: { id: true, info: true },
    });
    const infoMap = new Map(infos.map((i) => [i.id, i.info]));

    const data = tagihans.map((t) => {
      const last = t.pembayarans[0] || null;
      const tagihanBulanIni = t.totalTagihan || 0;
      const totalDue = (t.tagihanLalu || 0) + tagihanBulanIni;

      return {
        id: t.id,
        periode: t.periode,

        pelangganId: t.pelangganId,
        pelangganIdUser: t.pelanggan?.userId ?? null,
        pelangganKode: t.pelanggan?.kode ?? null,
        namaWarga: t.pelanggan?.nama ?? "-",
        zona: t.pelanggan?.zona?.nama ?? "-",
        wa: t.pelanggan?.wa ?? null,

        // ← langsung dari Tagihan.catatMeter
        meterAwal: t.catatMeter?.meterAwal ?? null,
        meterAkhir: t.catatMeter?.meterAkhir ?? null,
        pemakaian: t.catatMeter?.pemakaianM3 ?? null,

        tarifPerM3: t.tarifPerM3,
        abonemen: t.abonemen,
        denda: t.denda,
        totalTagihan: totalDue,

        status: t.sisaKurang <= 0 ? "lunas" : "belum-lunas",
        statusVerif: t.statusVerif,
        tglJatuhTempo: t.tglJatuhTempo,
        tagihanLalu: t.tagihanLalu,
        tagihanBulanIni: tagihanBulanIni,

        tanggalBayar: last?.tanggalBayar ?? null,
        jumlahBayar: last?.jumlahBayar ?? null,
        buktiPembayaran: last?.buktiUrl ?? null,
        metode: last?.metode ?? null,
        keterangan: last?.keterangan ?? null,

        info: infoMap.get(t.id) ?? null,

        // tetap: input hanya untuk periode terakhir
        canInputPayment: Boolean(latestPeriode) && t.periode === latestPeriode,
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
        latestPeriode,
        periodes: periodesUnique, // untuk dropdown filter di UI
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Error" },
      { status: 500 }
    );
  }
}

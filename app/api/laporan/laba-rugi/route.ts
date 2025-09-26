// app/api/laporan/laba-rugi/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserWithRole } from "@/lib/auth-user-server";
import { PengeluaranStatus, MetodeBayar } from "@prisma/client";

export const dynamic = "force-dynamic";

function monthRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const start = new Date(Date.UTC(y, (m ?? 1) - 1, 1, 0, 0, 0));
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
}
function yearRange(yyyy: string) {
  const y = Number(yyyy);
  const start = new Date(Date.UTC(y, 0, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y + 1, 0, 1, 0, 0, 0));
  return { start, end };
}

export async function GET(req: NextRequest) {
  try {
    const me = await getAuthUserWithRole(req);
    if (!me)
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    if (me.role !== "ADMIN" && me.role !== "PETUGAS") {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const sp = req.nextUrl.searchParams;
    const scope = (sp.get("scope") || "month").toLowerCase(); // month|year
    const now = new Date();
    const ymDefault = `${now.getUTCFullYear()}-${String(
      now.getUTCMonth() + 1
    ).padStart(2, "0")}`;

    let start: Date,
      end: Date,
      periodLabel = "";
    if (scope === "year") {
      const y = sp.get("year") || String(now.getUTCFullYear());
      ({ start, end } = yearRange(y));
      periodLabel = `Tahun ${y}`;
    } else {
      const ym = sp.get("month") || ymDefault;
      ({ start, end } = monthRange(ym));
      const d = new Date(start);
      periodLabel = d.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
    }

    // ====== KREDIT (PEMASUKAN) dari Pembayaran ======
    const payments = await prisma.pembayaran.findMany({
      where: { deletedAt: null, tanggalBayar: { gte: start, lt: end } },
      include: {
        tagihan: {
          select: {
            periode: true,
            pelanggan: { select: { nama: true, kode: true } },
          },
        },
      },
      orderBy: { tanggalBayar: "asc" },
    });

    const kreditTotal = payments.reduce((s, p) => s + (p.jumlahBayar || 0), 0);
    const kreditByMetode: Record<string, number> = {};
    for (const m of Object.values(MetodeBayar)) kreditByMetode[m] = 0;
    for (const p of payments)
      kreditByMetode[p.metode] =
        (kreditByMetode[p.metode] || 0) + p.jumlahBayar;

    // ====== DEBIT (PENGELUARAN) dari PengeluaranDetail yg header CLOSE ======
    const details = await prisma.pengeluaranDetail.findMany({
      where: {
        pengeluaran: {
          status: PengeluaranStatus.CLOSE,
          tanggalPengeluaran: { gte: start, lt: end },
        },
      },
      include: {
        masterBiaya: { select: { nama: true } },
        pengeluaran: { select: { tanggalPengeluaran: true, noBulan: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const debitTotal = details.reduce((s, d) => s + (d.nominal || 0), 0);
    const debitByKategori: Record<string, { nama: string; total: number }> = {};
    for (const d of details) {
      const key = d.masterBiayaId || d.biayaNamaSnapshot || "Lainnya";
      if (!debitByKategori[key])
        debitByKategori[key] = {
          nama: d.masterBiaya?.nama || d.biayaNamaSnapshot || "Lainnya",
          total: 0,
        };
      debitByKategori[key].total += d.nominal || 0;
    }

    // ====== LEDGER (Debit / Kredit) disatukan untuk UI & export ======
    type Row = {
      tanggal: Date;
      keterangan: string;
      debit: number;
      kredit: number;
    };
    const ledger: Row[] = [
      ...details.map<Row>((d) => ({
        tanggal: d.pengeluaran.tanggalPengeluaran,
        keterangan: `${
          d.biayaNamaSnapshot || d.masterBiaya?.nama || "Biaya"
        } • ${d.keterangan || ""}`.trim(),
        debit: d.nominal,
        kredit: 0,
      })),
      ...payments.map<Row>((p) => ({
        tanggal: p.tanggalBayar,
        keterangan: `Pembayaran ${p.tagihan?.pelanggan?.nama || ""} (${
          p.tagihan?.pelanggan?.kode || ""
        }) • Tagihan ${p.tagihan?.periode} • ${p.metode}`,
        debit: 0,
        kredit: p.jumlahBayar,
      })),
    ].sort((a, b) => +new Date(a.tanggal) - +new Date(b.tanggal));

    const labaBersih = kreditTotal - debitTotal;

    return NextResponse.json({
      ok: true,
      scope,
      periodLabel,
      range: { start, end },
      ringkasan: {
        debitTotal, // Pengeluaran
        kreditTotal, // Pemasukan
        labaBersih,
      },
      pemasukan: {
        total: kreditTotal,
        byMetode: kreditByMetode,
        rows: payments,
      },
      pengeluaran: {
        total: debitTotal,
        byKategori: Object.values(debitByKategori),
        rows: details,
      },
      ledger, // ← debit/kredit siap render tabel / export
    });
  } catch (e: any) {
    console.error("LR API error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

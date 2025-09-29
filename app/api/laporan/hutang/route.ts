import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Terima ISO atau "YYYY-MM-DD" + jam opsional */
function parseFlexibleRange(
  dateFrom?: string | null,
  timeFrom?: string | null,
  dateTo?: string | null,
  timeTo?: string | null
) {
  let start: Date | undefined;
  let end: Date | undefined;

  if (dateFrom) {
    start = dateFrom.includes("T")
      ? new Date(dateFrom)
      : new Date(`${dateFrom}T${timeFrom || "00:00"}:00`);
  }
  if (dateTo) {
    end = dateTo.includes("T")
      ? new Date(dateTo)
      : new Date(`${dateTo}T${timeTo || "23:59"}:59.999`);
  }
  return { start, end };
}

const fmtIDR = (n = 0) => "Rp " + Number(n || 0).toLocaleString("id-ID");
const csvEsc = (s: any) => {
  const v = String(s ?? "");
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};
const fmtTanggalID = (d: Date | string) => {
  const date = new Date(d);
  const tgl = date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const jam = date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${tgl} ${jam}`;
};

type HutangStatus = "UNPAID" | "PARTIAL" | "PAID";

export async function GET(req: NextRequest) {
  try {
    const u = new URL(req.url);
    const statusParam = (u.searchParams.get("status") || "").toUpperCase() as
      | HutangStatus
      | "";
    const dateFrom = u.searchParams.get("dateFrom");
    const timeFrom = u.searchParams.get("timeFrom");
    const dateTo = u.searchParams.get("dateTo");
    const timeTo = u.searchParams.get("timeTo");
    const { start, end } = parseFlexibleRange(
      dateFrom,
      timeFrom,
      dateTo,
      timeTo
    );

    // 1) Ambil semua header hutang (range by tanggalHutang)
    const whereHeader: any = {};
    if (start || end) {
      whereHeader.tanggalHutang = {};
      if (start) whereHeader.tanggalHutang.gte = start;
      if (end) whereHeader.tanggalHutang.lte = end;
    }

    const headers = await prisma.hutang.findMany({
      where: whereHeader,
      orderBy: [{ tanggalHutang: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        noBukti: true,
        tanggalHutang: true,
        keterangan: true,
        pemberi: true,
        // jika ada field zona/kategori di tabel hutang, boleh di-select juga;
        // kalau tidak ada, tetap null agar cocok dengan tipe halaman:
        // zona: true, kategori: true,
        details: {
          select: { id: true, nominal: true },
        },
      },
    });

    if (!headers.length) {
      return NextResponse.json({
        ok: true,
        items: [],
        summary: { totalHutang: 0, totalTerbayar: 0, totalSisa: 0, count: 0 },
      });
    }

    // 2) Sum pembayaran per header (via hutangPaymentDetail.hutangId)
    const headerIds = headers.map((h) => h.id);
    const paidByHeader = await prisma.hutangPaymentDetail.groupBy({
      by: ["hutangId"],
      where: { hutangId: { in: headerIds } },
      _sum: { amount: true },
    });
    const paidMap: Record<string, number> = {};
    for (const r of paidByHeader)
      paidMap[r.hutangId] = Number(r._sum.amount || 0);

    // 3) Bentuk rows untuk UI
    const rows = headers.map((h) => {
      const nominal = (h.details || []).reduce(
        (a, d) => a + Number(d.nominal || 0),
        0
      );
      const terbayar = Number(paidMap[h.id] || 0);
      const status: HutangStatus =
        terbayar <= 0 ? "UNPAID" : terbayar < nominal ? "PARTIAL" : "PAID";

      return {
        id: h.id,
        tanggal: h.tanggalHutang as unknown as string,
        deskripsi: h.keterangan || "-",
        kategori: null as string | null, // isi jika tabel punya
        refNo: h.noBukti || null,
        pihak: h.pemberi || null,
        zona: null as string | null, // isi jika tabel punya
        nominal,
        terbayar,
        status,
      };
    });

    // 4) Filter status (di app layer, karena status hasil komputasi)
    const filtered = statusParam
      ? rows.filter((r) => r.status === statusParam)
      : rows;

    // 5) Summary
    const totalHutang = filtered.reduce((a, it) => a + (it.nominal || 0), 0);
    const totalTerbayar = filtered.reduce((a, it) => a + (it.terbayar || 0), 0);
    const totalSisa = Math.max(0, totalHutang - totalTerbayar);

    // 6) CSV export (opsional)
    const wantCsv =
      (u.searchParams.get("format") || "").toLowerCase() === "csv" ||
      u.searchParams.get("export") === "1";

    if (wantCsv) {
      const header = [
        "Tanggal",
        "Deskripsi",
        "Pengelola/Vendor",
        "Kategori",
        "Ref",
        "Zona",
        "Nominal",
        "Terbayar",
        "Sisa",
        "Status",
      ].join(",");
      const rowsCsv = filtered.map((it) => {
        const sisa = Math.max(0, (it.nominal || 0) - (it.terbayar || 0));
        return [
          csvEsc(fmtTanggalID(it.tanggal)),
          csvEsc(it.deskripsi ?? ""),
          csvEsc(it.pihak ?? ""),
          csvEsc(it.kategori ?? ""),
          csvEsc(it.refNo ?? ""),
          csvEsc(it.zona ?? ""),
          csvEsc(fmtIDR(it.nominal)),
          csvEsc(fmtIDR(it.terbayar)),
          csvEsc(fmtIDR(sisa)),
          csvEsc(
            it.status === "PAID"
              ? "Lunas"
              : it.status === "PARTIAL"
              ? "Cicil"
              : "Belum Bayar"
          ),
        ].join(",");
      });
      const csv = [header, ...rowsCsv].join("\n");
      const filename = `laporan-hutang-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json({
      ok: true,
      items: filtered,
      summary: {
        totalHutang,
        totalTerbayar,
        totalSisa,
        count: filtered.length,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "ERR_REPORT" },
      { status: 500 }
    );
  }
}

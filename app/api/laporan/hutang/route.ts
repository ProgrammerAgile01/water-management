import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseFlexibleRange(
  dateFrom?: string | null,
  timeFrom?: string | null,
  dateTo?: string | null,
  timeTo?: string | null
) {
  let start: Date | undefined;
  let end: Date | undefined;

  if (dateFrom) {
    // jika sudah ISO (mengandung "T") pakai langsung
    start = dateFrom.includes("T")
      ? new Date(dateFrom)
      : new Date(`${dateFrom}T${timeFrom || "00:00"}:00`);
  }
  if (dateTo) {
    end = dateTo.includes("T")
      ? new Date(dateTo)
      : new Date(`${dateTo}T${timeTo || "23:59"}:59`);
  }
  return { start, end };
}

const fmtIDR = (n = 0) => "Rp " + Number(n || 0).toLocaleString("id-ID");
const csvEsc = (s: any) => {
  const v = String(s ?? "");
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};
const fmtTanggalID = (d: Date) => {
  const tgl = new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const jam = new Date(d).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${tgl} ${jam}`;
};

export async function GET(req: NextRequest) {
  try {
    const u = new URL(req.url);
    const q = (u.searchParams.get("q") || "").trim().toLowerCase();
    const status = u.searchParams.get("status") || "";
    const zona = u.searchParams.get("zona") || "";

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

    const where: any = {};
    if (q) {
      where.OR = [
        { deskripsi: { contains: q, mode: "insensitive" } },
        { refNo: { contains: q, mode: "insensitive" } },
        { pihak: { contains: q, mode: "insensitive" } },
        { kategori: { contains: q, mode: "insensitive" } },
        { zona: { contains: q, mode: "insensitive" } },
      ];
    }
    if (status) where.status = status;
    if (zona) where.zona = { contains: zona, mode: "insensitive" };
    if (start || end) {
      where.tanggal = {};
      if (start) where.tanggal.gte = start;
      if (end) where.tanggal.lte = end;
    }

    const items = await prisma.hutang.findMany({
      where,
      orderBy: [{ tanggal: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        tanggal: true,
        deskripsi: true,
        kategori: true,
        refNo: true,
        pihak: true,
        zona: true,
        nominal: true,
        terbayar: true,
        status: true,
      },
    });

    const totalHutang = items.reduce((a, it) => a + (it.nominal || 0), 0);
    const totalTerbayar = items.reduce((a, it) => a + (it.terbayar || 0), 0);
    const totalSisa = Math.max(0, totalHutang - totalTerbayar);

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
      const rows = items.map((it) => {
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
          csvEsc(it.status),
        ].join(",");
      });
      const csv = [header, ...rows].join("\n");
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
      items,
      summary: { totalHutang, totalTerbayar, totalSisa, count: items.length },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "ERR_REPORT" },
      { status: 500 }
    );
  }
}

// app/api/laporan/konsumsi-zona/export/excel/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserWithRole } from "@/lib/auth-user-server";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";
const isYm = (x?: string | null) => !!x && /^\d{4}-\d{2}$/.test(x);

export async function GET(req: NextRequest) {
  try {
    // Auth
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

    // Query
    const sp = req.nextUrl.searchParams;
    const month = sp.get("month") || "";
    const zone = (sp.get("zone") || "ALL").trim();
    const q = (sp.get("q") || "").trim();

    if (!isYm(month)) {
      return NextResponse.json(
        { ok: false, error: "Param 'month' harus format YYYY-MM" },
        { status: 400 }
      );
    }

    // Periode
    const periode = await prisma.catatPeriode.findFirst({
      where: { kodePeriode: month, deletedAt: null },
      select: { id: true },
    });

    // Zona master (nama + kode)
    const allZones = await prisma.zona.findMany({
      select: { nama: true, kode: true },
      orderBy: { nama: "asc" },
    });
    const zonesList = allZones.map((z) => z.nama);
    const zonesDict: Record<string, string> = Object.fromEntries(
      allZones.map((z) => [z.nama, z.kode])
    );

    // Workbook
    const wb = XLSX.utils.book_new();

    if (!periode) {
      const ws = XLSX.utils.aoa_to_sheet([
        ["Kode", "Zona", "Total Pemakaian (m3)", "Pelanggan Tercatat"],
      ]);
      XLSX.utils.book_append_sheet(wb, ws, "Konsumsi Per Zona");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="konsumsi-zona-${month}.xlsx"`,
        },
      });
    }

    // Entries DONE
    const entries = await prisma.catatMeter.findMany({
      where: { periodeId: periode.id, deletedAt: null, status: "DONE" },
      select: {
        pemakaianM3: true,
        zonaNamaSnapshot: true,
        pelanggan: { select: { zona: { select: { nama: true } } } },
      },
    });

    // Seed semua zona
    const map = new Map<string, { total: number; count: number }>();
    for (const z of zonesList) map.set(z, { total: 0, count: 0 });

    for (const e of entries) {
      const rawName = (
        e.zonaNamaSnapshot ||
        e.pelanggan.zona?.nama ||
        "-"
      ).trim();
      const key =
        zonesList.find(
          (z) => z.trim().toLowerCase() === rawName.toLowerCase()
        ) ?? rawName;

      // Filter zona + pencarian q (nama/kode)
      if (zone !== "ALL" && key.trim().toLowerCase() !== zone.toLowerCase())
        continue;
      const kodeKey = zonesDict[key];
      const matchQ =
        !q ||
        key.toLowerCase().includes(q.toLowerCase()) ||
        (kodeKey && kodeKey.toLowerCase().includes(q.toLowerCase()));
      if (!matchQ) continue;

      const prev = map.get(key) || { total: 0, count: 0 };
      prev.total += e.pemakaianM3 || 0;
      prev.count += 1;
      map.set(key, prev);
    }

    const rows = Array.from(map.entries())
      .filter(([name]) =>
        zone === "ALL" ? true : name.trim().toLowerCase() === zone.toLowerCase()
      )
      .filter(([name]) => {
        if (!q) return true;
        const kode = zonesDict[name];
        return (
          name.toLowerCase().includes(q.toLowerCase()) ||
          (kode && kode.toLowerCase().includes(q.toLowerCase()))
        );
      })
      .map(([name, v]) => ({
        kode: zonesDict[name] ?? "-",
        zona: name,
        totalPemakaian: v.total,
        jumlahPelangganTercatat: v.count,
      }));

    // Sheet data
    const ws = XLSX.utils.aoa_to_sheet([
      ["Kode", "Zona", "Total Pemakaian (m3)", "Pelanggan Tercatat"],
      ...rows.map((r) => [
        r.kode,
        r.zona,
        r.totalPemakaian,
        r.jumlahPelangganTercatat,
      ]),
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Konsumsi Per Zona");

    // Sheet summary
    const totalPemakaian = rows.reduce((a, b) => a + b.totalPemakaian, 0);
    const totalCount = rows.reduce((a, b) => a + b.jumlahPelangganTercatat, 0);
    const ws2 = XLSX.utils.aoa_to_sheet([
      ["Periode", month],
      ["Filter Zona", zone === "ALL" ? "Semua" : zone],
      ["Jumlah Zona", rows.length],
      ["Total Pemakaian (m3)", totalPemakaian],
      ["Total Pelanggan Tercatat", totalCount],
    ]);
    XLSX.utils.book_append_sheet(wb, ws2, "Summary");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="konsumsi-zona-${month}.xlsx"`,
      },
    });
  } catch (err: any) {
    console.error("GET /api/laporan/konsumsi-zona/export/excel error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}

// app/api/laporan/konsumsi-zona/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserWithRole } from "@/lib/auth-user-server";

export const dynamic = "force-dynamic";

const isYm = (x?: string | null) => !!x && /^\d{4}-\d{2}$/.test(x);
const toInt = (v: string | null, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : d;
};

export async function GET(req: NextRequest) {
  try {
    // ===== Authz =====
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

    // ===== Query params =====
    const sp = req.nextUrl.searchParams;
    const month = sp.get("month") || "";
    const zone = (sp.get("zone") || "ALL").trim();
    const q = (sp.get("q") || "").trim();
    const page = toInt(sp.get("page"), 1);
    const size = Math.min(toInt(sp.get("size"), 1000), 5000); // guard max

    // ===== Periode tersedia (tanpa filter status) =====
    const periodRows = await prisma.catatPeriode.findMany({
      where: { deletedAt: null },
      select: { kodePeriode: true },
      orderBy: { kodePeriode: "desc" }, // aman utk "YYYY-MM"
    });
    const availableMonths = Array.from(
      new Set(periodRows.map((p) => p.kodePeriode))
    );
    const monthResolved = isYm(month) ? month : availableMonths[0] || "";

    // ===== Zona master (nama + kode) =====
    const allZones = await prisma.zona.findMany({
      select: { nama: true, kode: true },
      orderBy: { nama: "asc" },
    });
    const zonesList = allZones.map((z) => z.nama);
    const zonesDict: Record<string, string> = Object.fromEntries(
      allZones.map((z) => [z.nama, z.kode])
    );

    // Jika belum ada periode terpilih, kembalikan shell response
    if (!isYm(monthResolved)) {
      return NextResponse.json({
        ok: true,
        month: monthResolved,
        availableMonths,
        zone: zone === "ALL" ? null : zone,
        rows: [],
        zones: zonesList,
        zonesDict,
        summary: { totalPemakaian: 0, byZone: [], pelangganCount: 0 },
        pagination: { page, size, total: 0, totalPages: 0 },
      });
    }

    // ===== Periode id =====
    const periode = await prisma.catatPeriode.findFirst({
      where: { kodePeriode: monthResolved, deletedAt: null },
      select: { id: true },
    });
    if (!periode) {
      return NextResponse.json({
        ok: true,
        month: monthResolved,
        availableMonths,
        zone: zone === "ALL" ? null : zone,
        rows: [],
        zones: zonesList,
        zonesDict,
        summary: { totalPemakaian: 0, byZone: [], pelangganCount: 0 },
        pagination: { page, size, total: 0, totalPages: 0 },
      });
    }

    // ===== Ambil entries DONE utk periode =====
    const entries = await prisma.catatMeter.findMany({
      where: { periodeId: periode.id, deletedAt: null, status: "DONE" },
      select: {
        pemakaianM3: true,
        zonaNamaSnapshot: true,
        pelanggan: { select: { zona: { select: { nama: true } } } },
      },
    });

    // ===== Seed semua zona dengan 0 =====
    const bucket = new Map<string, { total: number; count: number }>();
    for (const z of zonesList) bucket.set(z, { total: 0, count: 0 });

    // ===== Isi agregat (case-insensitive, fallback snapshot→relasi) =====
    for (const e of entries) {
      const rawName = (
        e.zonaNamaSnapshot ||
        e.pelanggan.zona?.nama ||
        "-"
      ).trim();
      // normalisasi ke salah satu nama di master zona bila cocok
      const key =
        zonesList.find(
          (z) => z.trim().toLowerCase() === rawName.toLowerCase()
        ) ?? rawName;

      // Filter "Zona" dropdown
      if (zone !== "ALL" && key.trim().toLowerCase() !== zone.toLowerCase())
        continue;

      // Filter pencarian "q" ke nama atau kode
      const kodeKey = zonesDict[key];
      const matchQ =
        !q ||
        key.toLowerCase().includes(q.toLowerCase()) ||
        (kodeKey && kodeKey.toLowerCase().includes(q.toLowerCase()));
      if (!matchQ) continue;

      const prev = bucket.get(key) || { total: 0, count: 0 };
      prev.total += e.pemakaianM3 || 0;
      prev.count += 1;
      bucket.set(key, prev);
    }

    // ===== Bentuk rows penuh (nama + kode) =====
    const fullRows = Array.from(bucket.entries())
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
        zona: name,
        kodeZona: zonesDict[name] ?? "-",
        totalPemakaian: v.total,
        jumlahPelangganTercatat: v.count,
      }))
      .sort(
        (a, b) =>
          b.totalPemakaian - a.totalPemakaian ||
          a.zona.localeCompare(b.zona, "id-ID")
      );

    // ===== Pagination =====
    const total = fullRows.length;
    const totalPages = Math.max(1, Math.ceil(total / size));
    const pageSafe = Math.min(Math.max(1, page), totalPages);
    const start = (pageSafe - 1) * size;
    const end = start + size;
    const rows = fullRows.slice(start, end);

    // Summary untuk halaman aktif
    const totalPemakaian = rows.reduce(
      (a, b) => a + (b.totalPemakaian || 0),
      0
    );
    const byZone = rows.map((r) => ({ zona: r.zona, total: r.totalPemakaian }));

    return NextResponse.json({
      ok: true,
      month: monthResolved,
      availableMonths,
      zone: zone === "ALL" ? null : zone,
      rows,
      zones: zonesList,
      zonesDict, // nama -> kode
      summary: { totalPemakaian, byZone, pelangganCount: rows.length },
      pagination: { page: pageSafe, size, total, totalPages },
    });
  } catch (err: any) {
    console.error("GET /api/laporan/konsumsi-zona error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}

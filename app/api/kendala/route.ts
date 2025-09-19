// app/api/kendala/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Tentukan prioritas dari isi kendala (heuristic ringan).
 */
function inferPriority(text?: string | null): "high" | "medium" | "low" {
  if (!text) return "medium";
  const t = text.toLowerCase();
  if (/(bocor parah|pipa pecah|banjir|air mati total|meter rusak berat)/.test(t)) return "high";
  if (/(bocor|meter rusak|tekanan rendah|rembes|mampet)/.test(t)) return "medium";
  return "low";
}

/**
 * Map entri CatatMeter/CatatMeterBlok ke bentuk yang dipakai UI
 * (status default "unresolved"; source "meter_reading"/"meter_reading_blok")
 */
function mapIssue(row: any, source: "meter_reading" | "meter_reading_blok") {
  const pelanggan = row?.pelanggan ?? {};
  const created = row?.updatedAt ?? row?.createdAt ?? new Date();
  const kendala = row?.kendala ?? "";

  return {
    // biar unik & stabil di frontend
    id: `${source}-${row.id}`,
    issue: kendala?.split("\n")[0]?.slice(0, 120) || "Kendala dari catat meter",
    description: kendala || "",
    reporter: pelanggan?.nama || "Pelanggan",
    phone: pelanggan?.wa || "",
    address: pelanggan?.alamat || "",
    priority: inferPriority(kendala),
    status: "unresolved" as const,
    source,
    date: new Date(created).toISOString().slice(0, 10),
    // field opsional untuk item "solved"
    solution: null as string | null,
    solvedDate: null as string | null,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    // optional: ?periode=YYYY-MM (kalau mau limit ke 1 periode tertentu)
    const periodeParam = searchParams.get("periode") ?? undefined;

    // ---- Query dari CatatMeter ----
    const whereCatat: any = {
      deletedAt: null,
      NOT: [{ kendala: null }, { kendala: "" }],
    };
    if (periodeParam) {
      const [yStr, mStr] = periodeParam.split("-");
      whereCatat.periode = {
        tahun: Number(yStr),
        bulan: Number(mStr),
      };
    }
    const cm = await prisma.catatMeter.findMany({
      where: whereCatat,
      orderBy: [
        { periode: { tahun: "desc" } },
        { periode: { bulan: "desc" } },
        { updatedAt: "desc" },
      ],
      select: {
        id: true,
        kendala: true,
        updatedAt: true,
        createdAt: true,
        pelanggan: { select: { nama: true, wa: true, alamat: true } },
      },
      take: 500,
    });

    // ---- Query dari CatatMeterBlok (opsional tambahan) ----
    const whereBlok: any = {
      deletedAt: null,
      NOT: [{ kendala: null }, { kendala: "" }],
    };
    if (periodeParam) {
      const [yStr, mStr] = periodeParam.split("-");
      whereBlok.periode = {
        tahun: Number(yStr),
        bulan: Number(mStr),
      };
    }
    const cmb = await prisma.catatMeterBlok.findMany({
      where: whereBlok,
      orderBy: [
        { periode: { tahun: "desc" } },
        { periode: { bulan: "desc" } },
        { updatedAt: "desc" },
      ],
      select: {
        id: true,
        kendala: true,
        updatedAt: true,
        createdAt: true,
        pelanggan: { select: { nama: true, wa: true, alamat: true } },
      },
      take: 500,
    });

    // gabungkan & normalisasi
    const items = [
      ...cm.map((r) => mapIssue(r, "meter_reading")),
      ...cmb.map((r) => mapIssue(r, "meter_reading_blok")),
    ];

    return NextResponse.json({ items });
  } catch (e: any) {
    console.error("[API] /api/kendala GET error:", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

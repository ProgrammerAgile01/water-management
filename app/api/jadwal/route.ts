// app/api/jadwal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isYm(x?: string | null) {
  return !!x && /^\d{4}-\d{2}$/.test(x);
}

function resolveMonthFromSearchParams(sp: URLSearchParams) {
  let month = (sp.get("month") ?? "").slice(0, 7);
  if (!isYm(month)) {
    const y = sp.get("year");
    const m = sp.get("month");
    if (y && m && /^\d{4}$/.test(y) && /^\d{1,2}$/.test(m)) {
      month = `${y}-${String(Number(m)).padStart(2, "0")}`;
    }
  }
  return month;
}

function buildTanggalUntukBulan(month: string, settingDay?: number | null) {
  const [y, m] = month.split("-");
  const dayFromSetting = settingDay ?? 1;
  const lastDay = new Date(Number(y), Number(m), 0).getDate();
  const day = Math.min(Math.max(1, dayFromSetting), lastDay);
  return new Date(`${month}-${String(day).padStart(2, "0")}T00:00:00.000Z`);
}

function mapUiStatus(
  s?: string | null
): "WAITING" | "IN_PROGRESS" | "NON_PROGRESS" | "DONE" | "OVERDUE" | undefined {
  const v = (s ?? "").toUpperCase();
  if (v === "WAITING") return "WAITING";
  if (v === "IN-PROGRESS" || v === "IN_PROGRESS") return "IN_PROGRESS";
  if (v === "NON-PROGRESS" || v === "NON_PROGRESS") return "NON_PROGRESS";
  if (v === "DONE" || v === "FINISHED") return "DONE";
  if (v === "OVERDUE") return "OVERDUE";
  return undefined;
}

// ---------------- GET ----------------
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const month = resolveMonthFromSearchParams(sp);
    if (!isYm(month)) {
      return NextResponse.json(
        { ok: false, message: "Param month (YYYY-MM) wajib." },
        { status: 400 }
      );
    }

    const zona = sp.get("zona") ?? "";
    const petugas = sp.get("petugas") ?? "";
    const statusStr = sp.get("status") ?? "all";
    const q = (sp.get("q") ?? "").trim();

    const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(sp.get("pageSize") ?? "20", 10))
    );

    const where: any = { bulan: month };
    if (zona) where.zonaId = zona;
    if (petugas) where.petugasId = petugas;
    const statusEnum = mapUiStatus(statusStr);
    if (statusEnum) where.status = statusEnum;
    if (q) {
      where.OR = [
        { alamat: { contains: q } },
        { zona: { nama: { contains: q } } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.jadwalPencatatan.findMany({
        where,
        orderBy: [{ createdAt: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          zona: { select: { id: true, nama: true, deskripsi: true } },
          petugas: { select: { id: true, name: true } },
        },
      }),
      prisma.jadwalPencatatan.count({ where }),
    ]);

    // === Hitung progress Live dari CatatMeter ===
    const zonaIds = rows.map((r) => r.zonaId).filter(Boolean) as string[];

    let progressMap = new Map<string, number>();
    if (zonaIds.length) {
      const grouped = await prisma.catatMeter.groupBy({
        by: ["zonaIdSnapshot"],
        where: {
          status: "DONE",
          deletedAt: null,
          zonaIdSnapshot: { in: zonaIds },
          periode: { kodePeriode: month },
        },
        _count: { _all: true },
      });
      progressMap = new Map(
        grouped.map((g) => [g.zonaIdSnapshot ?? "", g._count._all])
      );
    }

    // Fallback pakai relasi pelanggan.zonaId
    if (
      [...progressMap.values()].reduce((a, b) => a + b, 0) === 0 &&
      zonaIds.length
    ) {
      const perZonaCounts = await Promise.all(
        zonaIds.map(async (zid) => {
          const c = await prisma.catatMeter.count({
            where: {
              status: "DONE",
              deletedAt: null,
              periode: { kodePeriode: month },
              pelanggan: { zonaId: zid },
            },
          });
          return [zid, c] as const;
        })
      );
      progressMap = new Map(perZonaCounts);
    }

    // Turunkan status baru berdasar progress vs target
    type Row = (typeof rows)[number];
    const toDerivedStatus = (r: Row, progress: number) => {
      const target = r.target ?? 0;
      // NON_PROGRESS / OVERDUE tetap dipertahankan bila manual set
      if (r.status === "NON_PROGRESS" || r.status === "OVERDUE")
        return r.status;
      if (target > 0 && progress >= target) return "DONE";
      if (progress > 0) return "IN_PROGRESS";
      return "WAITING";
    };

    const needDoneIds: string[] = [];
    const needInProgressIds: string[] = [];
    const rowsWithDerived = rows.map((r) => {
      const progress = progressMap.get(r.zonaId ?? "") ?? r.progress ?? 0;
      const derived = toDerivedStatus(r, progress);
      // Kumpulkan yang perlu disimpan ke DB (hindari write berlebihan)
      if (derived !== r.status) {
        if (derived === "DONE") needDoneIds.push(r.id);
        else if (derived === "IN_PROGRESS") needInProgressIds.push(r.id);
      }
      return { ...r, progress, status: derived };
    });

    // Persist perubahan status (jika ada)
    if (needDoneIds.length || needInProgressIds.length) {
      const tx: any[] = [];
      if (needDoneIds.length) {
        tx.push(
          prisma.jadwalPencatatan.updateMany({
            where: { id: { in: needDoneIds } },
            data: { status: "DONE" },
          })
        );
      }
      if (needInProgressIds.length) {
        tx.push(
          prisma.jadwalPencatatan.updateMany({
            where: { id: { in: needInProgressIds } },
            data: { status: "IN_PROGRESS" },
          })
        );
      }
      if (tx.length) await prisma.$transaction(tx);
    }

    return NextResponse.json({
      ok: true,
      data: rowsWithDerived,
      pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
    });
  } catch (e) {
    console.error("GET /api/jadwal error:", e);
    return NextResponse.json(
      { ok: false, message: "Gagal memuat jadwal" },
      { status: 500 }
    );
  }
}

// ---------------- POST ----------------
export async function POST(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;

    let month = resolveMonthFromSearchParams(sp);
    if (!isYm(month)) {
      const body = await req.json().catch(() => ({}));
      if (typeof body?.month === "string" && isYm(body.month)) {
        month = body.month;
      } else if (
        typeof body?.year === "string" &&
        typeof body?.month === "string" &&
        /^\d{4}$/.test(body.year) &&
        /^\d{1,2}$/.test(body.month)
      ) {
        month = `${body.year}-${String(Number(body.month)).padStart(2, "0")}`;
      }
    }
    if (!isYm(month)) {
      month = new Date().toISOString().slice(0, 7);
    }

    const setting = await prisma.setting.findUnique({ where: { id: 1 } });
    const tanggalRencana = buildTanggalUntukBulan(
      month,
      setting?.tanggalCatatDefault
    );

    const zonas = await prisma.zona.findMany({
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, deskripsi: true, petugasId: true },
    });
    if (zonas.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Tidak ada data zona untuk digenerate." },
        { status: 400 }
      );
    }

    const pelangganCounts = await prisma.pelanggan.groupBy({
      by: ["zonaId"],
      where: { statusAktif: true, zonaId: { in: zonas.map((z) => z.id) } },
      _count: { _all: true },
    });
    const targetByZona = new Map<string, number>();
    for (const row of pelangganCounts) {
      targetByZona.set(row.zonaId ?? "", row._count._all);
    }

    const existing = await prisma.jadwalPencatatan.findMany({
      where: { bulan: month },
      select: { zonaId: true },
    });
    const existSet = new Set(existing.map((x) => x.zonaId ?? ""));

    const payload = zonas
      .filter((z) => !existSet.has(z.id))
      .map((z) => ({
        bulan: month,
        tanggalRencana,
        target: targetByZona.get(z.id) ?? 0,
        progress: 0,
        status: "WAITING" as const,
        zonaId: z.id,
        petugasId: z.petugasId ?? null,
        alamat: z.deskripsi ?? null,
      }));

    if (payload.length > 0) {
      await prisma.jadwalPencatatan.createMany({ data: payload });
    }

    return NextResponse.json({
      ok: true,
      message:
        payload.length > 0
          ? `Generate ${
              payload.length
            } jadwal untuk bulan ${month} (tanggal ${tanggalRencana
              .toISOString()
              .slice(0, 10)}).`
          : `Semua jadwal bulan ${month} sudah ada. Tanggal rencana: ${tanggalRencana
              .toISOString()
              .slice(0, 10)}.`,
    });
  } catch (e) {
    console.error("POST /api/jadwal error:", e);
    return NextResponse.json(
      { ok: false, message: "Gagal generate jadwal" },
      { status: 500 }
    );
  }
}

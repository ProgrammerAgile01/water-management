// app/api/jadwal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma, CatatStatus } from "@prisma/client";
import { toUiStatus } from "@/lib/status-map";

export const runtime = "nodejs";

const UI_TO_DB: Record<string, string> = {
  waiting: "WAITING",
  "in-progress": "IN_PROGRESS",
  "non-progress": "NON_PROGRESS",
  finished: "DONE",
  overdue: "OVERDUE",
};

/* ===================== GET /api/jadwal ===================== */
/* ===================== GET /api/jadwal ===================== */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;

    // bulan boleh "YYYY-MM" atau (year + month)
    const mParam = (sp.get("month") ?? "").trim();
    const yParam = Number(sp.get("year"));
    let bulan = "";
    if (/^\d{4}-\d{2}$/.test(mParam)) {
      bulan = mParam;
    } else if (Number.isFinite(yParam) && Number.isFinite(Number(mParam))) {
      bulan = `${yParam}-${String(Number(mParam)).padStart(2, "0")}`;
    }

    const zonaId = sp.get("zonaId") || "";
    const petugasId = sp.get("petugasId") || "";
    const statusUi = (sp.get("status") ?? "all").toLowerCase();
    const q = (sp.get("q") ?? "").trim();

    const where: Prisma.JadwalPencatatanWhereInput = {};
    if (bulan) where.bulan = bulan;
    if (zonaId) where.zonaId = zonaId;
    if (petugasId) where.petugasId = petugasId;
    if (statusUi !== "all" && UI_TO_DB[statusUi]) {
      where.status = UI_TO_DB[statusUi] as any;
    }
    if (q) {
      // Tanpa "mode", pakai LIKE/contains default DB
      where.OR = [
        { zona: { nama: { contains: q } } },
        { alamat: { contains: q } },
        { petugas: { name: { contains: q } } },
      ];
    }

    // Ambil jadwal
    const rows = await prisma.jadwalPencatatan.findMany({
      where,
      orderBy: [{ tanggalRencana: "asc" }, { createdAt: "asc" }],
      include: {
        zona: { select: { id: true, nama: true, deskripsi: true } },
        petugas: { select: { id: true, name: true } },
      },
    });

    // Cari periode catat untuk bulan ini (jika ada)
    const periode = bulan
      ? await prisma.catatPeriode.findUnique({
          where: { kodePeriode: bulan },
          select: { id: true },
        })
      : null;

    // Hitung target/progress langsung dari catatMeter (sinkron dengan /catat-meter)
    const data = await Promise.all(
      rows.map(async (r) => {
        const d = new Date(r.tanggalRencana);

        let target = 0;
        let progress = 0;

        if (periode?.id) {
          const zonaNama = (r.zona?.nama ?? "").trim();
          const zonaFilters: Prisma.CatatMeterWhereInput[] = [];

          // 1) Paling akurat: pakai zonaId
          if (r.zonaId) {
            zonaFilters.push({ zonaIdSnapshot: r.zonaId });
            zonaFilters.push({ pelanggan: { zonaId: r.zonaId } });
          }

          // 2) Fallback: pakai nama zona (tanpa mode)
          if (zonaNama) {
            zonaFilters.push({ zonaNamaSnapshot: { equals: zonaNama } });
            zonaFilters.push({
              pelanggan: { zona: { is: { nama: { equals: zonaNama } } } },
            });
            // bila ada kolom string zonaNama di pelanggan
            // zonaFilters.push({ pelanggan: { zonaNama: { equals: zonaNama } } });
          }

          const baseWhere: Prisma.CatatMeterWhereInput = {
            periodeId: periode.id,
            deletedAt: null,
            ...(zonaFilters.length ? { OR: zonaFilters } : {}),
          };

          // total entri & yang DONE
          target = await prisma.catatMeter.count({ where: baseWhere });
          progress = await prisma.catatMeter.count({
            where: { ...baseWhere, status: CatatStatus.DONE },
          });
        }

        return {
          id: r.id,
          zonaId: r.zonaId ?? r.zona?.id ?? "",
          zona: { id: r.zona?.id ?? r.zonaId ?? "", nama: r.zona?.nama ?? "-" },
          alamat: r.alamat ?? r.zona?.deskripsi ?? "-",
          petugas: {
            id: r.petugas?.id ?? r.petugasId ?? "",
            nama: r.petugas?.name ?? "-",
            avatar: "/placeholder.svg?height=32&width=32",
          },
          target,
          progress,
          status: toUiStatus(r.status),
          tanggalRencana: d.toISOString().slice(0, 10),
          bulan: r.bulan,
        };
      })
    );

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

/* ===================== POST /api/jadwal (Generate) ===================== */
const genSchema = z.object({
  bulan: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  tanggalRencana: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  zonaIds: z.array(z.string()).optional(),
  petugasId: z.string().optional(),
  overwrite: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = genSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ ok: false, message: msg }, { status: 400 });
    }

    const setting = await prisma.setting.findUnique({
      where: { id: 1 },
      select: { periodeJadwalAktif: true, tanggalCatatDefault: true },
    });

    const bulan =
      parsed.data.bulan ??
      setting?.periodeJadwalAktif ??
      new Date().toISOString().slice(0, 7);

    const tanggalRencanaStr =
      parsed.data.tanggalRencana ??
      (setting?.tanggalCatatDefault
        ? setting.tanggalCatatDefault.toISOString().slice(0, 10)
        : undefined);

    const planDate = tanggalRencanaStr
      ? new Date(tanggalRencanaStr)
      : new Date(`${bulan}-20`);

    if (parsed.data.overwrite) {
      await prisma.jadwalPencatatan.deleteMany({
        where: {
          bulan,
          ...(parsed.data.zonaIds?.length
            ? { zonaId: { in: parsed.data.zonaIds } }
            : {}),
        },
      });
    }

    const zonas = await prisma.zona.findMany({
      where: parsed.data.zonaIds?.length
        ? { id: { in: parsed.data.zonaIds } }
        : undefined,
      select: { id: true, deskripsi: true, petugasId: true },
    });
    if (!zonas.length) {
      return NextResponse.json(
        { ok: false, message: "Zona tidak ditemukan" },
        { status: 404 }
      );
    }

    const perZonaCounts = await prisma.pelanggan.groupBy({
      by: ["zonaId"],
      where: {
        zonaId: { in: zonas.map((z) => z.id) },
        deletedAt: null,
        statusAktif: true,
      },
      _count: { _all: true },
    });
    const mapCount = new Map(
      perZonaCounts.map((x) => [x.zonaId, x._count._all])
    );

    // hindari duplikat pada periode yang sama
    const existing = await prisma.jadwalPencatatan.findMany({
      where: { bulan, zonaId: { in: zonas.map((z) => z.id) } },
      select: { zonaId: true },
    });
    const already = new Set(existing.map((e) => e.zonaId!));

    const data = zonas
      .filter((z) => !already.has(z.id))
      .map((z) => ({
        bulan,
        tanggalRencana: planDate,
        zonaId: z.id,
        petugasId: parsed.data.petugasId ?? z.petugasId ?? null,
        target: mapCount.get(z.id) ?? 0,
        progress: 0,
        status: "WAITING" as const,
        alamat: z.deskripsi ?? null,
      }));

    if (!data.length) {
      return NextResponse.json({
        ok: true,
        created: 0,
        message: "Semua jadwal zona untuk bulan ini sudah ada.",
      });
    }

    const created = await prisma.jadwalPencatatan.createMany({ data });
    return NextResponse.json(
      {
        ok: true,
        created: created.count,
        message: "Jadwal berhasil digenerate.",
      },
      { status: 201 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

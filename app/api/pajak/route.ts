// // app/api/pajak/route.ts
// import { prisma } from "@/lib/prisma";
// import { NextResponse } from "next/server";

// export async function GET(req: Request) {
//   try {
//     const url = new URL(req.url);
//     const periodeId = url.searchParams.get("periodeId");
//     const calc = url.searchParams.get("calc"); // if calc=1 => return pemakaianM3 aggregate
//     // jika tidak ada periodeId => return semua pajak (opsional)
//     if (!periodeId) {
//       const all = await prisma.pajak.findMany({
//         orderBy: { periodeId: "desc" },
//       });
//       return NextResponse.json({ ok: true, data: all });
//     }

//     if (calc === "1") {
//       const agg = await prisma.catatMeter.aggregate({
//         _sum: { pemakaianM3: true },
//         where: { periodeId },
//       });
//       const pemakaianM3 = agg._sum.pemakaianM3 ?? 0;
//       return NextResponse.json({ ok: true, pemakaianM3 });
//     }

//     // normal: ambil pajak per periode (unique per periode)
//     const pajak = await prisma.pajak.findUnique({ where: { periodeId } });
//     return NextResponse.json({ ok: true, pajak });
//   } catch (err: any) {
//     console.error("GET /api/pajak error", err);
//     return NextResponse.json(
//       { ok: false, message: err.message || String(err) },
//       { status: 500 }
//     );
//   }
// }

// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const { periodeId, tarifPajakPerM3, keterangan } = body as {
//       periodeId: string;
//       tarifPajakPerM3: number;
//       keterangan?: string;
//     };

//     if (!periodeId)
//       return NextResponse.json(
//         { ok: false, message: "periodeId required" },
//         { status: 400 }
//       );
//     if (typeof tarifPajakPerM3 !== "number" || tarifPajakPerM3 < 0)
//       return NextResponse.json(
//         { ok: false, message: "tarifPajakPerM3 must be >= 0" },
//         { status: 400 }
//       );

//     // hitung pemakaian total dari catatMeter untuk periode
//     const agg = await prisma.catatMeter.aggregate({
//       _sum: { pemakaianM3: true },
//       where: { periodeId },
//     });
//     const pemakaianM3 = agg._sum.pemakaianM3 ?? 0;
//     const nominalBayarPajak = pemakaianM3 * tarifPajakPerM3;

//     // ambil info periode untuk keterangan default
//     const periode = await prisma.catatPeriode.findUnique({
//       where: { id: periodeId },
//     });
//     let keteranganFinal =
//       keterangan ??
//       `Pembayaran pajak untuk Periode ${periode?.kodePeriode ?? periodeId}`;
//     if (periode) {
//       const bulan = periode.bulan.toString().padStart(2, "0");
//       keteranganFinal =
//         keterangan ??
//         `Pembayaran pajak untuk Bulan ${bulan} Tahun ${periode.tahun}`;
//     }

//     // upsert (unique per periodeId)
//     const pajak = await prisma.pajak.upsert({
//       where: { periodeId },
//       update: {
//         keterangan: keteranganFinal,
//         pemakaianM3,
//         tarifPajakPerM3,
//         nominalBayarPajak,
//       },
//       create: {
//         periodeId,
//         keterangan: keteranganFinal,
//         pemakaianM3,
//         tarifPajakPerM3,
//         nominalBayarPajak,
//       },
//     });

//     return NextResponse.json({ ok: true, pajak });
//   } catch (err: any) {
//     console.error("POST /api/pajak error", err);
//     return NextResponse.json(
//       { ok: false, message: err.message || String(err) },
//       { status: 500 }
//     );
//   }
// }

// app/api/pajak/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MONTH_NAMES = [
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

function buildKeteranganFromPeriod(periode: {
  bulan: number;
  tahun: number;
  kodePeriode?: string | null;
}) {
  const monthIndex = Math.max(0, Math.min(11, (periode.bulan ?? 1) - 1));
  const monthName = MONTH_NAMES[monthIndex] ?? String(periode.bulan);
  return `Pembayaran pajak untuk Bulan ${monthName} Tahun ${periode.tahun}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const periodeId = url.searchParams.get("periodeId");
    const calc = url.searchParams.get("calc");

    // If no periodeId => return all pajak (history)
    if (!periodeId) {
      const all = await prisma.pajak.findMany({
        orderBy: { periodeId: "desc" }, // you can adjust ordering
      });
      return NextResponse.json({ ok: true, data: all });
    }

    // find periode record (ensure periodeId may be an id)
    const periodeRecord = await prisma.catatPeriode.findUnique({
      where: { id: periodeId },
    });

    // if calc mode -> aggregate pemakaian from catatMeter using periode id (if periode not found -> try kodePeriode)
    if (calc === "1") {
      let realPeriodeId = periodeId;
      if (!periodeRecord) {
        // try find by kodePeriode fallback
        const found = await prisma.catatPeriode.findFirst({
          where: { kodePeriode: periodeId },
        });
        if (found) realPeriodeId = found.id;
        else {
          return NextResponse.json({ ok: true, pemakaianM3: 0 });
        }
      }

      const agg = await prisma.catatMeter.aggregate({
        _sum: { pemakaianM3: true },
        where: { periodeId: realPeriodeId },
      });
      const pemakaianM3 = agg._sum.pemakaianM3 ?? 0;
      return NextResponse.json({ ok: true, pemakaianM3 });
    }

    // normal: return pajak for periode (upsert unique by periodeId)
    const pajak = await prisma.pajak.findUnique({ where: { periodeId } });

    // if not found and periodeRecord is null, attempt by kodePeriode
    if (!pajak && !periodeRecord) {
      const byKode = await prisma.catatPeriode.findFirst({
        where: { kodePeriode: periodeId },
      });
      if (byKode) {
        const p2 = await prisma.pajak.findUnique({
          where: { periodeId: byKode.id },
        });
        return NextResponse.json({ ok: true, pajak: p2 ?? null });
      }
    }

    return NextResponse.json({ ok: true, pajak: pajak ?? null });
  } catch (err: any) {
    console.error("GET /api/pajak error", err);
    return NextResponse.json(
      { ok: false, message: err.message ?? String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { periodeId, tarifPajakPerM3 } = body as {
      periodeId?: string;
      tarifPajakPerM3?: number;
      keterangan?: string;
    };

    if (!periodeId)
      return NextResponse.json(
        { ok: false, message: "periodeId required" },
        { status: 400 }
      );
    if (typeof tarifPajakPerM3 !== "number" || tarifPajakPerM3 < 0) {
      return NextResponse.json(
        { ok: false, message: "tarifPajakPerM3 must be a non-negative number" },
        { status: 400 }
      );
    }

    // resolve periode record (accept either id or kodePeriode)
    let periode = await prisma.catatPeriode.findUnique({
      where: { id: periodeId },
    });
    if (!periode) {
      periode = await prisma.catatPeriode.findFirst({
        where: { kodePeriode: periodeId },
      });
    }
    if (!periode) {
      return NextResponse.json(
        { ok: false, message: "Periode tidak ditemukan" },
        { status: 404 }
      );
    }

    // aggregate pemakaian from catatMeter with resolved periode.id
    const agg = await prisma.catatMeter.aggregate({
      _sum: { pemakaianM3: true },
      where: { periodeId: periode.id },
    });
    const pemakaianM3 = agg._sum.pemakaianM3 ?? 0;
    const nominalBayarPajak = pemakaianM3 * tarifPajakPerM3;

    // Build keterangan using month name on server (consistent) IGNORE frontend keterangan if any
    const keteranganServer = buildKeteranganFromPeriod({
      bulan: periode.bulan,
      tahun: periode.tahun,
      kodePeriode: periode.kodePeriode,
    });

    // upsert by unique periodeId
    const pajak = await prisma.pajak.upsert({
      where: { periodeId: periode.id },
      update: {
        keterangan: keteranganServer,
        pemakaianM3,
        tarifPajakPerM3,
        nominalBayarPajak,
      },
      create: {
        periodeId: periode.id,
        keterangan: keteranganServer,
        pemakaianM3,
        tarifPajakPerM3,
        nominalBayarPajak,
      },
    });

    return NextResponse.json({ ok: true, pajak });
  } catch (err: any) {
    console.error("POST /api/pajak error", err);
    return NextResponse.json(
      { ok: false, message: err.message ?? String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id)
      return NextResponse.json(
        { ok: false, message: "id required" },
        { status: 400 }
      );

    await prisma.pajak.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/pajak error", err);
    return NextResponse.json(
      { ok: false, message: err.message ?? String(err) },
      { status: 500 }
    );
  }
}

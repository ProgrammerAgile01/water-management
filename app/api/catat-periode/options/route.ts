import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const periods = await prisma.catatPeriode.findMany({
    where: { deletedAt: null },
    orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
    select: {
      kodePeriode: true,
      tahun: true,
      bulan: true,
      status: true,
      isLocked: true,
    },
  });

  let options = periods.map((p) => ({
    value: p.kodePeriode,
    label: new Date(p.tahun, p.bulan - 1, 1).toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    }),
    status: p.status,
    locked: p.isLocked,
  }));

  // ==== tambah next periode kalau last sudah FINAL ====
  const last = periods[0];
  if (last && last.isLocked) {
    const d = new Date(last.tahun, last.bulan - 1, 1);
    d.setMonth(d.getMonth() + 1);

    const kode = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0",
    )}`;

    // jangan dobel
    if (!options.find((o) => o.value === kode)) {
      options.unshift({
        value: kode,
        label: d.toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        }),
        status: "DRAFT",
        locked: false,
        isNew: true,
      });
    }
  }

  return NextResponse.json({ ok: true, options });
}

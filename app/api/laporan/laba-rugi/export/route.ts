// app/api/laporan/laba-rugi/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthUserWithRole } from "@/lib/auth-user-server";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function fetchJSON(url: string, headers: Headers) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
  return res.json();
}

export async function GET(req: NextRequest) {
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

  // panggil API utama
  const url = new URL(req.url);
  url.pathname = "/api/laporan/laba-rugi";
  const data = await fetchJSON(url.toString(), req.headers);

  // --- Sheet Ledger (utama) ---
  const aoa: (string | number | Date)[][] = [];
  aoa.push(["LAPORAN LABA & RUGI"]);
  aoa.push([String(data.periodLabel)]);
  aoa.push([]);
  aoa.push([
    "Tanggal",
    "Keterangan",
    "Debit (Beban)",
    "Kredit (Pendapatan)",
    "Saldo",
  ]);

  let saldo = 0;
  for (const r of data.ledger as Array<{
    tanggal: string;
    keterangan: string;
    debit: number;
    kredit: number;
  }>) {
    saldo += (r.kredit || 0) - (r.debit || 0);
    aoa.push([
      new Date(r.tanggal),
      r.keterangan,
      r.debit || 0,
      r.kredit || 0,
      saldo,
    ]);
  }

  aoa.push([]);
  aoa.push([
    "",
    "TOTAL",
    data.ringkasan.bebanTotal,
    data.ringkasan.pendapatanTotal,
    data.ringkasan.labaBersih,
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // format kolom tanggal
  const range = XLSX.utils.decode_range(ws["!ref"] as string);
  for (let R = 3; R <= range.e.r; ++R) {
    const c = XLSX.utils.encode_cell({ r: R, c: 0 });
    const cell = ws[c];
    if (cell && cell.v instanceof Date) {
      cell.t = "d";
      cell.z = "yyyy-mm-dd";
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, "Laba Rugi");

  // Opsional: Sheet Ringkasan
  const sum = XLSX.utils.aoa_to_sheet([
    ["Ringkasan", ""],
    ["Periode", String(data.periodLabel)],
    [],
    ["Pendapatan", data.ringkasan.pendapatanTotal],
    ["Beban", data.ringkasan.bebanTotal],
    ["Laba Bersih", data.ringkasan.labaBersih],
  ]);
  XLSX.utils.book_append_sheet(wb, sum, "Ringkasan");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="laba-rugi-${Date.now()}.xlsx"`,
    },
  });
}

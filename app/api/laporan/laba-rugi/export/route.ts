// app/api/laporan/laba-rugi/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthUserWithRole } from "@/lib/auth-user-server";
import { GET as getLabaRugi } from "../route";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RUPIAH_FORMAT = '"Rp" #,##0;[Red]-"Rp" #,##0;"Rp" 0';
const DATE_FORMAT = "dd/mm/yyyy";

function rupiahText(value: number) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

function cellPreview(value: string | number | Date | null | undefined) {
  if (value instanceof Date) return "00/00/0000";
  if (typeof value === "number") return rupiahText(value);
  return String(value ?? "");
}

function fitColumns(rows: (string | number | Date)[][]) {
  const maxByColumn = rows.reduce<number[]>((cols, row) => {
    row.forEach((value, index) => {
      cols[index] = Math.max(cols[index] || 0, cellPreview(value).length);
    });
    return cols;
  }, []);

  return maxByColumn.map((width, index) => ({
    wch: Math.min(
      Math.max(width + 2, index === 1 ? 28 : 12),
      index === 1 ? 60 : 22,
    ),
  }));
}

function formatSheet(
  ws: XLSX.WorkSheet,
  rows: (string | number | Date)[][],
  currencyColumns: number[],
) {
  ws["!cols"] = fitColumns(rows);

  const range = XLSX.utils.decode_range(ws["!ref"] as string);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (const C of currencyColumns) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell && typeof cell.v === "number") cell.z = RUPIAH_FORMAT;
    }

    const dateCell = ws[XLSX.utils.encode_cell({ r: R, c: 0 })];
    if (dateCell && dateCell.v instanceof Date) {
      dateCell.t = "d";
      dateCell.z = DATE_FORMAT;
    }
  }
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

  // panggil API utama — gunakan query dari request, termasuk scope=all jika ada
  const reportUrl = new URL(req.url);
  reportUrl.pathname = "/api/laporan/laba-rugi";
  reportUrl.searchParams.delete("page");
  reportUrl.searchParams.set("size", "5000");

  const reportReq = new NextRequest(reportUrl, { headers: req.headers });
  const reportRes = await getLabaRugi(reportReq);
  if (!reportRes.ok) throw new Error(`Fetch failed ${reportRes.status}`);
  const data = await reportRes.json();

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

  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
  ws["!autofilter"] = { ref: `A4:E${Math.max(4, aoa.length - 1)}` };
  formatSheet(ws, aoa, [2, 3, 4]);
  XLSX.utils.book_append_sheet(wb, ws, "Laba Rugi");

  // Opsional: Sheet Ringkasan
  const sumAoa: (string | number | Date)[][] = [
    ["Ringkasan", ""],
    ["Periode", String(data.periodLabel)],
    [],
    ["Pendapatan", data.ringkasan.pendapatanTotal],
    ["Beban", data.ringkasan.bebanTotal],
    ["Laba Bersih", data.ringkasan.labaBersih],
  ];
  const sum = XLSX.utils.aoa_to_sheet(sumAoa);
  formatSheet(sum, sumAoa, [1]);
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

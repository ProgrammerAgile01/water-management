"use client";

import { useMemo, useState } from "react";
import { GlassCard } from "./glass-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Status = "paid" | "unpaid" | "partial";

interface Row {
  id: string;
  periode: string;
  totalM3: number;
  tagihan: number; // totalTagihan bulan ini (tanpa carry)
  sudahBayar: number; // total pembayaran yang masuk
  tagihanLalu?: number; // carry-in (bisa + piutang atau - kredit)
  belumBayar?: number; // FINAL dari server (sudah hormati CLOSED_BY)
  status: Status;
}

interface DataTableProps {
  title: string;
  data: Row[];
}

export function DataTable({ title, data }: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

  // === Filter & pagination
  const filteredData = useMemo(
    () =>
      data.filter((item) =>
        item.periode.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [data, searchTerm]
  );
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  /**
   * Hitung angka tampilan per baris:
   * - tagihanBlnIni = row.tagihan (bulan ini)
   * - tagihanLalu = row.tagihanLalu (carry-in, ±)
   * - tagihanIncl = max(tagihanBlnIni + tagihanLalu, 0)  --> definisi “Tagihan (incl. Bln Lalu)”
   * - sudahBayar = total pembayaran
   * - belumBayar:
   *    • kalau server sudah kirim row.belumBayar -> pakai itu (sudah hormati CLOSED_BY)
   *    • else fallback: max(tagihanIncl - sudahBayar, 0)
   */
  const calcDisplay = (row: Row) => {
    const tagihanBlnIni = Number(row.tagihan || 0);
    const tagihanLalu = Number(row.tagihanLalu ?? 0);
    const net = tagihanBlnIni + tagihanLalu;
    const tagihanIncl = Math.max(net, 0);

    const sudah = Number(row.sudahBayar || 0);

    const belum =
      typeof row.belumBayar === "number"
        ? Math.max(row.belumBayar, 0)
        : Math.max(tagihanIncl - sudah, 0);

    return {
      tagihanBlnIni,
      tagihanLalu,
      tagihanTampil: tagihanIncl, // ✅ sesuai definisi “incl. bln lalu”
      sudahBayarTampil: sudah,
      belumBayarTampil: belum,
    };
  };

  // === Totals (semua hasil filter) — pakai definisi tagihanIncl
  const totalsAll = useMemo(() => {
    return filteredData.reduce(
      (acc, it) => {
        const d = calcDisplay(it);
        acc.totalM3 += it.totalM3 || 0;
        acc.tagihanLalu += d.tagihanLalu;
        acc.tagihan += d.tagihanTampil;
        acc.tagihanBlnIni += d.tagihanBlnIni;
        acc.sudahBayar += d.sudahBayarTampil;
        acc.belumBayar += d.belumBayarTampil;
        return acc;
      },
      {
        totalM3: 0,
        tagihanLalu: 0,
        tagihanBlnIni: 0,
        tagihan: 0,
        sudahBayar: 0,
        belumBayar: 0,
      }
    );
  }, [filteredData]);

  // === Totals (halaman aktif) — pakai definisi tagihanIncl
  const totalsPage = useMemo(() => {
    return paginatedData.reduce(
      (acc, it) => {
        const d = calcDisplay(it);
        acc.totalM3 += it.totalM3 || 0;
        acc.tagihanLalu += d.tagihanLalu;
        acc.tagihan += d.tagihanTampil;
        acc.tagihanBlnIni += d.tagihanBlnIni;
        acc.sudahBayar += d.sudahBayarTampil;
        acc.belumBayar += d.belumBayarTampil;
        return acc;
      },
      {
        totalM3: 0,
        tagihanLalu: 0,
        tagihanBlnIni: 0,
        tagihan: 0,
        sudahBayar: 0,
        belumBayar: 0,
      }
    );
  }, [paginatedData]);

  const getStatusBadge = (status: Status) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Lunas
          </Badge>
        );
      case "unpaid":
        return <Badge variant="destructive">Belum Bayar</Badge>;
      case "partial":
        return <Badge variant="secondary">Sebagian</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <Input
          placeholder="Cari periode..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="w-48 bg-card/50"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/20">
              <th className="text-left  py-3 px-2 text-sm font-medium text-muted-foreground">
                Periode
              </th>
              <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                Total m³
              </th>

              {/* NEW: terpisah */}
              <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                Tagihan Bulan Lalu
              </th>
              <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                Tagihan Sekarang
              </th>
              <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                Total Tagihan
              </th>

              <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                Sudah Bayar
              </th>
              <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                Belum Bayar
              </th>
              <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>

          <tbody>
            {paginatedData.map((item) => {
              const d = calcDisplay(item);
              return (
                <tr
                  key={item.id}
                  className="border-b border-border/10 hover:bg-muted/20"
                >
                  <td className="py-3 px-2 text-sm font-medium text-foreground">
                    {item.periode}
                  </td>
                  <td className="py-3 px-2 text-sm text-right text-foreground">
                    {item.totalM3.toLocaleString()} m³
                  </td>

                  {/* Tagihan Bln Lalu: tampilkan negatif sebagai kredit (hijau) */}
                  <td className="py-3 px-2 text-sm text-right">
                    {d.tagihanLalu === 0 ? (
                      <span className="text-muted-foreground">Rp 0</span>
                    ) : d.tagihanLalu > 0 ? (
                      <span className="text-red-600 font-medium">
                        Kurang {fmtRp(d.tagihanLalu)}
                      </span>
                    ) : (
                      <span className="text-green-600 font-medium">
                        Sisa {fmtRp(Math.abs(d.tagihanLalu))}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-2 text-sm text-right text-foreground">
                    {fmtRp(d.tagihanBlnIni)}
                  </td>

                  <td className="py-3 px-2 text-sm text-right font-semibold text-foreground">
                    {fmtRp(d.tagihanTampil)}
                  </td>

                  <td className="py-3 px-2 text-sm text-right text-green-700">
                    {fmtRp(d.sudahBayarTampil)}
                  </td>
                  <td className="py-3 px-2 text-sm text-right text-red-700">
                    {fmtRp(d.belumBayarTampil)}
                  </td>
                  <td className="py-3 px-2 text-center">
                    {getStatusBadge(item.status)}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Footer Totals (halaman ini) */}
          <tfoot>
            <tr className="border-t border-border/30 bg-muted/20 font-bold">
              <td className="py-3 px-2 text-sm text-foreground">Total</td>
              <td className="py-3 px-2 text-sm text-right text-muted-foreground">
                {totalsPage.totalM3.toLocaleString()} m³
              </td>
              <td className="py-3 px-2 text-sm text-right text-foreground">
                {fmtRp(totalsPage.tagihanLalu)}
              </td>
              <td className="py-3 px-2 text-sm text-right text-foreground">
                {fmtRp(totalsPage.tagihanBlnIni)}
              </td>
              <td className="py-3 px-2 text-sm text-right text-foreground">
                {fmtRp(totalsPage.tagihan)}
              </td>
              <td className="py-3 px-2 text-sm text-right text-green-700">
                {fmtRp(totalsPage.sudahBayar)}
              </td>
              <td className="py-3 px-2 text-sm text-right text-red-700">
                {fmtRp(totalsPage.belumBayar)}
              </td>
              <td className="py-3 px-2 text-center text-muted-foreground"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Menampilkan {filteredData.length === 0 ? 0 : startIndex + 1}-
            {Math.min(startIndex + itemsPerPage, filteredData.length)} dari{" "}
            {filteredData.length} data
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="bg-transparent"
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="bg-transparent"
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
// "use client"

// import { useState } from "react"
// import { GlassCard } from "./glass-card"
// import { Input } from "@/components/ui/input"
// import { Button } from "@/components/ui/button"
// import { Badge } from "@/components/ui/badge"

// interface DataTableProps {
//   title: string
//   data: Array<{
//     id: string
//     periode: string
//     totalM3: number
//     tagihan: number
//     sudahBayar: number
//     belumBayar: number
//     status: "paid" | "unpaid" | "partial"
//   }>
// }

// export function DataTable({ title, data }: DataTableProps) {
//   const [searchTerm, setSearchTerm] = useState("")
//   const [currentPage, setCurrentPage] = useState(1)
//   const itemsPerPage = 5

//   const filteredData = data.filter((item) => item.periode.toLowerCase().includes(searchTerm.toLowerCase()))

//   const totalPages = Math.ceil(filteredData.length / itemsPerPage)
//   const startIndex = (currentPage - 1) * itemsPerPage
//   const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage)

//   const getStatusBadge = (status: string) => {
//     switch (status) {
//       case "paid":
//         return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Lunas</Badge>
//       case "unpaid":
//         return <Badge variant="destructive">Belum Bayar</Badge>
//       case "partial":
//         return <Badge variant="secondary">Sebagian</Badge>
//       default:
//         return <Badge variant="outline">Unknown</Badge>
//     }
//   }

//   return (
//     <GlassCard className="p-6">
//       <div className="flex items-center justify-between mb-4">
//         <h3 className="text-lg font-semibold text-foreground">{title}</h3>
//         <Input
//           placeholder="Cari periode..."
//           value={searchTerm}
//           onChange={(e) => setSearchTerm(e.target.value)}
//           className="w-48 bg-card/50"
//         />
//       </div>

//       <div className="overflow-x-auto">
//         <table className="w-full">
//           <thead>
//             <tr className="border-b border-border/20">
//               <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Periode</th>
//               <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Total m³</th>
//               <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Tagihan</th>
//               <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Sudah Bayar</th>
//               <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Belum Bayar</th>
//               <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
//             </tr>
//           </thead>
//           <tbody>
//             {paginatedData.map((item) => (
//               <tr key={item.id} className="border-b border-border/10 hover:bg-muted/20">
//                 <td className="py-3 px-2 text-sm font-medium text-foreground">{item.periode}</td>
//                 <td className="py-3 px-2 text-sm text-right text-foreground">{item.totalM3.toLocaleString()} m³</td>
//                 <td className="py-3 px-2 text-sm text-right text-foreground">
//                   Rp {item.tagihan.toLocaleString("id-ID")}
//                 </td>
//                 <td className="py-3 px-2 text-sm text-right text-green-600">
//                   Rp {item.sudahBayar.toLocaleString("id-ID")}
//                 </td>
//                 <td className="py-3 px-2 text-sm text-right text-red-600">
//                   Rp {item.belumBayar.toLocaleString("id-ID")}
//                 </td>
//                 <td className="py-3 px-2 text-center">{getStatusBadge(item.status)}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       {totalPages > 1 && (
//         <div className="flex items-center justify-between mt-4">
//           <p className="text-sm text-muted-foreground">
//             Menampilkan {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredData.length)} dari{" "}
//             {filteredData.length} data
//           </p>
//           <div className="flex gap-2">
//             <Button
//               variant="outline"
//               size="sm"
//               onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
//               disabled={currentPage === 1}
//               className="bg-transparent"
//             >
//               Sebelumnya
//             </Button>
//             <Button
//               variant="outline"
//               size="sm"
//               onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
//               disabled={currentPage === totalPages}
//               className="bg-transparent"
//             >
//               Selanjutnya
//             </Button>
//           </div>
//         </div>
//       )}
//     </GlassCard>
//   )
// }

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
  tagihan: number; // bulan ini saja (dari API)
  sudahBayar: number; // total semua pembayaran
  // opsional dari API (tidak ditampilkan, hanya untuk perhitungan konsisten)
  tagihanLalu?: number; // carry-in: bisa + atau -
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

  // === Helper: hitung angka tampil per baris berdasar aturan kamu
  const calcDisplay = (row: Row) => {
    // tagihan bulan ini + carry (boleh negatif jika kredit)
    const tagihanNet = (row.tagihan || 0) + (row.tagihanLalu || 0);
    // untuk tampilan, jangan sampai minus
    const tagihanTampil = Math.max(tagihanNet, 0);

    const sudahBayarTampil = row.sudahBayar || 0; // semua pembayaran (boleh lebih)

    // belum bayar dihitung dari angka tampil (yang sudah di-cap 0)
    const belumBayarTampil = Math.max(tagihanTampil - sudahBayarTampil, 0);

    return { tagihanTampil, sudahBayarTampil, belumBayarTampil };
  };

  // === Totals (semua hasil filter)
  const totalsAll = useMemo(() => {
    const t = filteredData.reduce(
      (acc, it) => {
        const d = calcDisplay(it);
        acc.totalM3 += it.totalM3 || 0
        acc.sudahBayar += d.sudahBayarTampil;
        acc.belumBayar += d.belumBayarTampil;
        return acc;
      },
      { totalM3: 0, tagihan: 0, sudahBayar: 0, belumBayar: 0 }
    );
    // Pastikan identitas akuntansi berlaku di grand total
    t.tagihan = t.sudahBayar + t.belumBayar;
    return t;
  }, [filteredData]);

  // === Totals (halaman aktif)
  const totalsPage = useMemo(() => {
    const p = paginatedData.reduce(
      (acc, it) => {
        const d = calcDisplay(it);
        acc.totalM3 += it.totalM3 || 0
        acc.sudahBayar += d.sudahBayarTampil;
        acc.belumBayar += d.belumBayarTampil;
        return acc;
      },
      { totalM3: 0, tagihan: 0, sudahBayar: 0, belumBayar: 0 }
    );
    p.tagihan = p.sudahBayar + p.belumBayar;
    return p;
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
              <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                Tagihan (incl. Bln Lalu)
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
                  <td className="py-3 px-2 text-sm text-right text-foreground">
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
              <td className="py-3 px-2 text-sm text-foreground">
                Total
              </td>
              <td className="py-3 px-2 text-sm text-right text-muted-foreground">
                {totalsPage.totalM3.toLocaleString()} m³
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

      {/* Summary (semua hasil filter) */}
      {/* <div className="mt-4 rounded-lg border border-border/30 bg-muted/20 p-3">
        <p className="text-xs text-muted-foreground mb-2">
          Ringkasan Semua Hasil (setelah filter)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center justify-between rounded-md bg-background/60 px-3 py-2">
            <span className="text-muted-foreground">Total Tagihan</span>
            <strong className="text-foreground">
              {fmtRp(totalsAll.tagihan)}
            </strong>
          </div>
          <div className="flex items-center justify-between rounded-md bg-background/60 px-3 py-2">
            <span className="text-muted-foreground">Total Sudah Bayar</span>
            <strong className="text-green-700">
              {fmtRp(totalsAll.sudahBayar)}
            </strong>
          </div>
          <div className="flex items-center justify-between rounded-md bg-background/60 px-3 py-2">
            <span className="text-muted-foreground">Total Belum Bayar</span>
            <strong className="text-red-700">
              {fmtRp(totalsAll.belumBayar)}
            </strong>
          </div>
        </div>
      </div> */}

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

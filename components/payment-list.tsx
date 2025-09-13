// "use client"

// import { useState } from "react"
// import { GlassCard } from "./glass-card"
// import { Input } from "@/components/ui/input"
// import { Button } from "@/components/ui/button"
// import { Badge } from "@/components/ui/badge"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Eye, Download, Search, Filter } from "lucide-react"

// interface Payment {
//   id: string
//   customerId: string
//   customerName: string
//   periode: string
//   totalTagihan: number
//   denda: number
//   totalDenganDenda: number
//   nominalBayar: number
//   metodeBayar: string
//   tanggalBayar: string
//   status: "lunas" | "belum_lunas"
//   keterangan: string
//   buktiFile?: string
// }

// const mockPayments: Payment[] = [
//   {
//     id: "1",
//     customerId: "TB240001",
//     customerName: "Budi Santoso",
//     periode: "Agustus 2025",
//     totalTagihan: 77500,
//     denda: 0,
//     totalDenganDenda: 77500,
//     nominalBayar: 77500,
//     metodeBayar: "transfer",
//     tanggalBayar: "2025-09-05",
//     status: "lunas",
//     keterangan: "Pembayaran tepat waktu",
//     buktiFile: "bukti_001.jpg",
//   },
//   {
//     id: "2",
//     customerId: "TB240002",
//     customerName: "Siti Aminah",
//     periode: "Juli 2025",
//     totalTagihan: 72500,
//     denda: 5000,
//     totalDenganDenda: 77500,
//     nominalBayar: 50000,
//     metodeBayar: "tunai",
//     tanggalBayar: "2025-08-15",
//     status: "belum_lunas",
//     keterangan: "Pembayaran sebagian, sisa akan dibayar minggu depan",
//   },
//   {
//     id: "3",
//     customerId: "TB240003",
//     customerName: "Ahmad Rahman",
//     periode: "Juni 2025",
//     totalTagihan: 82500,
//     denda: 10000,
//     totalDenganDenda: 92500,
//     nominalBayar: 92500,
//     metodeBayar: "ewallet",
//     tanggalBayar: "2025-08-20",
//     status: "lunas",
//     keterangan: "Pembayaran dengan denda bulan kedua",
//     buktiFile: "bukti_003.pdf",
//   },
//   {
//     id: "4",
//     customerId: "TB240004",
//     customerName: "Dewi Sartika",
//     periode: "Agustus 2025",
//     totalTagihan: 85000,
//     denda: 0,
//     totalDenganDenda: 85000,
//     nominalBayar: 85000,
//     metodeBayar: "qris",
//     tanggalBayar: "2025-09-08",
//     status: "lunas",
//     keterangan: "Pembayaran via QRIS",
//     buktiFile: "bukti_004.jpg",
//   },
//   {
//     id: "5",
//     customerId: "TB240005",
//     customerName: "Joko Widodo",
//     periode: "Mei 2025",
//     totalTagihan: 87500,
//     denda: 10000,
//     totalDenganDenda: 97500,
//     nominalBayar: 97500,
//     metodeBayar: "transfer",
//     tanggalBayar: "2025-08-30",
//     status: "lunas",
//     keterangan: "Transfer bank BCA dengan denda",
//     buktiFile: "bukti_005.pdf",
//   },
// ]

// export function PaymentList() {
//   const [payments] = useState<Payment[]>(mockPayments)
//   const [searchTerm, setSearchTerm] = useState("")
//   const [statusFilter, setStatusFilter] = useState<string>("all")
//   const [currentPage, setCurrentPage] = useState(1)
//   const itemsPerPage = 5

//   const filteredPayments = payments.filter((payment) => {
//     const matchesSearch =
//       payment.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       payment.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       payment.periode.toLowerCase().includes(searchTerm.toLowerCase())

//     const matchesStatus = statusFilter === "all" || payment.status === statusFilter

//     return matchesSearch && matchesStatus
//   })

//   const totalPages = Math.ceil(filteredPayments.length / itemsPerPage)
//   const startIndex = (currentPage - 1) * itemsPerPage
//   const paginatedPayments = filteredPayments.slice(startIndex, startIndex + itemsPerPage)

//   const getStatusBadge = (status: string) => {
//     switch (status) {
//       case "lunas":
//         return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Lunas</Badge>
//       case "belum_lunas":
//         return <Badge variant="destructive">Belum Lunas</Badge>
//       default:
//         return <Badge variant="outline">Unknown</Badge>
//     }
//   }

//   const getMethodBadge = (method: string) => {
//     const methodLabels = {
//       tunai: "Tunai",
//       transfer: "Transfer",
//       ewallet: "E-Wallet",
//       qris: "QRIS",
//     }
//     return <Badge variant="outline">{methodLabels[method as keyof typeof methodLabels] || method}</Badge>
//   }

//   const handleViewProof = (payment: Payment) => {
//     if (payment.buktiFile) {
//       // In real app, this would open the file or show in modal
//       console.log("View proof:", payment.buktiFile)
//     }
//   }

//   const handleDownloadProof = (payment: Payment) => {
//     if (payment.buktiFile) {
//       // In real app, this would download the file
//       console.log("Download proof:", payment.buktiFile)
//     }
//   }

//   const lunasCount = payments.filter((p) => p.status === "lunas").length
//   const belumLunasCount = payments.filter((p) => p.status === "belum_lunas").length
//   const totalDiterima = payments.filter((p) => p.status === "lunas").reduce((sum, p) => sum + p.nominalBayar, 0)
//   const totalBelumDiterima = payments
//     .filter((p) => p.status === "belum_lunas")
//     .reduce((sum, p) => sum + (p.totalDenganDenda - p.nominalBayar), 0)

//   return (
//     <GlassCard className="p-6">
//       <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
//         <h3 className="text-xl font-semibold text-foreground">Riwayat Pelunasan</h3>
//         <div className="flex items-center gap-3 w-full sm:w-auto">
//           <div className="relative flex-1 sm:flex-none">
//             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
//             <Input
//               placeholder="Cari pembayaran..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="pl-10 w-full sm:w-64 bg-card/50"
//             />
//           </div>
//           <Select value={statusFilter} onValueChange={setStatusFilter}>
//             <SelectTrigger className="w-32 bg-card/50">
//               <Filter className="w-4 h-4 mr-2" />
//               <SelectValue />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="all">Semua</SelectItem>
//               <SelectItem value="lunas">Lunas</SelectItem>
//               <SelectItem value="belum_lunas">Belum Lunas</SelectItem>
//             </SelectContent>
//           </Select>
//         </div>
//       </div>

//       {/* Desktop Table */}
//       <div className="hidden lg:block overflow-x-auto">
//         <table className="w-full">
//           <thead>
//             <tr className="border-b border-border/20">
//               <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Tanggal</th>
//               <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Pelanggan</th>
//               <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Periode</th>
//               <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Tagihan</th>
//               <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Denda</th>
//               <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Dibayar</th>
//               <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Metode</th>
//               <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
//               <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Aksi</th>
//             </tr>
//           </thead>
//           <tbody>
//             {paginatedPayments.map((payment) => (
//               <tr key={payment.id} className="border-b border-border/10 hover:bg-muted/20">
//                 <td className="py-3 px-2 text-sm text-foreground">
//                   {new Date(payment.tanggalBayar).toLocaleDateString("id-ID")}
//                 </td>
//                 <td className="py-3 px-2">
//                   <div>
//                     <p className="text-sm font-medium text-foreground">{payment.customerName}</p>
//                     <p className="text-xs text-primary">{payment.customerId}</p>
//                   </div>
//                 </td>
//                 <td className="py-3 px-2 text-sm text-foreground">{payment.periode}</td>
//                 <td className="py-3 px-2 text-sm text-right text-foreground">
//                   Rp {payment.totalTagihan.toLocaleString("id-ID")}
//                 </td>
//                 <td className="py-3 px-2 text-sm text-right text-red-600">
//                   {payment.denda > 0 ? `Rp ${payment.denda.toLocaleString("id-ID")}` : "-"}
//                 </td>
//                 <td className="py-3 px-2 text-sm text-right font-medium text-foreground">
//                   Rp {payment.nominalBayar.toLocaleString("id-ID")}
//                 </td>
//                 <td className="py-3 px-2 text-center">{getMethodBadge(payment.metodeBayar)}</td>
//                 <td className="py-3 px-2 text-center">{getStatusBadge(payment.status)}</td>
//                 <td className="py-3 px-2">
//                   <div className="flex items-center justify-center gap-2">
//                     {payment.buktiFile && (
//                       <>
//                         <Button
//                           size="sm"
//                           variant="outline"
//                           onClick={() => handleViewProof(payment)}
//                           className="h-8 w-8 p-0 bg-transparent"
//                         >
//                           <Eye className="w-4 h-4" />
//                         </Button>
//                         <Button
//                           size="sm"
//                           variant="outline"
//                           onClick={() => handleDownloadProof(payment)}
//                           className="h-8 w-8 p-0 bg-transparent"
//                         >
//                           <Download className="w-4 h-4" />
//                         </Button>
//                       </>
//                     )}
//                   </div>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       {/* Mobile Cards */}
//       <div className="lg:hidden space-y-4">
//         {paginatedPayments.map((payment) => (
//           <div key={payment.id} className="p-4 bg-muted/20 rounded-lg space-y-3">
//             <div className="flex items-start justify-between">
//               <div>
//                 <p className="font-medium text-foreground">{payment.customerName}</p>
//                 <p className="text-sm text-primary font-medium">{payment.customerId}</p>
//                 <p className="text-xs text-muted-foreground">{payment.periode}</p>
//               </div>
//               <div className="text-right">
//                 {getStatusBadge(payment.status)}
//                 <p className="text-xs text-muted-foreground mt-1">
//                   {new Date(payment.tanggalBayar).toLocaleDateString("id-ID")}
//                 </p>
//               </div>
//             </div>

//             <div className="grid grid-cols-2 gap-2 text-sm">
//               <div>
//                 <span className="text-muted-foreground">Tagihan:</span>
//                 <p className="font-medium">Rp {payment.totalTagihan.toLocaleString("id-ID")}</p>
//               </div>
//               <div>
//                 <span className="text-muted-foreground">Denda:</span>
//                 <p className="font-medium text-red-600">
//                   {payment.denda > 0 ? `Rp ${payment.denda.toLocaleString("id-ID")}` : "Tidak ada"}
//                 </p>
//               </div>
//               <div>
//                 <span className="text-muted-foreground">Total + Denda:</span>
//                 <p className="font-medium">Rp {payment.totalDenganDenda.toLocaleString("id-ID")}</p>
//               </div>
//               <div>
//                 <span className="text-muted-foreground">Dibayar:</span>
//                 <p className="font-medium">Rp {payment.nominalBayar.toLocaleString("id-ID")}</p>
//               </div>
//             </div>

//             <div className="flex items-center justify-between pt-2 border-t border-border/20">
//               <div className="flex items-center gap-2">{getMethodBadge(payment.metodeBayar)}</div>
//               {payment.buktiFile && (
//                 <div className="flex gap-2">
//                   <Button
//                     size="sm"
//                     variant="outline"
//                     onClick={() => handleViewProof(payment)}
//                     className="bg-transparent"
//                   >
//                     <Eye className="w-4 h-4 mr-2" />
//                     Lihat
//                   </Button>
//                   <Button
//                     size="sm"
//                     variant="outline"
//                     onClick={() => handleDownloadProof(payment)}
//                     className="bg-transparent"
//                   >
//                     <Download className="w-4 h-4" />
//                   </Button>
//                 </div>
//               )}
//             </div>

//             {payment.keterangan && (
//               <div className="pt-2 border-t border-border/20">
//                 <p className="text-xs text-muted-foreground">Keterangan:</p>
//                 <p className="text-sm text-foreground">{payment.keterangan}</p>
//               </div>
//             )}
//           </div>
//         ))}
//       </div>

//       {/* Pagination */}
//       {totalPages > 1 && (
//         <div className="flex items-center justify-between mt-6">
//           <p className="text-sm text-muted-foreground">
//             Menampilkan {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredPayments.length)} dari{" "}
//             {filteredPayments.length} pembayaran
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

//       <div className="mt-6 pt-4 border-t border-border/20">
//         <h4 className="text-lg font-semibold text-foreground mb-4">Statistik Pembayaran Saat Ini</h4>
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//           <div className="text-center p-4 bg-green-100/50 rounded-lg">
//             <p className="text-2xl font-bold text-green-600">{lunasCount}</p>
//             <p className="text-sm text-muted-foreground">Lunas</p>
//           </div>
//           <div className="text-center p-4 bg-red-100/50 rounded-lg">
//             <p className="text-2xl font-bold text-red-600">{belumLunasCount}</p>
//             <p className="text-sm text-muted-foreground">Belum Lunas</p>
//           </div>
//           <div className="text-center p-4 bg-primary/10 rounded-lg">
//             <p className="text-2xl font-bold text-primary">Rp {totalDiterima.toLocaleString("id-ID")}</p>
//             <p className="text-sm text-muted-foreground">Total Diterima</p>
//           </div>
//           <div className="text-center p-4 bg-yellow-100/50 rounded-lg">
//             <p className="text-2xl font-bold text-yellow-600">Rp {totalBelumDiterima.toLocaleString("id-ID")}</p>
//             <p className="text-sm text-muted-foreground">Total Belum Diterima</p>
//           </div>
//         </div>
//       </div>
//     </GlassCard>
//   )
// }

"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { GlassCard } from "./glass-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Download, Search, Filter, RefreshCcw } from "lucide-react";

type Item = {
  id: string;
  tagihanId: string;
  pelangganId: string;
  pelangganKode: string;
  pelangganNama: string;
  periode: string;              // "YYYY-MM"
  totalTagihan: number;
  denda: number;
  totalDenganDenda: number;
  nominalBayar: number;         // nominal di transaksi ini
  metodeBayar: string;          // TUNAI|TRANSFER|EWALLET|QRIS
  tanggalBayar: string;         // ISO
  buktiUrl?: string | null;
  keterangan?: string | null;
  status: "lunas" | "belum_lunas";
};

type ApiResp = {
  ok: boolean;
  page: number;
  limit: number;
  total: number;
  items: Item[];
  message?: string;
};

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json());

function formatRp(n: number) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

export function PaymentList({ pelangganId }: { pelangganId?: string }) {
  // filters
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "lunas" | "belum_lunas">("all");
  const [metode, setMetode] = useState<"ALL" | "TUNAI" | "TRANSFER" | "EWALLET" | "QRIS">("ALL");
  const [periode, setPeriode] = useState(""); // "YYYY-MM" (opsional)

  const qs = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("limit", String(limit));
    if (q.trim()) sp.set("q", q.trim());
    if (status !== "all") sp.set("status", status);
    if (metode !== "ALL") sp.set("metode", metode);
    if (periode.trim()) sp.set("periode", periode.trim());
    if (pelangganId) sp.set("pelangganId", pelangganId);
    return sp.toString();
  }, [page, limit, q, status, metode, periode, pelangganId]);

  const { data, isLoading, error, mutate } = useSWR<ApiResp>(
    `/api/pelunasan/list?${qs}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const items = data?.ok ? data.items : [];
  const total = data?.ok ? data.total : 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const lunasCount = items.filter((p) => p.status === "lunas").length;
  const belumLunasCount = items.filter((p) => p.status === "belum_lunas").length;
  const totalDiterima = items.reduce((sum, p) => sum + p.nominalBayar, 0);
  const totalBelumDiterima = items.reduce(
    (sum, p) => sum + Math.max(0, p.totalDenganDenda - p.nominalBayar),
    0
  );

  const getStatusBadge = (s: Item["status"]) =>
    s === "lunas" ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Lunas</Badge>
    ) : (
      <Badge variant="destructive">Belum Lunas</Badge>
    );

  const getMethodBadge = (m: string) => {
    const map: Record<string, string> = {
      TUNAI: "Tunai",
      TRANSFER: "Transfer",
      EWALLET: "E-Wallet",
      QRIS: "QRIS",
    };
    return <Badge variant="outline">{map[m] || m}</Badge>;
  };

  const handleViewProof = (row: Item) => {
    if (row.buktiUrl) window.open(row.buktiUrl, "_blank");
  };
  const handleDownloadProof = (row: Item) => {
    if (row.buktiUrl) window.open(row.buktiUrl, "_blank");
  };

  return (
    <GlassCard className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h3 className="text-xl font-semibold text-foreground">Riwayat Pelunasan</h3>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama/kode/periode..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="pl-10 w-full sm:w-64 bg-card/50"
            />
          </div>

          {/* <Input
            type="month"
            value={periode}
            onChange={(e) => {
              setPeriode(e.target.value);
              setPage(1);
            }}
            className="w-[150px] bg-card/50"
            placeholder="Periode"
          /> */}

          <Select
            value={status}
            onValueChange={(v: any) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36 bg-card/50">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="lunas">Lunas</SelectItem>
              <SelectItem value="belum_lunas">Belum Lunas</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={metode}
            onValueChange={(v: any) => {
              setMetode(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36 bg-card/50">
              <SelectValue placeholder="Metode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Metode</SelectItem>
              <SelectItem value="TUNAI">Tunai</SelectItem>
              <SelectItem value="TRANSFER">Transfer</SelectItem>
              <SelectItem value="EWALLET">E-Wallet</SelectItem>
              <SelectItem value="QRIS">QRIS</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => mutate()} className="bg-transparent">
            <RefreshCcw className="w-4 h-4 mr-2" />
            Muat Ulang
          </Button>
        </div>
      </div>

      {/* states */}
      {isLoading && (
        <div className="p-4 text-sm text-muted-foreground">Memuat data…</div>
      )}
      {error && (
        <div className="p-4 text-sm text-red-600">
          Gagal memuat data. {data?.message ?? ""}
        </div>
      )}

      {/* Desktop Table */}
      {!isLoading && items.length > 0 && (
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/20">
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Tanggal</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Pelanggan</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Periode</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Tagihan</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Denda</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Dibayar</th>
                <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Metode</th>
                <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Bukti</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-border/10 hover:bg-muted/20">
                  <td className="py-3 px-2 text-sm text-foreground">
                    {new Date(p.tanggalBayar).toLocaleDateString("id-ID")}
                  </td>
                  <td className="py-3 px-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.pelangganNama}</p>
                      <p className="text-xs text-primary">{p.pelangganKode}</p>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-sm text-foreground">{p.periode}</td>
                  <td className="py-3 px-2 text-sm text-right text-foreground">
                    {formatRp(p.totalTagihan)}
                  </td>
                  <td className="py-3 px-2 text-sm text-right text-red-600">
                    {p.denda > 0 ? formatRp(p.denda) : "-"}
                  </td>
                  <td className="py-3 px-2 text-sm text-right font-medium text-foreground">
                    {formatRp(p.nominalBayar)}
                  </td>
                  <td className="py-3 px-2 text-center">{getMethodBadge(p.metodeBayar)}</td>
                  <td className="py-3 px-2 text-center">{getStatusBadge(p.status)}</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center justify-center gap-2">
                      {p.buktiUrl && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewProof(p)}
                            className="h-8 w-8 p-0 bg-transparent"
                            title="Lihat bukti"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadProof(p)}
                            className="h-8 w-8 p-0 bg-transparent"
                            title="Unduh bukti"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile Cards */}
      {!isLoading && items.length > 0 && (
        <div className="lg:hidden space-y-4">
          {items.map((p) => (
            <div key={p.id} className="p-4 bg-muted/20 rounded-lg space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-foreground">{p.pelangganNama}</p>
                  <p className="text-sm text-primary font-medium">{p.pelangganKode}</p>
                  <p className="text-xs text-muted-foreground">{p.periode}</p>
                </div>
                <div className="text-right">
                  {getStatusBadge(p.status)}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(p.tanggalBayar).toLocaleDateString("id-ID")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Tagihan:</span>
                  <p className="font-medium">{formatRp(p.totalTagihan)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Denda:</span>
                  <p className="font-medium text-red-600">
                    {p.denda > 0 ? formatRp(p.denda) : "Tidak ada"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total + Denda:</span>
                  <p className="font-medium">{formatRp(p.totalDenganDenda)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Dibayar:</span>
                  <p className="font-medium">{formatRp(p.nominalBayar)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/20">
                <div className="flex items-center gap-2">{getMethodBadge(p.metodeBayar)}</div>
                {p.buktiUrl && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewProof(p)}
                      className="bg-transparent"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Lihat
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadProof(p)}
                      className="bg-transparent"
                    >
                      <Download className="w-4 h-4" />
                      Unduh
                    </Button>
                  </div>
                )}
              </div>

              {p.keterangan && (
                <div className="pt-2 border-t border-border/20">
                  <p className="text-xs text-muted-foreground">Keterangan:</p>
                  <p className="text-sm text-foreground">{p.keterangan}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && items.length === 0 && (
        <div className="p-6 text-sm text-muted-foreground">Belum ada data pelunasan.</div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-muted-foreground">
            Menampilkan {(page - 1) * limit + 1}-
            {Math.min(page * limit, total)} dari {total} pembayaran
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="bg-transparent"
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="bg-transparent"
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 pt-4 border-top border-border/20">
        <h4 className="text-lg font-semibold text-foreground mb-4">Statistik (halaman ini)</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-100/50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{lunasCount}</p>
            <p className="text-sm text-muted-foreground">Lunas</p>
          </div>
          <div className="text-center p-4 bg-red-100/50 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{belumLunasCount}</p>
            <p className="text-sm text-muted-foreground">Belum Lunas</p>
          </div>
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <p className="text-2xl font-bold text-primary">{formatRp(totalDiterima)}</p>
            <p className="text-sm text-muted-foreground">Total Diterima</p>
          </div>
          <div className="text-center p-4 bg-yellow-100/50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">{formatRp(totalBelumDiterima)}</p>
            <p className="text-sm text-muted-foreground">Total Belum Diterima</p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

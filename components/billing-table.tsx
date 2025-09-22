// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { useRouter } from "next/navigation";
// import { GlassCard } from "./glass-card";
// import { Button } from "./ui/button";
// import { Badge } from "./ui/badge";
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
// import {
//   Eye,
//   FileText,
//   CreditCard,
//   Search,
//   ChevronLeft,
//   ChevronRight,
// } from "lucide-react";
// import { useMobile } from "@/hooks/use-mobile";
// import { Input } from "./ui/input";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "./ui/select";

// type Role = "ADMIN" | "PETUGAS" | "WARGA";

// type AuthUser = { id: string; name: string; role: Role; username?: string };

// type BillingItem = {
//   id: string;
//   periode: string;
//   pelangganId: string;
//   pelangganIdUser?: string | null;
//   pelangganKode?: string | null;
//   namaWarga: string;
//   zona: string;
//   meterAwal: number | null;
//   meterAkhir: number | null;
//   pemakaian: number | null;
//   tarifPerM3: number;
//   abonemen: number;
//   denda: number;
//   totalTagihan: number;
//   status: "lunas" | "belum-lunas";
//   statusVerif: "VERIFIED" | "UNVERIFIED";
//   tagihanBulanIni: number;
//   tagihanLalu: number;
//   tglJatuhTempo: string | Date;
//   tanggalBayar: string | Date | null;
//   jumlahBayar: number;
//   buktiPembayaran: string | null;
//   metode: string | null;
//   keterangan: string | null;
//   canInputPayment?: boolean;
// };

// type Option = { value: string; label: string };

// const ID_MONTHS = [
//   "Januari",
//   "Februari",
//   "Maret",
//   "April",
//   "Mei",
//   "Juni",
//   "Juli",
//   "Agustus",
//   "September",
//   "Oktober",
//   "November",
//   "Desember",
// ];
// const MONTH_INDEX: Record<string, number> = {
//   januari: 1,
//   februari: 2,
//   maret: 3,
//   april: 4,
//   mei: 5,
//   juni: 6,
//   juli: 7,
//   agustus: 8,
//   september: 9,
//   oktober: 10,
//   november: 11,
//   desember: 12,
// };
// function formatPeriode(p?: string | null): string {
//   if (!p) return "-";
//   const s = String(p).trim();
//   const m1 = /^(\d{4})-(\d{1,2})$/.exec(s);
//   if (m1) {
//     const y = m1[1];
//     const m = Math.min(Math.max(parseInt(m1[2], 10), 1), 12);
//     return `${ID_MONTHS[m - 1]} ${y}`;
//   }
//   const norm = s.replace("-", " ").replace(/\s+/, " ");
//   const [mon, y] = norm.split(" ");
//   if (mon && y && MONTH_INDEX[mon.toLowerCase()]) {
//     return `${ID_MONTHS[MONTH_INDEX[mon.toLowerCase()] - 1]} ${y}`;
//   }
//   return s;
// }

// export function BillingTable() {
//   const router = useRouter();
//   const isMobile = useMobile();

//   const [authUser, setAuthUser] = useState<AuthUser | null>(null);
//   const [items, setItems] = useState<BillingItem[]>([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [selected, setSelected] = useState<BillingItem | null>(null);

//   // ===== FILTERS =====
//   const [selectedPeriode, setSelectedPeriode] = useState<string>("semua"); // default "semua", nanti diset latest oleh fetch pertama
//   const [selectedStatus, setSelectedStatus] = useState<
//     "semua" | "lunas" | "belum-lunas"
//   >("semua");
//   const [searchQuery, setSearchQuery] = useState("");
//   const [debouncedQ, setDebouncedQ] = useState("");

//   const [periodeOptions, setPeriodeOptions] = useState<Option[]>([
//     // { value: "semua", label: "Semua Periode" },
//   ]);
//   const statusOptions: Option[] = [
//     { value: "semua", label: "Semua Status" },
//     { value: "belum-lunas", label: "Belum Lunas" },
//     { value: "lunas", label: "Lunas" },
//   ];

//   // ===== PAGINATION =====
//   const [page, setPage] = useState(1);
//   const [perPage, setPerPage] = useState(10);
//   const [total, setTotal] = useState(0);
//   const totalPages = Math.max(Math.ceil(total / perPage), 1);

//   // latest dari API (untuk enable tombol bayar & set default filter di UI)
//   const [latestPeriode, setLatestPeriode] = useState("");

//   const toApiStatus = (
//     s: "semua" | "lunas" | "belum-lunas"
//   ): string | undefined =>
//     s === "lunas" ? "lunas" : s === "belum-lunas" ? "belum-lunas" : undefined;

//   const fmtRp = (n: number) =>
//     new Intl.NumberFormat("id-ID", {
//       style: "currency",
//       currency: "IDR",
//       minimumFractionDigits: 0,
//     }).format(n || 0);

//   // helper format sisa kurang
//   function renderSisaKurang(n: number) {
//     if (n > 0) {
//       return <span className="text-red-600">Kurang Rp {fmtRp(n)}</span>;
//     }
//     if (n < 0) {
//       return <span className="text-green-600">Sisa Rp {fmtRp(-n)}</span>;
//     }
//     return <span className="text-green-600">Rp 0</span>;
//   }

//   const StatusBadge = ({ s }: { s: "lunas" | "belum-lunas" }) =>
//     s === "lunas" ? (
//       <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
//         Lunas
//       </Badge>
//     ) : (
//       <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
//         Belum Lunas
//       </Badge>
//     );

//   const VerifBadge = ({ v }: { v: "VERIFIED" | "UNVERIFIED" }) =>
//     v === "VERIFIED" ? (
//       <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
//         Terverifikasi
//       </Badge>
//     ) : (
//       <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
//         Menunggu Verifikasi
//       </Badge>
//     );

//   const canInput = (b: BillingItem) =>
//     b.canInputPayment ??
//     (latestPeriode && b.periode === latestPeriode && b.status !== "lunas");

//   // debounce pencarian
//   useEffect(() => {
//     const t = setTimeout(() => setDebouncedQ(searchQuery.trim()), 400);
//     return () => clearTimeout(t);
//   }, [searchQuery]);

//   // reset page saat filter berubah
//   useEffect(() => {
//     setPage(1);
//   }, [selectedPeriode, selectedStatus, debouncedQ]);

//   // ambil user
//   useEffect(() => {
//     if (typeof window === "undefined") return;
//     try {
//       const raw = localStorage.getItem("tb_user");
//       if (raw) setAuthUser(JSON.parse(raw));
//     } catch {}
//   }, []);

//   const refreshData = async () => {
//     setIsLoading(true);
//     try {
//       const headers: HeadersInit = authUser
//         ? { "x-user-id": authUser.id, "x-user-role": authUser.role }
//         : {};

//       const qs = new URLSearchParams();
//       // kalau user belum memilih periode (masih "semua"), biarkan kosong
//       if (selectedPeriode && selectedPeriode !== "semua")
//         qs.set("periode", selectedPeriode);
//       const apiStatus = toApiStatus(selectedStatus);
//       if (apiStatus) qs.set("status", apiStatus);
//       if (debouncedQ) qs.set("q", debouncedQ);
//       qs.set("page", String(page));
//       qs.set("perPage", String(perPage));

//       const res = await fetch(
//         `/api/tagihan${qs.toString() ? `?${qs.toString()}` : ""}`,
//         { cache: "no-store", headers }
//       );
//       const json = await res.json();

//       const data: BillingItem[] = json?.data ?? [];
//       setItems(data);
//       setTotal(json?.meta?.total ?? 0);

//       const periodes: string[] = json?.meta?.periodes ?? [];
//       const latest: string = json?.meta?.latestPeriode ?? "";
//       setLatestPeriode(latest);

//       // opsi dropdown (label human readable)
//       const options = [
//         // { value: "semua", label: "Semua Periode" },
//         ...periodes.map((p) => ({ value: p, label: formatPeriode(p) })),
//       ];
//       setPeriodeOptions(options);

//       // **default UI: pilih periode terakhir** saat pertama fetch / saat selection masih "semua"
//       if (!selectedPeriode || selectedPeriode === "semua") {
//         setSelectedPeriode(latest || "semua"); // update state → effect di bawah akan re-fetch dengan ?periode=latest
//       }
//     } catch (e) {
//       console.error("fetch tagihan error:", e);
//       setItems([]);
//       setTotal(0);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // fetch awal & saat filter/paging berubah
//   useEffect(() => {
//     if (authUser) refreshData();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [authUser, selectedPeriode, selectedStatus, debouncedQ, page, perPage]);

//   const rows = useMemo(() => items, [items]);

//   function PaginationBar() {
//     const from = (page - 1) * perPage + (rows.length ? 1 : 0);
//     const to = (page - 1) * perPage + rows.length;
//     return (
//       <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4">
//         <div className="text-sm text-muted-foreground">
//           Menampilkan{" "}
//           <span className="font-medium">{rows.length ? from : 0}</span>–
//           <span className="font-medium">{to}</span> dari{" "}
//           <span className="font-medium">{total}</span> data
//         </div>
//         <div className="flex items-center gap-2">
//           <Select
//             value={String(perPage)}
//             onValueChange={(v) => {
//               setPerPage(parseInt(v));
//               setPage(1);
//             }}
//           >
//             <SelectTrigger className="w-[120px]">
//               <SelectValue placeholder="per halaman" />
//             </SelectTrigger>
//             <SelectContent>
//               {[5, 10, 20, 50].map((n) => (
//                 <SelectItem key={n} value={String(n)}>
//                   {n}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//           <Button
//             variant="outline"
//             onClick={() => setPage((p) => Math.max(p - 1, 1))}
//             disabled={page <= 1}
//           >
//             <ChevronLeft className="h-4 w-4 mr-1" /> Sebelumnya
//           </Button>
//           <div className="text-sm w-16 text-center">
//             {page} / {Math.max(totalPages, 1)}
//           </div>
//           <Button
//             variant="outline"
//             onClick={() =>
//               setPage((p) => Math.min(p + 1, Math.max(totalPages, 1)))
//             }
//             disabled={page >= totalPages}
//           >
//             Selanjutnya <ChevronRight className="h-4 w-4 ml-1" />
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   function FiltersBar() {
//     return (
//       <GlassCard className="p-4">
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//           {/* Periode */}
//           <div className="space-y-2">
//             <label className="text-sm font-medium text-foreground">
//               Periode
//             </label>
//             <Select value={selectedPeriode} onValueChange={setSelectedPeriode}>
//               <SelectTrigger>
//                 <SelectValue placeholder="Pilih periode" />
//               </SelectTrigger>
//               <SelectContent>
//                 {periodeOptions.map((opt) => (
//                   <SelectItem key={opt.value} value={opt.value}>
//                     {opt.label}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </div>

//           {/* Status */}
//           <div className="space-y-2">
//             <label className="text-sm font-medium text-foreground">
//               Status
//             </label>
//             <Select
//               value={selectedStatus}
//               onValueChange={(v) => setSelectedStatus(v as any)}
//             >
//               <SelectTrigger>
//                 <SelectValue placeholder="Pilih status" />
//               </SelectTrigger>
//               <SelectContent>
//                 {statusOptions.map((opt) => (
//                   <SelectItem key={opt.value} value={opt.value}>
//                     {opt.label}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </div>

//           {/* Search */}
//           <div className="space-y-2">
//             <label className="text-sm font-medium text-foreground">
//               Cari Warga/Kode/Zona
//             </label>
//             <div className="relative">
//               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//               <Input
//                 placeholder="Nama warga, kode pelanggan, atau zona..."
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 className="pl-10"
//               />
//             </div>
//           </div>

//           {/* Actions */}
//           <div className="space-y-2">
//             <label className="text-sm font-medium text-foreground opacity-0">
//               Actions
//             </label>
//             <Button
//               onClick={refreshData}
//               className="w-full bg-transparent"
//               variant="outline"
//             >
//               Refresh Data
//             </Button>
//           </div>
//         </div>
//       </GlassCard>
//     );
//   }

//   // Loading
//   if (isLoading) {
//     return (
//       <>
//         <FiltersBar />
//         <GlassCard className="p-6 mt-4">
//           <div className="animate-pulse space-y-4">
//             <div className="h-4 bg-muted rounded w-1/4" />
//             <div className="space-y-2">
//               {[...Array(5)].map((_, i) => (
//                 <div key={i} className="h-16 bg-muted rounded" />
//               ))}
//             </div>
//           </div>
//         </GlassCard>
//       </>
//     );
//   }

//   // Empty
//   if (!authUser || rows.length === 0) {
//     return (
//       <>
//         <FiltersBar />
//         <GlassCard className="p-8 text-center mt-4">
//           <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
//           <h3 className="text-lg font-semibold text-foreground mb-2">
//             Tidak Ada Tagihan
//           </h3>
//           <p className="text-muted-foreground">
//             Tidak ada tagihan yang sesuai dengan filter/akses Anda.
//           </p>
//         </GlassCard>
//       </>
//     );
//   }

//   // Mobile
//   if (isMobile) {
//     return (
//       <div className="space-y-4">
//         <FiltersBar />
//         {rows.map((b) => (
//           <GlassCard key={b.id} className="p-4">
//             <div className="flex items-start justify-between mb-3">
//               <div>
//                 <h3 className="font-semibold text-foreground">
//                   Periode: {formatPeriode(b.periode)}
//                 </h3>
//                 <p className="text-sm text-muted-foreground">
//                   Nama Warga: {b.namaWarga}
//                 </p>
//                 <p className="text-sm text-muted-foreground">
//                   Zona/Blok: {b.zona}
//                 </p>
//               </div>
//               <StatusBadge s={b.status} />
//             </div>

//             <div className="space-y-3 mb-4">
//               <div className="grid grid-cols-3 gap-2 text-sm">
//                 <div>
//                   <span className="text-muted-foreground">Meter Awal:</span>
//                   <p className="font-medium">{b.meterAwal ?? "-"}</p>
//                 </div>
//                 <div>
//                   <span className="text-muted-foreground">Meter Akhir:</span>
//                   <p className="font-medium">{b.meterAkhir ?? "-"}</p>
//                 </div>
//                 <div>
//                   <span className="text-muted-foreground">Pemakaian:</span>
//                   <p className="font-medium">
//                     {b.pemakaian ?? "-"} {b.pemakaian != null ? "m³" : ""}
//                   </p>
//                 </div>
//               </div>

//               <div className="space-y-1 text-sm">
//                 <p className="text-muted-foreground">Rincian Tagihan:</p>
//                 <div className="pl-2 space-y-1">
//                   <p>
//                     • {b.pemakaian ?? 0} x {fmtRp(b.tarifPerM3)} ={" "}
//                     {fmtRp(b.tarifPerM3 * (b.pemakaian ?? 0))}
//                   </p>
//                   <p>• Abonemen = {fmtRp(b.abonemen)}</p>
//                   <hr />
//                   <p>• Tagihan Bulan Ini = {fmtRp(b.tagihanBulanIni)}</p>
//                   <p>• Tagihan Bulan Lalu (+/-) = {renderSisaKurang(b.tagihanLalu)}</p>
//                   {/* {!!b.denda && <p>• Denda = {fmtRp(b.denda)}</p>} */}
//                   <hr />
//                   <p className="font-semibold">
//                     • Total Tagihan = {fmtRp(b.totalTagihan)}
//                   </p>
//                 </div>
//               </div>
//             </div>

//             <div className="flex gap-2">
//               {b.buktiPembayaran && (
//                 <Button
//                   variant="outline"
//                   size="sm"
//                   onClick={() => setSelected(b)}
//                   className="flex-1"
//                 >
//                   <Eye className="h-4 w-4 mr-2" /> Lihat Bukti
//                 </Button>
//               )}
//               <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={() => router.push(`/input-pembayaran/${b.id}`)}
//                 className="flex-1"
//                 disabled={!canInput(b)}
//                 title={
//                   !canInput(b)
//                     ? "Pembayaran hanya untuk periode terakhir"
//                     : undefined
//                 }
//               >
//                 <CreditCard className="h-4 w-4 mr-2" /> Input Pembayaran
//               </Button>
//             </div>
//           </GlassCard>
//         ))}
//         <GlassCard className="overflow-hidden">
//           <PaginationBar />
//         </GlassCard>

//         {/* Modal Mobile */}
//         <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
//           <DialogContent className="max-w-md">
//             <DialogHeader>
//               <DialogTitle>Bukti Pembayaran</DialogTitle>
//             </DialogHeader>
//             {selected && (
//               <div className="space-y-4">
//                 <div className="flex items-center gap-2">
//                   <StatusBadge s={selected.status} />
//                   <VerifBadge v={selected.statusVerif} />
//                 </div>
//                 <div className="text-sm space-y-2">
//                   <p>
//                     <span className="font-medium">Nama:</span>{" "}
//                     {selected.namaWarga}
//                   </p>
//                   <p>
//                     <span className="font-medium">Periode:</span>{" "}
//                     {formatPeriode(selected.periode)}
//                   </p>
//                   <p>
//                     <span className="font-medium">Tagihan Bulan Lalu:</span>{" "}
//                     {renderSisaKurang(selected.tagihanLalu)}
//                   </p>
//                   <p>
//                     <span className="font-medium">Tagihan Bulan Ini:</span>{" "}
//                     {fmtRp(selected.totalTagihan)}
//                   </p>
//                   <p>
//                     <span className="font-medium">Jumlah Bayar:</span>{" "}
//                     {fmtRp(selected.jumlahBayar)}
//                   </p>
//                   {selected.tanggalBayar && (
//                     <p>
//                       <span className="font-medium">Tanggal Bayar:</span>{" "}
//                       {new Date(selected.tanggalBayar).toLocaleString("id-ID")}
//                     </p>
//                   )}
//                 </div>
//                 {selected.buktiPembayaran && (
//                   <div className="text-center">
//                     <img
//                       src={selected.buktiPembayaran || "/placeholder.svg"}
//                       alt="Bukti Pembayaran"
//                       className="max-w-full h-auto rounded-lg border"
//                     />
//                   </div>
//                 )}
//                 <div className="flex gap-2">
//                   <Button
//                     variant="outline"
//                     onClick={() => setSelected(null)}
//                     className="flex-1"
//                   >
//                     Tutup
//                   </Button>
//                 </div>
//               </div>
//             )}
//           </DialogContent>
//         </Dialog>
//       </div>
//     );
//   }

//   // Desktop
//   return (
//     <div className="space-y-4">
//       <FiltersBar />
//       <GlassCard className="overflow-hidden">
//         <div className="overflow-x-auto">
//           <table className="w-full">
//             <thead>
//               <tr className="border-b border-border/20">
//                 <th className="text-left p-4 font-semibold text-foreground">
//                   Info Tagihan
//                 </th>
//                 <th className="text-left p-4 font-semibold text-foreground">
//                   Meter & Pemakaian
//                 </th>
//                 <th className="text-left p-4 font-semibold text-foreground">
//                   Rincian Tagihan
//                 </th>
//                 <th className="text-left p-4 font-semibold text-foreground">
//                   Aksi
//                 </th>
//               </tr>
//             </thead>
//             <tbody>
//               {rows.map((b) => (
//                 <tr
//                   key={b.id}
//                   className="border-b border-border/10 hover:bg-white/5"
//                 >
//                   <td className="p-4">
//                     <div className="space-y-1">
//                       <p className="font-medium text-foreground">
//                         Periode: {formatPeriode(b.periode)}
//                       </p>
//                       <p className="text-sm text-muted-foreground">
//                         Nama Warga: {b.namaWarga}
//                       </p>
//                       <p className="text-sm text-muted-foreground">
//                         Zona/Blok: {b.zona}
//                       </p>
//                       <div className="mt-2 flex gap-2 items-center">
//                         <StatusBadge s={b.status} />
//                         <VerifBadge v={b.statusVerif} />
//                       </div>
//                     </div>
//                   </td>
//                   <td className="p-4">
//                     <div className="space-y-1 text-sm">
//                       <p>
//                         Meter Awal:{" "}
//                         <span className="font-medium">
//                           {b.meterAwal ?? "-"}
//                         </span>
//                       </p>
//                       <p>
//                         Meter Akhir:{" "}
//                         <span className="font-medium">
//                           {b.meterAkhir ?? "-"}
//                         </span>
//                       </p>
//                       <p>
//                         Pemakaian:{" "}
//                         <span className="font-medium">
//                           {b.pemakaian ?? "-"} {b.pemakaian != null ? "m³" : ""}
//                         </span>
//                       </p>
//                     </div>
//                   </td>
//                   <td className="p-4">
//                     <div className="space-y-1 text-sm">
//                       <p>
//                         {b.pemakaian ?? 0} x {fmtRp(b.tarifPerM3)} ={" "}
//                         {fmtRp(b.tarifPerM3 * (b.pemakaian ?? 0))}
//                       </p>
//                       <p>Abonemen = {fmtRp(b.abonemen)}</p>
//                       <hr />
//                       {/* {!!b.denda && <p>Denda = {fmtRp(b.denda)}</p>} */}
//                       <p>Tagihan Bulan Ini = {fmtRp(b.tagihanBulanIni)}</p>
//                       <p>Tagihan Bulan Lalu (+/-) = {renderSisaKurang(b.tagihanLalu)}</p>
//                       <hr />
//                       <p className="font-semibold">
//                         Total Tagihan = {fmtRp(b.totalTagihan)}
//                       </p>
//                     </div>
//                   </td>
//                   <td className="p-4">
//                     <div className="flex gap-2">
//                       {b.buktiPembayaran && (
//                         <Button
//                           variant="outline"
//                           size="sm"
//                           onClick={() => setSelected(b)}
//                         >
//                           <Eye className="h-4 w-4 mr-2" /> Lihat Bukti
//                         </Button>
//                       )}
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => router.push(`/input-pembayaran/${b.id}`)}
//                         disabled={!canInput(b)}
//                         title={
//                           !canInput(b)
//                             ? "Pembayaran hanya untuk periode terakhir"
//                             : undefined
//                         }
//                       >
//                         <CreditCard className="h-4 w-4 mr-2" /> Input Pembayaran
//                       </Button>
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>

//         <PaginationBar />

//         {/* Modal Desktop */}
//         <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
//           <DialogContent className="max-w-md">
//             <DialogHeader>
//               <DialogTitle>Bukti Pembayaran</DialogTitle>
//             </DialogHeader>
//             {selected && (
//               <div className="space-y-4">
//                 <div className="flex items-center gap-2">
//                   <StatusBadge s={selected.status} />
//                   <VerifBadge v={selected.statusVerif} />
//                 </div>
//                 <div className="text-sm space-y-2">
//                   <p>
//                     <span className="font-medium">Nama:</span>{" "}
//                     {selected.namaWarga}
//                   </p>
//                   <p>
//                     <span className="font-medium">Periode:</span>{" "}
//                     {formatPeriode(selected.periode)}
//                   </p>
//                   <p>
//                     <span className="font-medium">Tagihan Bulan Lalu:</span>{" "}
//                     {renderSisaKurang(selected.tagihanLalu)}
//                   </p>
//                   <p>
//                     <span className="font-medium">Tagihan Bulan Ini:</span>{" "}
//                     {fmtRp(selected.totalTagihan)}
//                   </p>
//                   <p>
//                     <span className="font-medium">Jumlah Bayar:</span>{" "}
//                     {fmtRp(selected.jumlahBayar)}
//                   </p>
//                   {selected.tanggalBayar && (
//                     <p>
//                       <span className="font-medium">Tanggal Bayar:</span>{" "}
//                       {new Date(selected.tanggalBayar).toLocaleString("id-ID")}
//                     </p>
//                   )}
//                 </div>
//                 {selected.buktiPembayaran && (
//                   <div className="text-center">
//                     <img
//                       src={selected.buktiPembayaran || "/placeholder.svg"}
//                       alt="Bukti Pembayaran"
//                       className="max-w-full h-auto rounded-lg border"
//                     />
//                   </div>
//                 )}
//                 <div className="flex gap-2">
//                   <Button
//                     variant="outline"
//                     onClick={() => setSelected(null)}
//                     className="flex-1"
//                   >
//                     Tutup
//                   </Button>
//                 </div>
//               </div>
//             )}
//           </DialogContent>
//         </Dialog>
//       </GlassCard>
//     </div>
//   );
// }

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "./glass-card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  Eye,
  FileText,
  CreditCard,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type Role = "ADMIN" | "PETUGAS" | "WARGA";

type AuthUser = { id: string; name: string; role: Role; username?: string };

type BillingItem = {
  id: string;
  periode: string;
  pelangganId: string;
  pelangganIdUser?: string | null;
  pelangganKode?: string | null;
  namaWarga: string;
  zona: string;
  meterAwal: number | null;
  meterAkhir: number | null;
  pemakaian: number | null;
  tarifPerM3: number;
  abonemen: number;
  denda: number;
  totalTagihan: number; // sudah termasuk carry (+/-) dari bulan lalu
  status: "lunas" | "belum-lunas"; // TIDAK lagi dipakai untuk tampilan, hanya kompat lama
  statusVerif: "VERIFIED" | "UNVERIFIED";
  tagihanBulanIni: number;
  tagihanLalu: number; // (+/-) carry
  tglJatuhTempo: string | Date;
  tanggalBayar: string | Date | null;
  jumlahBayar: number; // total pembayaran yang sudah masuk (akumulasi)
  buktiPembayaran: string | null;
  metode: string | null;
  keterangan: string | null;
  canInputPayment?: boolean;
};

type Option = { value: string; label: string };

const ID_MONTHS = [
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
const MONTH_INDEX: Record<string, number> = {
  januari: 1,
  februari: 2,
  maret: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  agustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  desember: 12,
};
function formatPeriode(p?: string | null): string {
  if (!p) return "-";
  const s = String(p).trim();
  const m1 = /^(\d{4})-(\d{1,2})$/.exec(s);
  if (m1) {
    const y = m1[1];
    const m = Math.min(Math.max(parseInt(m1[2], 10), 1), 12);
    return `${ID_MONTHS[m - 1]} ${y}`;
  }
  const norm = s.replace("-", " ").replace(/\s+/, " ");
  const [mon, y] = norm.split(" ");
  if (mon && y && MONTH_INDEX[mon.toLowerCase()]) {
    return `${ID_MONTHS[MONTH_INDEX[mon.toLowerCase()] - 1]} ${y}`;
  }
  return s;
}

export function BillingTable() {
  const router = useRouter();
  const isMobile = useMobile();

  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [items, setItems] = useState<BillingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<BillingItem | null>(null);

  // ===== FILTERS =====
  const [selectedPeriode, setSelectedPeriode] = useState<string>("semua"); // default "semua", nanti diset latest oleh fetch pertama
  const [selectedStatus, setSelectedStatus] = useState<
    "semua" | "lunas" | "belum-lunas"
  >("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  const [periodeOptions, setPeriodeOptions] = useState<Option[]>([]);
  const statusOptions: Option[] = [
    { value: "semua", label: "Semua Status" },
    { value: "belum-lunas", label: "Belum Lunas" },
    { value: "lunas", label: "Lunas" },
  ];

  // ===== PAGINATION =====
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(Math.ceil(total / perPage), 1);

  // latest dari API (untuk enable tombol bayar & set default filter di UI)
  const [latestPeriode, setLatestPeriode] = useState("");

  // ===== FORMAT & HELPER =====
  const fmtRp = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n || 0);

  // Status pelunasan HANYA dari perbandingan totalTagihan vs jumlahBayar
  const getPelunasanStatus = (b: BillingItem): "lunas" | "belum-lunas" => {
    const total = Math.round(Number(b.totalTagihan || 0));
    const paid = Math.round(Number(b.jumlahBayar || 0));
    return paid >= total ? "lunas" : "belum-lunas";
  };

  // text (+/-) carry bulan lalu (rapikan agar tidak dobel "Rp")
  function renderSisaKurang(n: number) {
    if (n > 0) {
      return <span className="text-red-600">Kurang {fmtRp(n)}</span>;
    }
    if (n < 0) {
      return <span className="text-green-600">Sisa {fmtRp(-n)}</span>;
    }
    return <span className="text-green-600">{fmtRp(0)}</span>;
  }

  const StatusBadge = ({ s }: { s: "lunas" | "belum-lunas" }) =>
    s === "lunas" ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        Lunas
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
        Belum Lunas
      </Badge>
    );

  const VerifBadge = ({ v }: { v: "VERIFIED" | "UNVERIFIED" }) =>
    v === "VERIFIED" ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        Terverifikasi
      </Badge>
    ) : (
      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
        Menunggu Verifikasi
      </Badge>
    );

  // tombol input pembayaran: tetap batasi hanya periode terakhir
  const canInput = (b: BillingItem) => {
    // const pelunasan = getPelunasanStatus(b);
    return (
      (b.canInputPayment ??
        (latestPeriode && b.periode === latestPeriode))
    );
  };

  // status untuk FILTER API (biar kompatibel dgn backend)
  const toApiStatus = (
    s: "semua" | "lunas" | "belum-lunas"
  ): string | undefined =>
    s === "lunas" ? "lunas" : s === "belum-lunas" ? "belum-lunas" : undefined;

  // ====== EFFECTS ======

  // debounce pencarian
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQuery.trim()), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // reset page saat filter berubah
  useEffect(() => {
    setPage(1);
  }, [selectedPeriode, selectedStatus, debouncedQ]);

  // ambil user
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("tb_user");
      if (raw) setAuthUser(JSON.parse(raw));
    } catch {}
  }, []);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const headers: HeadersInit = authUser
        ? { "x-user-id": authUser.id, "x-user-role": authUser.role }
        : {};

      const qs = new URLSearchParams();
      if (selectedPeriode && selectedPeriode !== "semua")
        qs.set("periode", selectedPeriode);
      const apiStatus = toApiStatus(selectedStatus);
      if (apiStatus) qs.set("status", apiStatus);
      if (debouncedQ) qs.set("q", debouncedQ);
      qs.set("page", String(page));
      qs.set("perPage", String(perPage));

      const res = await fetch(
        `/api/tagihan${qs.toString() ? `?${qs.toString()}` : ""}`,
        { cache: "no-store", headers }
      );
      const json = await res.json();

      const data: BillingItem[] = json?.data ?? [];
      setItems(data);
      setTotal(json?.meta?.total ?? 0);

      const periodes: string[] = json?.meta?.periodes ?? [];
      const latest: string = json?.meta?.latestPeriode ?? "";
      setLatestPeriode(latest);

      // opsi dropdown periode (label human readable)
      const options = [
        ...periodes.map((p) => ({ value: p, label: formatPeriode(p) })),
      ];
      setPeriodeOptions(options);

      // default: pilih periode terakhir di UI jika masih "semua"
      if (!selectedPeriode || selectedPeriode === "semua") {
        setSelectedPeriode(latest || "semua");
      }
    } catch (e) {
      console.error("fetch tagihan error:", e);
      setItems([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  };

  // fetch awal & saat filter/paging berubah
  useEffect(() => {
    if (authUser) refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, selectedPeriode, selectedStatus, debouncedQ, page, perPage]);

  const rows = useMemo(() => items, [items]);

  function PaginationBar() {
    const from = (page - 1) * perPage + (rows.length ? 1 : 0);
    const to = (page - 1) * perPage + rows.length;
    return (
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4">
        <div className="text-sm text-muted-foreground">
          Menampilkan{" "}
          <span className="font-medium">{rows.length ? from : 0}</span>–
          <span className="font-medium">{to}</span> dari{" "}
          <span className="font-medium">{total}</span> data
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(perPage)}
            onValueChange={(v) => {
              setPerPage(parseInt(v));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="per halaman" />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 20, 50].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Sebelumnya
          </Button>
          <div className="text-sm w-16 text-center">
            {page} / {Math.max(totalPages, 1)}
          </div>
          <Button
            variant="outline"
            onClick={() =>
              setPage((p) => Math.min(p + 1, Math.max(totalPages, 1)))
            }
            disabled={page >= totalPages}
          >
            Selanjutnya <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  function FiltersBar() {
    return (
      <GlassCard className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Periode */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Periode
            </label>
            <Select value={selectedPeriode} onValueChange={setSelectedPeriode}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih periode" />
              </SelectTrigger>
              <SelectContent>
                {periodeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Status
            </label>
            <Select
              value={selectedStatus}
              onValueChange={(v) => setSelectedStatus(v as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Cari Warga/Kode/Zona
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nama warga, kode pelanggan, atau zona..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground opacity-0">
              Actions
            </label>
            <Button
              onClick={refreshData}
              className="w-full bg-transparent"
              variant="outline"
            >
              Refresh Data
            </Button>
          </div>
        </div>
      </GlassCard>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <>
        <FiltersBar />
        <GlassCard className="p-6 mt-4">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded" />
              ))}
            </div>
          </div>
        </GlassCard>
      </>
    );
  }

  // Empty
  if (!authUser || rows.length === 0) {
    return (
      <>
        <FiltersBar />
        <GlassCard className="p-8 text-center mt-4">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Tidak Ada Tagihan
          </h3>
          <p className="text-muted-foreground">
            Tidak ada tagihan yang sesuai dengan filter/akses Anda.
          </p>
        </GlassCard>
      </>
    );
  }

  // Mobile
  if (isMobile) {
    return (
      <div className="space-y-4">
        <FiltersBar />
        {rows.map((b) => {
          const pelunasan = getPelunasanStatus(b);
          return (
            <GlassCard key={b.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">
                    Periode: {formatPeriode(b.periode)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Nama Warga: {b.namaWarga}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Zona/Blok: {b.zona}
                  </p>
                </div>
                <StatusBadge s={pelunasan} />
              </div>

              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Meter Awal:</span>
                    <p className="font-medium">{b.meterAwal ?? "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Meter Akhir:</span>
                    <p className="font-medium">{b.meterAkhir ?? "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pemakaian:</span>
                    <p className="font-medium">
                      {b.pemakaian ?? "-"} {b.pemakaian != null ? "m³" : ""}
                    </p>
                  </div>
                </div>

                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">Rincian Tagihan:</p>
                  <div className="pl-2 space-y-1">
                    <p>
                      • {b.pemakaian ?? 0} x {fmtRp(b.tarifPerM3)} ={" "}
                      {fmtRp(b.tarifPerM3 * (b.pemakaian ?? 0))}
                    </p>
                    <p>• Abonemen = {fmtRp(b.abonemen)}</p>
                    <hr />
                    <p>• Tagihan Bulan Ini = {fmtRp(b.tagihanBulanIni)}</p>
                    <p>
                      • Tagihan Bulan Lalu (+/-) = {renderSisaKurang(b.tagihanLalu)}
                    </p>
                    {/* {!!b.denda && <p>• Denda = {fmtRp(b.denda)}</p>} */}
                    <hr />
                    <p className="font-semibold">
                      • Total Tagihan = {fmtRp(b.totalTagihan)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {b.buktiPembayaran && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelected(b)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" /> Lihat Bukti
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/input-pembayaran/${b.id}`)}
                  className="flex-1"
                  disabled={!canInput(b)}
                  title={
                    !canInput(b)
                      ? "Pembayaran hanya untuk periode terakhir"
                      : undefined
                  }
                >
                  <CreditCard className="h-4 w-4 mr-2" /> Input Pembayaran
                </Button>
              </div>
            </GlassCard>
          );
        })}
        <GlassCard className="overflow-hidden">
          <PaginationBar />
        </GlassCard>

        {/* Modal Mobile */}
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Bukti Pembayaran</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <StatusBadge s={getPelunasanStatus(selected)} />
                  <VerifBadge v={selected.statusVerif} />
                </div>
                <div className="text-sm space-y-2">
                  <p>
                    <span className="font-medium">Nama:</span>{" "}
                    {selected.namaWarga}
                  </p>
                  <p>
                    <span className="font-medium">Periode:</span>{" "}
                    {formatPeriode(selected.periode)}
                  </p>
                  <p>
                    <span className="font-medium">Tagihan Bulan Lalu:</span>{" "}
                    {renderSisaKurang(selected.tagihanLalu)}
                  </p>
                  <p>
                    <span className="font-medium">Total Tagihan:</span>{" "}
                    {fmtRp(selected.totalTagihan)}
                  </p>
                  <p>
                    <span className="font-medium">Jumlah Bayar:</span>{" "}
                    {fmtRp(selected.jumlahBayar)}
                  </p>
                  {selected.tanggalBayar && (
                    <p>
                      <span className="font-medium">Tanggal Bayar:</span>{" "}
                      {new Date(selected.tanggalBayar).toLocaleString("id-ID")}
                    </p>
                  )}
                </div>
                {selected.buktiPembayaran && (
                  <div className="text-center">
                    <img
                      src={selected.buktiPembayaran || "/placeholder.svg"}
                      alt="Bukti Pembayaran"
                      className="max-w-full h-auto rounded-lg border"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelected(null)}
                    className="flex-1"
                  >
                    Tutup
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Desktop
  return (
    <div className="space-y-4">
      <FiltersBar />
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/20">
                <th className="text-left p-4 font-semibold text-foreground">
                  Info Tagihan
                </th>
                <th className="text-left p-4 font-semibold text-foreground">
                  Meter & Pemakaian
                </th>
                <th className="text-left p-4 font-semibold text-foreground">
                  Rincian Tagihan
                </th>
                <th className="text-left p-4 font-semibold text-foreground">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const pelunasan = getPelunasanStatus(b);
                return (
                  <tr
                    key={b.id}
                    className="border-b border-border/10 hover:bg-white/5"
                  >
                    <td className="p-4">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">
                          Periode: {formatPeriode(b.periode)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Nama Warga: {b.namaWarga}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Zona/Blok: {b.zona}
                        </p>
                        <div className="mt-2 flex gap-2 items-center">
                          <StatusBadge s={pelunasan} />
                          <VerifBadge v={b.statusVerif} />
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1 text-sm">
                        <p>
                          Meter Awal:{" "}
                          <span className="font-medium">
                            {b.meterAwal ?? "-"}
                          </span>
                        </p>
                        <p>
                          Meter Akhir:{" "}
                          <span className="font-medium">
                            {b.meterAkhir ?? "-"}
                          </span>
                        </p>
                        <p>
                          Pemakaian:{" "}
                          <span className="font-medium">
                            {b.pemakaian ?? "-"}{" "}
                            {b.pemakaian != null ? "m³" : ""}
                          </span>
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1 text-sm">
                        <p>
                          {b.pemakaian ?? 0} x {fmtRp(b.tarifPerM3)} ={" "}
                          {fmtRp(b.tarifPerM3 * (b.pemakaian ?? 0))}
                        </p>
                        <p>Abonemen = {fmtRp(b.abonemen)}</p>
                        <hr />
                        {/* {!!b.denda && <p>Denda = {fmtRp(b.denda)}</p>} */}
                        <p>Tagihan Bulan Ini = {fmtRp(b.tagihanBulanIni)}</p>
                        <p>
                          Tagihan Bulan Lalu (+/-) = {renderSisaKurang(b.tagihanLalu)}
                        </p>
                        <hr />
                        <p className="font-semibold">
                          Total Tagihan = {fmtRp(b.totalTagihan)}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {b.buktiPembayaran && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelected(b)}
                          >
                            <Eye className="h-4 w-4 mr-2" /> Lihat Bukti
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/input-pembayaran/${b.id}`)}
                          disabled={!canInput(b)}
                          title={
                            !canInput(b)
                              ? "Pembayaran hanya untuk periode terakhir"
                              : undefined
                          }
                        >
                          <CreditCard className="h-4 w-4 mr-2" /> Input Pembayaran
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <PaginationBar />

        {/* Modal Desktop */}
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Bukti Pembayaran</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <StatusBadge s={getPelunasanStatus(selected)} />
                  <VerifBadge v={selected.statusVerif} />
                </div>
                <div className="text-sm space-y-2">
                  <p>
                    <span className="font-medium">Nama:</span>{" "}
                    {selected.namaWarga}
                  </p>
                  <p>
                    <span className="font-medium">Periode:</span>{" "}
                    {formatPeriode(selected.periode)}
                  </p>
                  <p>
                    <span className="font-medium">Tagihan Bulan Lalu:</span>{" "}
                    {renderSisaKurang(selected.tagihanLalu)}
                  </p>
                  <p>
                    <span className="font-medium">Total Tagihan:</span>{" "}
                    {fmtRp(selected.totalTagihan)}
                  </p>
                  <p>
                    <span className="font-medium">Jumlah Bayar:</span>{" "}
                    {fmtRp(selected.jumlahBayar)}
                  </p>
                  {selected.tanggalBayar && (
                    <p>
                      <span className="font-medium">Tanggal Bayar:</span>{" "}
                      {new Date(selected.tanggalBayar).toLocaleString("id-ID")}
                    </p>
                  )}
                </div>
                {selected.buktiPembayaran && (
                  <div className="text-center">
                    <img
                      src={selected.buktiPembayaran || "/placeholder.svg"}
                      alt="Bukti Pembayaran"
                      className="max-w-full h-auto rounded-lg border"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelected(null)}
                    className="flex-1"
                  >
                    Tutup
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </GlassCard>
    </div>
  );
}
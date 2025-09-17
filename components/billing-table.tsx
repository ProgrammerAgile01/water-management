// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { useRouter } from "next/navigation";
// import { GlassCard } from "./glass-card";
// import { Button } from "./ui/button";
// import { Badge } from "./ui/badge";
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
// import { Eye, FileText, CreditCard, Search } from "lucide-react";
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

// type AuthUser = {
//   id: string;
//   name: string;
//   role: Role;
//   username?: string;
// };

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
//   tglJatuhTempo: string | Date;

//   tanggalBayar: string | Date | null;
//   buktiPembayaran: string | null;
//   metode: string | null;
//   keterangan: string | null;
// };

// export function BillingTable() {
//   const router = useRouter();
//   const isMobile = useMobile();

//   const [authUser, setAuthUser] = useState<AuthUser | null>(null);
//   const [items, setItems] = useState<BillingItem[]>([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [selected, setSelected] = useState<BillingItem | null>(null);

//   // ambil user dari localStorage
//   useEffect(() => {
//     if (typeof window === "undefined") return;
//     try {
//       const raw = localStorage.getItem("tb_user");
//       if (raw) setAuthUser(JSON.parse(raw));
//     } catch {}
//   }, []);

//   // fetch langsung dari komponen
//   useEffect(() => {
//     const fetchData = async () => {
//       setIsLoading(true);
//       try {
//         // jika kamu ingin scope WARGA di server, kirim header:
//         const headers: HeadersInit = authUser
//           ? { "x-user-id": authUser.id, "x-user-role": authUser.role }
//           : {};

//         const res = await fetch(`/api/tagihan`, {
//           cache: "no-store",
//           headers,
//         });
//         const json = await res.json();
//         setItems(json?.data ?? []);
//       } catch (e) {
//         console.error("fetch tagihan error:", e);
//         setItems([]);
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     fetchData();
//   }, [authUser]);

//   // filter di client sesuai role
//   const rows = useMemo(() => {
//     if (!authUser) return [];
//     if (authUser.role === "ADMIN" || authUser.role === "PETUGAS") return items;
//     return items.filter((b) => b.pelangganIdUser === authUser.id);
//   }, [authUser, items]);

//   const fmtRp = (n: number) =>
//     new Intl.NumberFormat("id-ID", {
//       style: "currency",
//       currency: "IDR",
//       minimumFractionDigits: 0,
//     }).format(n || 0);

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

//   // skeleton
//   if (isLoading) {
//     return (
//       <>
//         {/* FILTERS */}
//         <GlassCard className="p-4">
//           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//             {/* Periode */}
//             <div className="space-y-2">
//               <label className="text-sm font-medium text-foreground">
//                 Periode Tagihan
//               </label>
//               <Select
//                 value={selectedPeriode}
//                 onValueChange={setSelectedPeriode}
//               >
//                 <SelectTrigger>
//                   <SelectValue placeholder="Pilih periode" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {periodeOptions.map((opt) => (
//                     <SelectItem key={opt.value} value={opt.value}>
//                       {opt.label}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>

//             {/* Status */}
//             <div className="space-y-2">
//               <label className="text-sm font-medium text-foreground">
//                 Status Tagihan
//               </label>
//               <Select value={selectedStatus} onValueChange={setSelectedStatus}>
//                 <SelectTrigger>
//                   <SelectValue placeholder="Pilih status" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {statusOptions.map((opt) => (
//                     <SelectItem key={opt.value} value={opt.value}>
//                       {opt.label}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>

//             {/* Search */}
//             <div className="space-y-2">
//               <label className="text-sm font-medium text-foreground">
//                 Cari Warga/Zona
//               </label>
//               <div className="relative">
//                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//                 <Input
//                   placeholder="Nama warga atau zona..."
//                   value={searchQuery}
//                   onChange={(e) => setSearchQuery(e.target.value)}
//                   className="pl-10"
//                 />
//               </div>
//             </div>

//             {/* Actions */}
//             <div className="space-y-2">
//               <label className="text-sm font-medium text-foreground opacity-0">
//                 Actions
//               </label>
//               <Button
//                 onClick={refreshData}
//                 className="w-full bg-transparent"
//                 variant="outline"
//               >
//                 Refresh Data
//               </Button>
//             </div>
//           </div>
//         </GlassCard>

//         {/* SKELETON */}
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

//   // kosong
//   if (!authUser || rows.length === 0) {
//     return (
//       <>
//         {/* FILTERS */}
//         <GlassCard className="p-4">
//           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//             {/* Periode */}
//             <div className="space-y-2">
//               <label className="text-sm font-medium text-foreground">
//                 Periode Tagihan
//               </label>
//               <Select
//                 value={selectedPeriode}
//                 onValueChange={setSelectedPeriode}
//               >
//                 <SelectTrigger>
//                   <SelectValue placeholder="Pilih periode" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {periodeOptions.map((opt) => (
//                     <SelectItem key={opt.value} value={opt.value}>
//                       {opt.label}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>

//             {/* Status */}
//             <div className="space-y-2">
//               <label className="text-sm font-medium text-foreground">
//                 Status Tagihan
//               </label>
//               <Select value={selectedStatus} onValueChange={setSelectedStatus}>
//                 <SelectTrigger>
//                   <SelectValue placeholder="Pilih status" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {statusOptions.map((opt) => (
//                     <SelectItem key={opt.value} value={opt.value}>
//                       {opt.label}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>

//             {/* Search */}
//             <div className="space-y-2">
//               <label className="text-sm font-medium text-foreground">
//                 Cari Warga/Zona
//               </label>
//               <div className="relative">
//                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//                 <Input
//                   placeholder="Nama warga atau zona..."
//                   value={searchQuery}
//                   onChange={(e) => setSearchQuery(e.target.value)}
//                   className="pl-10"
//                 />
//               </div>
//             </div>

//             {/* Actions */}
//             <div className="space-y-2">
//               <label className="text-sm font-medium text-foreground opacity-0">
//                 Actions
//               </label>
//               <Button
//                 onClick={refreshData}
//                 className="w-full bg-transparent"
//                 variant="outline"
//               >
//                 Refresh Data
//               </Button>
//             </div>
//           </div>
//         </GlassCard>

//         {/* EMPTY */}
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

//   // ===== MOBILE =====
//   if (isMobile) {
//     return (
//       <div className="space-y-4">
//         {/* FILTERS */}
//         <GlassCard className="p-4">
//           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//             {/* Periode */}
//             <div className="space-y-2">
//               <label className="text-sm font-medium text-foreground">
//                 Periode Tagihan
//               </label>
//               <Select
//                 value={selectedPeriode}
//                 onValueChange={setSelectedPeriode}
//               >
//                 <SelectTrigger>
//                   <SelectValue placeholder="Pilih periode" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {periodeOptions.map((opt) => (
//                     <SelectItem key={opt.value} value={opt.value}>
//                       {opt.label}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>

//             {/* Status */}
//             <div className="space-y-2">
//               <label className="text-sm font-medium text-foreground">
//                 Status Tagihan
//               </label>
//               <Select value={selectedStatus} onValueChange={setSelectedStatus}>
//                 <SelectTrigger>
//                   <SelectValue placeholder="Pilih status" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {statusOptions.map((opt) => (
//                     <SelectItem key={opt.value} value={opt.value}>
//                       {opt.label}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>

//             {/* Search */}
//             <div className="space-y-2">
//               <label className="text-sm font-medium text-foreground">
//                 Cari Warga/Zona
//               </label>
//               <div className="relative">
//                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//                 <Input
//                   placeholder="Nama warga atau zona..."
//                   value={searchQuery}
//                   onChange={(e) => setSearchQuery(e.target.value)}
//                   className="pl-10"
//                 />
//               </div>
//             </div>

//             {/* Actions */}
//             <div className="space-y-2">
//               <label className="text-sm font-medium text-foreground opacity-0">
//                 Actions
//               </label>
//               <Button
//                 onClick={refreshData}
//                 className="w-full bg-transparent"
//                 variant="outline"
//               >
//                 Refresh Data
//               </Button>
//             </div>
//           </div>
//         </GlassCard>

//         {rows.map((b) => (
//           <GlassCard key={b.id} className="p-4">
//             <div className="flex items-start justify-between mb-3">
//               <div>
//                 <h3 className="font-semibold text-foreground">
//                   Periode: {b.periode}
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
//                   <p className="font-medium">{b.meterAkhir ?? "-"} </p>
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
//                   {!!b.denda && <p>• Denda = {fmtRp(b.denda)}</p>}
//                   <p className="font-semibold">
//                     • Total Tagihan = {fmtRp(b.totalTagihan)}
//                   </p>
//                 </div>
//               </div>

//               {b.buktiPembayaran && (
//                 <div className="flex items-center gap-2 text-sm">
//                   <span className="text-muted-foreground">
//                     Bukti Pembayaran:
//                   </span>
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     onClick={() => setSelected(b)}
//                   >
//                     <Eye className="h-3 w-3 mr-1" />
//                     Lihat
//                   </Button>
//                 </div>
//               )}
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
//               >
//                 <CreditCard className="h-4 w-4 mr-2" /> Input Pembayaran
//               </Button>
//             </div>
//           </GlassCard>
//         ))}

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
//                     {selected.periode}
//                   </p>
//                   <p>
//                     <span className="font-medium">Total:</span>{" "}
//                     {fmtRp(selected.totalTagihan)}
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

//   // ===== DESKTOP =====
//   return (
//     <div className="space-y-4">
//       {/* FILTERS */}
//       <GlassCard className="p-4">
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//           {/* Periode */}
//           <div className="space-y-2">
//             <label className="text-sm font-medium text-foreground">
//               Periode Tagihan
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
//               Status Tagihan
//             </label>
//             <Select value={selectedStatus} onValueChange={setSelectedStatus}>
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
//               Cari Warga/Zona
//             </label>
//             <div className="relative">
//               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//               <Input
//                 placeholder="Nama warga atau zona..."
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
//                         Periode: {b.periode}
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
//                       {!!b.denda && <p>Denda = {fmtRp(b.denda)}</p>}
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
//                           <Eye className="h-4 w-4 mr-2" />
//                           Lihat Bukti
//                         </Button>
//                       )}

//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => router.push(`/input-pembayaran/${b.id}`)}
//                       >
//                         <CreditCard className="h-4 w-4 mr-2" />
//                         Input Pembayaran
//                       </Button>
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>

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
//                     {selected.periode}
//                   </p>
//                   <p>
//                     <span className="font-medium">Total:</span>{" "}
//                     {fmtRp(selected.totalTagihan)}
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

type AuthUser = {
  id: string;
  name: string;
  role: Role;
  username?: string;
};

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
  totalTagihan: number;

  status: "lunas" | "belum-lunas";
  statusVerif: "VERIFIED" | "UNVERIFIED";
  tglJatuhTempo: string | Date;

  tanggalBayar: string | Date | null;
  buktiPembayaran: string | null;
  metode: string | null;
  keterangan: string | null;
};

type Option = { value: string; label: string };

export function BillingTable() {
  const router = useRouter();
  const isMobile = useMobile();

  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [items, setItems] = useState<BillingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<BillingItem | null>(null);

  // ---------- FILTER STATES ----------
  const [selectedPeriode, setSelectedPeriode] = useState<string>("semua");
  const [selectedStatus, setSelectedStatus] = useState<
    "semua" | "lunas" | "belum-lunas"
  >("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  const [periodeOptions, setPeriodeOptions] = useState<Option[]>([
    { value: "semua", label: "Semua Periode" },
  ]);
  const statusOptions: Option[] = [
    { value: "semua", label: "Semua Status" },
    { value: "belum-lunas", label: "Belum Lunas" },
    { value: "lunas", label: "Lunas" },
  ];

  // pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  const totalPages = Math.max(Math.ceil(total / perPage), 1);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQuery.trim()), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ambil user dari localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("tb_user");
      if (raw) setAuthUser(JSON.parse(raw));
    } catch {}
  }, []);

  // map status UI -> status API
  const toApiStatus = (
    s: "semua" | "lunas" | "belum-lunas"
  ): string | undefined => {
    if (s === "lunas") return "lunas"; // diterjemahkan di API jadi PAID
    if (s === "belum-lunas") return "belum-lunas"; // diterjemahkan di API jadi not PAID
    return undefined;
  };

  // fetch + set options periode dinamis
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

      const res = await fetch(`/api/tagihan?${qs.toString()}`, {
        cache: "no-store",
        headers,
      });
      const json = await res.json();
      const data: BillingItem[] = json?.data ?? [];
      setItems(data);
      setTotal(json?.meta?.total ?? 0);

      // build opsi periode dinamis dari data
      const unique = Array.from(new Set(data.map((d) => d.periode))).filter(
        Boolean
      ) as string[];
      setPeriodeOptions([
        { value: "semua", label: "Semua Periode" },
        ...unique.map((p) => ({ value: p, label: p })),
      ]);
    } catch (e) {
      console.error("fetch tagihan error:", e);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  // fetch ketika user siap & filter berubah
  useEffect(() => {
    if (authUser) refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, selectedPeriode, selectedStatus, debouncedQ, page, perPage]);

  // filter sisi client (backup & untuk 'belum-lunas')
  const rows = useMemo(() => {
    if (!authUser) return [];
    let base =
      authUser.role === "ADMIN" || authUser.role === "PETUGAS"
        ? items
        : items.filter((b) => b.pelangganIdUser === authUser.id);

    if (selectedPeriode !== "semua")
      base = base.filter((b) => b.periode === selectedPeriode);
    if (selectedStatus !== "semua")
      base = base.filter((b) => b.status === selectedStatus);

    if (debouncedQ) {
      const q = debouncedQ.toLowerCase();
      base = base.filter(
        (b) =>
          (b.namaWarga || "").toLowerCase().includes(q) ||
          (b.zona || "").toLowerCase().includes(q) ||
          (b.pelangganKode || "").toLowerCase().includes(q)
      );
    }
    return base;
  }, [authUser, items, selectedPeriode, selectedStatus, debouncedQ]);

  const fmtRp = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n || 0);

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
            <SelectTrigger className="w-[110px]">
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
            {page} / {totalPages}
          </div>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page >= totalPages}
          >
            Selanjutnya <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  // ---------- RETURNS ----------
  if (isLoading) {
    return (
      <>
        {/* FILTERS */}
        <GlassCard className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Periode Tagihan
              </label>
              <Select
                value={selectedPeriode}
                onValueChange={setSelectedPeriode}
              >
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Status Tagihan
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Cari Warga/Zona
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nama warga atau zona..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

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

        {/* SKELETON */}
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

  if (!authUser || rows.length === 0) {
    return (
      <>
        {/* FILTERS */}
        <GlassCard className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Periode Tagihan
              </label>
              <Select
                value={selectedPeriode}
                onValueChange={setSelectedPeriode}
              >
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Status Tagihan
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Cari Warga/Zona
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nama warga atau zona..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

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

        {/* EMPTY */}
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

  // ===== MOBILE =====
  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* FILTERS */}
        <GlassCard className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Periode Tagihan
              </label>
              <Select
                value={selectedPeriode}
                onValueChange={setSelectedPeriode}
              >
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Status Tagihan
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Cari Warga/Zona
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nama warga atau zona..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

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

        {rows.map((b) => (
          <GlassCard key={b.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-foreground">
                  Periode: {b.periode}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Nama Warga: {b.namaWarga}
                </p>
                <p className="text-sm text-muted-foreground">
                  Zona/Blok: {b.zona}
                </p>
              </div>
              <StatusBadge s={b.status} />
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
                  {!!b.denda && <p>• Denda = {fmtRp(b.denda)}</p>}
                  <p className="font-semibold">
                    • Total Tagihan = {fmtRp(b.totalTagihan)}
                  </p>
                </div>
              </div>

              {b.buktiPembayaran && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    Bukti Pembayaran:
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelected(b)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Lihat
                  </Button>
                </div>
              )}
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
              >
                <CreditCard className="h-4 w-4 mr-2" /> Input Pembayaran
              </Button>
            </div>
          </GlassCard>
        ))}

        <PaginationBar />

        {/* Modal Mobile */}
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Bukti Pembayaran</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <StatusBadge s={selected.status} />
                  <VerifBadge v={selected.statusVerif} />
                </div>

                <div className="text-sm space-y-2">
                  <p>
                    <span className="font-medium">Nama:</span>{" "}
                    {selected.namaWarga}
                  </p>
                  <p>
                    <span className="font-medium">Periode:</span>{" "}
                    {selected.periode}
                  </p>
                  <p>
                    <span className="font-medium">Total:</span>{" "}
                    {fmtRp(selected.totalTagihan)}
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

  // ===== DESKTOP =====
  return (
    <div className="space-y-4">
      {/* FILTERS */}
      <GlassCard className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Periode Tagihan
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

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Status Tagihan
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

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Cari Warga/Zona
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nama warga atau zona..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

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
              {rows.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-border/10 hover:bg-white/5"
                >
                  <td className="p-4">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        Periode: {b.periode}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Nama Warga: {b.namaWarga}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Zona/Blok: {b.zona}
                      </p>
                      <div className="mt-2 flex gap-2 items-center">
                        <StatusBadge s={b.status} />
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
                          {b.pemakaian ?? "-"} {b.pemakaian != null ? "m³" : ""}
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
                      {!!b.denda && <p>Denda = {fmtRp(b.denda)}</p>}
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
                          <Eye className="h-4 w-4 mr-2" />
                          Lihat Bukti
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/input-pembayaran/${b.id}`)}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Input Pembayaran
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
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
                  <StatusBadge s={selected.status} />
                  <VerifBadge v={selected.statusVerif} />
                </div>

                <div className="text-sm space-y-2">
                  <p>
                    <span className="font-medium">Nama:</span>{" "}
                    {selected.namaWarga}
                  </p>
                  <p>
                    <span className="font-medium">Periode:</span>{" "}
                    {selected.periode}
                  </p>
                  <p>
                    <span className="font-medium">Total:</span>{" "}
                    {fmtRp(selected.totalTagihan)}
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

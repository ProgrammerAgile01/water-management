// "use client";

// import { useState } from "react";
// import { GlassCard } from "./glass-card";
// import { Button } from "./ui/button";
// import { Badge } from "./ui/badge";
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
// import { Eye, CheckCircle, FileText, CreditCard } from "lucide-react";
// import { useBillingStore } from "@/lib/billing-store";
// import { useToast } from "@/hooks/use-toast";
// import { useMobile } from "@/hooks/use-mobile";
// import type { BillingItem } from "@/lib/billing-store";
// import { useRouter } from "next/navigation";

// function canApproveBilling(b: BillingItem) {
//   // Tampilkan approve jika:
//   // - status masih belum-lunas DAN (belum VERIFIED ATAU ada bukti), atau
//   // - backend beri flag canApprove = true
//   if (b.status === "belum-lunas") {
//     if (b.canApprove) return true;
//     if (b.statusVerif !== "VERIFIED") return true;
//     if (b.buktiPembayaran) return true;
//   }
//   return false;
// }

// export function BillingTable() {
//   const router = useRouter();
//   const { filteredBillings, approveBilling, isLoading } = useBillingStore();
//   const { toast } = useToast();
//   const isMobile = useMobile();
//   const [selectedBilling, setSelectedBilling] = useState<BillingItem | null>(
//     null
//   );

//   const handleApprove = async (id: string, namaWarga: string) => {
//     try {
//       await approveBilling(id);
//       toast({
//         title: "Pembayaran Disetujui",
//         description: `Tagihan ${namaWarga} telah disetujui dan diverifikasi.`,
//       });
//     } catch (e: any) {
//       toast({
//         title: "Gagal",
//         description: e?.message ?? "Tidak bisa menyetujui pembayaran",
//         variant: "destructive",
//       });
//     }
//   };

//   const getStatusBadge = (status: string) => {
//     switch (status) {
//       case "lunas":
//         return (
//           <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
//             Lunas
//           </Badge>
//         );
//       case "belum-lunas":
//         return (
//           <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
//             Belum Lunas
//           </Badge>
//         );
//       default:
//         return <Badge variant="secondary">{status}</Badge>;
//     }
//   };

//   const getVerifBadge = (b: BillingItem) =>
//     b.statusVerif === "VERIFIED" ? (
//       <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
//         Terverifikasi
//       </Badge>
//     ) : (
//       <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
//         Menunggu Verifikasi
//       </Badge>
//     );

//   const formatCurrency = (amount: number) =>
//     new Intl.NumberFormat("id-ID", {
//       style: "currency",
//       currency: "IDR",
//       minimumFractionDigits: 0,
//     }).format(amount);

//   if (isLoading) {
//     return (
//       <GlassCard className="p-6">
//         <div className="animate-pulse space-y-4">
//           <div className="h-4 bg-muted rounded w-1/4"></div>
//           <div className="space-y-2">
//             {[...Array(5)].map((_, i) => (
//               <div key={i} className="h-16 bg-muted rounded"></div>
//             ))}
//           </div>
//         </div>
//       </GlassCard>
//     );
//   }

//   if (filteredBillings.length === 0) {
//     return (
//       <GlassCard className="p-8 text-center">
//         <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
//         <h3 className="text-lg font-semibold text-foreground mb-2">
//           Tidak Ada Tagihan
//         </h3>
//         <p className="text-muted-foreground">
//           Tidak ada tagihan yang sesuai dengan filter yang dipilih.
//         </p>
//       </GlassCard>
//     );
//   }

//   // ========== Mobile ==========
//   if (isMobile) {
//     return (
//       <div className="space-y-4">
//         {filteredBillings.map((b) => {
//           const showApprove = canApproveBilling(b);
//           return (
//             <GlassCard key={b.id} className="p-4">
//               <div className="flex items-start justify-between mb-3">
//                 <div>
//                   <h3 className="font-semibold text-foreground">
//                     Periode: {b.periode}
//                   </h3>
//                   <p className="text-sm text-muted-foreground">
//                     Nama Warga: {b.namaWarga}
//                   </p>
//                   <p className="text-sm text-muted-foreground">
//                     Zona/Blok: {b.zona}
//                   </p>
//                 </div>
//                 {getStatusBadge(b.status)}
//               </div>

//               <div className="space-y-3 mb-4">
//                 <div className="grid grid-cols-3 gap-2 text-sm">
//                   <div>
//                     <span className="text-muted-foreground">Meter Awal:</span>
//                     <p className="font-medium">{b.meterAwal}</p>
//                   </div>
//                   <div>
//                     <span className="text-muted-foreground">Meter Akhir:</span>
//                     <p className="font-medium">{b.meterAkhir}</p>
//                   </div>
//                   <div>
//                     <span className="text-muted-foreground">Pemakaian:</span>
//                     <p className="font-medium">{b.pemakaian} m³</p>
//                   </div>
//                 </div>

//                 <div className="space-y-1 text-sm">
//                   <p className="text-muted-foreground">Rincian Tagihan:</p>
//                   <div className="pl-2 space-y-1">
//                     <p>
//                       • {b.pemakaian} x {formatCurrency(b.tarifPerM3)} ={" "}
//                       {formatCurrency(b.totalPemakaian)}
//                     </p>
//                     <p>• Abonemen = {formatCurrency(b.abonemen)}</p>
//                     <p className="font-semibold">
//                       • Total Tagihan = {formatCurrency(b.totalTagihan)}
//                     </p>
//                   </div>
//                 </div>

//                 {/* Lihat bukti TETAP ditampilkan bila ada bukti — tidak tergantung status */}
//                 {b.buktiPembayaran && (
//                   <div className="flex items-center gap-2 text-sm">
//                     <span className="text-muted-foreground">
//                       Bukti Pembayaran:
//                     </span>
//                     <Button
//                       variant="outline"
//                       size="sm"
//                       onClick={() => setSelectedBilling(b)}
//                     >
//                       <Eye className="h-3 w-3 mr-1" />
//                       Lihat
//                     </Button>
//                   </div>
//                 )}
//               </div>

//               <div className="flex gap-2">
//                 {b.buktiPembayaran && (
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     onClick={() => setSelectedBilling(b)}
//                     className="flex-1"
//                   >
//                     <Eye className="h-4 w-4 mr-2" />
//                     Lihat Bukti
//                   </Button>
//                 )}

//                 <Button
//                   variant="outline"
//                   size="sm"
//                   onClick={() => router.push(`/input-pembayaran/${b.id}`)}
//                   className="flex-1"
//                 >
//                   <CreditCard className="h-4 w-4 mr-2" />
//                   Input Pembayaran
//                 </Button>

//                 {showApprove && (
//                   <Button
//                     size="sm"
//                     onClick={() => handleApprove(b.id, b.namaWarga)}
//                     className="flex-1"
//                   >
//                     <CheckCircle className="h-4 w-4 mr-2" />
//                     Approve
//                   </Button>
//                 )}

//                 <Button
//                   variant="outline"
//                   size="sm"
//                   className="flex-1 bg-transparent"
//                 >
//                   <FileText className="h-4 w-4 mr-2" />
//                   Status
//                 </Button>
//               </div>
//             </GlassCard>
//           );
//         })}
//       </div>
//     );
//   }

//   // ========== Desktop ==========
//   return (
//     <GlassCard className="overflow-hidden">
//       <div className="overflow-x-auto">
//         <table className="w-full">
//           <thead>
//             <tr className="border-b border-border/20">
//               <th className="text-left p-4 font-semibold text-foreground">
//                 Info Tagihan
//               </th>
//               <th className="text-left p-4 font-semibold text-foreground">
//                 Meter & Pemakaian
//               </th>
//               <th className="text-left p-4 font-semibold text-foreground">
//                 Rincian Tagihan
//               </th>
//               <th className="text-left p-4 font-semibold text-foreground">
//                 Aksi
//               </th>
//             </tr>
//           </thead>
//           <tbody>
//             {filteredBillings.map((b) => {
//               const showApprove = canApproveBilling(b);
//               return (
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
//                       <div className="mt-2">{getStatusBadge(b.status)}</div>
//                     </div>
//                   </td>

//                   <td className="p-4">
//                     <div className="space-y-1">
//                       <p className="text-sm">
//                         Meter Awal:{" "}
//                         <span className="font-medium">{b.meterAwal}</span>
//                       </p>
//                       <p className="text-sm">
//                         Meter Akhir:{" "}
//                         <span className="font-medium">{b.meterAkhir}</span>
//                       </p>
//                       <p className="text-sm">
//                         Pemakaian:{" "}
//                         <span className="font-medium">{b.pemakaian} m³</span>
//                       </p>
//                     </div>
//                   </td>

//                   <td className="p-4">
//                     <div className="space-y-1">
//                       <p className="text-sm">
//                         {b.pemakaian} x {formatCurrency(b.tarifPerM3)} ={" "}
//                         {formatCurrency(b.totalPemakaian)}
//                       </p>
//                       <p className="text-sm">
//                         Abonemen = {formatCurrency(b.abonemen)}
//                       </p>
//                       <p className="text-sm font-semibold">
//                         Total Tagihan = {formatCurrency(b.totalTagihan)}
//                       </p>
//                     </div>
//                   </td>

//                   <td className="p-4">
//                     <div className="flex gap-2">
//                       {/* Lihat bukti ditampilkan bila ada bukti—tidak bergantung status */}
//                       {b.buktiPembayaran && (
//                         <Button
//                           variant="outline"
//                           size="sm"
//                           onClick={() => setSelectedBilling(b)}
//                         >
//                           <Eye className="h-4 w-4 mr-2" />
//                           Lihat Bukti
//                         </Button>
//                       )}

//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => router.push(`/input-pembayaran/${b.id}`)}
//                         className="flex-1"
//                       >
//                         <CreditCard className="h-4 w-4 mr-2" />
//                         Input Pembayaran
//                       </Button>

//                       {/* {showApprove && (
//                         <Button
//                           size="sm"
//                           onClick={() => handleApprove(b.id, b.namaWarga)}
//                         >
//                           <CheckCircle className="h-4 w-4 mr-2" />
//                           Approve
//                         </Button>
//                       )} */}

//                       {/* <Button variant="outline" size="sm">
//                         <FileText className="h-4 w-4 mr-2" />
//                         Lihat Status
//                       </Button> */}
//                     </div>
//                   </td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>
//       </div>

//       {/* Modal Bukti Pembayaran */}
//       <Dialog
//         open={!!selectedBilling}
//         onOpenChange={() => setSelectedBilling(null)}
//       >
//         <DialogContent className="max-w-md">
//           <DialogHeader>
//             <DialogTitle>Bukti Pembayaran</DialogTitle>
//           </DialogHeader>

//           {selectedBilling && (
//             <div className="space-y-4">
//               {/* Ringkasan status ditampilkan untuk SEMUA status */}
//               <div className="flex items-center gap-2">
//                 {getStatusBadge(selectedBilling.status)}
//                 {getVerifBadge(selectedBilling)}
//               </div>

//               <div className="text-sm space-y-2">
//                 <p>
//                   <span className="font-medium">Nama:</span>{" "}
//                   {selectedBilling.namaWarga}
//                 </p>
//                 <p>
//                   <span className="font-medium">Periode:</span>{" "}
//                   {selectedBilling.periode}
//                 </p>
//                 <p>
//                   <span className="font-medium">Total:</span>{" "}
//                   {formatCurrency(selectedBilling.totalTagihan)}
//                 </p>
//                 {selectedBilling.tanggalBayar && (
//                   <p>
//                     <span className="font-medium">Tanggal Bayar:</span>{" "}
//                     {selectedBilling.tanggalBayar}
//                   </p>
//                 )}
//               </div>

//               {selectedBilling.buktiPembayaran && (
//                 <div className="text-center">
//                   <img
//                     src={selectedBilling.buktiPembayaran || "/placeholder.svg"}
//                     alt="Bukti Pembayaran"
//                     className="max-w-full h-auto rounded-lg border"
//                   />
//                 </div>
//               )}

//               <div className="flex gap-2">
//                 <Button
//                   variant="outline"
//                   onClick={() => setSelectedBilling(null)}
//                   className="flex-1"
//                 >
//                   Tutup
//                 </Button>

//                 {/* Tombol Approve juga muncul dari modal jika masih eligible */}
//                 {canApproveBilling(selectedBilling) && (
//                   <Button
//                     onClick={() => {
//                       handleApprove(
//                         selectedBilling.id,
//                         selectedBilling.namaWarga
//                       );
//                       setSelectedBilling(null);
//                     }}
//                     className="flex-1"
//                   >
//                     <CheckCircle className="h-4 w-4 mr-2" />
//                     Approve
//                   </Button>
//                 )}
//               </div>
//             </div>
//           )}
//         </DialogContent>
//       </Dialog>
//     </GlassCard>
//   );
// }

// components/BillingTable.tsx
// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { useRouter } from "next/navigation";
// import { GlassCard } from "./glass-card";
// import { Button } from "./ui/button";
// import { Badge } from "./ui/badge";
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
// import { Eye, FileText, CreditCard } from "lucide-react";
// import { useBillingStore } from "@/lib/billing-store";
// import { useMobile } from "@/hooks/use-mobile";
// import { getCurrentUser } from "@/lib/auth-user";

// type AuthUser = {
//   id: string;
//   role: "ADMIN" | "PETUGAS" | "WARGA";
//   name: string;
//   username: string;
// };

// export function BillingTable() {
//   const router = useRouter();
//   const isMobile = useMobile();

//   const { isLoading, fetch, filteredBillings } = useBillingStore();

//   // ambil user dari localStorage
//   const [authUser, setAuthUser] =
//     useState<ReturnType<typeof getCurrentUser>>(null);
//   useEffect(() => {
//     setAuthUser(getCurrentUser());
//   }, []);

//   useEffect(() => {
//     if (authUser) fetch();
//   }, [authUser, fetch]);

//   const rows = useMemo(() => {
//     if (!authUser) return [];
//     if (authUser.role === "ADMIN" || authUser.role === "PETUGAS")
//       return filteredBillings;
//     return filteredBillings.filter((b) => b.pelangganIdUser === authUser.id);
//   }, [authUser, filteredBillings]);

//   console.log("data", rows);
//   console.log("authUser", authUser);
//   console.log(
//     "filteredBillings",
//     filteredBillings.map((b) => ({
//       id: b.id,
//       pelangganIdUser: b.pelangganIdUser,
//     }))
//   );

//   // modal bukti
//   const [selected, setSelected] = useState<
//     (typeof filteredBillings)[number] | null
//   >(null);

//   const fmtRp = (n: number) =>
//     new Intl.NumberFormat("id-ID", {
//       style: "currency",
//       currency: "IDR",
//       minimumFractionDigits: 0,
//     }).format(n || 0);

//   const StatusBadge = ({ s }: { s: string }) =>
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

//   // loading
//   if (isLoading) {
//     return (
//       <GlassCard className="p-6">
//         <div className="animate-pulse space-y-4">
//           <div className="h-4 bg-muted rounded w-1/4" />
//           <div className="space-y-2">
//             {[...Array(5)].map((_, i) => (
//               <div key={i} className="h-16 bg-muted rounded" />
//             ))}
//           </div>
//         </div>
//       </GlassCard>
//     );
//   }

//   // kosong
//   if (!authUser || rows.length === 0) {
//     return (
//       <GlassCard className="p-8 text-center">
//         <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
//         <h3 className="text-lg font-semibold text-foreground mb-2">
//           Tidak Ada Tagihan
//         </h3>
//         <p className="text-muted-foreground">
//           Tidak ada tagihan yang sesuai dengan filter/akses Anda.
//         </p>
//       </GlassCard>
//     );
//   }

//   // ======== MOBILE ========
//   if (isMobile) {
//     return (
//       <div className="space-y-4">
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
//                   <Eye className="h-4 w-4 mr-2" />
//                   Lihat Bukti
//                 </Button>
//               )}

//               <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={() => router.push(`/input-pembayaran/${b.id}`)}
//                 className="flex-1"
//               >
//                 <CreditCard className="h-4 w-4 mr-2" />
//                 Input Pembayaran
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

//   // ======== DESKTOP ========
//   return (
//     <GlassCard className="overflow-hidden">
//       <div className="overflow-x-auto">
//         <table className="w-full">
//           <thead>
//             <tr className="border-b border-border/20">
//               <th className="text-left p-4 font-semibold text-foreground">
//                 Info Tagihan
//               </th>
//               <th className="text-left p-4 font-semibold text-foreground">
//                 Meter & Pemakaian
//               </th>
//               <th className="text-left p-4 font-semibold text-foreground">
//                 Rincian Tagihan
//               </th>
//               <th className="text-left p-4 font-semibold text-foreground">
//                 Aksi
//               </th>
//             </tr>
//           </thead>
//           <tbody>
//             {rows.map((b) => (
//               <tr
//                 key={b.id}
//                 className="border-b border-border/10 hover:bg-white/5"
//               >
//                 <td className="p-4">
//                   <div className="space-y-1">
//                     <p className="font-medium text-foreground">
//                       Periode: {b.periode}
//                     </p>
//                     <p className="text-sm text-muted-foreground">
//                       Nama Warga: {b.namaWarga}
//                     </p>
//                     <p className="text-sm text-muted-foreground">
//                       Zona/Blok: {b.zona}
//                     </p>
//                     <div className="mt-2 flex gap-2 items-center">
//                       <StatusBadge s={b.status} />
//                       <VerifBadge v={b.statusVerif} />
//                     </div>
//                   </div>
//                 </td>

//                 <td className="p-4">
//                   <div className="space-y-1 text-sm">
//                     <p>
//                       Meter Awal:{" "}
//                       <span className="font-medium">{b.meterAwal ?? "-"}</span>
//                     </p>
//                     <p>
//                       Meter Akhir:{" "}
//                       <span className="font-medium">{b.meterAkhir ?? "-"}</span>
//                     </p>
//                     <p>
//                       Pemakaian:{" "}
//                       <span className="font-medium">
//                         {b.pemakaian ?? "-"} {b.pemakaian != null ? "m³" : ""}
//                       </span>
//                     </p>
//                   </div>
//                 </td>

//                 <td className="p-4">
//                   <div className="space-y-1 text-sm">
//                     <p>
//                       {b.pemakaian ?? 0} x {fmtRp(b.tarifPerM3)} ={" "}
//                       {fmtRp(b.tarifPerM3 * (b.pemakaian ?? 0))}
//                     </p>
//                     <p>Abonemen = {fmtRp(b.abonemen)}</p>
//                     {!!b.denda && <p>Denda = {fmtRp(b.denda)}</p>}
//                     <p className="font-semibold">
//                       Total Tagihan = {fmtRp(b.totalTagihan)}
//                     </p>
//                   </div>
//                 </td>

//                 <td className="p-4">
//                   <div className="flex gap-2">
//                     {b.buktiPembayaran && (
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => setSelected(b)}
//                       >
//                         <Eye className="h-4 w-4 mr-2" />
//                         Lihat Bukti
//                       </Button>
//                     )}

//                     <Button
//                       variant="outline"
//                       size="sm"
//                       onClick={() => router.push(`/input-pembayaran/${b.id}`)}
//                     >
//                       <CreditCard className="h-4 w-4 mr-2" />
//                       Input Pembayaran
//                     </Button>
//                   </div>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       {/* Modal Desktop */}
//       <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
//         <DialogContent className="max-w-md">
//           <DialogHeader>
//             <DialogTitle>Bukti Pembayaran</DialogTitle>
//           </DialogHeader>

//           {selected && (
//             <div className="space-y-4">
//               <div className="flex items-center gap-2">
//                 <StatusBadge s={selected.status} />
//                 <VerifBadge v={selected.statusVerif} />
//               </div>

//               <div className="text-sm space-y-2">
//                 <p>
//                   <span className="font-medium">Nama:</span>{" "}
//                   {selected.namaWarga}
//                 </p>
//                 <p>
//                   <span className="font-medium">Periode:</span>{" "}
//                   {selected.periode}
//                 </p>
//                 <p>
//                   <span className="font-medium">Total:</span>{" "}
//                   {fmtRp(selected.totalTagihan)}
//                 </p>
//                 {selected.tanggalBayar && (
//                   <p>
//                     <span className="font-medium">Tanggal Bayar:</span>{" "}
//                     {new Date(selected.tanggalBayar).toLocaleString("id-ID")}
//                   </p>
//                 )}
//               </div>

//               {selected.buktiPembayaran && (
//                 <div className="text-center">
//                   <img
//                     src={selected.buktiPembayaran || "/placeholder.svg"}
//                     alt="Bukti Pembayaran"
//                     className="max-w-full h-auto rounded-lg border"
//                   />
//                 </div>
//               )}

//               <div className="flex gap-2">
//                 <Button
//                   variant="outline"
//                   onClick={() => setSelected(null)}
//                   className="flex-1"
//                 >
//                   Tutup
//                 </Button>
//               </div>
//             </div>
//           )}
//         </DialogContent>
//       </Dialog>
//     </GlassCard>
//   );
// }

// components/BillingTable.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "./glass-card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Eye, FileText, CreditCard } from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";

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

export function BillingTable() {
  const router = useRouter();
  const isMobile = useMobile();

  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [items, setItems] = useState<BillingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<BillingItem | null>(null);

  // ambil user dari localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("tb_user");
      if (raw) setAuthUser(JSON.parse(raw));
    } catch {}
  }, []);

  // fetch langsung dari komponen
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // jika kamu ingin scope WARGA di server, kirim header:
        const headers: HeadersInit = authUser
          ? { "x-user-id": authUser.id, "x-user-role": authUser.role }
          : {};

        const res = await fetch(`/api/tagihan`, {
          cache: "no-store",
          headers,
        });
        const json = await res.json();
        setItems(json?.data ?? []);
      } catch (e) {
        console.error("fetch tagihan error:", e);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [authUser]);

  // filter di client sesuai role
  const rows = useMemo(() => {
    if (!authUser) return [];
    if (authUser.role === "ADMIN" || authUser.role === "PETUGAS") return items;
    return items.filter((b) => b.pelangganIdUser === authUser.id);
  }, [authUser, items]);

  const fmtRp = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n || 0);

  const StatusBadge = ({ s }: { s: "lunas" | "belum-lunas" }) =>
    s === "lunas" ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Lunas</Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Belum Lunas</Badge>
    );

  const VerifBadge = ({ v }: { v: "VERIFIED" | "UNVERIFIED" }) =>
    v === "VERIFIED" ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Terverifikasi</Badge>
    ) : (
      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Menunggu Verifikasi</Badge>
    );

  // skeleton
  if (isLoading) {
    return (
      <GlassCard className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </div>
      </GlassCard>
    );
  }

  // kosong
  if (!authUser || rows.length === 0) {
    return (
      <GlassCard className="p-8 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Tidak Ada Tagihan</h3>
        <p className="text-muted-foreground">Tidak ada tagihan yang sesuai dengan filter/akses Anda.</p>
      </GlassCard>
    );
  }

  // ===== MOBILE =====
  if (isMobile) {
    return (
      <div className="space-y-4">
        {rows.map((b) => (
          <GlassCard key={b.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-foreground">Periode: {b.periode}</h3>
                <p className="text-sm text-muted-foreground">Nama Warga: {b.namaWarga}</p>
                <p className="text-sm text-muted-foreground">Zona/Blok: {b.zona}</p>
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
                  <p className="font-medium">{b.meterAkhir ?? "-"} </p>
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
                    • {(b.pemakaian ?? 0)} x {fmtRp(b.tarifPerM3)} = {fmtRp(b.tarifPerM3 * (b.pemakaian ?? 0))}
                  </p>
                  <p>• Abonemen = {fmtRp(b.abonemen)}</p>
                  {!!b.denda && <p>• Denda = {fmtRp(b.denda)}</p>}
                  <p className="font-semibold">• Total Tagihan = {fmtRp(b.totalTagihan)}</p>
                </div>
              </div>

              {b.buktiPembayaran && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Bukti Pembayaran:</span>
                  <Button variant="outline" size="sm" onClick={() => setSelected(b)}>
                    <Eye className="h-3 w-3 mr-1" />
                    Lihat
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {b.buktiPembayaran && (
                <Button variant="outline" size="sm" onClick={() => setSelected(b)} className="flex-1">
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
                  <p><span className="font-medium">Nama:</span> {selected.namaWarga}</p>
                  <p><span className="font-medium">Periode:</span> {selected.periode}</p>
                  <p><span className="font-medium">Total:</span> {fmtRp(selected.totalTagihan)}</p>
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
                  <Button variant="outline" onClick={() => setSelected(null)} className="flex-1">
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
    <GlassCard className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/20">
              <th className="text-left p-4 font-semibold text-foreground">Info Tagihan</th>
              <th className="text-left p-4 font-semibold text-foreground">Meter & Pemakaian</th>
              <th className="text-left p-4 font-semibold text-foreground">Rincian Tagihan</th>
              <th className="text-left p-4 font-semibold text-foreground">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className="border-b border-border/10 hover:bg-white/5">
                <td className="p-4">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">Periode: {b.periode}</p>
                    <p className="text-sm text-muted-foreground">Nama Warga: {b.namaWarga}</p>
                    <p className="text-sm text-muted-foreground">Zona/Blok: {b.zona}</p>
                    <div className="mt-2 flex gap-2 items-center">
                      <StatusBadge s={b.status} />
                      <VerifBadge v={b.statusVerif} />
                    </div>
                  </div>
                </td>

                <td className="p-4">
                  <div className="space-y-1 text-sm">
                    <p>Meter Awal: <span className="font-medium">{b.meterAwal ?? "-"}</span></p>
                    <p>Meter Akhir: <span className="font-medium">{b.meterAkhir ?? "-"}</span></p>
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
                      {(b.pemakaian ?? 0)} x {fmtRp(b.tarifPerM3)} = {fmtRp(b.tarifPerM3 * (b.pemakaian ?? 0))}
                    </p>
                    <p>Abonemen = {fmtRp(b.abonemen)}</p>
                    {!!b.denda && <p>Denda = {fmtRp(b.denda)}</p>}
                    <p className="font-semibold">Total Tagihan = {fmtRp(b.totalTagihan)}</p>
                  </div>
                </td>

                <td className="p-4">
                  <div className="flex gap-2">
                    {b.buktiPembayaran && (
                      <Button variant="outline" size="sm" onClick={() => setSelected(b)}>
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
                <p><span className="font-medium">Nama:</span> {selected.namaWarga}</p>
                <p><span className="font-medium">Periode:</span> {selected.periode}</p>
                <p><span className="font-medium">Total:</span> {fmtRp(selected.totalTagihan)}</p>
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
                <Button variant="outline" onClick={() => setSelected(null)} className="flex-1">
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </GlassCard>
  );
}

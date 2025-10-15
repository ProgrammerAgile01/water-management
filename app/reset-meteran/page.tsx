// // app/reset-meteran/page.tsx
// "use client";

// import { AppHeader } from "@/components/app-header";
// import { AuthGuard } from "@/components/auth-guard";
// import { AppShell } from "@/components/app-shell";
// import { GlassCard } from "@/components/glass-card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Badge } from "@/components/ui/badge";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Calendar } from "@/components/ui/calendar";
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover";
// import {
//   RotateCcw,
//   Plus,
//   Edit,
//   Eye,
//   Trash2,
//   Search,
//   CalendarIcon,
// } from "lucide-react";
// import { useEffect, useMemo, useState } from "react";
// import { format } from "date-fns";
// import { id as localeID } from "date-fns/locale";
// import { cn } from "@/lib/utils";
// import { toast } from "sonner";
// import { useMobile } from "@/hooks/use-mobile";
// import { useResetMeterStore } from "@/lib/reset-meter-store";

// type ZoneOption = { id: string; kode: string; nama: string };

// function prettyZone(kode?: string) {
//   if (!kode) return "-";
//   // Ambil huruf pertama; jika A/B/C → jadikan "Zona X"
//   const m = kode.trim()[0]?.toUpperCase();
//   if (m && /[A-Z]/.test(m)) return `Zona ${m}`;
//   return kode;
// }
// function joinOneLine(parts: (string | undefined | null)[]) {
//   return parts.filter(Boolean).join(" — ");
// }

// export default function ResetMeteranPage() {
//   const {
//     filteredResets,
//     filters,
//     setFilters,
//     addReset,
//     updateReset,
//     deleteReset,
//     customers,
//     loadInitial,
//     loading,
//   } = useResetMeterStore();

//   const [isFormOpen, setIsFormOpen] = useState(false);
//   const [editingReset, setEditingReset] = useState<any>(null);
//   const [formData, setFormData] = useState({
//     pelanggan: { nama: "", alamat: "", blok: "" },
//     alasan: "",
//     tanggalReset: "",
//     meterAwalBaru: 0,
//     status: "Draft" as const,
//   });
//   const [selectedDate, setSelectedDate] = useState<Date>();
//   const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

//   // Dropdown Zona (relasi)
//   const [zones, setZones] = useState<ZoneOption[]>([]);
//   const [selectedZoneId, setSelectedZoneId] = useState<string>("");

//   const isMobile = useMobile();

//   // load customers & data awal
//   useEffect(() => {
//     loadInitial();
//   }, [loadInitial]);

//   // load list awal sesuai filter default
//   useEffect(() => {
//     setFilters({ ...filters });
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // load daftar zona
//   useEffect(() => {
//     (async () => {
//       try {
//         const res = await fetch("/api/zona?page=1&pageSize=200", {
//           cache: "no-store",
//         });
//         if (!res.ok) throw new Error(`HTTP ${res.status}`);
//         const data = await res.json();
//         const arr = Array.isArray(data?.items)
//           ? data.items
//           : Array.isArray(data)
//           ? data
//           : [];
//         const list: ZoneOption[] = arr.map((z: any) => ({
//           id: String(z.id ?? z.kode),
//           kode: String(z.kode ?? ""),
//           nama: String(z.nama ?? ""),
//         }));
//         setZones(list);
//       } catch (err) {
//         console.error("Gagal load blok:", err);
//         setZones([]);
//       }
//     })();
//   }, []);

//   const resetForm = () => {
//     setEditingReset(null);
//     setFormData({
//       pelanggan: { nama: "", alamat: "", blok: "" },
//       alasan: "",
//       tanggalReset: "",
//       meterAwalBaru: 0,
//       status: "Draft",
//     });
//     setSelectedDate(undefined);
//     setSelectedCustomerId("");
//     setSelectedZoneId("");
//   };

//   // ⬇️ Perbaikan: isi alamat & blok, set zonaId
//   const handleCustomerSelect = (customerId: string) => {
//     setSelectedCustomerId(customerId);

//     const c = customers.find((x) => String(x.id) === String(customerId));
//     const blok = c?.blok ?? c?.zona?.kode ?? "";

//     setFormData((prev) => ({
//       ...prev,
//       pelanggan: {
//         nama: c?.nama ?? "",
//         alamat: c?.alamat ?? "",
//         blok,
//       },
//     }));

//     setSelectedZoneId((c as any)?.zonaId ?? (c?.zona?.id as any) ?? "");
//   };

//   async function maybeUpdateCustomerZone(pelangganId: string, zonaId: string) {
//     if (!pelangganId || !zonaId) return;
//     try {
//       await fetch(`/api/pelanggan/${pelangganId}`, {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ zonaId }),
//       });
//     } catch {}
//   }

//   const handleSubmit = async () => {
//     if (
//       !selectedCustomerId ||
//       (!selectedDate && !formData.tanggalReset) ||
//       !formData.meterAwalBaru ||
//       !selectedZoneId
//     ) {
//       toast.error("Mohon lengkapi semua field yang bertanda *");
//       return;
//     }

//     await maybeUpdateCustomerZone(selectedCustomerId, selectedZoneId);

//     const payload = {
//       pelangganId: selectedCustomerId,
//       tanggalReset: selectedDate
//         ? format(selectedDate, "yyyy-MM-dd")
//         : formData.tanggalReset,
//       alasan: formData.alasan || null,
//       meterAwalBaru: Number(formData.meterAwalBaru) || 0,
//       status: formData.status === "Selesai" ? "SELESAI" : "DRAFT",
//     };

//     try {
//       if (editingReset?.id) {
//         await updateReset(editingReset.id as string, payload);
//         toast.success("Reset meter berhasil diperbarui");
//       } else {
//         await addReset(payload);
//         toast.success("Reset meter berhasil disimpan");
//       }
//       setIsFormOpen(false);
//       resetForm();
//     } catch (e: any) {
//       toast.error(e?.message ?? "Gagal menyimpan data");
//     }
//   };

//   const handleEdit = (reset: any) => {
//     setEditingReset(reset);
//     setFormData({
//       pelanggan: {
//         nama: reset.pelanggan?.nama ?? "",
//         alamat: reset.pelanggan?.alamat ?? "",
//         blok: reset.pelanggan?.blok ?? "",
//       },
//       alasan: reset.alasan ?? "",
//       tanggalReset: reset.tanggalReset ?? "",
//       meterAwalBaru: Number(reset.meterAwalBaru) || 0,
//       status: reset.status === "Selesai" ? "Selesai" : "Draft",
//     });

//     const customer = customers.find((c) => c.nama === reset.pelanggan?.nama);
//     setSelectedCustomerId(customer ? String(customer.id) : "");
//     setSelectedZoneId(customer?.zonaId ?? customer?.zona?.id ?? "");
//     setSelectedDate(
//       reset.tanggalReset ? new Date(reset.tanggalReset) : undefined
//     );
//     setIsFormOpen(true);
//   };

//   const handleDelete = async (id: string) => {
//     if (!id) return;
//     if (confirm("Apakah Anda yakin ingin menghapus data reset meter ini?")) {
//       try {
//         await deleteReset(id);
//         toast.success("Data reset meter dihapus");
//       } catch (e: any) {
//         toast.error(e?.message ?? "Gagal menghapus data");
//       }
//     }
//   };

//   const getStatusBadge = (status: string) =>
//     status === "Selesai" ? (
//       <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
//         Selesai
//       </Badge>
//     ) : (
//       <Badge variant="secondary">Draft</Badge>
//     );

//   const list = useMemo(() => filteredResets, [filteredResets]);

//   return (
//     <AuthGuard>
//       <AppShell>
//         <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-indigo-100 p-4 pb-24">
//           <AppHeader title="Reset Meteran" />

//           {/* Header */}
//           <GlassCard className="mb-6 p-6">
//             <div className="flex items-start gap-4">
//               <div className="p-3 bg-teal-100 rounded-lg">
//                 <RotateCcw className="h-6 w-6 text-teal-600" />
//               </div>
//               <div className="flex-1">
//                 <h1 className="text-2xl font-bold text-gray-900 mb-2">
//                   Reset Meteran
//                 </h1>
//                 <p className="text-gray-600 mb-4">
//                   Gunakan menu ini untuk mencatat pergantian meter pelanggan.
//                 </p>

//                 {/* Add - Desktop */}
//                 {!isMobile && (
//                   <Dialog
//                     open={isFormOpen}
//                     onOpenChange={(o) => {
//                       setIsFormOpen(o);
//                       if (!o) resetForm();
//                     }}
//                   >
//                     <DialogTrigger asChild>
//                       <Button className="bg-teal-600 hover:bg-teal-700">
//                         <Plus className="h-4 w-4 mr-2" />
//                         Tambah Reset Meter
//                       </Button>
//                     </DialogTrigger>
//                     <DialogContent className="max-w-md">
//                       <DialogHeader>
//                         <DialogTitle>
//                           {editingReset
//                             ? "Edit Reset Meter"
//                             : "Tambah Reset Meter"}
//                         </DialogTitle>
//                       </DialogHeader>

//                       <div className="space-y-4">
//                         <div>
//                           <Label>Nama Pelanggan *</Label>
//                           <Select
//                             value={selectedCustomerId || "PILIH"}
//                             onValueChange={handleCustomerSelect}
//                           >
//                             <SelectTrigger>
//                               <SelectValue placeholder="Pilih pelanggan" />
//                             </SelectTrigger>
//                             <SelectContent>
//                               <SelectItem value="PILIH" disabled>
//                                 Pilih pelanggan
//                               </SelectItem>
//                               {customers.map((c) => {
//                                 const zon = c.blok ?? c.zona?.kode ?? "";
//                                 return (
//                                   <SelectItem
//                                     key={c.id}
//                                     value={String(c.id)}
//                                     className="truncate"
//                                   >
//                                     {joinOneLine([
//                                       c.nama,
//                                       zon ? prettyZone(zon) : undefined,
//                                     ])}
//                                   </SelectItem>
//                                 );
//                               })}
//                             </SelectContent>
//                           </Select>
//                         </div>

//                         <div>
//                           <Label>Alamat</Label>
//                           <Input
//                             value={formData.pelanggan.alamat}
//                             onChange={(e) =>
//                               setFormData((prev) => ({
//                                 ...prev,
//                                 pelanggan: {
//                                   ...prev.pelanggan,
//                                   alamat: e.target.value,
//                                 },
//                               }))
//                             }
//                             placeholder="Masukkan alamat"
//                             readOnly={!!selectedCustomerId} // ⬅️ perbaikan
//                             className={cn(
//                               !!selectedCustomerId && "bg-muted/50"
//                             )}
//                           />
//                         </div>

//                         {/* Dropdown relasi Zona */}
//                         <div>
//                           <Label>Blok *</Label>
//                           <Select
//                             value={selectedZoneId || "PILIH"}
//                             onValueChange={(v) => {
//                               setSelectedZoneId(v === "PILIH" ? "" : v);
//                               const z = zones.find((zz) => zz.id === v);
//                               setFormData((prev) => ({
//                                 ...prev,
//                                 pelanggan: {
//                                   ...prev.pelanggan,
//                                   blok: z?.kode ?? prev.pelanggan.blok,
//                                 },
//                               }));
//                             }}
//                           >
//                             <SelectTrigger>
//                               <SelectValue placeholder="Pilih blok" />
//                             </SelectTrigger>
//                             <SelectContent>
//                               <SelectItem value="PILIH" disabled>
//                                 Pilih blok
//                               </SelectItem>
//                               {zones.map((z) => (
//                                 <SelectItem key={z.id} value={z.id}>
//                                   {z.kode} — {z.nama}
//                                 </SelectItem>
//                               ))}
//                             </SelectContent>
//                           </Select>
//                         </div>

//                         <div>
//                           <Label>Tanggal Reset *</Label>
//                           <Popover>
//                             <PopoverTrigger asChild>
//                               <Button
//                                 variant="outline"
//                                 className={cn(
//                                   "w-full justify-start text-left font-normal mt-1 mb-2", // ⬅️ beri jarak
//                                   !selectedDate &&
//                                     !formData.tanggalReset &&
//                                     "text-muted-foreground"
//                                 )}
//                               >
//                                 <CalendarIcon className="mr-2 h-4 w-4" />
//                                 {selectedDate
//                                   ? format(selectedDate, "PPP", {
//                                       locale: localeID,
//                                     })
//                                   : formData.tanggalReset
//                                   ? format(
//                                       new Date(formData.tanggalReset),
//                                       "PPP",
//                                       { locale: localeID }
//                                     )
//                                   : "Pilih tanggal"}
//                               </Button>
//                             </PopoverTrigger>
//                             <PopoverContent className="w-auto p-0">
//                               <Calendar
//                                 mode="single"
//                                 selected={
//                                   selectedDate ??
//                                   (formData.tanggalReset
//                                     ? new Date(formData.tanggalReset)
//                                     : undefined)
//                                 }
//                                 onSelect={setSelectedDate}
//                                 initialFocus
//                               />
//                             </PopoverContent>
//                           </Popover>
//                         </div>

//                         <div>
//                           <Label>Meter Awal Baru *</Label>
//                           <Input
//                             type="number"
//                             value={formData.meterAwalBaru}
//                             onChange={(e) =>
//                               setFormData((prev) => ({
//                                 ...prev,
//                                 meterAwalBaru:
//                                   Number.parseInt(e.target.value) || 0,
//                               }))
//                             }
//                             placeholder="Masukkan angka meter awal"
//                           />
//                         </div>

//                         <div>
//                           <Label>Alasan Reset</Label>
//                           <Textarea
//                             value={formData.alasan}
//                             onChange={(e) =>
//                               setFormData((prev) => ({
//                                 ...prev,
//                                 alasan: e.target.value,
//                               }))
//                             }
//                             placeholder="Masukkan alasan reset meter"
//                             rows={3}
//                           />
//                         </div>

//                         <div className="flex gap-2 pt-4">
//                           <Button
//                             variant="outline"
//                             onClick={() => {
//                               setIsFormOpen(false);
//                               resetForm();
//                             }}
//                             className="flex-1"
//                           >
//                             Batal
//                           </Button>
//                           <Button
//                             onClick={handleSubmit}
//                             className="flex-1 bg-teal-600 hover:bg-teal-700"
//                             disabled={loading}
//                           >
//                             {loading ? "Menyimpan..." : "Simpan"}
//                           </Button>
//                         </div>
//                       </div>
//                     </DialogContent>
//                   </Dialog>
//                 )}
//               </div>
//             </div>
//           </GlassCard>

//           {/* Mobile Add Button */}
//           {isMobile && (
//             <div className="mb-4">
//               <Dialog
//                 open={isFormOpen}
//                 onOpenChange={(o) => {
//                   setIsFormOpen(o);
//                   if (!o) resetForm();
//                 }}
//               >
//                 <DialogTrigger asChild>
//                   <Button className="w-full bg-teal-600 hover:bg-teal-700">
//                     <Plus className="h-4 w-4 mr-2" />
//                     Tambah Reset Meter
//                   </Button>
//                 </DialogTrigger>
//                 <DialogContent className="max-w-md">
//                   <DialogHeader>
//                     <DialogTitle>
//                       {editingReset ? "Edit Reset Meter" : "Tambah Reset Meter"}
//                     </DialogTitle>
//                   </DialogHeader>

//                   <div className="space-y-4">
//                     <div>
//                       <Label>Nama Pelanggan *</Label>
//                       <Select
//                         value={selectedCustomerId || "PILIH"}
//                         onValueChange={handleCustomerSelect}
//                       >
//                         <SelectTrigger>
//                           <SelectValue placeholder="Pilih pelanggan" />
//                         </SelectTrigger>
//                         <SelectContent>
//                           <SelectItem value="PILIH" disabled>
//                             Pilih pelanggan
//                           </SelectItem>
//                           {customers.map((c) => {
//                             const zon = c.blok ?? c.zona?.kode ?? "";
//                             return (
//                               <SelectItem
//                                 key={c.id}
//                                 value={String(c.id)}
//                                 className="truncate"
//                               >
//                                 {joinOneLine([
//                                   c.nama,
//                                   zon ? prettyZone(zon) : undefined,
//                                 ])}
//                               </SelectItem>
//                             );
//                           })}
//                         </SelectContent>
//                       </Select>
//                     </div>

//                     <div>
//                       <Label>Alamat</Label>
//                       <Input
//                         value={formData.pelanggan.alamat}
//                         onChange={(e) =>
//                           setFormData((prev) => ({
//                             ...prev,
//                             pelanggan: {
//                               ...prev.pelanggan,
//                               alamat: e.target.value,
//                             },
//                           }))
//                         }
//                         placeholder="Masukkan alamat"
//                         readOnly={!!selectedCustomerId}
//                         className={cn(!!selectedCustomerId && "bg-muted/50")}
//                       />
//                     </div>

//                     {/* Zona - Mobile */}
//                     <div>
//                       <Label>Blok *</Label>
//                       <Select
//                         value={selectedZoneId || "PILIH"}
//                         onValueChange={(v) => {
//                           setSelectedZoneId(v === "PILIH" ? "" : v);
//                           const z = zones.find((zz) => zz.id === v);
//                           setFormData((prev) => ({
//                             ...prev,
//                             pelanggan: {
//                               ...prev.pelanggan,
//                               blok: z?.kode ?? prev.pelanggan.blok,
//                             },
//                           }));
//                         }}
//                       >
//                         <SelectTrigger>
//                           <SelectValue placeholder="Pilih blok" />
//                         </SelectTrigger>
//                         <SelectContent>
//                           <SelectItem value="PILIH" disabled>
//                             Pilih blok
//                           </SelectItem>
//                           {zones.map((z) => (
//                             <SelectItem key={z.id} value={z.id}>
//                               {z.kode} — {z.nama}
//                             </SelectItem>
//                           ))}
//                         </SelectContent>
//                       </Select>
//                     </div>

//                     <div>
//                       <Label>Tanggal Reset *</Label>
//                       <Popover>
//                         <PopoverTrigger asChild>
//                           <Button
//                             variant="outline"
//                             className={cn(
//                               "w-full justify-start text-left font-normal mt-1 mb-2",
//                               !selectedDate &&
//                                 !formData.tanggalReset &&
//                                 "text-muted-foreground"
//                             )}
//                           >
//                             <CalendarIcon className="mr-2 h-4 w-4" />
//                             {selectedDate
//                               ? format(selectedDate, "PPP", {
//                                   locale: localeID,
//                                 })
//                               : formData.tanggalReset
//                               ? format(new Date(formData.tanggalReset), "PPP", {
//                                   locale: localeID,
//                                 })
//                               : "Pilih tanggal"}
//                           </Button>
//                         </PopoverTrigger>
//                         <PopoverContent className="w-auto p-0">
//                           <Calendar
//                             mode="single"
//                             selected={
//                               selectedDate ??
//                               (formData.tanggalReset
//                                 ? new Date(formData.tanggalReset)
//                                 : undefined)
//                             }
//                             onSelect={setSelectedDate}
//                             initialFocus
//                           />
//                         </PopoverContent>
//                       </Popover>
//                     </div>

//                     <div>
//                       <Label>Meter Awal Baru *</Label>
//                       <Input
//                         type="number"
//                         value={formData.meterAwalBaru}
//                         onChange={(e) =>
//                           setFormData((prev) => ({
//                             ...prev,
//                             meterAwalBaru: Number.parseInt(e.target.value) || 0,
//                           }))
//                         }
//                         placeholder="Masukkan angka meter awal"
//                       />
//                     </div>

//                     <div>
//                       <Label>Alasan Reset</Label>
//                       <Textarea
//                         value={formData.alasan}
//                         onChange={(e) =>
//                           setFormData((prev) => ({
//                             ...prev,
//                             alasan: e.target.value,
//                           }))
//                         }
//                         placeholder="Masukkan alasan reset meter"
//                         rows={3}
//                       />
//                     </div>

//                     <div className="flex gap-2 pt-4">
//                       <Button
//                         variant="outline"
//                         onClick={() => {
//                           setIsFormOpen(false);
//                           resetForm();
//                         }}
//                         className="flex-1"
//                       >
//                         Batal
//                       </Button>
//                       <Button
//                         onClick={handleSubmit}
//                         className="flex-1 bg-teal-600 hover:bg-teal-700"
//                         disabled={loading}
//                       >
//                         {loading ? "Menyimpan..." : "Simpan"}
//                       </Button>
//                     </div>
//                   </div>
//                 </DialogContent>
//               </Dialog>
//             </div>
//           )}

//           {/* Filters */}
//           <GlassCard className="mb-6 p-4">
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//               <div>
//                 <Label>Periode</Label>
//                 <Select
//                   value={filters.periode}
//                   onValueChange={(value) => setFilters({ periode: value })}
//                 >
//                   <SelectTrigger>
//                     <SelectValue placeholder="Pilih periode" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="2025-09">September 2025</SelectItem>
//                     <SelectItem value="2025-08">Agustus 2025</SelectItem>
//                     <SelectItem value="2025-07">Juli 2025</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>
//               <div>
//                 <Label>Blok</Label>
//                 <Select
//                   value={filters.zona || "ALL"}
//                   onValueChange={(value) =>
//                     setFilters({ zona: value === "ALL" ? "" : value })
//                   }
//                 >
//                   <SelectTrigger>
//                     <SelectValue placeholder="Pilih blok" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="ALL">Semua Blok</SelectItem>
//                     <SelectItem value="A">Blok A</SelectItem>
//                     <SelectItem value="B">Blok B</SelectItem>
//                     <SelectItem value="C">Blok C</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>
//               <div>
//                 <Label>Cari</Label>
//                 <div className="relative">
//                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
//                   <Input
//                     placeholder="Nama pelanggan/alamat/blok"
//                     value={filters.search}
//                     onChange={(e) => setFilters({ search: e.target.value })}
//                     className="pl-10"
//                   />
//                 </div>
//               </div>
//             </div>
//           </GlassCard>

//           {/* Desktop Table */}
//           {!isMobile && (
//             <GlassCard className="p-6">
//               {loading ? (
//                 <div className="py-8 text-center text-sm text-gray-500">
//                   Memuat data...
//                 </div>
//               ) : (
//                 <Table>
//                   <TableHeader>
//                     <TableRow>
//                       <TableHead>Info Pelanggan</TableHead>
//                       <TableHead>Info Reset</TableHead>
//                       <TableHead className="text-center">Meter Baru</TableHead>
//                       <TableHead className="text-center">Status</TableHead>
//                       <TableHead className="text-right">Aksi</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {list.map((reset: any) => (
//                       <TableRow key={reset.id}>
//                         <TableCell>
//                           <div className="space-y-1">
//                             <div className="font-medium">
//                               {reset.pelanggan?.nama}
//                             </div>
//                             <div className="text-sm text-gray-600 truncate max-w-48">
//                               {reset.pelanggan?.alamat}
//                             </div>
//                             <div className="text-sm text-gray-500">
//                               {joinOneLine([
//                                 "Blok",
//                                 prettyZone(reset.pelanggan?.blok),
//                               ])}
//                             </div>
//                           </div>
//                         </TableCell>
//                         <TableCell>
//                           <div className="space-y-1">
//                             <div className="text-sm">
//                               <span className="font-medium">Alasan:</span>{" "}
//                               {reset.alasan}
//                             </div>
//                             <div className="text-sm">
//                               <span className="font-medium">Tanggal:</span>{" "}
//                               {reset.tanggalReset
//                                 ? format(
//                                     new Date(reset.tanggalReset),
//                                     "dd MMM yyyy",
//                                     { locale: localeID }
//                                   )
//                                 : "-"}
//                             </div>
//                           </div>
//                         </TableCell>
//                         <TableCell className="text-center">
//                           <div className="text-lg font-bold text-teal-600">
//                             {reset.meterAwalBaru}
//                           </div>
//                         </TableCell>
//                         <TableCell className="text-center">
//                           {getStatusBadge(reset.status)}
//                         </TableCell>
//                         <TableCell className="text-right">
//                           <div className="flex gap-1 justify-end">
//                             <Button
//                               variant="ghost"
//                               size="sm"
//                               onClick={() => handleEdit(reset)}
//                               className="h-8 w-8 p-0"
//                             >
//                               <Edit className="h-4 w-4" />
//                             </Button>
//                             <Button
//                               variant="ghost"
//                               size="sm"
//                               className="h-8 w-8 p-0"
//                             >
//                               <Eye className="h-4 w-4" />
//                             </Button>
//                             <Button
//                               variant="ghost"
//                               size="sm"
//                               onClick={() => handleDelete(String(reset.id))}
//                               className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
//                             >
//                               <Trash2 className="h-4 w-4" />
//                             </Button>
//                           </div>
//                         </TableCell>
//                       </TableRow>
//                     ))}
//                   </TableBody>
//                 </Table>
//               )}
//             </GlassCard>
//           )}

//           {/* Mobile Cards */}
//           {isMobile && (
//             <div className="space-y-4">
//               {loading ? (
//                 <GlassCard className="p-4 text-center text-sm text-gray-500">
//                   Memuat data...
//                 </GlassCard>
//               ) : (
//                 list.map((reset: any) => (
//                   <GlassCard key={reset.id} className="p-4">
//                     <div className="flex justify-between items-start mb-3">
//                       <h3 className="font-bold text-gray-900">
//                         {reset.pelanggan?.nama}
//                       </h3>
//                       {getStatusBadge(reset.status)}
//                     </div>

//                     <div className="space-y-2 text-sm">
//                       <div className="border-b border-gray-100 pb-2">
//                         <span className="text-gray-600">Blok:</span>{" "}
//                         <span className="font-medium">
//                           {prettyZone(reset.pelanggan?.blok)}
//                         </span>
//                       </div>
//                       <div className="border-b border-gray-100 pb-2">
//                         <span className="text-gray-600">Alasan Reset:</span>{" "}
//                         <span className="font-medium">{reset.alasan}</span>
//                       </div>
//                       <div className="border-b border-gray-100 pb-2">
//                         <span className="text-gray-600">Meter Awal Baru:</span>{" "}
//                         <span className="text-xl font-bold text-teal-600">
//                           {reset.meterAwalBaru}
//                         </span>
//                       </div>
//                       <div className="pb-2">
//                         <span className="text-gray-600">Tanggal Reset:</span>{" "}
//                         <span className="font-medium">
//                           {reset.tanggalReset
//                             ? format(
//                                 new Date(reset.tanggalReset),
//                                 "dd MMM yyyy",
//                                 { locale: localeID }
//                               )
//                             : "-"}
//                         </span>
//                       </div>
//                     </div>

//                     <div className="flex gap-2 mt-4">
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => handleEdit(reset)}
//                         className="flex-1"
//                       >
//                         <Edit className="h-4 w-4 mr-1" />
//                         Edit
//                       </Button>
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         className="flex-1 bg-transparent"
//                       >
//                         <Eye className="h-4 w-4 mr-1" />
//                         Lihat
//                       </Button>
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => handleDelete(String(reset.id))}
//                         className="flex-1 text-red-600 hover:text-red-700"
//                       >
//                         <Trash2 className="h-4 w-4 mr-1" />
//                         Hapus
//                       </Button>
//                     </div>
//                   </GlassCard>
//                 ))
//               )}
//             </div>
//           )}
//         </div>
//       </AppShell>
//     </AuthGuard>
//   );
// }

// app/reset-meteran/page.tsx
"use client";

import { AppHeader } from "@/components/app-header";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  RotateCcw,
  Plus,
  Edit,
  Eye,
  Trash2,
  Search,
  CalendarIcon,
  Info, // ⬅️ NEW
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useMobile } from "@/hooks/use-mobile";
import { useResetMeterStore } from "@/lib/reset-meter-store";

// ⬇️ NEW: Tooltip (desktop) + provider
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* ---------- Small helpers ---------- */
type ZoneOption = { id: string; kode: string; nama: string };

function prettyZone(kode?: string) {
  if (!kode) return "-";
  const m = kode.trim()[0]?.toUpperCase();
  if (m && /[A-Z]/.test(m)) return `Zona ${m}`;
  return kode;
}
function joinOneLine(parts: (string | undefined | null)[]) {
  return parts.filter(Boolean).join(" — ");
}

/* ---------- NEW: tiny hook to detect mobile ---------- */
function useIsMobileStrict() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return isMobile;
}

/* ---------- NEW: InfoTip (desktop tooltip, mobile dialog) ---------- */
function InfoTip({
  ariaLabel,
  children,
  open,
  onOpenChange,
  className = "",
}: {
  ariaLabel: string;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  className?: string;
}) {
  const isMobile = useIsMobileStrict();

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          aria-label={ariaLabel}
          className={`inline-flex items-center justify-center rounded-full p-1.5 hover:bg-muted/50 ${className}`}
          onClick={() => onOpenChange?.(true)}
        >
          <Info className="h-4 w-4 opacity-70" />
        </button>
        <Dialog open={!!open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Info</DialogTitle>
            </DialogHeader>
            <div className="text-sm">{children}</div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            className={`inline-flex items-center justify-center rounded-full p-1.5 hover:bg-muted/50 ${className}`}
          >
            <Info className="h-4 w-4 opacity-70" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          sideOffset={10}
          collisionPadding={16}
          className="rounded-md break-words whitespace-normal leading-relaxed p-3 shadow-lg pointer-events-auto"
          style={{
            position: "fixed",
            zIndex: 2147483647,
            width: "min(92vw, 420px)",
          }}
        >
          <div className="text-sm">{children}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function ResetMeteranPage() {
  const {
    filteredResets,
    filters,
    setFilters,
    addReset,
    updateReset,
    deleteReset,
    customers,
    loadInitial,
    loading,
  } = useResetMeterStore();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReset, setEditingReset] = useState<any>(null);
  const [formData, setFormData] = useState({
    pelanggan: { nama: "", alamat: "", blok: "" },
    alasan: "",
    tanggalReset: "",
    meterAwalBaru: 0,
    status: "Draft" as const,
  });
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  // Dropdown Zona (relasi)
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");

  const isMobile = useMobile();

  // NEW: state untuk tooltip title (mobile dialog)
  const [openTip, setOpenTip] = useState(false);

  // load customers & data awal
  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // load list awal sesuai filter default
  useEffect(() => {
    setFilters({ ...filters });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load daftar zona
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/zona?page=1&pageSize=200", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const arr = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : [];
        const list: ZoneOption[] = arr.map((z: any) => ({
          id: String(z.id ?? z.kode),
          kode: String(z.kode ?? ""),
          nama: String(z.nama ?? ""),
        }));
        setZones(list);
      } catch (err) {
        console.error("Gagal load blok:", err);
        setZones([]);
      }
    })();
  }, []);

  const resetForm = () => {
    setEditingReset(null);
    setFormData({
      pelanggan: { nama: "", alamat: "", blok: "" },
      alasan: "",
      tanggalReset: "",
      meterAwalBaru: 0,
      status: "Draft",
    });
    setSelectedDate(undefined);
    setSelectedCustomerId("");
    setSelectedZoneId("");
  };

  // ⬇️ Perbaikan: isi alamat & blok, set zonaId
  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);

    const c = customers.find((x) => String(x.id) === String(customerId));
    const blok = c?.blok ?? c?.zona?.kode ?? "";

    setFormData((prev) => ({
      ...prev,
      pelanggan: {
        nama: c?.nama ?? "",
        alamat: c?.alamat ?? "",
        blok,
      },
    }));

    setSelectedZoneId((c as any)?.zonaId ?? (c?.zona?.id as any) ?? "");
  };

  async function maybeUpdateCustomerZone(pelangganId: string, zonaId: string) {
    if (!pelangganId || !zonaId) return;
    try {
      await fetch(`/api/pelanggan/${pelangganId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zonaId }),
      });
    } catch {}
  }

  const handleSubmit = async () => {
    if (
      !selectedCustomerId ||
      (!selectedDate && !formData.tanggalReset) ||
      !formData.meterAwalBaru ||
      !selectedZoneId
    ) {
      toast.error("Mohon lengkapi semua field yang bertanda *");
      return;
    }

    await maybeUpdateCustomerZone(selectedCustomerId, selectedZoneId);

    const payload = {
      pelangganId: selectedCustomerId,
      tanggalReset: selectedDate
        ? format(selectedDate, "yyyy-MM-dd")
        : formData.tanggalReset,
      alasan: formData.alasan || null,
      meterAwalBaru: Number(formData.meterAwalBaru) || 0,
      status: formData.status === "Selesai" ? "SELESAI" : "DRAFT",
    };

    try {
      if (editingReset?.id) {
        await updateReset(editingReset.id as string, payload);
        toast.success("Reset meter berhasil diperbarui");
      } else {
        await addReset(payload);
        toast.success("Reset meter berhasil disimpan");
      }
      setIsFormOpen(false);
      resetForm();
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal menyimpan data");
    }
  };

  const handleEdit = (reset: any) => {
    setEditingReset(reset);
    setFormData({
      pelanggan: {
        nama: reset.pelanggan?.nama ?? "",
        alamat: reset.pelanggan?.alamat ?? "",
        blok: reset.pelanggan?.blok ?? "",
      },
      alasan: reset.alasan ?? "",
      tanggalReset: reset.tanggalReset ?? "",
      meterAwalBaru: Number(reset.meterAwalBaru) || 0,
      status: reset.status === "Selesai" ? "Selesai" : "Draft",
    });

    const customer = customers.find((c) => c.nama === reset.pelanggan?.nama);
    setSelectedCustomerId(customer ? String(customer.id) : "");
    setSelectedZoneId(customer?.zonaId ?? customer?.zona?.id ?? "");
    setSelectedDate(
      reset.tanggalReset ? new Date(reset.tanggalReset) : undefined
    );
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!id) return;
    if (confirm("Apakah Anda yakin ingin menghapus data reset meter ini?")) {
      try {
        await deleteReset(id);
        toast.success("Data reset meter dihapus");
      } catch (e: any) {
        toast.error(e?.message ?? "Gagal menghapus data");
      }
    }
  };

  const getStatusBadge = (status: string) =>
    status === "Selesai" ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        Selesai
      </Badge>
    ) : (
      <Badge variant="secondary">Draft</Badge>
    );

  const list = useMemo(() => filteredResets, [filteredResets]);

  return (
    <AuthGuard>
      <AppShell>
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-indigo-100 p-4 pb-24">
          {/* ⬇️ AppHeader dengan tooltip di samping judul */}
          <AppHeader
            title="Reset Meteran"
            titleExtra={
              <InfoTip
                ariaLabel="Apa itu Reset Meteran?"
                open={openTip}
                onOpenChange={setOpenTip}
              >
                <b>Reset Meteran</b> dipakai saat meter rusak/bermasalah atau
                ada indikasi kecurangan. Pilih pelanggan, isi tanggal
                penggantian dan angka <i>meter awal baru</i>. Data lama tetap
                tersimpan.
              </InfoTip>
            }
          />

          {/* Header */}
          <GlassCard className="mb-6 p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-teal-100 rounded-lg">
                <RotateCcw className="h-6 w-6 text-teal-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Reset Meteran
                </h1>
                <p className="text-gray-600 mb-4">
                  Gunakan menu ini untuk mencatat pergantian meter pelanggan.
                </p>

                {/* Add - Desktop */}
                {!isMobile && (
                  <Dialog
                    open={isFormOpen}
                    onOpenChange={(o) => {
                      setIsFormOpen(o);
                      if (!o) resetForm();
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button className="bg-teal-600 hover:bg-teal-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Reset Meter
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>
                          {editingReset
                            ? "Edit Reset Meter"
                            : "Tambah Reset Meter"}
                        </DialogTitle>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div>
                          <Label>Nama Pelanggan *</Label>
                          <Select
                            value={selectedCustomerId || "PILIH"}
                            onValueChange={handleCustomerSelect}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih pelanggan" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PILIH" disabled>
                                Pilih pelanggan
                              </SelectItem>
                              {customers.map((c) => {
                                const zon = c.blok ?? c.zona?.kode ?? "";
                                return (
                                  <SelectItem
                                    key={c.id}
                                    value={String(c.id)}
                                    className="truncate"
                                  >
                                    {joinOneLine([
                                      c.nama,
                                      zon ? prettyZone(zon) : undefined,
                                    ])}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Alamat</Label>
                          <Input
                            value={formData.pelanggan.alamat}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                pelanggan: {
                                  ...prev.pelanggan,
                                  alamat: e.target.value,
                                },
                              }))
                            }
                            placeholder="Masukkan alamat"
                            readOnly={!!selectedCustomerId}
                            className={cn(
                              !!selectedCustomerId && "bg-muted/50"
                            )}
                          />
                        </div>

                        {/* Dropdown relasi Zona */}
                        <div>
                          <Label>Blok *</Label>
                          <Select
                            value={selectedZoneId || "PILIH"}
                            onValueChange={(v) => {
                              setSelectedZoneId(v === "PILIH" ? "" : v);
                              const z = zones.find((zz) => zz.id === v);
                              setFormData((prev) => ({
                                ...prev,
                                pelanggan: {
                                  ...prev.pelanggan,
                                  blok: z?.kode ?? prev.pelanggan.blok,
                                },
                              }));
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih blok" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PILIH" disabled>
                                Pilih blok
                              </SelectItem>
                              {zones.map((z) => (
                                <SelectItem key={z.id} value={z.id}>
                                  {z.kode} — {z.nama}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Tanggal Reset *</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal mt-1 mb-2",
                                  !selectedDate &&
                                    !formData.tanggalReset &&
                                    "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedDate
                                  ? format(selectedDate, "PPP", {
                                      locale: localeID,
                                    })
                                  : formData.tanggalReset
                                  ? format(
                                      new Date(formData.tanggalReset),
                                      "PPP",
                                      { locale: localeID }
                                    )
                                  : "Pilih tanggal"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={
                                  selectedDate ??
                                  (formData.tanggalReset
                                    ? new Date(formData.tanggalReset)
                                    : undefined)
                                }
                                onSelect={setSelectedDate}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div>
                          <Label>Meter Awal Baru *</Label>
                          <Input
                            type="number"
                            value={formData.meterAwalBaru}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                meterAwalBaru:
                                  Number.parseInt(e.target.value) || 0,
                              }))
                            }
                            placeholder="Masukkan angka meter awal"
                          />
                        </div>

                        <div>
                          <Label>Alasan Reset</Label>
                          <Textarea
                            value={formData.alasan}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                alasan: e.target.value,
                              }))
                            }
                            placeholder="Masukkan alasan reset meter"
                            rows={3}
                          />
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsFormOpen(false);
                              resetForm();
                            }}
                            className="flex-1"
                          >
                            Batal
                          </Button>
                          <Button
                            onClick={handleSubmit}
                            className="flex-1 bg-teal-600 hover:bg-teal-700"
                            disabled={loading}
                          >
                            {loading ? "Menyimpan..." : "Simpan"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </GlassCard>

          {/* Mobile Add Button */}
          {isMobile && (
            <div className="mb-4">
              <Dialog
                open={isFormOpen}
                onOpenChange={(o) => {
                  setIsFormOpen(o);
                  if (!o) resetForm();
                }}
              >
                <DialogTrigger asChild>
                  <Button className="w-full bg-teal-600 hover:bg-teal-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Reset Meter
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingReset ? "Edit Reset Meter" : "Tambah Reset Meter"}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div>
                      <Label>Nama Pelanggan *</Label>
                      <Select
                        value={selectedCustomerId || "PILIH"}
                        onValueChange={handleCustomerSelect}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih pelanggan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PILIH" disabled>
                            Pilih pelanggan
                          </SelectItem>
                          {customers.map((c) => {
                            const zon = c.blok ?? c.zona?.kode ?? "";
                            return (
                              <SelectItem
                                key={c.id}
                                value={String(c.id)}
                                className="truncate"
                              >
                                {joinOneLine([
                                  c.nama,
                                  zon ? prettyZone(zon) : undefined,
                                ])}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Alamat</Label>
                      <Input
                        value={formData.pelanggan.alamat}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            pelanggan: {
                              ...prev.pelanggan,
                              alamat: e.target.value,
                            },
                          }))
                        }
                        placeholder="Masukkan alamat"
                        readOnly={!!selectedCustomerId}
                        className={cn(!!selectedCustomerId && "bg-muted/50")}
                      />
                    </div>

                    {/* Zona - Mobile */}
                    <div>
                      <Label>Blok *</Label>
                      <Select
                        value={selectedZoneId || "PILIH"}
                        onValueChange={(v) => {
                          setSelectedZoneId(v === "PILIH" ? "" : v);
                          const z = zones.find((zz) => zz.id === v);
                          setFormData((prev) => ({
                            ...prev,
                            pelanggan: {
                              ...prev.pelanggan,
                              blok: z?.kode ?? prev.pelanggan.blok,
                            },
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih blok" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PILIH" disabled>
                            Pilih blok
                          </SelectItem>
                          {zones.map((z) => (
                            <SelectItem key={z.id} value={z.id}>
                              {z.kode} — {z.nama}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Tanggal Reset *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal mt-1 mb-2",
                              !selectedDate &&
                                !formData.tanggalReset &&
                                "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate
                              ? format(selectedDate, "PPP", {
                                  locale: localeID,
                                })
                              : formData.tanggalReset
                              ? format(new Date(formData.tanggalReset), "PPP", {
                                  locale: localeID,
                                })
                              : "Pilih tanggal"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={
                              selectedDate ??
                              (formData.tanggalReset
                                ? new Date(formData.tanggalReset)
                                : undefined)
                            }
                            onSelect={setSelectedDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label>Meter Awal Baru *</Label>
                      <Input
                        type="number"
                        value={formData.meterAwalBaru}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            meterAwalBaru: Number.parseInt(e.target.value) || 0,
                          }))
                        }
                        placeholder="Masukkan angka meter awal"
                      />
                    </div>

                    <div>
                      <Label>Alasan Reset</Label>
                      <Textarea
                        value={formData.alasan}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            alasan: e.target.value,
                          }))
                        }
                        placeholder="Masukkan alasan reset meter"
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsFormOpen(false);
                          resetForm();
                        }}
                        className="flex-1"
                      >
                        Batal
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        className="flex-1 bg-teal-600 hover:bg-teal-700"
                        disabled={loading}
                      >
                        {loading ? "Menyimpan..." : "Simpan"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Filters */}
          <GlassCard className="mb-6 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Periode</Label>
                <Select
                  value={filters.periode}
                  onValueChange={(value) => setFilters({ periode: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih periode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025-09">September 2025</SelectItem>
                    <SelectItem value="2025-08">Agustus 2025</SelectItem>
                    <SelectItem value="2025-07">Juli 2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Blok</Label>
                <Select
                  value={filters.zona || "ALL"}
                  onValueChange={(value) =>
                    setFilters({ zona: value === "ALL" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih blok" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Blok</SelectItem>
                    <SelectItem value="A">Blok A</SelectItem>
                    <SelectItem value="B">Blok B</SelectItem>
                    <SelectItem value="C">Blok C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cari</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Nama pelanggan/alamat/blok"
                    value={filters.search}
                    onChange={(e) => setFilters({ search: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Desktop Table */}
          {!isMobile && (
            <GlassCard className="p-6">
              {loading ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  Memuat data...
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Info Pelanggan</TableHead>
                      <TableHead>Info Reset</TableHead>
                      <TableHead className="text-center">Meter Baru</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((reset: any) => (
                      <TableRow key={reset.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {reset.pelanggan?.nama}
                            </div>
                            <div className="text-sm text-gray-600 truncate max-w-48">
                              {reset.pelanggan?.alamat}
                            </div>
                            <div className="text-sm text-gray-500">
                              {joinOneLine([
                                "Blok",
                                prettyZone(reset.pelanggan?.blok),
                              ])}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">
                              <span className="font-medium">Alasan:</span>{" "}
                              {reset.alasan}
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">Tanggal:</span>{" "}
                              {reset.tanggalReset
                                ? format(
                                    new Date(reset.tanggalReset),
                                    "dd MMM yyyy",
                                    { locale: localeID }
                                  )
                                : "-"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="text-lg font-bold text-teal-600">
                            {reset.meterAwalBaru}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(reset.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(reset)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(String(reset.id))}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </GlassCard>
          )}

          {/* Mobile Cards */}
          {isMobile && (
            <div className="space-y-4">
              {loading ? (
                <GlassCard className="p-4 text-center text-sm text-gray-500">
                  Memuat data...
                </GlassCard>
              ) : (
                list.map((reset: any) => (
                  <GlassCard key={reset.id} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-gray-900">
                        {reset.pelanggan?.nama}
                      </h3>
                      {getStatusBadge(reset.status)}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="border-b border-gray-100 pb-2">
                        <span className="text-gray-600">Blok:</span>{" "}
                        <span className="font-medium">
                          {prettyZone(reset.pelanggan?.blok)}
                        </span>
                      </div>
                      <div className="border-b border-gray-100 pb-2">
                        <span className="text-gray-600">Alasan Reset:</span>{" "}
                        <span className="font-medium">{reset.alasan}</span>
                      </div>
                      <div className="border-b border-gray-100 pb-2">
                        <span className="text-gray-600">Meter Awal Baru:</span>{" "}
                        <span className="text-xl font-bold text-teal-600">
                          {reset.meterAwalBaru}
                        </span>
                      </div>
                      <div className="pb-2">
                        <span className="text-gray-600">Tanggal Reset:</span>{" "}
                        <span className="font-medium">
                          {reset.tanggalReset
                            ? format(
                                new Date(reset.tanggalReset),
                                "dd MMM yyyy",
                                { locale: localeID }
                              )
                            : "-"}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(reset)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-transparent"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Lihat
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(String(reset.id))}
                        className="flex-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Hapus
                      </Button>
                    </div>
                  </GlassCard>
                ))
              )}
            </div>
          )}
        </div>
      </AppShell>
    </AuthGuard>
  );
}

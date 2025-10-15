// // app/catat-tandon/page.tsx
// "use client";

// import React, { useEffect, useMemo, useState } from "react";
// import useSWR, { useSWRConfig } from "swr";
// import { AuthGuard } from "@/components/auth-guard";
// import { AppShell } from "@/components/app-shell";
// import { AppHeader } from "@/components/app-header";
// import { GlassCard } from "@/components/glass-card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";
// import { Textarea } from "@/components/ui/textarea";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import {
//   Save,
//   Search,
//   LockOpen,
//   Lock,
//   ChevronDown,
//   Calendar,
//   User,
// } from "lucide-react";
// import { useToast } from "@/hooks/use-toast";
// import { LockRowModal } from "@/components/lock-row-modal";
// import { format } from "date-fns";
// import idLocale from "date-fns/locale/id";

// /* ===== Types ===== */
// type TandonOpt = { id: string; kode: string; nama: string };
// type Row = {
//   id: string;
//   kodeTandon: string;
//   nama: string;
//   meterAwal: number;
//   meterAkhir: number | null;
//   pemakaian: number;
//   status: "pending" | "completed";
//   kendala?: string;
//   locked?: boolean;
// };
// type Resp = {
//   ok: true;
//   period: string;
//   locked?: boolean;
//   progress: {
//     total: number;
//     selesai: number;
//     pending: number;
//     percent: number;
//   };
//   items: Row[];
// };
// type MonthOpt = { value: string; label: string };

// const fetcher = (u: string) => fetch(u).then((r) => r.json());

// export default function CatatTandonPage() {
//   const { toast } = useToast();
//   const { mutate } = useSWRConfig();

//   /* Periode (dropdown server) */
//   const { data: monthsResp } = useSWR<{ ok: true; items: MonthOpt[] }>(
//     "/api/catat-tandon?action=months",
//     fetcher,
//     { revalidateOnFocus: false }
//   );
//   const monthOptions = monthsResp?.items ?? [];
//   const [periode, setPeriode] = useState<string>("");

//   useEffect(() => {
//     if (!periode && monthOptions.length) setPeriode(monthOptions[0].value);
//   }, [monthOptions, periode]);

//   /* Tanggal catat default dari Setting */
//   const { data: dateResp } = useSWR<{ ok: true; date: string }>(
//     () =>
//       periode
//         ? `/api/catat-tandon?action=default-date&period=${encodeURIComponent(
//             periode
//           )}`
//         : null,
//     fetcher,
//     { revalidateOnFocus: false }
//   );
//   const tanggalCatatStr = dateResp?.date ?? "";

//   /* Dropdown tandon + search */
//   const [tandons, setTandons] = useState<TandonOpt[]>([]);
//   const [tandonId, setTandonId] = useState<string>("ALL");
//   const [searchTerm, setSearchTerm] = useState("");

//   useEffect(() => {
//     (async () => {
//       const res = await fetch("/api/tandon/list", { cache: "no-store" }).catch(
//         () => null
//       );
//       if (!res?.ok) return setTandons([]);
//       const js = await res.json();
//       setTandons(Array.isArray(js?.items) ? js.items : []);
//     })();
//   }, []);

//   /* Data utama (tidak tergantung tandonId, filter dilakukan di FE) */
//   const key = useMemo(() => {
//     if (!periode) return null;
//     return `/api/catat-tandon?periode=${encodeURIComponent(periode)}`;
//   }, [periode]);

//   const { data, isLoading, error } = useSWR<Resp>(key, fetcher, {
//     revalidateOnFocus: false,
//   });

//   const rowsAll = (data?.ok ? data.items : []) as Row[];
//   const rowsFilteredByTandon =
//     tandonId === "ALL"
//       ? rowsAll
//       : rowsAll.filter(
//           (r) => r.kodeTandon === tandons.find((t) => t.id === tandonId)?.kode
//         );
//   const rows = (rowsFilteredByTandon || []).filter(
//     (r) =>
//       r.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       r.kodeTandon.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   const [expanded, setExpanded] = useState<string | null>(null);
//   const [bufEnd, setBufEnd] = useState<Record<string, string>>({});
//   const [bufNote, setBufNote] = useState<Record<string, string>>({});
//   const [autoSaving, setAutoSaving] = useState<Record<string, boolean>>({});
//   const [lockTarget, setLockTarget] = useState<Row | null>(null);
//   const [locking, setLocking] = useState(false);

//   /* Petugas (localStorage) */
//   const [officerName, setOfficerName] = useState<string>("");
//   useEffect(() => {
//     try {
//       const raw = localStorage.getItem("tb_user");
//       if (raw) {
//         const u = JSON.parse(raw) as { name?: string };
//         if (u?.name) setOfficerName(u.name);
//       }
//     } catch {}
//   }, []);

//   /* Status periode */
//   const progressPct = Math.min(
//     100,
//     Math.max(0, Math.round(Number(data?.progress?.percent || 0)))
//   );
//   const isPeriodeLocked = !!data?.locked;
//   const isPeriodeFinal =
//     isPeriodeLocked ||
//     (!!data?.progress?.total &&
//       data.progress.total > 0 &&
//       data.progress.selesai === data.progress.total);

//   useEffect(() => {
//     if (!data?.ok) return;
//     const init: Record<string, string> = {};
//     for (const r of data.items) init[r.id] = r.kendala ?? "";
//     setBufNote(init);
//   }, [data]);

//   const getStatusBadge = (s: Row["status"]) =>
//     s === "completed" ? (
//       <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
//         Selesai
//       </Badge>
//     ) : (
//       <Badge variant="secondary">Pending</Badge>
//     );

//   /* Actions */
//   const saveRow = async (row: Row, endOverride?: number) => {
//     if (isPeriodeFinal || row.locked) {
//       toast({
//         title: "Terkunci",
//         description: "Periode atau baris terkunci.",
//         variant: "destructive",
//       });
//       return;
//     }
//     const raw = endOverride != null ? String(endOverride) : bufEnd[row.id];
//     const parsed = raw === "" || raw == null ? null : Number(raw);
//     if (parsed == null || !Number.isFinite(parsed)) {
//       toast({
//         title: "Input belum diisi",
//         description: "Masukkan meter akhir dahulu",
//         variant: "destructive",
//       });
//       return;
//     }
//     if (parsed < row.meterAwal) {
//       toast({
//         title: "Nilai tidak valid",
//         description: "Meter akhir < meter awal",
//         variant: "destructive",
//       });
//       return;
//     }
//     try {
//       setAutoSaving((p) => ({ ...p, [row.id]: true }));
//       const res = await fetch("/api/catat-tandon", {
//         method: "PUT",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           id: row.id,
//           meterAkhir: parsed,
//           kendala: bufNote[row.id] || "",
//         }),
//       });
//       const js = await res.json();
//       if (!res.ok || !js?.ok) throw new Error(js?.message || "Gagal simpan");
//       if (key) await mutate(key);
//       setBufEnd((p) => {
//         const { [row.id]: _drop, ...rest } = p;
//         return rest;
//       });
//       toast({ title: "Tersimpan", description: `Catat Meter ${row.nama}` });
//     } catch (e: any) {
//       toast({
//         title: "Gagal simpan",
//         description: e?.message ?? "Error",
//         variant: "destructive",
//       });
//     } finally {
//       setAutoSaving((p) => {
//         const { [row.id]: _drop, ...rest } = p;
//         return rest;
//       });
//     }
//   };

//   const finalizeRow = async (row: Row) => {
//     try {
//       setLocking(true);
//       const res = await fetch("/api/catat-tandon/finalize-row", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ id: row.id }),
//       });
//       const js = await res.json();
//       if (!res.ok || !js?.ok) throw new Error(js?.message || "Gagal finalize");
//       if (key) await mutate(key);
//       toast({
//         title: "Terkunci",
//         description: `Tandon ${row.nama} dikunci & carry ke bulan depan`,
//       });
//     } catch (e: any) {
//       toast({
//         title: "Gagal finalize",
//         description: e?.message ?? "Error",
//         variant: "destructive",
//       });
//     } finally {
//       setLocking(false);
//       setLockTarget(null);
//     }
//   };

//   // Tombol Mulai Pencatatan (opsional; sistem tetap auto di GET)
//   const handleStart = async () => {
//     if (!periode) return;
//     await mutate(key);
//     toast({
//       title: "Siap dicatat",
//       description: `Periode ${periode} • Petugas: ${officerName || "-"}`,
//     });
//   };

//   return (
//     <AuthGuard requiredRole="PETUGAS">
//       <AppShell>
//         <AppHeader title="Catat Meter Tandon" />

//         <div className="max-w-8xl mx-auto space-y-6">
//           {/* ===== STATUS & PETUGAS =====
//           {periode && (
//             <div className="flex flex-wrap items-center gap-3 px-1">
//               <span className="text-sm text-muted-foreground">
//                 Status Periode:
//               </span>
//               <Badge
//                 variant={isPeriodeFinal ? "default" : "secondary"}
//                 className={
//                   isPeriodeFinal
//                     ? "bg-green-100 text-green-800 hover:bg-green-100"
//                     : "bg-gray-100 text-gray-800 hover:bg-gray-100"
//                 }
//               >
//                 {isPeriodeFinal ? "FINAL" : "DRAFT"}
//               </Badge>

//               {officerName && (
//                 <span className="inline-flex items-center text-sm text-muted-foreground ml-1">
//                   <User className="w-4 h-4 mr-1" />
//                   Petugas:
//                   <span className="ml-1 font-medium text-foreground">
//                     {officerName}
//                   </span>
//                 </span>
//               )}
//             </div>
//           )} */}

//           {/* ===== HEADER FILTER ===== */}
//           <GlassCard className="p-6">
//             {/* ===== STATUS & PETUGAS ===== */}
//             <h2 className="text-xl font-semibold text-foreground mb-4">
//               Pilih Periode Pencatatan
//             </h2>
//             {periode && (
//               <div className="flex flex-wrap items-center gap-3 px-1">
//                 <span className="text-sm text-muted-foreground">
//                   Status Periode:
//                 </span>
//                 <Badge
//                   variant={isPeriodeFinal ? "default" : "secondary"}
//                   className={
//                     isPeriodeFinal
//                       ? "bg-green-100 text-green-800 hover:bg-green-100"
//                       : "bg-gray-100 text-gray-800 hover:bg-gray-100"
//                   }
//                 >
//                   {isPeriodeFinal ? "FINAL" : "DRAFT"}
//                 </Badge>

//                 {officerName && (
//                   <span className="inline-flex items-center text-sm text-muted-foreground ml-1">
//                     <User className="w-4 h-4 mr-1" />
//                     Petugas:
//                     <span className="ml-1 font-medium text-foreground">
//                       {officerName}
//                     </span>
//                   </span>
//                 )}
//               </div>
//             )}
//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
//               {/* Periode */}
//               <div>
//                 <p className="text-sm font-medium mb-2">Periode Pencatatan</p>
//                 <Select
//                   value={periode || ""}
//                   onValueChange={setPeriode}
//                   disabled={!monthOptions.length}
//                 >
//                   <SelectTrigger className="h-12 bg-card/50">
//                     <SelectValue placeholder="Pilih periode…" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {monthOptions.map((m) => (
//                       <SelectItem key={m.value} value={m.value}>
//                         {m.label}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//                 <p className="mt-2 text-xs text-muted-foreground">
//                   Untuk penagihan bulan berikutnya.
//                 </p>
//               </div>

//               {/* Tanggal Catat */}
//               <div>
//                 <p className="text-sm font-medium mb-2">Tanggal Catat</p>
//                 <div className="relative">
//                   <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
//                   <Input
//                     value={
//                       tanggalCatatStr
//                         ? format(new Date(tanggalCatatStr), "dd/MM/yyyy", {
//                             locale: idLocale,
//                           })
//                         : "-"
//                     }
//                     readOnly
//                     className="h-12 pl-9 bg-muted/40"
//                   />
//                 </div>
//                 <p className="mt-2 text-xs text-muted-foreground">
//                   Tanggal rencana pencatatan bulan ini.
//                 </p>
//               </div>

//               {/* Petugas */}
//               <div>
//                 <p className="text-sm font-medium mb-2">Petugas</p>
//                 <div className="h-12 px-3 rounded-md bg-muted/40 border flex items-center">
//                   <User className="w-4 h-4 mr-1 text-muted-foreground" />
//                   <span className="text-sm">{officerName || "-"}</span>
//                 </div>
//                 <p className="mt-2 text-xs text-muted-foreground">
//                   Diambil otomatis dari akun yang login.
//                 </p>
//               </div>
//             </div>

//             {/* Filter Tandon + Cari */}
//             <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
//               <div>
//                 <p className="text-sm font-medium mb-2">Filter Tandon</p>
//                 <Select value={tandonId} onValueChange={setTandonId}>
//                   <SelectTrigger className="bg-card/50">
//                     <SelectValue placeholder="Pilih tandon…" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="ALL">Semua Tandon</SelectItem>
//                     {tandons.map((t) => (
//                       <SelectItem key={t.id} value={t.id}>
//                         {t.nama} ({t.kode})
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//                 <p className="mt-2 text-xs text-muted-foreground">
//                   Menyaring daftar tandon yang ditampilkan.
//                 </p>
//               </div>

//               <div className="md:col-span-2 lg:col-span-3">
//                 <p className="text-sm font-medium mb-2">Cari</p>
//                 <div className="relative">
//                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
//                   <Input
//                     value={searchTerm}
//                     onChange={(e) => setSearchTerm(e.target.value)}
//                     placeholder="Cari tandon…"
//                     className="pl-10 bg-card/50"
//                   />
//                 </div>
//                 {data?.ok && (
//                   <p className="mt-2 text-xs text-muted-foreground">
//                     Progress: {data.progress.selesai}/{data.progress.total} (
//                     {progressPct}%)
//                   </p>
//                 )}
//               </div>
//             </div>

//             {/* Tombol Mulai */}
//             <div className="mt-6">
//               <Button onClick={handleStart} className="h-12 w-full">
//                 Mulai Pencatatan
//               </Button>
//             </div>

//             {/* Info hijau saat final */}
//             {isPeriodeFinal && (
//               <div className="mt-4 p-4 bg-green-50/50 border border-green-200/50 rounded-lg">
//                 <p className="text-sm font-medium text-green-800">
//                   Periode telah dikunci penuh
//                 </p>
//                 <p className="text-xs text-green-700">
//                   Seluruh baris terkunci.
//                 </p>
//               </div>
//             )}
//           </GlassCard>

//           {/* ===== DAFTAR PENCATATAN (ini yang sebelumnya hilang) ===== */}
//           <GlassCard className="p-6">
//             {periode && data?.ok && (
//               <>
//                 {/* progress bar atas */}
//                 <div className="mb-4">
//                   <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
//                     <div
//                       className="h-2 bg-emerald-600"
//                       style={{ width: `${progressPct}%` }}
//                     />
//                   </div>
//                   <p className="mt-1 text-xs text-muted-foreground">
//                     Progress: {data.progress.selesai}/{data.progress.total} (
//                     {progressPct}%)
//                   </p>
//                 </div>
//               </>
//             )}

//             {/* MOBILE list (cards) */}
//             <div className="md:hidden">
//               {!periode ? (
//                 <div className="p-4 text-sm text-muted-foreground bg-muted/20 rounded">
//                   Pilih periode dulu.
//                 </div>
//               ) : isLoading ? (
//                 <div className="p-4 text-sm text-muted-foreground">Memuat…</div>
//               ) : error ? (
//                 <div className="p-4 text-sm text-destructive">
//                   Gagal memuat data.
//                 </div>
//               ) : (
//                 <div className="space-y-3">
//                   {rows.length === 0 && (
//                     <div className="p-4 text-sm text-muted-foreground text-center">
//                       Tidak ada data.
//                     </div>
//                   )}

//                   {rows.map((r) => {
//                     const locked = !!r.locked || isPeriodeFinal;
//                     const endVal =
//                       bufEnd[r.id] === undefined
//                         ? r.meterAkhir ?? ""
//                         : bufEnd[r.id];
//                     const parsed = endVal === "" ? NaN : Number(endVal);
//                     const pem = Number.isFinite(parsed)
//                       ? Math.max(0, parsed - r.meterAwal)
//                       : Math.max(0, (r.meterAkhir ?? 0) - r.meterAwal);

//                     return (
//                       <div
//                         key={r.id}
//                         className="rounded-xl border border-border/40 bg-card/40 p-4 shadow-sm overflow-hidden"
//                       >
//                         <div className="flex items-center justify-between">
//                           <div className="font-medium text-primary">
//                             {r.kodeTandon}
//                           </div>
//                           <div>
//                             {r.status === "completed" ? (
//                               <Badge className="bg-green-100 text-green-800">
//                                 Selesai
//                               </Badge>
//                             ) : (
//                               <Badge variant="secondary">Pending</Badge>
//                             )}
//                           </div>
//                         </div>
//                         <div className="text-sm text-foreground mt-1">
//                           {r.nama}
//                         </div>

//                         <div className="mt-3 grid grid-cols-2 gap-3">
//                           <div>
//                             <div className="text-xs text-muted-foreground">
//                               Meter Awal
//                             </div>
//                             <div className="font-medium">{r.meterAwal}</div>
//                           </div>
//                           <div>
//                             <div className="text-xs text-muted-foreground">
//                               Meter Akhir
//                             </div>
//                             <Input
//                               type="number"
//                               value={endVal}
//                               onChange={(e) =>
//                                 setBufEnd((p) => ({
//                                   ...p,
//                                   [r.id]: e.target.value,
//                                 }))
//                               }
//                               className="h-9 text-center w-full"
//                               placeholder="0"
//                               min={r.meterAwal}
//                               readOnly={locked}
//                               disabled={locked || !!autoSaving[r.id]}
//                             />
//                           </div>
//                         </div>

//                         <div className="mt-2 text-xs text-muted-foreground">
//                           Pemakaian:{" "}
//                           <span className="font-medium text-primary">
//                             {pem} m³
//                           </span>
//                         </div>

//                         <div className="mt-3 flex flex-wrap items-center gap-2">
//                           {!locked && (
//                             <Button
//                               size="sm"
//                               variant="outline"
//                               className="h-9 shrink-0"
//                               disabled={
//                                 !Number.isFinite(parsed) || !!autoSaving[r.id]
//                               }
//                               onClick={() =>
//                                 saveRow(
//                                   r,
//                                   Number.isFinite(parsed)
//                                     ? Number(parsed)
//                                     : undefined
//                                 )
//                               }
//                             >
//                               <Save className="w-4 h-4 mr-1" />
//                               Simpan
//                             </Button>
//                           )}

//                           {!locked ? (
//                             <Button
//                               size="sm"
//                               variant="outline"
//                               className="h-9 shrink-0"
//                               onClick={() => setLockTarget(r)}
//                             >
//                               <LockOpen className="w-4 h-4 mr-1" />
//                               Kunci
//                             </Button>
//                           ) : (
//                             <Button
//                               size="sm"
//                               variant="outline"
//                               className="h-9 text-green-600 shrink-0"
//                             >
//                               <Lock className="w-4 h-4 mr-1" />
//                               Terkunci
//                             </Button>
//                           )}

//                           <Button
//                             size="sm"
//                             variant="outline"
//                             className="h-9 shrink-0 sm:ml-auto"
//                             onClick={() =>
//                               setExpanded(expanded === r.id ? null : r.id)
//                             }
//                           >
//                             <ChevronDown
//                               className={`w-4 h-4 mr-1 transition-transform ${
//                                 expanded === r.id ? "rotate-180" : ""
//                               }`}
//                             />
//                             Catatan
//                           </Button>
//                         </div>

//                         {expanded === r.id && (
//                           <div className="mt-3 w-full">
//                             <label className="text-xs text-muted-foreground">
//                               Kendala (opsional)
//                             </label>
//                             <Textarea
//                               value={bufNote[r.id] ?? ""}
//                               onChange={(e) =>
//                                 setBufNote((p) => ({
//                                   ...p,
//                                   [r.id]: e.target.value,
//                                 }))
//                               }
//                               placeholder={
//                                 locked
//                                   ? "Dikunci"
//                                   : "Catat kendala (misal kebocoran, dll.)"
//                               }
//                               className="h-20 mt-1 w-full"
//                               readOnly={locked}
//                               disabled={locked}
//                             />
//                           </div>
//                         )}
//                       </div>
//                     );
//                   })}
//                 </div>
//               )}
//             </div>

//             {/* DESKTOP table */}
//             <div className="hidden md:block">
//               {!periode ? (
//                 <div className="p-4 text-sm text-muted-foreground bg-muted/20 rounded">
//                   Pilih periode dulu.
//                 </div>
//               ) : isLoading ? (
//                 <div className="p-4 text-sm text-muted-foreground">Memuat…</div>
//               ) : error ? (
//                 <div className="p-4 text-sm text-destructive">
//                   Gagal memuat data.
//                 </div>
//               ) : (
//                 <div className="overflow-x-auto">
//                   <table className="w-full">
//                     <thead>
//                       <tr className="border-b border-border/20">
//                         <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
//                           Kode
//                         </th>
//                         <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
//                           Nama Tandon
//                         </th>
//                         <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
//                           Meter Awal
//                         </th>
//                         <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
//                           Meter Akhir
//                         </th>
//                         <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
//                           Pemakaian
//                         </th>
//                         <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
//                           Aksi
//                         </th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {rows.map((r) => {
//                         const locked = !!r.locked || isPeriodeFinal;
//                         const endVal =
//                           bufEnd[r.id] === undefined
//                             ? r.meterAkhir ?? ""
//                             : bufEnd[r.id];
//                         const parsed = endVal === "" ? NaN : Number(endVal);
//                         const pem = Number.isFinite(parsed)
//                           ? Math.max(0, parsed - r.meterAwal)
//                           : Math.max(0, (r.meterAkhir ?? 0) - r.meterAwal);

//                         return (
//                           <React.Fragment key={r.id}>
//                             <tr className="border-b border-border/10 hover:bg-muted/20">
//                               <td className="py-3 px-4 text-sm font-medium text-primary">
//                                 {r.kodeTandon}
//                               </td>
//                               <td className="py-3 px-4">
//                                 <p className="text-sm font-medium text-foreground">
//                                   {r.nama}
//                                 </p>
//                                 <div className="text-xs mt-1">
//                                   {getStatusBadge(r.status)}
//                                 </div>
//                               </td>
//                               <td className="py-3 px-4 text-sm text-center">
//                                 {r.meterAwal}
//                               </td>
//                               <td className="py-3 px-4 text-center">
//                                 <Input
//                                   type="number"
//                                   value={endVal}
//                                   onChange={(e) =>
//                                     setBufEnd((p) => ({
//                                       ...p,
//                                       [r.id]: e.target.value,
//                                     }))
//                                   }
//                                   className="w-28 h-8 text-center text-sm"
//                                   placeholder="0"
//                                   min={r.meterAwal}
//                                   readOnly={locked}
//                                   disabled={locked || !!autoSaving[r.id]}
//                                 />
//                               </td>
//                               <td className="py-3 px-4 text-sm text-center font-medium text-primary">
//                                 {pem} m³
//                               </td>
//                               <td className="py-3 px-4 text-center">
//                                 <div className="flex items-center justify-center gap-1">
//                                   {!locked && (
//                                     <Button
//                                       size="sm"
//                                       variant="outline"
//                                       className="h-8 px-2 bg-transparent"
//                                       disabled={
//                                         !Number.isFinite(parsed) ||
//                                         !!autoSaving[r.id]
//                                       }
//                                       onClick={() =>
//                                         saveRow(
//                                           r,
//                                           Number.isFinite(parsed)
//                                             ? Number(parsed)
//                                             : undefined
//                                         )
//                                       }
//                                       title="Simpan"
//                                     >
//                                       <Save className="w-4 h-4" />
//                                     </Button>
//                                   )}
//                                   {!locked ? (
//                                     <Button
//                                       size="sm"
//                                       variant="outline"
//                                       className="h-8 px-2"
//                                       onClick={() => setLockTarget(r)}
//                                       title="Kunci & Finalisasi"
//                                     >
//                                       <LockOpen className="w-4 h-4" />
//                                     </Button>
//                                   ) : (
//                                     <Button
//                                       size="sm"
//                                       variant="outline"
//                                       className="h-8 px-2 text-green-600"
//                                       title="Terkunci"
//                                     >
//                                       <Lock className="w-4 h-4" />
//                                     </Button>
//                                   )}
//                                   <Button
//                                     size="sm"
//                                     variant="outline"
//                                     className="h-8 px-2 bg-transparent"
//                                     onClick={() =>
//                                       setExpanded(
//                                         expanded === r.id ? null : r.id
//                                       )
//                                     }
//                                     title="Catatan/kendala"
//                                   >
//                                     <ChevronDown
//                                       className={`w-4 h-4 transition-transform ${
//                                         expanded === r.id ? "rotate-180" : ""
//                                       }`}
//                                     />
//                                   </Button>
//                                 </div>
//                               </td>
//                             </tr>

//                             {expanded === r.id && (
//                               <tr className="bg-primary/5">
//                                 <td colSpan={6} className="p-4">
//                                   <label className="text-xs text-muted-foreground">
//                                     Kendala (opsional)
//                                   </label>
//                                   <Textarea
//                                     value={bufNote[r.id] ?? ""}
//                                     onChange={(e) =>
//                                       setBufNote((p) => ({
//                                         ...p,
//                                         [r.id]: e.target.value,
//                                       }))
//                                     }
//                                     placeholder={
//                                       locked
//                                         ? "Dikunci"
//                                         : "Catat kendala (misal kebocoran, dll.)"
//                                     }
//                                     className="h-20 text-sm mt-1 w-full"
//                                     readOnly={locked}
//                                     disabled={locked}
//                                   />
//                                 </td>
//                               </tr>
//                             )}
//                           </React.Fragment>
//                         );
//                       })}

//                       {rows.length === 0 && (
//                         <tr>
//                           <td
//                             colSpan={6}
//                             className="py-6 text-center text-sm text-muted-foreground"
//                           >
//                             Tidak ada data.
//                           </td>
//                         </tr>
//                       )}
//                     </tbody>
//                   </table>
//                 </div>
//               )}
//               {/* Ringkas */}
//               {data?.ok && (
//                 <div className="mt-6 pt-4 border-t border-border/20 grid grid-cols-1 md:grid-cols-3 gap-4">
//                   <div className="text-center p-4 bg-primary/10 rounded-lg">
//                     <p className="text-2xl font-bold text-primary">
//                       {data.progress.selesai}
//                     </p>
//                     <p className="text-sm text-muted-foreground">Selesai</p>
//                   </div>
//                   <div className="text-center p-4 bg-yellow-100/50 rounded-lg">
//                     <p className="text-2xl font-bold text-yellow-600">
//                       {data.progress.pending}
//                     </p>
//                     <p className="text-sm text-muted-foreground">Pending</p>
//                   </div>
//                   <div className="text-center p-4 bg-green-100/50 rounded-lg">
//                     <p className="text-2xl font-bold text-green-600">
//                       {" "}
//                       {Math.round(progressPct)}%
//                     </p>
//                     <p className="text-sm text-muted-foreground">Progress</p>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </GlassCard>

//           {/* ===== STATISTIK =====
//           {data?.ok && (
//             <GlassCard className="p-4">
//               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//                 <div className="rounded-xl border bg-emerald-50/50 px-6 py-6 text-center">
//                   <div className="text-3xl font-semibold text-emerald-700">
//                     {data.progress.selesai}
//                   </div>
//                   <div className="mt-1 text-sm text-emerald-800/80">
//                     Selesai
//                   </div>
//                 </div>
//                 <div className="rounded-xl border bg-yellow-50/60 px-6 py-6 text-center">
//                   <div className="text-3xl font-semibold text-amber-700">
//                     {data.progress.pending}
//                   </div>
//                   <div className="mt-1 text-sm text-amber-800/80">Pending</div>
//                 </div>
//                 <div className="rounded-xl border bg-green-50/50 px-6 py-6 text-center">
//                   <div className="text-3xl font-semibold text-green-700">
//                     {Math.round(progressPct)}%
//                   </div>
//                   <div className="mt-1 text-sm text-green-800/80">Progress</div>
//                 </div>
//               </div>
//             </GlassCard>
//           )} */}
//         </div>

//         {/* modal kunci */}
//         <LockRowModal
//           open={!!lockTarget}
//           onClose={() => setLockTarget(null)}
//           onConfirm={() => lockTarget && finalizeRow(lockTarget)}
//           isLoading={locking}
//           row={lockTarget as any}
//           period={periode}
//           headerTarif={0}
//           headerAbon={0}
//         />
//       </AppShell>
//     </AuthGuard>
//   );
// }
// app/catat-tandon/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { AppHeader } from "@/components/app-header";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Save,
  Search,
  LockOpen,
  Lock,
  ChevronDown,
  Calendar,
  User,
  Info, // ⬅️ NEW
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LockRowModal } from "@/components/lock-row-modal";
import { format } from "date-fns";
import idLocale from "date-fns/locale/id";

// ⬇️ NEW: Tooltip components & Dialog (untuk mobile)
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ===== Types ===== */
type TandonOpt = { id: string; kode: string; nama: string };
type Row = {
  id: string;
  kodeTandon: string;
  nama: string;
  meterAwal: number;
  meterAkhir: number | null;
  pemakaian: number;
  status: "pending" | "completed";
  kendala?: string;
  locked?: boolean;
};
type Resp = {
  ok: true;
  period: string;
  locked?: boolean;
  progress: {
    total: number;
    selesai: number;
    pending: number;
    percent: number;
  };
  items: Row[];
};
type MonthOpt = { value: string; label: string };

const fetcher = (u: string) => fetch(u).then((r) => r.json());

/* ===== NEW: helper untuk deteksi mobile & komponen InfoTip ===== */
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

/* ===== Page ===== */
export default function CatatTandonPage() {
  const { toast } = useToast();
  const { mutate } = useSWRConfig();

  // NEW: state untuk dialog tooltip di mobile
  const [openTip, setOpenTip] = useState(false);

  /* Periode (dropdown server) */
  const { data: monthsResp } = useSWR<{ ok: true; items: MonthOpt[] }>(
    "/api/catat-tandon?action=months",
    fetcher,
    { revalidateOnFocus: false }
  );
  const monthOptions = monthsResp?.items ?? [];
  const [periode, setPeriode] = useState<string>("");

  useEffect(() => {
    if (!periode && monthOptions.length) setPeriode(monthOptions[0].value);
  }, [monthOptions, periode]);

  /* Tanggal catat default dari Setting */
  const { data: dateResp } = useSWR<{ ok: true; date: string }>(
    () =>
      periode
        ? `/api/catat-tandon?action=default-date&period=${encodeURIComponent(
            periode
          )}`
        : null,
    fetcher,
    { revalidateOnFocus: false }
  );
  const tanggalCatatStr = dateResp?.date ?? "";

  /* Dropdown tandon + search */
  const [tandons, setTandons] = useState<TandonOpt[]>([]);
  const [tandonId, setTandonId] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/tandon/list", { cache: "no-store" }).catch(
        () => null
      );
      if (!res?.ok) return setTandons([]);
      const js = await res.json();
      setTandons(Array.isArray(js?.items) ? js.items : []);
    })();
  }, []);

  /* Data utama */
  const key = useMemo(() => {
    if (!periode) return null;
    return `/api/catat-tandon?periode=${encodeURIComponent(periode)}`;
  }, [periode]);

  const { data, isLoading, error } = useSWR<Resp>(key, fetcher, {
    revalidateOnFocus: false,
  });

  const rowsAll = (data?.ok ? data.items : []) as Row[];
  const rowsFilteredByTandon =
    tandonId === "ALL"
      ? rowsAll
      : rowsAll.filter(
          (r) => r.kodeTandon === tandons.find((t) => t.id === tandonId)?.kode
        );
  const rows = (rowsFilteredByTandon || []).filter(
    (r) =>
      r.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.kodeTandon.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [expanded, setExpanded] = useState<string | null>(null);
  const [bufEnd, setBufEnd] = useState<Record<string, string>>({});
  const [bufNote, setBufNote] = useState<Record<string, string>>({});
  const [autoSaving, setAutoSaving] = useState<Record<string, boolean>>({});
  const [lockTarget, setLockTarget] = useState<Row | null>(null);
  const [locking, setLocking] = useState(false);

  /* Petugas (localStorage) */
  const [officerName, setOfficerName] = useState<string>("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tb_user");
      if (raw) {
        const u = JSON.parse(raw) as { name?: string };
        if (u?.name) setOfficerName(u.name);
      }
    } catch {}
  }, []);

  /* Status periode */
  const progressPct = Math.min(
    100,
    Math.max(0, Math.round(Number(data?.progress?.percent || 0)))
  );
  const isPeriodeLocked = !!data?.locked;
  const isPeriodeFinal =
    isPeriodeLocked ||
    (!!data?.progress?.total &&
      data.progress.total > 0 &&
      data.progress.selesai === data.progress.total);

  useEffect(() => {
    if (!data?.ok) return;
    const init: Record<string, string> = {};
    for (const r of data.items) init[r.id] = r.kendala ?? "";
    setBufNote(init);
  }, [data]);

  const getStatusBadge = (s: Row["status"]) =>
    s === "completed" ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        Selesai
      </Badge>
    ) : (
      <Badge variant="secondary">Pending</Badge>
    );

  /* Actions */
  const saveRow = async (row: Row, endOverride?: number) => {
    if (isPeriodeFinal || row.locked) {
      toast({
        title: "Terkunci",
        description: "Periode atau baris terkunci.",
        variant: "destructive",
      });
      return;
    }
    const raw = endOverride != null ? String(endOverride) : bufEnd[row.id];
    const parsed = raw === "" || raw == null ? null : Number(raw);
    if (parsed == null || !Number.isFinite(parsed)) {
      toast({
        title: "Input belum diisi",
        description: "Masukkan meter akhir dahulu",
        variant: "destructive",
      });
      return;
    }
    if (parsed < row.meterAwal) {
      toast({
        title: "Nilai tidak valid",
        description: "Meter akhir < meter awal",
        variant: "destructive",
      });
      return;
    }
    try {
      setAutoSaving((p) => ({ ...p, [row.id]: true }));
      const res = await fetch("/api/catat-tandon", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          meterAkhir: parsed,
          kendala: bufNote[row.id] || "",
        }),
      });
      const js = await res.json();
      if (!res.ok || !js?.ok) throw new Error(js?.message || "Gagal simpan");
      if (key) await mutate(key);
      setBufEnd((p) => {
        const { [row.id]: _drop, ...rest } = p;
        return rest;
      });
      toast({ title: "Tersimpan", description: `Catat Meter ${row.nama}` });
    } catch (e: any) {
      toast({
        title: "Gagal simpan",
        description: e?.message ?? "Error",
        variant: "destructive",
      });
    } finally {
      setAutoSaving((p) => {
        const { [row.id]: _drop, ...rest } = p;
        return rest;
      });
    }
  };

  const finalizeRow = async (row: Row) => {
    try {
      setLocking(true);
      const res = await fetch("/api/catat-tandon/finalize-row", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });
      const js = await res.json();
      if (!res.ok || !js?.ok) throw new Error(js?.message || "Gagal finalize");
      if (key) await mutate(key);
      toast({
        title: "Terkunci",
        description: `Tandon ${row.nama} dikunci & carry ke bulan depan`,
      });
    } catch (e: any) {
      toast({
        title: "Gagal finalize",
        description: e?.message ?? "Error",
        variant: "destructive",
      });
    } finally {
      setLocking(false);
      setLockTarget(null);
    }
  };

  const handleStart = async () => {
    if (!periode) return;
    await mutate(key);
    toast({
      title: "Siap dicatat",
      description: `Periode ${periode} • Petugas: ${officerName || "-"}`,
    });
  };

  return (
    <AuthGuard requiredRole="PETUGAS">
      <AppShell>
        <AppHeader
          title="Catat Meter Tandon"
          // ⬇️ NEW: tooltip di samping judul
          titleExtra={
            <InfoTip
              ariaLabel="Apa itu Catat Meter Tandon?"
              open={openTip}
              onOpenChange={setOpenTip}
            >
              <b>Catat Meter Tandon</b> dipakai untuk mencatat angka meter
              tandon per periode. Saat baris dikunci atau status periode{" "}
              <b>FINAL</b>, nilainya tidak bisa diubah.
            </InfoTip>
          }
        />

        <div className="max-w-8xl mx-auto space-y-6">
          {/* ===== HEADER FILTER ===== */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Pilih Periode Pencatatan
            </h2>
            {periode && (
              <div className="flex flex-wrap items-center gap-3 px-1">
                <span className="text-sm text-muted-foreground">
                  Status Periode:
                </span>
                <Badge
                  variant={isPeriodeFinal ? "default" : "secondary"}
                  className={
                    isPeriodeFinal
                      ? "bg-green-100 text-green-800 hover:bg-green-100"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                  }
                >
                  {isPeriodeFinal ? "FINAL" : "DRAFT"}
                </Badge>

                {officerName && (
                  <span className="inline-flex items-center text-sm text-muted-foreground ml-1">
                    <User className="w-4 h-4 mr-1" />
                    Petugas:
                    <span className="ml-1 font-medium text-foreground">
                      {officerName}
                    </span>
                  </span>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
              {/* Periode */}
              <div>
                <p className="text-sm font-medium mb-2">Periode Pencatatan</p>
                <Select
                  value={periode || ""}
                  onValueChange={setPeriode}
                  disabled={!monthOptions.length}
                >
                  <SelectTrigger className="h-12 bg-card/50">
                    <SelectValue placeholder="Pilih periode…" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-2 text-xs text-muted-foreground">
                  Untuk penagihan bulan berikutnya.
                </p>
              </div>

              {/* Tanggal Catat */}
              <div>
                <p className="text-sm font-medium mb-2">Tanggal Catat</p>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    value={
                      tanggalCatatStr
                        ? format(new Date(tanggalCatatStr), "dd/MM/yyyy", {
                            locale: idLocale,
                          })
                        : "-"
                    }
                    readOnly
                    className="h-12 pl-9 bg-muted/40"
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Tanggal rencana pencatatan bulan ini.
                </p>
              </div>

              {/* Petugas */}
              <div>
                <p className="text-sm font-medium mb-2">Petugas</p>
                <div className="h-12 px-3 rounded-md bg-muted/40 border flex items-center">
                  <User className="w-4 h-4 mr-1 text-muted-foreground" />
                  <span className="text-sm">{officerName || "-"}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Diambil otomatis dari akun yang login.
                </p>
              </div>
            </div>

            {/* Filter Tandon + Cari */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
              <div>
                <p className="text-sm font-medium mb-2">Filter Tandon</p>
                <Select value={tandonId} onValueChange={setTandonId}>
                  <SelectTrigger className="bg-card/50">
                    <SelectValue placeholder="Pilih tandon…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Tandon</SelectItem>
                    {tandons.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nama} ({t.kode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-2 text-xs text-muted-foreground">
                  Menyaring daftar tandon yang ditampilkan.
                </p>
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <p className="text-sm font-medium mb-2">Cari</p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari tandon…"
                    className="pl-10 bg-card/50"
                  />
                </div>
                {data?.ok && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Progress: {data.progress.selesai}/{data.progress.total} (
                    {progressPct}%)
                  </p>
                )}
              </div>
            </div>

            {/* Tombol Mulai */}
            <div className="mt-6">
              <Button onClick={handleStart} className="h-12 w-full">
                Mulai Pencatatan
              </Button>
            </div>

            {/* Info hijau saat final */}
            {isPeriodeFinal && (
              <div className="mt-4 p-4 bg-green-50/50 border border-green-200/50 rounded-lg">
                <p className="text-sm font-medium text-green-800">
                  Periode telah dikunci penuh
                </p>
                <p className="text-xs text-green-700">
                  Seluruh baris terkunci.
                </p>
              </div>
            )}
          </GlassCard>

          {/* ===== DAFTAR PENCATATAN ===== */}
          <GlassCard className="p-6">
            {periode && data?.ok && (
              <>
                <div className="mb-4">
                  <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className="h-2 bg-emerald-600"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Progress: {data.progress.selesai}/{data.progress.total} (
                    {progressPct}%)
                  </p>
                </div>
              </>
            )}

            {/* MOBILE list (cards) */}
            <div className="md:hidden">
              {!periode ? (
                <div className="p-4 text-sm text-muted-foreground bg-muted/20 rounded">
                  Pilih periode dulu.
                </div>
              ) : isLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Memuat…</div>
              ) : error ? (
                <div className="p-4 text-sm text-destructive">
                  Gagal memuat data.
                </div>
              ) : (
                <div className="space-y-3">
                  {rows.length === 0 && (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      Tidak ada data.
                    </div>
                  )}

                  {rows.map((r) => {
                    const locked = !!r.locked || isPeriodeFinal;
                    const endVal =
                      bufEnd[r.id] === undefined
                        ? r.meterAkhir ?? ""
                        : bufEnd[r.id];
                    const parsed = endVal === "" ? NaN : Number(endVal);
                    const pem = Number.isFinite(parsed)
                      ? Math.max(0, parsed - r.meterAwal)
                      : Math.max(0, (r.meterAkhir ?? 0) - r.meterAwal);

                    return (
                      <div
                        key={r.id}
                        className="rounded-xl border border-border/40 bg-card/40 p-4 shadow-sm overflow-hidden"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-primary">
                            {r.kodeTandon}
                          </div>
                          <div>
                            {r.status === "completed" ? (
                              <Badge className="bg-green-100 text-green-800">
                                Selesai
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-foreground mt-1">
                          {r.nama}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-muted-foreground">
                              Meter Awal
                            </div>
                            <div className="font-medium">{r.meterAwal}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">
                              Meter Akhir
                            </div>
                            <Input
                              type="number"
                              value={endVal}
                              onChange={(e) =>
                                setBufEnd((p) => ({
                                  ...p,
                                  [r.id]: e.target.value,
                                }))
                              }
                              className="h-9 text-center w-full"
                              placeholder="0"
                              min={r.meterAwal}
                              readOnly={locked}
                              disabled={locked || !!autoSaving[r.id]}
                            />
                          </div>
                        </div>

                        <div className="mt-2 text-xs text-muted-foreground">
                          Pemakaian:{" "}
                          <span className="font-medium text-primary">
                            {pem} m³
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {!locked && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 shrink-0"
                              disabled={
                                !Number.isFinite(parsed) || !!autoSaving[r.id]
                              }
                              onClick={() =>
                                saveRow(
                                  r,
                                  Number.isFinite(parsed)
                                    ? Number(parsed)
                                    : undefined
                                )
                              }
                            >
                              <Save className="w-4 h-4 mr-1" />
                              Simpan
                            </Button>
                          )}

                          {!locked ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 shrink-0"
                              onClick={() => setLockTarget(r)}
                            >
                              <LockOpen className="w-4 h-4 mr-1" />
                              Kunci
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 text-green-600 shrink-0"
                            >
                              <Lock className="w-4 h-4 mr-1" />
                              Terkunci
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 shrink-0 sm:ml-auto"
                            onClick={() =>
                              setExpanded(expanded === r.id ? null : r.id)
                            }
                          >
                            <ChevronDown
                              className={`w-4 h-4 mr-1 transition-transform ${
                                expanded === r.id ? "rotate-180" : ""
                              }`}
                            />
                            Catatan
                          </Button>
                        </div>

                        {expanded === r.id && (
                          <div className="mt-3 w-full">
                            <label className="text-xs text-muted-foreground">
                              Kendala (opsional)
                            </label>
                            <Textarea
                              value={bufNote[r.id] ?? ""}
                              onChange={(e) =>
                                setBufNote((p) => ({
                                  ...p,
                                  [r.id]: e.target.value,
                                }))
                              }
                              placeholder={
                                locked
                                  ? "Dikunci"
                                  : "Catat kendala (misal kebocoran, dll.)"
                              }
                              className="h-20 mt-1 w-full"
                              readOnly={locked}
                              disabled={locked}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* DESKTOP table */}
            <div className="hidden md:block">
              {!periode ? (
                <div className="p-4 text-sm text-muted-foreground bg-muted/20 rounded">
                  Pilih periode dulu.
                </div>
              ) : isLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Memuat…</div>
              ) : error ? (
                <div className="p-4 text-sm text-destructive">
                  Gagal memuat data.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/20">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                          Kode
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                          Nama Tandon
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                          Meter Awal
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                          Meter Akhir
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                          Pemakaian
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => {
                        const locked = !!r.locked || isPeriodeFinal;
                        const endVal =
                          bufEnd[r.id] === undefined
                            ? r.meterAkhir ?? ""
                            : bufEnd[r.id];
                        const parsed = endVal === "" ? NaN : Number(endVal);
                        const pem = Number.isFinite(parsed)
                          ? Math.max(0, parsed - r.meterAwal)
                          : Math.max(0, (r.meterAkhir ?? 0) - r.meterAwal);

                        return (
                          <React.Fragment key={r.id}>
                            <tr className="border-b border-border/10 hover:bg-muted/20">
                              <td className="py-3 px-4 text-sm font-medium text-primary">
                                {r.kodeTandon}
                              </td>
                              <td className="py-3 px-4">
                                <p className="text-sm font-medium text-foreground">
                                  {r.nama}
                                </p>
                                <div className="text-xs mt-1">
                                  {getStatusBadge(r.status)}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-sm text-center">
                                {r.meterAwal}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <Input
                                  type="number"
                                  value={endVal}
                                  onChange={(e) =>
                                    setBufEnd((p) => ({
                                      ...p,
                                      [r.id]: e.target.value,
                                    }))
                                  }
                                  className="w-28 h-8 text-center text-sm"
                                  placeholder="0"
                                  min={r.meterAwal}
                                  readOnly={locked}
                                  disabled={locked || !!autoSaving[r.id]}
                                />
                              </td>
                              <td className="py-3 px-4 text-sm text-center font-medium text-primary">
                                {pem} m³
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {!locked && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 px-2 bg-transparent"
                                      disabled={
                                        !Number.isFinite(parsed) ||
                                        !!autoSaving[r.id]
                                      }
                                      onClick={() =>
                                        saveRow(
                                          r,
                                          Number.isFinite(parsed)
                                            ? Number(parsed)
                                            : undefined
                                        )
                                      }
                                      title="Simpan"
                                    >
                                      <Save className="w-4 h-4" />
                                    </Button>
                                  )}
                                  {!locked ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 px-2"
                                      onClick={() => setLockTarget(r)}
                                      title="Kunci & Finalisasi"
                                    >
                                      <LockOpen className="w-4 h-4" />
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 px-2 text-green-600"
                                      title="Terkunci"
                                    >
                                      <Lock className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-2 bg-transparent"
                                    onClick={() =>
                                      setExpanded(
                                        expanded === r.id ? null : r.id
                                      )
                                    }
                                    title="Catatan/kendala"
                                  >
                                    <ChevronDown
                                      className={`w-4 h-4 transition-transform ${
                                        expanded === r.id ? "rotate-180" : ""
                                      }`}
                                    />
                                  </Button>
                                </div>
                              </td>
                            </tr>

                            {expanded === r.id && (
                              <tr className="bg-primary/5">
                                <td colSpan={6} className="p-4">
                                  <label className="text-xs text-muted-foreground">
                                    Kendala (opsional)
                                  </label>
                                  <Textarea
                                    value={bufNote[r.id] ?? ""}
                                    onChange={(e) =>
                                      setBufNote((p) => ({
                                        ...p,
                                        [r.id]: e.target.value,
                                      }))
                                    }
                                    placeholder={
                                      locked
                                        ? "Dikunci"
                                        : "Catat kendala (misal kebocoran, dll.)"
                                    }
                                    className="h-20 text-sm mt-1 w-full"
                                    readOnly={locked}
                                    disabled={locked}
                                  />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}

                      {rows.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-6 text-center text-sm text-muted-foreground"
                          >
                            Tidak ada data.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              {/* Ringkas */}
              {data?.ok && (
                <div className="mt-6 pt-4 border-t border-border/20 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-primary/10 rounded-lg">
                    <p className="text-2xl font-bold text-primary">
                      {data.progress.selesai}
                    </p>
                    <p className="text-sm text-muted-foreground">Selesai</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-100/50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">
                      {data.progress.pending}
                    </p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                  <div className="text-center p-4 bg-green-100/50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {Math.round(progressPct)}%
                    </p>
                    <p className="text-sm text-muted-foreground">Progress</p>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* modal kunci */}
        <LockRowModal
          open={!!lockTarget}
          onClose={() => setLockTarget(null)}
          onConfirm={() => lockTarget && finalizeRow(lockTarget)}
          isLoading={locking}
          row={lockTarget as any}
          period={periode}
          headerTarif={0}
          headerAbon={0}
        />
      </AppShell>
    </AuthGuard>
  );
}

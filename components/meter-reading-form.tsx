// // components/meter-reading-form.tsx
// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { useRouter, usePathname, useSearchParams } from "next/navigation";
// import { useSWRConfig } from "swr";

// import { Button } from "@/components/ui/button";
// import { Label } from "@/components/ui/label";
// import { Input } from "@/components/ui/input";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Badge } from "@/components/ui/badge";
// import { FinalizePeriodModal } from "./finalize-period-modal";
// import { useToast } from "@/hooks/use-toast";
// import { User } from "lucide-react";
// import { usePeriodStore } from "@/lib/period-store";

// type PeriodOpt = { value: string; catatLabel: string; tagihanLabel: string };
// type ZoneOpt = { id?: string; nama: string };

// const ZONA_ALL = "__ALL__";

// // ---- Parser aman
// async function safeJson(res: Response): Promise<Record<string, any>> {
//   try {
//     const t = await res.text();
//     if (!t) return {};
//     return JSON.parse(t);
//   } catch {
//     return {};
//   }
// }
// function pickErrorMessage(res: Response, data?: Record<string, any>) {
//   if (data && typeof data.message === "string" && data.message.trim())
//     return data.message;
//   return `HTTP ${res.status} ${res.statusText}`;
// }

// // ---- Util tanggal
// function toDateYYYYMMDDSafe(input: string) {
//   if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
//   const d = new Date(input);
//   if (Number.isNaN(d.getTime())) return "";
//   const y = d.getFullYear();
//   const m = String(d.getMonth() + 1).padStart(2, "0");
//   const dd = String(d.getDate()).padStart(2, "0");
//   return `${y}-${m}-${dd}`;
// }
// function todayStr() {
//   const d = new Date();
//   return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
//     2,
//     "0"
//   )}-${String(d.getDate()).padStart(2, "0")}`;
// }

// export function MeterReadingForm() {
//   const router = useRouter();
//   const pathname = usePathname();
//   const sp = useSearchParams();
//   const { mutate } = useSWRConfig();
//   const { toast } = useToast();

//   // ====== local state
//   const [selectedPeriod, setSelectedPeriod] = useState("");
//   const [selectedZona, setSelectedZona] = useState<string>("");
//   const [zones, setZones] = useState<ZoneOpt[]>([]);
//   const [zonesLoading, setZonesLoading] = useState(false);

//   const [officerName, setOfficerName] = useState<string>("");

//   const [isLoading, setIsLoading] = useState(false);
//   const [checking, setChecking] = useState(false);
//   const [showFinalizeModal, setShowFinalizeModal] = useState(false);
//   const [isFinalizingPeriod, setIsFinalizingPeriod] = useState(false);
//   const [serverLocked, setServerLocked] = useState(false);
//   const [finalizeTotal, setFinalizeTotal] = useState(0);
//   const [finalizeSelesai, setFinalizeSelesai] = useState(0);

//   const selectZonaValue = selectedZona ? selectedZona : ZONA_ALL;

//   // ⬇️ Awalnya kosong; akan diisi dari query/setting/hari-ini
//   const [readingDate, setReadingDate] = useState<string>("");

//   // ====== period store
//   const {
//     currentPeriod,
//     setCurrentPeriod,
//     isFinalPeriod,
//     finalizePeriod: finalizePeriodLocally,
//   } = usePeriodStore();

//   // Update query string
//   function setQuery(next: Record<string, string | undefined>) {
//     const params = new URLSearchParams(sp?.toString());
//     Object.entries(next).forEach(([k, v]) => {
//       if (!v) params.delete(k);
//       else params.set(k, v);
//     });
//     const qs = params.toString();
//     router.replace(qs ? `${pathname}?${qs}` : pathname);
//   }

//   // Prefill petugas dari localStorage
//   useEffect(() => {
//     try {
//       const raw = localStorage.getItem("tb_user");
//       if (raw) {
//         const u = JSON.parse(raw) as { name?: string };
//         if (u?.name) setOfficerName(u.name);
//       }
//     } catch {}
//   }, []);

//   // Prefill dari query (?periode, ?tanggal, ?petugas, ?zona)
//   useEffect(() => {
//     if (!sp) return;
//     const qp = sp.get("periode") ?? "";
//     const qt = sp.get("tanggal") ?? "";
//     const qn = sp.get("petugas") ?? "";
//     const qz = sp.get("zona") ?? "";
//     if (qp) {
//       setSelectedPeriod(qp);
//       setCurrentPeriod(qp);
//     }
//     if (qt) {
//       const normalized = toDateYYYYMMDDSafe(qt);
//       if (normalized) setReadingDate(normalized);
//     }
//     if (qn) setOfficerName(qn);
//     if (qz) setSelectedZona(qz);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [sp]);

//   // ⬇️ Jika masuk tanpa query ?tanggal=, ambil default dari /api/setting
//   useEffect(() => {
//     let cancelled = false;
//     const run = async () => {
//       // Jika sudah ada nilai dari query sebelumnya, jangan override
//       if (readingDate) return;
//       try {
//         const res = await fetch("/api/setting", { cache: "no-store" });
//         if (!res.ok) throw new Error();
//         const data = await safeJson(res);
//         const t: string | undefined = data?.tanggalCatatDefault;
//         const picked = t && /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : todayStr();
//         if (!cancelled) setReadingDate(picked);
//       } catch {
//         if (!cancelled) setReadingDate(todayStr());
//       }
//     };
//     run();
//     return () => {
//       cancelled = true;
//     };
//     // Hanya sekali saat mount; jangan depend ke selectedPeriod agar tidak override pilihan user
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // Sinkronisasi period dengan store
//   useEffect(() => {
//     if (!selectedPeriod && currentPeriod) setSelectedPeriod(currentPeriod);
//   }, [currentPeriod, selectedPeriod]);

//   // Cek status periode (abaikan 405). Bisa mengembalikan tanggalCatat dari server; dipakai jika belum ada.
//   useEffect(() => {
//     let cancelled = false;
//     const run = async () => {
//       if (!selectedPeriod) {
//         setServerLocked(false);
//         return;
//       }
//       setChecking(true);
//       try {
//         const res = await fetch(
//           `/api/catat-meter?periode=${encodeURIComponent(selectedPeriod)}`,
//           { cache: "no-store" }
//         );
//         if (res.status === 405) {
//           setServerLocked(false);
//           setCurrentPeriod(selectedPeriod);
//           return;
//         }
//         const data = await safeJson(res);
//         if (cancelled) return;
//         if (!res.ok || data?.ok === false) {
//           throw new Error(pickErrorMessage(res, data));
//         }
//         const locked = !!data.locked;
//         setServerLocked(locked);
//         if (locked) finalizePeriodLocally(selectedPeriod, "server");
//         setCurrentPeriod(selectedPeriod);

//         // Pakai tanggal dari server hanya jika user belum memilih
//         if (!readingDate && typeof data?.tanggalCatat === "string") {
//           const t = toDateYYYYMMDDSafe(data.tanggalCatat);
//           if (t) setReadingDate(t);
//         }
//         if (typeof data?.petugas === "string" && !officerName) {
//           setOfficerName(data.petugas);
//         }
//       } catch (e: any) {
//         toast({
//           title: "Gagal memuat periode",
//           description: e?.message ?? "Terjadi kesalahan",
//           variant: "destructive",
//         });
//       } finally {
//         if (!cancelled) setChecking(false);
//       }
//     };
//     run();
//     return () => {
//       cancelled = true;
//     };
//   }, [
//     selectedPeriod,
//     finalizePeriodLocally,
//     setCurrentPeriod,
//     officerName,
//     toast,
//     readingDate,
//   ]);

//   // Tulis periode/zona ke URL agar grid ikut baca
//   useEffect(() => {
//     if (selectedPeriod) setQuery({ periode: selectedPeriod });
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [selectedPeriod]);
//   useEffect(() => {
//     setQuery({ zona: selectedZona || undefined });
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [selectedZona]);

//   // ====== Ambil daftar zona (periode terlebih dahulu; fallback master zona)
//   useEffect(() => {
//     let cancelled = false;
//     const loadZones = async () => {
//       if (!selectedPeriod) {
//         setZones([]);
//         return;
//       }
//       setZonesLoading(true);
//       try {
//         let res = await fetch(
//           `/api/catat-meter/zona?periode=${encodeURIComponent(selectedPeriod)}`,
//           { cache: "no-store" }
//         );
//         if (res.status === 404 || res.status === 405) {
//           res = await fetch("/api/zona", { cache: "no-store" });
//         }
//         if (!res.ok) {
//           if (!cancelled) setZones([]);
//           return;
//         }
//         const data = await safeJson(res);
//         const raw = Array.isArray(data)
//           ? data
//           : data?.data ?? data?.items ?? [];
//         const list: ZoneOpt[] = Array.isArray(raw)
//           ? raw
//               .map((z: any) => ({
//                 id: z.id ?? z.zonaId ?? undefined,
//                 nama:
//                   z.nama ??
//                   z.zonaNama ??
//                   z.name ??
//                   z.title ??
//                   (typeof z === "string" ? z : ""),
//               }))
//               .filter((z: ZoneOpt) => z.nama)
//           : [];
//         if (!cancelled) setZones(list);
//       } finally {
//         if (!cancelled) setZonesLoading(false);
//       }
//     };
//     loadZones();
//     return () => {
//       cancelled = true;
//     };
//   }, [selectedPeriod]);

//   // ====== Periode options (mulai Juli tahun berjalan, 6 bulan ke depan)
//   const periodOptions = useMemo<PeriodOpt[]>(() => {
//     const opts: PeriodOpt[] = [];
//     const now = new Date();
//     const startYear = now.getFullYear();
//     const startMonthIndex = 6; // 0=Jan, 6=Jul
//     for (let i = 0; i < 6; i++) {
//       const catat = new Date(startYear, startMonthIndex + i, 1);
//       const tagih = new Date(catat.getFullYear(), catat.getMonth() + 1, 1);
//       const value = `${catat.getFullYear()}-${String(
//         catat.getMonth() + 1
//       ).padStart(2, "0")}`;
//       opts.push({
//         value,
//         catatLabel: catat.toLocaleDateString("id-ID", {
//           month: "long",
//           year: "numeric",
//         }),
//         tagihanLabel: tagih.toLocaleDateString("id-ID", {
//           month: "long",
//           year: "numeric",
//         }),
//       });
//     }
//     return opts;
//   }, []);

//   const selectedOption = useMemo(
//     () => periodOptions.find((o) => o.value === selectedPeriod),
//     [periodOptions, selectedPeriod]
//   );
//   const tagihanText = selectedOption
//     ? `Untuk Penagihan ${selectedOption.tagihanLabel}`
//     : "";

//   // ====== Actions
//   const { setCurrentPeriod: setCurrentPeriodStore } = usePeriodStore.getState();
//   const handleStartReading = async () => {
//     if (!selectedPeriod) {
//       toast({
//         title: "Periode belum dipilih",
//         description: "Silakan pilih periode dulu",
//         variant: "destructive",
//       });
//       return;
//     }
//     const tanggalToSend = toDateYYYYMMDDSafe(readingDate) || todayStr();

//     setIsLoading(true);
//     try {
//       const res = await fetch(
//         `/api/catat-meter?periode=${encodeURIComponent(selectedPeriod)}`,
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ officerName, readingDate: tanggalToSend }),
//         }
//       );
//       const data = await safeJson(res);
//       if (!res.ok || data?.ok === false) {
//         throw new Error(pickErrorMessage(res, data));
//       }

//       setCurrentPeriodStore(selectedPeriod);
//       await mutate(
//         `/api/catat-meter?periode=${encodeURIComponent(selectedPeriod)}`
//       );
//       toast({
//         title: "Siap dicatat",
//         description: `Periode ${selectedPeriod} • Petugas: ${
//           officerName || "-"
//         } • Tgl: ${tanggalToSend}`,
//       });
//     } catch (e: any) {
//       toast({
//         title: "Gagal memulai pencatatan",
//         description: e?.message ?? "Terjadi kesalahan",
//         variant: "destructive",
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const openFinalizeModal = async () => {
//     if (!selectedPeriod) return;
//     try {
//       const res = await fetch(
//         `/api/catat-meter?periode=${encodeURIComponent(selectedPeriod)}`
//       );
//       if (res.status === 405) {
//         setFinalizeTotal(0);
//         setFinalizeSelesai(0);
//       } else {
//         const data = await safeJson(res);
//         if (res.ok && data?.ok) {
//           setFinalizeTotal(data.progress?.total ?? 0);
//           setFinalizeSelesai(data.progress?.selesai ?? 0);
//         } else {
//           setFinalizeTotal(0);
//           setFinalizeSelesai(0);
//         }
//       }
//     } finally {
//       setShowFinalizeModal(true);
//     }
//   };

//   const handleFinalizePeriod = async () => {
//     if (!selectedPeriod) return;
//     setIsFinalizingPeriod(true);
//     try {
//       const res = await fetch(
//         `/api/finalize?periode=${encodeURIComponent(selectedPeriod)}`,
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: "{}",
//         }
//       );
//       const data = await safeJson(res);
//       if (!res.ok || data?.ok === false)
//         throw new Error(pickErrorMessage(res, data));

//       await mutate(
//         `/api/catat-meter?periode=${encodeURIComponent(selectedPeriod)}`
//       );
//       finalizePeriodLocally(selectedPeriod, "system");
//       toast({
//         title: "Terkunci",
//         description: `Berhasil mengunci ${data.lockedRows ?? 0} pelanggan DONE`,
//       });
//       setShowFinalizeModal(false);
//     } catch (e: any) {
//       toast({
//         title: "Gagal finalize",
//         description: e?.message ?? "Terjadi kesalahan",
//         variant: "destructive",
//       });
//     } finally {
//       setIsFinalizingPeriod(false);
//     }
//   };

//   const isCurrentPeriodFinal =
//     !!selectedPeriod && (isFinalPeriod(selectedPeriod) || serverLocked);

//   // ====== RENDER
//   return (
//     <div className="space-y-4">
//       {/* Status */}
//       {selectedPeriod && (
//         <div className="flex flex-wrap items-center gap-2">
//           <span className="text-sm text-muted-foreground">Status Periode:</span>
//           <Badge
//             variant={isCurrentPeriodFinal ? "default" : "secondary"}
//             className={
//               isCurrentPeriodFinal
//                 ? "bg-green-100 text-green-800 hover:bg-green-100"
//                 : "bg-gray-100 text-gray-800 hover:bg-gray-100"
//             }
//           >
//             {isCurrentPeriodFinal ? "FINAL" : "DRAFT"}
//           </Badge>
//           {officerName && (
//             <span className="inline-flex items-center text-sm text-muted-foreground ml-2">
//               <User className="w-4 h-4 mr-1" /> Petugas:
//               <span className="ml-1 font-medium text-foreground">
//                 {officerName}
//               </span>
//             </span>
//           )}
//         </div>
//       )}

//       {/* Baris utama */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
//         {/* Periode */}
//         <div className="space-y-2">
//           <Label htmlFor="period" className="text-base font-medium">
//             Periode Pencatatan
//           </Label>
//           <Select
//             value={selectedPeriod}
//             onValueChange={setSelectedPeriod}
//             disabled={isFinalizingPeriod || isLoading}
//           >
//             <SelectTrigger className="h-12 bg-card/50">
//               <SelectValue placeholder="Pilih periode..." />
//             </SelectTrigger>
//             <SelectContent>
//               {periodOptions.map((p) => (
//                 <SelectItem key={p.value} value={p.value}>
//                   {p.catatLabel}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//           {selectedOption && (
//             <p className="text-xs text-muted-foreground">{tagihanText}</p>
//           )}
//           {checking && (
//             <p className="text-xs text-muted-foreground">
//               Mengecek status periode…
//             </p>
//           )}
//         </div>

//         {/* Tanggal catat */}
//         <div className="space-y-2">
//           <Label htmlFor="readingDate" className="text-base font-medium">
//             Tanggal Catat
//           </Label>
//           <Input
//             id="readingDate"
//             type="date"
//             value={readingDate || todayStr()}
//             onChange={(e) => setReadingDate(e.target.value)}
//             className="h-12 bg-card/50"
//             disabled={isFinalizingPeriod || isLoading}
//           />
//           <p className="text-xs text-muted-foreground">
//             Tanggal rencana pencatatan bulan ini.
//           </p>
//         </div>

//         {/* Petugas */}
//         <div className="space-y-2">
//           <Label className="text-base font-medium">Petugas</Label>
//           <div className="h-12 px-3 rounded-md bg-muted/40 border flex items-center">
//             <User className="w-4 h-4 mr-1 text-muted-foreground" />
//             <span className="text-sm">{officerName || "-"}</span>
//           </div>
//           <p className="text-xs text-muted-foreground">
//             Diambil otomatis dari akun yang login.
//           </p>
//         </div>
//       </div>

//       {/* Filter Zona */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
//         <div className="space-y-2">
//           <Label className="text-base font-medium">Filter Zona</Label>
//           <Select
//             value={selectZonaValue}
//             onValueChange={(val) =>
//               setSelectedZona(val === ZONA_ALL ? "" : val)
//             }
//             disabled={isFinalizingPeriod || isLoading || zonesLoading}
//           >
//             <SelectTrigger className="h-10 bg-card/50">
//               <SelectValue
//                 placeholder={zonesLoading ? "Memuat zona..." : "Semua Zona"}
//               />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value={ZONA_ALL}>Semua Zona</SelectItem>
//               {zones.map((z) => (
//                 <SelectItem key={z.id ?? z.nama} value={z.nama}>
//                   {z.nama}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//           <p className="text-xs text-muted-foreground">
//             Menyaring pelanggan pada periode ini berdasarkan zona.
//           </p>
//         </div>
//       </div>

//       {/* Tombol */}
//       <div className="flex flex-col sm:flex-row gap-2">
//         <Button
//           onClick={handleStartReading}
//           className="h-12 w-full sm:flex-1"
//           disabled={isLoading || checking || !selectedPeriod}
//         >
//           {isLoading ? (
//             <div className="flex items-center gap-2">
//               <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
//               Memuat...
//             </div>
//           ) : (
//             "Mulai Pencatatan"
//           )}
//         </Button>

//         {/* {selectedPeriod && (
//           <Button
//             onClick={openFinalizeModal}
//             variant="outline"
//             className="h-12 w-full sm:w-auto bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
//             disabled={checking}
//           >
//             <Lock className="w-4 h-4 mr-2" /> Finalize & Kunci
//           </Button>
//         )} */}
//       </div>

//       {isCurrentPeriodFinal && (
//         <div className="p-4 bg-green-50/50 border border-green-200/50 rounded-lg">
//           <p className="text-sm font-medium text-green-800">
//             Periode telah dikunci penuh
//           </p>
//           <p className="text-xs text-green-700">Seluruh baris terkunci.</p>
//         </div>
//       )}

//       <FinalizePeriodModal
//         isOpen={showFinalizeModal}
//         onClose={() => setShowFinalizeModal(false)}
//         onConfirm={handleFinalizePeriod}
//         period={selectedPeriod}
//         isLoading={isFinalizingPeriod}
//         total={finalizeTotal}
//         selesai={finalizeSelesai}
//       />
//     </div>
//   );
// }

// components/meter-reading-form.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSWRConfig } from "swr";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FinalizePeriodModal } from "./finalize-period-modal";
import { useToast } from "@/hooks/use-toast";
import { User } from "lucide-react";
import { usePeriodStore } from "@/lib/period-store";

type PeriodOpt = { value: string; catatLabel: string; tagihanLabel: string };
type ZoneOpt = { id?: string; nama: string };

const ZONA_ALL = "__ALL__";

// ---- Parser aman
async function safeJson(res: Response): Promise<Record<string, any>> {
  try {
    const t = await res.text();
    if (!t) return {};
    return JSON.parse(t);
  } catch {
    return {};
  }
}
function pickErrorMessage(res: Response, data?: Record<string, any>) {
  if (data && typeof data.message === "string" && data.message.trim())
    return data.message;
  return `HTTP ${res.status} ${res.statusText}`;
}

// ---- Util tanggal
function toDateYYYYMMDDSafe(input: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}
function ymdFromPeriodAndDay(period: string, day: number) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return "";
  const [y, m] = period.split("-").map(Number);
  const max = new Date(y, m, 0).getDate();
  const d = Math.max(1, Math.min(max, Number(day) || 1));
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function MeterReadingForm() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { mutate } = useSWRConfig();
  const { toast } = useToast();

  // ====== local state
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedZona, setSelectedZona] = useState<string>("");
  const [zones, setZones] = useState<ZoneOpt[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);

  const [officerName, setOfficerName] = useState<string>("");

  const [isLoading, setIsLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [isFinalizingPeriod, setIsFinalizingPeriod] = useState(false);
  const [serverLocked, setServerLocked] = useState(false);
  const [finalizeTotal, setFinalizeTotal] = useState(0);
  const [finalizeSelesai, setFinalizeSelesai] = useState(0);

  const selectZonaValue = selectedZona ? selectedZona : ZONA_ALL;

  // ⬇️ Awalnya kosong; akan diisi dari query/setting/periode
  const [readingDate, setReadingDate] = useState<string>("");

  // ====== period store
  const {
    currentPeriod,
    setCurrentPeriod,
    isFinalPeriod,
    finalizePeriod: finalizePeriodLocally,
  } = usePeriodStore();

  // Update query string
  function setQuery(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(sp?.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (!v) params.delete(k);
      else params.set(k, v);
    });
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  // Prefill petugas dari localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tb_user");
      if (raw) {
        const u = JSON.parse(raw) as { name?: string };
        if (u?.name) setOfficerName(u.name);
      }
    } catch {}
  }, []);

  // Prefill dari query (?periode, ?tanggal, ?petugas, ?zona)
  useEffect(() => {
    if (!sp) return;
    const qp = sp.get("periode") ?? "";
    const qt = sp.get("tanggal") ?? "";
    const qn = sp.get("petugas") ?? "";
    const qz = sp.get("zona") ?? "";
    if (qp) {
      setSelectedPeriod(qp);
      setCurrentPeriod(qp);
    }
    if (qt) {
      const normalized = toDateYYYYMMDDSafe(qt);
      if (normalized) setReadingDate(normalized);
    }
    if (qn) setOfficerName(qn);
    if (qz) setSelectedZona(qz);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  // Sinkronisasi period dengan store
  useEffect(() => {
    if (!selectedPeriod && currentPeriod) setSelectedPeriod(currentPeriod);
  }, [currentPeriod, selectedPeriod]);

  // Default tanggal: ambil dari server (kalau ada), kalau tidak hitung dari Setting
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!selectedPeriod || readingDate) return;

      try {
        // 1) coba ambil tanggal dari server
        const r = await fetch(
          `/api/catat-meter?periode=${encodeURIComponent(selectedPeriod)}`,
          { cache: "no-store" }
        );
        const d = await safeJson(r);
        if (!cancelled && r.ok && d?.tanggalCatat) {
          const t = toDateYYYYMMDDSafe(d.tanggalCatat);
          if (t) {
            setReadingDate(t);
            return;
          }
        }

        // 2) fallback ke Setting
        const res = await fetch("/api/setting", { cache: "no-store" });
        const data = await safeJson(res);
        const hariDefault = Number(data?.tanggalCatatDefault) || 1;
        const computed = ymdFromPeriodAndDay(selectedPeriod, hariDefault);
        setReadingDate(computed || todayStr());
      } catch {
        if (!cancelled) setReadingDate(todayStr());
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [selectedPeriod, readingDate]);

  // Cek status periode (serverLocked, petugas, dll.)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!selectedPeriod) {
        setServerLocked(false);
        return;
      }
      setChecking(true);
      try {
        const res = await fetch(
          `/api/catat-meter?periode=${encodeURIComponent(selectedPeriod)}`,
          { cache: "no-store" }
        );
        if (res.status === 405) {
          setServerLocked(false);
          setCurrentPeriod(selectedPeriod);
          return;
        }
        const data = await safeJson(res);
        if (cancelled) return;
        if (!res.ok || data?.ok === false) {
          throw new Error(pickErrorMessage(res, data));
        }
        const locked = !!data.locked;
        setServerLocked(locked);
        if (locked) finalizePeriodLocally(selectedPeriod, "server");
        setCurrentPeriod(selectedPeriod);

        if (!readingDate && typeof data?.tanggalCatat === "string") {
          const t = toDateYYYYMMDDSafe(data.tanggalCatat);
          if (t) setReadingDate(t);
        }
        if (typeof data?.petugas === "string" && !officerName) {
          setOfficerName(data.petugas);
        }
      } catch (e: any) {
        toast({
          title: "Gagal memuat periode",
          description: e?.message ?? "Terjadi kesalahan",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setChecking(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [
    selectedPeriod,
    finalizePeriodLocally,
    setCurrentPeriod,
    officerName,
    toast,
    readingDate,
  ]);

  // Tulis periode/zona ke URL
  useEffect(() => {
    if (selectedPeriod) setQuery({ periode: selectedPeriod });
  }, [selectedPeriod]); // eslint-disable-line
  useEffect(() => {
    setQuery({ zona: selectedZona || undefined });
  }, [selectedZona]); // eslint-disable-line

  // ====== Ambil daftar zona (periode-zona -> fallback master zona)
  useEffect(() => {
    let cancelled = false;
    const loadZones = async () => {
      setZonesLoading(true);
      try {
        if (selectedPeriod) {
          const res1 = await fetch(
            `/api/catat-meter/zona?periode=${encodeURIComponent(
              selectedPeriod
            )}`,
            { cache: "no-store" }
          );
          const d1 = await safeJson(res1);
          const raw1 = Array.isArray(d1) ? d1 : d1?.data ?? d1?.items;
          if (res1.ok && Array.isArray(raw1) && raw1.length > 0) {
            if (!cancelled) {
              setZones(
                raw1
                  .map((z: any) => ({
                    id: z.id ?? z.zonaId,
                    nama: z.nama ?? z.zonaNama ?? "",
                  }))
                  .filter((z: ZoneOpt) => z.nama)
              );
            }
            return;
          }
        }

        // fallback ke master zona
        const res2 = await fetch("/api/zona?page=1&pageSize=1000", {
          cache: "no-store",
        });
        const d2 = await safeJson(res2);
        const raw2 = d2?.items ?? d2?.data ?? [];
        if (!cancelled) {
          setZones(
            Array.isArray(raw2)
              ? raw2
                  .map((z: any) => ({ id: z.id, nama: z.nama }))
                  .filter((z: ZoneOpt) => z.nama)
              : []
          );
        }
      } finally {
        if (!cancelled) setZonesLoading(false);
      }
    };
    loadZones();
    return () => {
      cancelled = true;
    };
  }, [selectedPeriod]);

  // ====== Periode options (mulai Juli tahun berjalan, 6 bulan ke depan)
  const periodOptions = useMemo<PeriodOpt[]>(() => {
    const opts: PeriodOpt[] = [];
    const now = new Date();
    const startYear = now.getFullYear();
    const startMonthIndex = 6; // 0=Jan, 6=Jul
    for (let i = 0; i < 6; i++) {
      const catat = new Date(startYear, startMonthIndex + i, 1);
      const tagih = new Date(catat.getFullYear(), catat.getMonth() + 1, 1);
      const value = `${catat.getFullYear()}-${String(
        catat.getMonth() + 1
      ).padStart(2, "0")}`;
      opts.push({
        value,
        catatLabel: catat.toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        }),
        tagihanLabel: tagih.toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        }),
      });
    }
    return opts;
  }, []);

  const selectedOption = useMemo(
    () => periodOptions.find((o) => o.value === selectedPeriod),
    [periodOptions, selectedPeriod]
  );
  const tagihanText = selectedOption
    ? `Untuk Penagihan ${selectedOption.tagihanLabel}`
    : "";

  // ====== Actions
  const { setCurrentPeriod: setCurrentPeriodStore } = usePeriodStore.getState();
  const handleStartReading = async () => {
    if (!selectedPeriod) {
      toast({
        title: "Periode belum dipilih",
        description: "Silakan pilih periode dulu",
        variant: "destructive",
      });
      return;
    }
    const tanggalToSend = toDateYYYYMMDDSafe(readingDate) || todayStr();

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/catat-meter?periode=${encodeURIComponent(selectedPeriod)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ officerName, readingDate: tanggalToSend }),
        }
      );
      const data = await safeJson(res);
      if (!res.ok || data?.ok === false) {
        throw new Error(pickErrorMessage(res, data));
      }

      setCurrentPeriodStore(selectedPeriod);
      await mutate(
        `/api/catat-meter?periode=${encodeURIComponent(selectedPeriod)}`
      );
      toast({
        title: "Siap dicatat",
        description: `Periode ${selectedPeriod} • Petugas: ${
          officerName || "-"
        } • Tgl: ${tanggalToSend}`,
      });
    } catch (e: any) {
      toast({
        title: "Gagal memulai pencatatan",
        description: e?.message ?? "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openFinalizeModal = async () => {
    if (!selectedPeriod) return;
    try {
      const res = await fetch(
        `/api/catat-meter?periode=${encodeURIComponent(selectedPeriod)}`
      );
      if (res.status === 405) {
        setFinalizeTotal(0);
        setFinalizeSelesai(0);
      } else {
        const data = await safeJson(res);
        if (res.ok && data?.ok) {
          setFinalizeTotal(data.progress?.total ?? 0);
          setFinalizeSelesai(data.progress?.selesai ?? 0);
        } else {
          setFinalizeTotal(0);
          setFinalizeSelesai(0);
        }
      }
    } finally {
      setShowFinalizeModal(true);
    }
  };

  const handleFinalizePeriod = async () => {
    if (!selectedPeriod) return;
    setIsFinalizingPeriod(true);
    try {
      const res = await fetch(
        `/api/finalize?periode=${encodeURIComponent(selectedPeriod)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }
      );
      const data = await safeJson(res);
      if (!res.ok || data?.ok === false)
        throw new Error(pickErrorMessage(res, data));

      await mutate(
        `/api/catat-meter?periode=${encodeURIComponent(selectedPeriod)}`
      );
      finalizePeriodLocally(selectedPeriod, "system");
      toast({
        title: "Terkunci",
        description: `Berhasil mengunci ${data.lockedRows ?? 0} pelanggan DONE`,
      });
      setShowFinalizeModal(false);
    } catch (e: any) {
      toast({
        title: "Gagal finalize",
        description: e?.message ?? "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setIsFinalizingPeriod(false);
    }
  };

  const isCurrentPeriodFinal =
    !!selectedPeriod && (isFinalPeriod(selectedPeriod) || serverLocked);

  // ====== RENDER
  return (
    <div className="space-y-4">
      {/* Status */}
      {selectedPeriod && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Status Periode:</span>
          <Badge
            variant={isCurrentPeriodFinal ? "default" : "secondary"}
            className={
              isCurrentPeriodFinal
                ? "bg-green-100 text-green-800 hover:bg-green-100"
                : "bg-gray-100 text-gray-800 hover:bg-gray-100"
            }
          >
            {isCurrentPeriodFinal ? "FINAL" : "DRAFT"}
          </Badge>
          {officerName && (
            <span className="inline-flex items-center text-sm text-muted-foreground ml-2">
              <User className="w-4 h-4 mr-1" /> Petugas:
              <span className="ml-1 font-medium text-foreground">
                {officerName}
              </span>
            </span>
          )}
        </div>
      )}

      {/* Baris utama */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
        {/* Periode */}
        <div className="space-y-2">
          <Label htmlFor="period" className="text-base font-medium">
            Periode Pencatatan
          </Label>
          <Select
            value={selectedPeriod}
            onValueChange={setSelectedPeriod}
            disabled={isFinalizingPeriod || isLoading}
          >
            <SelectTrigger className="h-12 bg-card/50">
              <SelectValue placeholder="Pilih periode..." />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.catatLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedOption && (
            <p className="text-xs text-muted-foreground">{tagihanText}</p>
          )}
          {checking && (
            <p className="text-xs text-muted-foreground">
              Mengecek status periode…
            </p>
          )}
        </div>

        {/* Tanggal catat */}
        <div className="space-y-2">
          <Label htmlFor="readingDate" className="text-base font-medium">
            Tanggal Catat
          </Label>
          <Input
            id="readingDate"
            type="date"
            value={readingDate || todayStr()}
            onChange={(e) => setReadingDate(e.target.value)}
            className="h-12 bg-card/50"
            disabled={isFinalizingPeriod || isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Tanggal rencana pencatatan bulan ini.
          </p>
        </div>

        {/* Petugas */}
        <div className="space-y-2">
          <Label className="text-base font-medium">Petugas</Label>
          <div className="h-12 px-3 rounded-md bg-muted/40 border flex items-center">
            <User className="w-4 h-4 mr-1 text-muted-foreground" />
            <span className="text-sm">{officerName || "-"}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Diambil otomatis dari akun yang login.
          </p>
        </div>
      </div>

      {/* Filter Zona */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-base font-medium">Filter Blok</Label>
          <Select
            value={selectZonaValue}
            onValueChange={(val) =>
              setSelectedZona(val === ZONA_ALL ? "" : val)
            }
            disabled={isFinalizingPeriod || isLoading || zonesLoading}
          >
            <SelectTrigger className="h-10 bg-card/50">
              <SelectValue
                placeholder={zonesLoading ? "Memuat blok..." : "Semua blok"}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ZONA_ALL}>Semua Blok</SelectItem>
              {zones.map((z) => (
                <SelectItem key={z.id ?? z.nama} value={z.nama}>
                  {z.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Menyaring pelanggan pada periode ini berdasarkan blok.
          </p>
        </div>
      </div>

      {/* Tombol */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={handleStartReading}
          className="h-12 w-full sm:flex-1"
          disabled={isLoading || checking || !selectedPeriod}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Memuat...
            </div>
          ) : (
            "Mulai Pencatatan"
          )}
        </Button>
        {/* Tombol finalize kalau perlu */}
        {/* <Button
          onClick={openFinalizeModal}
          variant="outline"
          className="h-12 w-full sm:w-auto bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
          disabled={checking}
        >
          <Lock className="w-4 h-4 mr-2" /> Finalize & Kunci
        </Button> */}
      </div>

      {isCurrentPeriodFinal && (
        <div className="p-4 bg-green-50/50 border border-green-200/50 rounded-lg">
          <p className="text-sm font-medium text-green-800">
            Periode telah dikunci penuh
          </p>
          <p className="text-xs text-green-700">Seluruh baris terkunci.</p>
        </div>
      )}

      <FinalizePeriodModal
        isOpen={showFinalizeModal}
        onClose={() => setShowFinalizeModal(false)}
        onConfirm={handleFinalizePeriod}
        period={selectedPeriod}
        isLoading={isFinalizingPeriod}
        total={finalizeTotal}
        selesai={finalizeSelesai}
      />
    </div>
  );
}

// // app/tandon/page.tsx
// "use client";

// import { useEffect, useMemo, useState } from "react";
// import useSWR, { useSWRConfig } from "swr";
// import { AuthGuard } from "@/components/auth-guard";
// import { AppShell } from "@/components/app-shell";
// import { AppHeader } from "@/components/app-header";
// import { GlassCard } from "@/components/glass-card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { Badge } from "@/components/ui/badge";
// import {
//   Dialog,
//   DialogContent,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { Textarea } from "@/components/ui/textarea";
// import { useToast } from "@/hooks/use-toast";
// import { Plus, Pencil, Trash2, RefreshCw, Save, Search } from "lucide-react";
// import { format } from "date-fns";

// type Tandon = {
//   id: string;
//   kode: string;
//   nama: string;
//   deskripsi?: string | null;
//   initialMeter: number; // ⬅️ NEW
//   createdAt: string;
//   updatedAt: string;
// };

// type RespList = {
//   ok: true;
//   items: Tandon[];
//   total: number;
//   page: number;
//   pageSize: number;
// };

// const fetcher = (u: string) => fetch(u).then((r) => r.json());

// export default function MasterTandonPage() {
//   const { toast } = useToast();
//   const { mutate } = useSWRConfig();

//   const [q, setQ] = useState("");
//   const [page, setPage] = useState(1);
//   const pageSize = 20;

//   const key = useMemo(() => {
//     const sp = new URLSearchParams({
//       page: String(page),
//       pageSize: String(pageSize),
//     });
//     if (q.trim()) sp.set("q", q.trim());
//     return `/api/tandon?${sp.toString()}`;
//   }, [q, page]);

//   const { data, isLoading, error } = useSWR<RespList>(key, fetcher, {
//     revalidateOnFocus: false,
//   });
//   const items = data?.ok ? data.items : [];
//   const total = data?.total || 0;
//   const totalPages = Math.max(1, Math.ceil(total / pageSize));

//   // modal state
//   const [open, setOpen] = useState(false);
//   const [edit, setEdit] = useState<Tandon | null>(null);

//   // form state
//   const [kode, setKode] = useState("");
//   const [nama, setNama] = useState("");
//   const [deskripsi, setDeskripsi] = useState("");
//   const [initialMeter, setInitialMeter] = useState<string>("0"); // ⬅️ NEW

//   const [saving, setSaving] = useState(false);
//   const [genLoading, setGenLoading] = useState(false);

//   function openAdd() {
//     setEdit(null);
//     setKode("");
//     setNama("");
//     setDeskripsi("");
//     setInitialMeter("0"); // ⬅️ NEW
//     setOpen(true);
//   }

//   function openEdit(x: Tandon) {
//     setEdit(x);
//     setKode(x.kode);
//     setNama(x.nama);
//     setDeskripsi(x.deskripsi || "");
//     setInitialMeter(String(x.initialMeter ?? 0)); // ⬅️ NEW
//     setOpen(true);
//   }

//   async function handleGenerate() {
//     setGenLoading(true);
//     try {
//       const res = await fetch("/api/tandon?action=next-code", {
//         cache: "no-store",
//       });
//       const js = await res.json();
//       if (!res.ok || !js?.ok) throw new Error(js?.message || "Gagal generate");
//       setKode(js.kode || "");
//     } catch (e: any) {
//       toast({
//         title: "Gagal generate",
//         description: e?.message ?? "Error",
//         variant: "destructive",
//       });
//     } finally {
//       setGenLoading(false);
//     }
//   }

//   async function handleSave() {
//     if (!nama.trim()) {
//       toast({ title: "Nama wajib diisi", variant: "destructive" });
//       return;
//     }
//     const im = Math.max(0, Number(initialMeter) || 0);
//     setSaving(true);
//     try {
//       const payload: any = {
//         nama: nama.trim(),
//         deskripsi: deskripsi.trim() || null,
//         initialMeter: im, // ⬅️ NEW
//       };
//       if (kode.trim()) payload.kode = kode.trim().toUpperCase();

//       const method = edit ? "PUT" : "POST";
//       const body = edit ? { ...payload, id: edit.id } : payload;

//       const res = await fetch("/api/tandon", {
//         method,
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(body),
//       });
//       const js = await res.json();
//       if (!res.ok || !js?.ok) throw new Error(js?.message || "Gagal menyimpan");

//       toast({
//         title: "Tersimpan",
//         description: edit ? "Tandon diperbarui" : "Tandon ditambahkan",
//       });
//       setOpen(false);
//       await mutate(key);
//     } catch (e: any) {
//       toast({
//         title: "Gagal menyimpan",
//         description: e?.message ?? "Error",
//         variant: "destructive",
//       });
//     } finally {
//       setSaving(false);
//     }
//   }

//   async function handleDelete(x: Tandon) {
//     if (!confirm(`Hapus ${x.nama}?`)) return;
//     try {
//       const res = await fetch("/api/tandon", {
//         method: "DELETE",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ id: x.id }),
//       });
//       const js = await res.json();
//       if (!res.ok || !js?.ok) throw new Error(js?.message || "Gagal hapus");
//       toast({ title: "Dihapus", description: x.nama });
//       await mutate(key);
//     } catch (e: any) {
//       toast({
//         title: "Gagal hapus",
//         description: e?.message ?? "Error",
//         variant: "destructive",
//       });
//     }
//   }

//   useEffect(() => {
//     if (open && !edit && !kode) handleGenerate();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [open, edit]);

//   return (
//     <AuthGuard requiredRole="ADMIN">
//       <AppShell>
//         <div className="max-w-6xl mx-auto space-y-6">
//           {/* Header di dalam konten agar konsisten dengan halaman lain */}
//           <AppHeader title="Master Tandon" />

//           <GlassCard className="p-6">
//             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
//               <div className="flex items-center gap-2">
//                 <div className="relative">
//                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
//                   <Input
//                     value={q}
//                     onChange={(e) => {
//                       setQ(e.target.value);
//                       setPage(1);
//                     }}
//                     placeholder="Cari kode/nama/deskripsi…"
//                     className="pl-10 w-72 bg-card/50"
//                   />
//                 </div>
//                 {q && (
//                   <Badge
//                     variant="secondary"
//                     className="cursor-pointer"
//                     onClick={() => setQ("")}
//                   >
//                     Bersihkan
//                   </Badge>
//                 )}
//               </div>

//               <Button onClick={openAdd} className="gap-2">
//                 <Plus className="w-4 h-4" />
//                 Tambah Tandon
//               </Button>
//             </div>

//             <div className="mt-6 overflow-x-auto">
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead>Kode</TableHead>
//                     <TableHead>Nama</TableHead>
//                     <TableHead>Deskripsi</TableHead>
//                     <TableHead className="text-right">Meter Awal</TableHead>
//                     {/* ⬅️ NEW */}
//                     <TableHead className="text-right">Dibuat</TableHead>
//                     <TableHead className="text-center">Aksi</TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {isLoading && (
//                     <TableRow>
//                       <TableCell
//                         colSpan={6}
//                         className="text-center text-sm text-muted-foreground"
//                       >
//                         Memuat…
//                       </TableCell>
//                     </TableRow>
//                   )}
//                   {error && (
//                     <TableRow>
//                       <TableCell
//                         colSpan={6}
//                         className="text-center text-sm text-destructive"
//                       >
//                         Gagal memuat data
//                       </TableCell>
//                     </TableRow>
//                   )}
//                   {!isLoading && !error && items.length === 0 && (
//                     <TableRow>
//                       <TableCell
//                         colSpan={6}
//                         className="text-center text-sm text-muted-foreground"
//                       >
//                         Tidak ada data.
//                       </TableCell>
//                     </TableRow>
//                   )}
//                   {items.map((x) => (
//                     <TableRow key={x.id} className="hover:bg-muted/20">
//                       <TableCell className="font-medium text-primary">
//                         {x.kode}
//                       </TableCell>
//                       <TableCell>{x.nama}</TableCell>
//                       <TableCell className="max-w-[340px] truncate">
//                         {x.deskripsi || "-"}
//                       </TableCell>
//                       <TableCell className="text-right">
//                         {x.initialMeter}
//                       </TableCell>
//                       <TableCell className="text-right text-muted-foreground">
//                         {format(new Date(x.createdAt), "dd MMM yyyy")}
//                       </TableCell>
//                       <TableCell className="text-center">
//                         <div className="flex items-center justify-center gap-2">
//                           <Button
//                             size="sm"
//                             variant="outline"
//                             className="h-8 px-2"
//                             onClick={() => openEdit(x)}
//                           >
//                             <Pencil className="w-4 h-4" />
//                           </Button>
//                           <Button
//                             size="sm"
//                             variant="outline"
//                             className="h-8 px-2 text-destructive"
//                             onClick={() => handleDelete(x)}
//                           >
//                             <Trash2 className="w-4 h-4" />
//                           </Button>
//                         </div>
//                       </TableCell>
//                     </TableRow>
//                   ))}
//                 </TableBody>
//               </Table>

//               {totalPages > 1 && (
//                 <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
//                   <span>
//                     Halaman {page} / {totalPages} • Total {total} data
//                   </span>
//                   <div className="flex gap-2">
//                     <Button
//                       size="sm"
//                       variant="outline"
//                       disabled={page <= 1}
//                       onClick={() => setPage((p) => p - 1)}
//                     >
//                       Prev
//                     </Button>
//                     <Button
//                       size="sm"
//                       variant="outline"
//                       disabled={page >= totalPages}
//                       onClick={() => setPage((p) => p + 1)}
//                     >
//                       Next
//                     </Button>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </GlassCard>
//         </div>

//         {/* Modal Tambah/Edit */}
//         <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
//           <DialogContent className="sm:max-w-lg">
//             <DialogHeader>
//               <DialogTitle>
//                 {edit ? "Edit Tandon" : "Tambah Tandon"}
//               </DialogTitle>
//             </DialogHeader>

//             <div className="space-y-4">
//               <div className="space-y-2">
//                 <div className="flex items-center justify-between">
//                   <label className="text-sm font-medium">Kode</label>
//                   <Button
//                     type="button"
//                     size="sm"
//                     variant="outline"
//                     className="gap-2"
//                     onClick={handleGenerate}
//                     disabled={genLoading}
//                   >
//                     <RefreshCw
//                       className={`w-4 h-4 ${genLoading ? "animate-spin" : ""}`}
//                     />
//                     Generate
//                   </Button>
//                 </div>
//                 <Input
//                   value={kode}
//                   onChange={(e) => setKode(e.target.value.toUpperCase())}
//                   placeholder="Mis. TDN-001 (opsional, klik Generate)"
//                 />
//               </div>

//               <div className="space-y-2">
//                 <label className="text-sm font-medium">Nama</label>
//                 <Input
//                   value={nama}
//                   onChange={(e) => setNama(e.target.value)}
//                   placeholder="Tandon Utama"
//                 />
//               </div>

//               <div className="space-y-2">
//                 <label className="text-sm font-medium">Deskripsi</label>
//                 <Textarea
//                   value={deskripsi}
//                   onChange={(e) => setDeskripsi(e.target.value)}
//                   placeholder="Opsional"
//                 />
//               </div>

//               {/* ⬇️ NEW field */}
//               <div className="space-y-2">
//                 <label className="text-sm font-medium">
//                   Meter Awal (pertama kali)
//                 </label>
//                 <Input
//                   type="number"
//                   min={0}
//                   value={initialMeter}
//                   onChange={(e) => setInitialMeter(e.target.value)}
//                   placeholder="0"
//                 />
//                 <p className="text-xs text-muted-foreground">
//                   Hanya dipakai pada periode pertama. Periode berikutnya akan
//                   memakai meter akhir bulan sebelumnya.
//                 </p>
//               </div>
//             </div>

//             <DialogFooter className="gap-2">
//               <Button variant="outline" onClick={() => setOpen(false)}>
//                 Batal
//               </Button>
//               <Button onClick={handleSave} disabled={saving} className="gap-2">
//                 <Save className="w-4 h-4" />
//                 Simpan
//               </Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>
//       </AppShell>
//     </AuthGuard>
//   );
// }

// app/tandon/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { AppHeader } from "@/components/app-header";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Save,
  Search,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

type Tandon = {
  id: string;
  kode: string;
  nama: string;
  deskripsi?: string | null;
  initialMeter: number;
  createdAt: string;
  updatedAt: string;
};

type RespList = {
  ok: true;
  items: Tandon[];
  total: number;
  page: number;
  pageSize: number;
};

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function MasterTandonPage() {
  const { toast } = useToast();
  const { mutate } = useSWRConfig();

  // detect touch device (untuk switch tooltip→popover)
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const touch =
      typeof window !== "undefined" &&
      ("ontouchstart" in window ||
        (navigator as any).maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0);
    setIsTouch(!!touch);
  }, []);

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const key = useMemo(() => {
    const sp = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (q.trim()) sp.set("q", q.trim());
    return `/api/tandon?${sp.toString()}`;
  }, [q, page]);

  const { data, isLoading, error } = useSWR<RespList>(key, fetcher, {
    revalidateOnFocus: false,
  });
  const items = data?.ok ? data.items : [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // modal state
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Tandon | null>(null);

  // form state
  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [initialMeter, setInitialMeter] = useState<string>("0");

  const [saving, setSaving] = useState(false);
  const [genLoading, setGenLoading] = useState(false);

  function openAdd() {
    setEdit(null);
    setKode("");
    setNama("");
    setDeskripsi("");
    setInitialMeter("0");
    setOpen(true);
  }

  function openEdit(x: Tandon) {
    setEdit(x);
    setKode(x.kode);
    setNama(x.nama);
    setDeskripsi(x.deskripsi || "");
    setInitialMeter(String(x.initialMeter ?? 0));
    setOpen(true);
  }

  async function handleGenerate() {
    setGenLoading(true);
    try {
      const res = await fetch("/api/tandon?action=next-code", {
        cache: "no-store",
      });
      const js = await res.json();
      if (!res.ok || !js?.ok) throw new Error(js?.message || "Gagal generate");
      setKode(js.kode || "");
    } catch (e: any) {
      toast({
        title: "Gagal generate",
        description: e?.message ?? "Error",
        variant: "destructive",
      });
    } finally {
      setGenLoading(false);
    }
  }

  async function handleSave() {
    if (!nama.trim()) {
      toast({ title: "Nama wajib diisi", variant: "destructive" });
      return;
    }
    const im = Math.max(0, Number(initialMeter) || 0);
    setSaving(true);
    try {
      const payload: any = {
        nama: nama.trim(),
        deskripsi: deskripsi.trim() || null,
        initialMeter: im,
      };
      if (kode.trim()) payload.kode = kode.trim().toUpperCase();

      const method = edit ? "PUT" : "POST";
      const body = edit ? { ...payload, id: edit.id } : payload;

      const res = await fetch("/api/tandon", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const js = await res.json();
      if (!res.ok || !js?.ok) throw new Error(js?.message || "Gagal menyimpan");

      toast({
        title: "Tersimpan",
        description: edit ? "Tandon diperbarui" : "Tandon ditambahkan",
      });
      setOpen(false);
      await mutate(key);
    } catch (e: any) {
      toast({
        title: "Gagal menyimpan",
        description: e?.message ?? "Error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(x: Tandon) {
    if (!confirm(`Hapus ${x.nama}?`)) return;
    try {
      const res = await fetch("/api/tandon", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: x.id }),
      });
      const js = await res.json();
      if (!res.ok || !js?.ok) throw new Error(js?.message || "Gagal hapus");
      toast({ title: "Dihapus", description: x.nama });
      await mutate(key);
    } catch (e: any) {
      toast({
        title: "Gagal hapus",
        description: e?.message ?? "Error",
        variant: "destructive",
      });
    }
  }

  useEffect(() => {
    if (open && !edit && !kode) handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, edit]);

  const tipContent = (
    <div className="text-sm">
      <strong>Tandon</strong> adalah sumber air (bisa sumur, mata air, atau
      penampungan) yang airnya dialirkan ke meteran di tiap <em>blok</em> untuk
      dicatat pemakaiannya.
    </div>
  );

  const titleExtra = isTouch ? (
    // Mobile/Touch → Popover (tap)
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Apa itu Tandon?"
          className="inline-flex items-center justify-center rounded-full p-1 hover:bg-muted/50"
        >
          <Info className="h-4 w-4 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={10}
        collisionPadding={16}
        className="z-[9999] max-w-md break-words p-3 shadow-lg"
      >
        {tipContent}
      </PopoverContent>
    </Popover>
  ) : (
    // Desktop → Tooltip (hover/focus)
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Apa itu Tandon?"
            className="inline-flex items-center justify-center rounded-full p-1 hover:bg-muted/50"
          >
            <Info className="h-4 w-4 opacity-70" />
          </button>
        </TooltipTrigger>
        {/* pakai Portal agar tidak ter-clip */}
        <TooltipPrimitive.Portal>
          <TooltipContent
            side="top"
            align="start"
            sideOffset={10}
            collisionPadding={16}
            className="z-[9999] max-w-md break-words p-3 shadow-lg"
          >
            {tipContent}
          </TooltipContent>
        </TooltipPrimitive.Portal>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <AuthGuard requiredRole="ADMIN">
      <AppShell>
        <div className="max-w-6xl mx-auto space-y-6">
          <AppHeader title="Kelola Tandon" titleExtra={titleExtra} />

          <GlassCard className="p-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Cari kode/nama/deskripsi…"
                    className="pl-10 w-72 bg-card/50"
                  />
                </div>
                {q && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => setQ("")}
                  >
                    Bersihkan
                  </Badge>
                )}
              </div>

              <Button onClick={openAdd} className="gap-2">
                <Plus className="w-4 h-4" />
                Tambah Tandon
              </Button>
            </div>

            {/* Desktop: Tabel */}
            <div className="mt-6 overflow-x-auto hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead className="text-right">Meter Awal</TableHead>
                    <TableHead className="text-right">Dibuat</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-sm text-muted-foreground"
                      >
                        Memuat…
                      </TableCell>
                    </TableRow>
                  )}
                  {error && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-sm text-destructive"
                      >
                        Gagal memuat data
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && !error && items.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-sm text-muted-foreground"
                      >
                        Tidak ada data.
                      </TableCell>
                    </TableRow>
                  )}
                  {items.map((x) => (
                    <TableRow key={x.id} className="hover:bg-muted/20">
                      <TableCell className="font-medium text-primary">
                        {x.kode}
                      </TableCell>
                      <TableCell>{x.nama}</TableCell>
                      <TableCell className="max-w-[340px] truncate">
                        {x.deskripsi || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {x.initialMeter}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {format(new Date(x.createdAt), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2"
                            onClick={() => openEdit(x)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-destructive"
                            onClick={() => handleDelete(x)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: Cards */}
            <div className="sm:hidden mt-6 space-y-3">
              {isLoading && (
                <div className="text-center text-sm text-muted-foreground py-6">
                  Memuat…
                </div>
              )}
              {error && (
                <div className="text-center text-sm text-destructive py-6">
                  Gagal memuat data
                </div>
              )}
              {!isLoading && !error && items.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-6">
                  Tidak ada data.
                </div>
              )}

              {items.map((x) => (
                <div
                  key={x.id}
                  className="rounded-xl border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Kode</div>
                      <div className="font-medium text-primary">{x.kode}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        onClick={() => openEdit(x)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-destructive"
                        onClick={() => handleDelete(x)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Nama</div>
                      <div className="text-sm">{x.nama}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">
                        Meter Awal
                      </div>
                      <div className="text-sm font-medium">
                        {x.initialMeter}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-muted-foreground">
                        Deskripsi
                      </div>
                      <div className="text-sm">
                        {x.deskripsi && x.deskripsi.trim() ? x.deskripsi : "-"}
                      </div>
                    </div>
                    <div className="col-span-2 text-right">
                      <div className="text-xs text-muted-foreground">
                        Dibuat
                      </div>
                      <div className="text-sm">
                        {format(new Date(x.createdAt), "dd MMM yyyy")}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination (keduanya pakai ini) */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                <span>
                  Halaman {page} / {totalPages} • Total {total} data
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Prev
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Modal Tambah/Edit */}
        <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {edit ? "Edit Tandon" : "Tambah Tandon"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Kode</label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={handleGenerate}
                    disabled={genLoading}
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${genLoading ? "animate-spin" : ""}`}
                    />
                    Generate
                  </Button>
                </div>
                <Input
                  value={kode}
                  onChange={(e) => setKode(e.target.value.toUpperCase())}
                  placeholder="Mis. TDN-001 (opsional, klik Generate)"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nama</label>
                <Input
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Tandon Utama"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Deskripsi</label>
                <Textarea
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  placeholder="Opsional"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Meter Awal (pertama kali)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={initialMeter}
                  onChange={(e) => setInitialMeter(e.target.value)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Hanya dipakai pada periode pertama. Periode berikutnya akan
                  memakai meter akhir bulan sebelumnya.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="w-4 h-4" />
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AppShell>
    </AuthGuard>
  );
}

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
import { Plus, Pencil, Trash2, RefreshCw, Save, Search } from "lucide-react";
import { format } from "date-fns";

type Tandon = {
  id: string;
  kode: string;
  nama: string;
  deskripsi?: string | null;
  initialMeter: number; // ⬅️ NEW
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
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // modal state
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Tandon | null>(null);

  // form state
  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [initialMeter, setInitialMeter] = useState<string>("0"); // ⬅️ NEW

  const [saving, setSaving] = useState(false);
  const [genLoading, setGenLoading] = useState(false);

  function openAdd() {
    setEdit(null);
    setKode("");
    setNama("");
    setDeskripsi("");
    setInitialMeter("0"); // ⬅️ NEW
    setOpen(true);
  }

  function openEdit(x: Tandon) {
    setEdit(x);
    setKode(x.kode);
    setNama(x.nama);
    setDeskripsi(x.deskripsi || "");
    setInitialMeter(String(x.initialMeter ?? 0)); // ⬅️ NEW
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
        initialMeter: im, // ⬅️ NEW
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

  return (
    <AuthGuard requiredRole="ADMIN">
      <AppShell>
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header di dalam konten agar konsisten dengan halaman lain */}
          <AppHeader title="Master Tandon" />

          <GlassCard className="p-6">
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

            <div className="mt-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead className="text-right">Meter Awal</TableHead>
                    {/* ⬅️ NEW */}
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
            </div>
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

              {/* ⬇️ NEW field */}
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

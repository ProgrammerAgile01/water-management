// components/meter-blok-grid.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { useSearchParams } from "next/navigation";
import { GlassCard } from "./glass-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Save,
  Search,
  Trash2,
  Lock,
  LockOpen,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ApiRow = {
  id: string;
  kodeCustomer: string;
  nama: string;
  alamat: string;
  meterAwal: number;
  meterAkhir: number | null;
  pemakaian: number;
  status: "pending" | "completed";
  kendala?: string;
  locked?: boolean;
};

type ApiResp = {
  ok: boolean;
  period: string;
  locked: boolean;
  progress: {
    total: number;
    selesai: number;
    pending: number;
    percent: number;
  };
  items: ApiRow[];
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function MeterBlokGrid() {
  const { toast } = useToast();
  const { mutate } = useSWRConfig();
  const sp = useSearchParams();

  // ambil periode & zona dari URL
  const period = useMemo(
    () => (sp?.get("periode") || "").replace(/[^0-9-]/g, "").slice(0, 7),
    [sp]
  );
  const zona = useMemo(() => sp?.get("zona") || "", [sp]);

  // build key (hindari salah ketik path)
  const listKey = useMemo(() => {
    if (!period) return null;
    const qs = new URLSearchParams({ periode: period });
    if (zona) qs.set("zona", zona); // kode zona (blok)
    return `/api/catat-meter-blok?${qs.toString()}`;
  }, [period, zona]);

  const { data, isLoading, error } = useSWR<ApiResp>(listKey, fetcher, {
    revalidateOnFocus: false,
  });

  const rows = (data?.ok ? data?.items : []) as ApiRow[];
  const lockedPeriod = !!data?.locked;

  // UI states
  const [searchTerm, setSearchTerm] = useState("");
  const [editEnd, setEditEnd] = useState<Record<string, string>>({});
  const [editNote, setEditNote] = useState<Record<string, string>>({});
  const [autoSaving, setAutoSaving] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiRow | null>(null);

  // sinkron editNote dari server
  useEffect(() => {
    if (!data?.ok) return;
    const m: Record<string, string> = {};
    for (const r of data.items) m[r.id] = r.kendala ?? "";
    setEditNote(m);
  }, [data]);

  // reset buffer ketika period/zona berubah
  useEffect(() => {
    setEditEnd({});
    setAutoSaving({});
    setExpanded(null);
  }, [period, zona]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.kodeCustomer.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.alamat.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [rows, searchTerm]
  );

  const completedCount = useMemo(
    () => rows.filter((r) => r.status === "completed").length,
    [rows]
  );
  const percent = Math.min(
    100,
    Math.max(0, Number(data?.progress?.percent ?? 0))
  );

  const saveRow = async (row: ApiRow, endOverride?: number) => {
    if (lockedPeriod || row.locked) {
      toast({
        title: "Terkunci",
        description: "Periode atau baris ini terkunci.",
        variant: "destructive",
      });
      return;
    }
    const raw = endOverride != null ? String(endOverride) : editEnd[row.id];
    const parsed = raw === "" || raw == null ? null : Number(raw);
    if (parsed == null || !Number.isFinite(parsed)) {
      toast({
        title: "Input kosong",
        description: "Isi meter akhir terlebih dahulu",
        variant: "destructive",
      });
      return;
    }
    if (parsed < row.meterAwal) {
      toast({
        title: "Tidak valid",
        description: "Meter akhir < meter awal",
        variant: "destructive",
      });
      return;
    }
    try {
      setAutoSaving((p) => ({ ...p, [row.id]: true }));
      const res = await fetch(`/api/catat-meter-blok`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          meterAkhir: parsed,
          kendala: editNote[row.id] || "",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.message || "Gagal menyimpan");
      if (listKey) await mutate(listKey);
      setEditEnd((p) => {
        const { [row.id]: _, ...rest } = p;
        return rest;
      });
      toast({
        title: "Tersimpan",
        description: `Pencatatan ${row.nama} disimpan`,
      });
    } catch (e: any) {
      toast({
        title: "Gagal",
        description: e?.message ?? "Error",
        variant: "destructive",
      });
    } finally {
      setAutoSaving((p) => {
        const { [row.id]: _, ...rest } = p;
        return rest;
      });
    }
  };

  const deleteRow = async (row: ApiRow) => {
    if (!row?.id) return;
    if (lockedPeriod || row.locked) {
      toast({
        title: "Tidak bisa hapus",
        description: "Periode/baris terkunci.",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await fetch(`/api/catat-meter-blok?id=${row.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.message || "Gagal menghapus");
      if (listKey) await mutate(listKey);
      toast({ title: "Terhapus", description: `Inputan ${row.nama} dihapus.` });
    } catch (e: any) {
      toast({
        title: "Gagal",
        description: e?.message ?? "Error",
        variant: "destructive",
      });
    }
  };

  return (
    <GlassCard className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-semibold">
            Daftar Pencatatan Meter (Per Blok)
          </h3>
          {period ? (
            <>
              <p className="text-sm text-muted-foreground">
                Progress: {completedCount}/{rows.length} pelanggan ({percent}%)
              </p>
              {lockedPeriod && (
                <p className="text-xs text-green-700 mt-1">Periode dikunci</p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Pilih periode terlebih dahulu.
            </p>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari pelanggan…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-64"
          />
        </div>
      </div>

      {!period && (
        <div className="p-4 text-sm text-muted-foreground bg-muted/20 rounded">
          Silakan pilih periode.
        </div>
      )}
      {period && isLoading && (
        <div className="p-4 text-sm text-muted-foreground">Memuat data…</div>
      )}
      {period && error && (
        <div className="p-4 text-sm text-destructive">Gagal memuat data.</div>
      )}

      {period && data?.ok && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/20">
                <th className="text-left py-3 px-2 text-sm text-muted-foreground">
                  Kode
                </th>
                <th className="text-left py-3 px-2 text-sm text-muted-foreground">
                  Nama
                </th>
                <th className="text-center py-3 px-2 text-sm text-muted-foreground">
                  Meter Awal
                </th>
                <th className="text-center py-3 px-2 text-sm text-muted-foreground">
                  Meter Akhir
                </th>
                <th className="text-center py-3 px-2 text-sm text-muted-foreground">
                  Pemakaian
                </th>
                <th className="text-center py-3 px-2 text-sm text-muted-foreground">
                  Status
                </th>
                <th className="text-center py-3 px-2 text-sm text-muted-foreground">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const buf = editEnd[r.id];
                const endVal = buf === undefined ? r.meterAkhir ?? "" : buf;
                const parsed = endVal === "" ? NaN : Number(endVal);
                const pem = Number.isFinite(parsed)
                  ? Math.max(0, parsed - r.meterAwal)
                  : Math.max(0, (r.meterAkhir ?? 0) - r.meterAwal);

                return (
                  <React.Fragment key={r.id}>
                    <tr className="border-b border-border/10 hover:bg-muted/20">
                      <td className="py-3 px-2 text-sm font-medium text-primary">
                        {r.kodeCustomer}
                      </td>
                      <td className="py-3 px-2">
                        <p className="text-sm font-medium">{r.nama}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.alamat}
                        </p>
                      </td>
                      <td className="py-3 px-2 text-center text-sm">
                        {r.meterAwal}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Input
                          type="number"
                          value={endVal}
                          onChange={(e) => {
                            if (lockedPeriod || r.locked) return;
                            setEditEnd((p) => ({
                              ...p,
                              [r.id]: e.target.value,
                            }));
                          }}
                          className="w-28 h-8 text-center text-sm"
                          placeholder="0"
                          min={r.meterAwal}
                          readOnly={lockedPeriod || !!r.locked}
                        />
                      </td>
                      <td className="py-3 px-2 text-center text-sm font-medium text-primary">
                        {pem} m³
                      </td>
                      <td className="py-3 px-2 text-center">
                        {r.status === "completed" ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            Selesai
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center gap-1 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2"
                            onClick={() =>
                              saveRow(
                                r,
                                Number.isFinite(parsed)
                                  ? Number(parsed)
                                  : undefined
                              )
                            }
                            disabled={
                              !Number.isFinite(parsed) ||
                              lockedPeriod ||
                              !!r.locked ||
                              !!autoSaving[r.id]
                            }
                            title="Simpan"
                          >
                            <Save className="w-4 h-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-red-600"
                            onClick={() => setDeleteTarget(r)}
                            disabled={lockedPeriod || !!r.locked}
                            title="Hapus inputan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2"
                            onClick={() =>
                              setExpanded(expanded === r.id ? null : r.id)
                            }
                            title="Rincian"
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform ${
                                expanded === r.id ? "rotate-180" : ""
                              }`}
                            />
                          </Button>

                          {r.locked ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-green-600"
                              title="Terkunci"
                            >
                              <Lock className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2"
                              onClick={() =>
                                toast({
                                  title:
                                    "Kunci per baris tidak tersedia di mode blok.",
                                })
                              }
                              title="Kunci (off)"
                            >
                              <LockOpen className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {expanded === r.id && (
                      <tr className="bg-primary/5">
                        <td colSpan={7} className="p-4">
                          <div className="grid grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Meter Awal
                              </p>
                              <p className="font-medium">{r.meterAwal}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Meter Akhir
                              </p>
                              <p className="font-medium">
                                {(editEnd[r.id] ?? r.meterAkhir ?? 0) as any}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Pemakaian
                              </p>
                              <p className="font-bold text-primary">
                                {Math.max(
                                  0,
                                  (Number.isFinite(Number(editEnd[r.id]))
                                    ? Number(editEnd[r.id])
                                    : r.meterAkhir ?? 0) - r.meterAwal
                                )}{" "}
                                m³
                              </p>
                            </div>
                            <div className="col-span-1">
                              <p className="text-xs text-muted-foreground">
                                Kendala
                              </p>
                              <Textarea
                                value={editNote[r.id] ?? ""}
                                onChange={(e) =>
                                  setEditNote((p) => ({
                                    ...p,
                                    [r.id]: e.target.value,
                                  }))
                                }
                                className="h-20 text-sm mt-1"
                                placeholder="Catat kendala (opsional)"
                                readOnly={lockedPeriod || !!r.locked}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
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

      {/* dialog hapus */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Inputan?</AlertDialogTitle>
            <AlertDialogDescription>
              Kamu akan menghapus inputan meter untuk{" "}
              <b>{deleteTarget?.nama}</b> pada periode <b>{period}</b>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) deleteRow(deleteTarget);
                setDeleteTarget(null);
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={lockedPeriod}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </GlassCard>
  );
}

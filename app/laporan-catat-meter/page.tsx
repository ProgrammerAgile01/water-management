"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { AppHeader } from "@/components/app-header";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

type Row = {
  id: string;
  namaPelanggan: string;
  meterAwal: number;
  meterAkhir: number;
  pemakaian: number;
  zona: string;
  namaPetugas?: string;
  isSaved: boolean;
  isLocked: boolean;
};
type Zone = { id: string; nama: string };

const ALL_ZONA = "__ALL__";
const PAGE_SIZES = ["10", "20", "50", "100"] as const;

function formatYmId(ym: string) {
  const [y, m] = ym.split("-");
  const bulan = [
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
  const idx = Math.max(0, Math.min(11, parseInt(m || "1", 10) - 1));
  return `${bulan[idx]} ${y}`;
}

export default function LaporanCatatMeterPage() {
  // state
  const [periods, setPeriods] = useState<string[]>([]);
  const [month, setMonth] = useState<string>(""); // selected period (YYYY-MM)
  const [zonaId, setZonaId] = useState<string>(ALL_ZONA);
  const [rows, setRows] = useState<Row[]>([]);
  const [zonesAll, setZonesAll] = useState<Zone[]>([]);
  const [zonesAssigned, setZonesAssigned] = useState<Zone[]>([]);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(50);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const totalPages = useMemo(
    () => Math.max(Math.ceil(total / limit), 1),
    [total, limit]
  );

  async function loadData(
    p: number = 1,
    currentMonth?: string,
    currentZonaId?: string,
    currentLimit?: number
  ) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", String(currentLimit ?? limit));

      const m = (currentMonth ?? month)?.slice(0, 7);
      if (m) params.set("month", m);
      const z = currentZonaId ?? zonaId;
      if (z && z !== ALL_ZONA) params.set("zonaId", z);

      const res = await fetch(`/api/laporan/catat-meter?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setError(json?.error || "Gagal memuat");
        setRows([]);
        setTotal(0);
        setPage(1);
        return;
      }

      setRows(
        (json.rows || []).map((r: any) => ({
          ...r,
          namaPetugas: r.namaPetugas ?? "-",
          isSaved: !!r.isSaved,
          isLocked: !!r.isLocked,
        }))
      );
      setTotal(json.pagination?.total || 0);
      setPage(json.pagination?.page || 1);

      // bila month belum ada, ambil default dari API
      if (!month && json.month) setMonth(json.month);

      setZonesAssigned(json.zones?.assigned || []);
      setZonesAll(json.zones?.all || []);
    } catch (e) {
      console.error(e);
      setError("Gagal memuat");
    } finally {
      setLoading(false);
    }
  }

  // initial: load periods, pilih default, langsung load data
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/laporan/catat-meter/periods", {
          cache: "no-store",
        });
        const j = await r.json();
        if (j?.ok && Array.isArray(j.periods) && j.periods.length) {
          setPeriods(j.periods);
          setMonth(j.periods[0]); // default: terbaru
          await loadData(1, j.periods[0], zonaId, limit); // auto-load
        } else {
          setPeriods([]);
          // tetap load untuk dapatkan zones (meski tanpa periode)
          await loadData(1);
        }
      } catch {
        await loadData(1);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmt = (n: number) => (n ?? 0).toLocaleString("id-ID");

  function exportToExcel() {
    if (!rows.length) {
      toast.info("Tidak ada data untuk diekspor");
      return;
    }
    const aoa: (string | number)[][] = [
      ["LAPORAN CATAT METER"],
      [
        `Periode: ${
          month ? formatYmId(month) : "-"
        }   —   Dicetak: ${new Date().toLocaleDateString("id-ID", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}`,
      ],
      [],
      [
        "No",
        "Nama Pelanggan",
        "Nama Petugas",
        "Meter Awal",
        "Meter Akhir",
        "Jumlah Pemakaian",
        "Zona",
        "Status Simpan",
        "Status Finalisasi",
      ],
      ...rows.map((r, i) => [
        (page - 1) * limit + i + 1,
        r.namaPelanggan,
        r.namaPetugas || "-",
        r.meterAwal,
        r.meterAkhir,
        r.pemakaian,
        r.zona || "-",
        r.isSaved ? "Disimpan" : "Belum Disimpan", // NEW
        r.isLocked ? "Terkunci" : "Belum Terkunci", // NEW
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    (ws as any)["!cols"] = [
      { wch: 6 },
      { wch: 28 },
      { wch: 22 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
      { wch: 16 },
    ];
    (ws as any)["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, month || "Periode");
    XLSX.writeFile(wb, `Laporan-Catat-Meter-${month || "all"}.xlsx`);
  }

  // handlers — AUTO REFRESH on change
  const onChangeMonth = (v: string) => {
    setMonth(v);
    loadData(1, v, zonaId, limit);
  };
  const onChangeZona = (v: string) => {
    setZonaId(v);
    loadData(1, month, v, limit);
  };
  const onChangePageSize = (v: string) => {
    const num = parseInt(v, 10);
    setLimit(num);
    loadData(1, month, zonaId, num);
  };

  return (
    <AuthGuard requiredRole={["ADMIN", "PETUGAS"]}>
      <AppShell>
        <div className="max-w-7xl mx-auto space-y-6">
          <AppHeader title="Laporan Catat Meter" />

          {/* FILTER BAR */}
          <GlassCard className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Periode = dropdown dari DB */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Periode Catat</label>
                  <Select value={month} onValueChange={onChangeMonth}>
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Pilih periode" />
                    </SelectTrigger>
                    <SelectContent>
                      {periods.map((p) => (
                        <SelectItem key={p} value={p}>
                          {formatYmId(p)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Zona */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Blok</label>
                  <Select value={zonaId} onValueChange={onChangeZona}>
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Semua blok" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_ZONA}>Semua blok</SelectItem>

                      {zonesAssigned.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Blok Ditugaskan</SelectLabel>
                          {zonesAssigned.map((z) => (
                            <SelectItem key={z.id} value={z.id}>
                              {z.nama}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}

                      <SelectGroup>
                        <SelectLabel>Semua Blok</SelectLabel>
                        {zonesAll.map((z) => (
                          <SelectItem key={z.id} value={z.id}>
                            {z.nama}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {/* Page size */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium whitespace-nowrap">
                    Baris
                  </label>
                  <Select
                    value={String(limit)}
                    onValueChange={onChangePageSize}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue placeholder="50" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={() => {
                  exportToExcel();
                  toast.success("Data berhasil diekspor ke Excel");
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </GlassCard>

          {/* DESKTOP TABLE */}
          <GlassCard className="p-6 hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 text-sm text-muted-foreground">
                    <th className="text-left py-3 px-2">No</th>
                    <th className="text-left py-3 px-2">Nama Pelanggan</th>
                    <th className="text-left py-3 px-2">Nama Petugas</th>
                    <th className="text-center py-3 px-2">Meter Awal</th>
                    <th className="text-center py-3 px-2">Meter Akhir</th>
                    <th className="text-center py-3 px-2">Pemakaian (m³)</th>
                    <th className="text-center py-3 px-2 w-36">Blok</th>
                    <th className="text-center py-3 px-2 w-28">
                      Status Simpan
                    </th>
                    <th className="text-center py-3 px-2 w-28">
                      Status Finalisasi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <tr
                          key={`sk-${i}`}
                          className="border-b border-border/30"
                        >
                          <td className="py-3 px-2">
                            <Skeleton className="h-4 w-8" />
                          </td>
                          <td className="py-3 px-2">
                            <Skeleton className="h-4 w-64" />
                          </td>
                          <td className="py-3 px-2">
                            <Skeleton className="h-4 w-40" />
                          </td>
                          {/* Nama Petugas */}
                          <td className="py-3 px-2">
                            <div className="flex justify-end">
                              <Skeleton className="h-4 w-16" />
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex justify-end">
                              <Skeleton className="h-4 w-16" />
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex justify-end">
                              <Skeleton className="h-4 w-20" />
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <Skeleton className="h-4 w-24" />
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex justify-center">
                              <Skeleton className="h-5 w-16 rounded-full" />
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex justify-center">
                              <Skeleton className="h-5 w-16 rounded-full" />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </>
                  ) : error ? (
                    <tr>
                      <td
                        className="py-4 px-2 text-sm text-red-600"
                        colSpan={7}
                      >
                        {error}
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td
                        className="py-4 px-2 text-sm text-muted-foreground"
                        colSpan={7}
                      >
                        Tidak ada data.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, idx) => (
                      <tr
                        key={r.id}
                        className="border-b border-border/30 hover:bg-muted/20 text-sm"
                      >
                        <td className="py-3 px-2">
                          {(page - 1) * limit + idx + 1}
                        </td>
                        <td className="py-3 px-2 font-medium">
                          {r.namaPelanggan}
                        </td>
                        <td className="py-3 px-2">{r.namaPetugas || "-"}</td>
                        <td className="py-3 px-2 text-center tabular-nums">
                          {fmt(r.meterAwal)}
                        </td>
                        <td className="py-3 px-2 text-center tabular-nums">
                          {fmt(r.meterAkhir)}
                        </td>
                        <td className="py-3 px-2 text-center font-semibold tabular-nums">
                          {fmt(r.pemakaian)} m³
                        </td>
                        <td className="py-3 px-2 text-center">
                          {r.zona || "-"}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Badge variant={r.isSaved ? "default" : "secondary"}>
                            {r.isSaved ? "Disimpan" : "Belum Disimpan"}
                          </Badge>
                        </td>

                        <td className="py-3 px-2 text-center">
                          <Badge variant={r.isLocked ? "default" : "secondary"}>
                            {r.isLocked ? "Terkunci" : "Belum Terkunci"}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* footer pagination + size */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t">
              <div className="text-sm">
                Halaman <b>{page}</b> dari <b>{totalPages}</b> • Total{" "}
                <b>{total}</b> baris
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Baris</span>
                  <Select
                    value={String(limit)}
                    onValueChange={onChangePageSize}
                  >
                    <SelectTrigger className="h-8 w-24">
                      <SelectValue placeholder="50" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1 || loading}
                    onClick={() => loadData(page - 1, month, zonaId, limit)}
                    className="bg-transparent"
                  >
                    ‹ Sebelumnya
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages || loading}
                    onClick={() => loadData(page + 1, month, zonaId, limit)}
                    className="bg-transparent"
                  >
                    Selanjutnya ›
                  </Button>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* MOBILE CARDS */}
          <div className="md:hidden space-y-4">
            {loading ? (
              <>
                {Array.from({ length: 3 }).map((_, i) => (
                  <GlassCard key={`skm-${i}`} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <Skeleton className="h-4 w-40 mb-2" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-3 w-14" />
                    </div>
                    <Skeleton className="h-3 w-32" /> {/* Petugas */}
                    <div className="grid grid-cols-2 gap-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-20 justify-self-end" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-20 justify-self-end" />
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-3 w-24 justify-self-end" />
                    </div>
                  </GlassCard>
                ))}
              </>
            ) : error ? (
              <GlassCard className="p-8 text-center text-sm text-red-600">
                {error}
              </GlassCard>
            ) : rows.length === 0 ? (
              <GlassCard className="p-8 text-center text-sm text-muted-foreground">
                Tidak ada data.
              </GlassCard>
            ) : (
              rows.map((r) => (
                <GlassCard key={r.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{r.namaPelanggan}</h4>
                      <p className="text-xs text-muted-foreground">
                        {month ? formatYmId(month) : "-"}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.zona || "-"}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-y-1 text-sm">
                    <span className="text-muted-foreground">Meter Awal</span>
                    <span className="tabular-nums text-right">
                      {fmt(r.meterAwal)}
                    </span>

                    <span className="text-muted-foreground">Meter Akhir</span>
                    <span className="tabular-nums text-right">
                      {fmt(r.meterAkhir)}
                    </span>

                    <span className="text-muted-foreground">
                      Pemakaian (m³)
                    </span>
                    <span className="tabular-nums text-right font-semibold">
                      {fmt(r.pemakaian)} m³
                    </span>
                    <span className="text-muted-foreground">Status Simpan</span>
                    <span className="text-right">
                      {r.isSaved ? "Disimpan" : "Belum Disimpan"}
                    </span>

                    <span className="text-muted-foreground">
                      Status Finalisasi
                    </span>
                    <span className="text-right">
                      {r.isLocked ? "Terkunci" : "Belum Terkunci"}
                    </span>
                    <div className="text-sm mt-2 font-semibold text-muted-foreground">
                      Petugas:{" "}
                      <span className="text-foreground">
                        {r.namaPetugas || "-"}
                      </span>
                    </div>
                  </div>
                </GlassCard>
              ))
            )}

            {/* mobile pager + size */}
            {!!rows.length && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Baris</span>
                  <Select
                    value={String(limit)}
                    onValueChange={onChangePageSize}
                  >
                    <SelectTrigger className="h-8 w-24">
                      <SelectValue placeholder="50" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1 || loading}
                    onClick={() => loadData(page - 1, month, zonaId, limit)}
                    className="bg-transparent"
                  >
                    ‹ Sebelumnya
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages || loading}
                    onClick={() => loadData(page + 1, month, zonaId, limit)}
                    className="bg-transparent"
                  >
                    Selanjutnya ›
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}

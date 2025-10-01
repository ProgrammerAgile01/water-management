// app/laporan/konsumsi-zona/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { AppHeader } from "@/components/app-header";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Filter,
  Search,
  Loader2,
  Droplets,
  MapPin,
} from "lucide-react";

type ZoneRow = {
  zona: string;
  kodeZona?: string; // <-- NEW
  totalPemakaian: number;
  jumlahPelangganTercatat: number;
};

type ApiResponse = {
  ok: boolean;
  month: string;
  availableMonths?: string[];
  zone?: string | null;
  rows: ZoneRow[];
  zones: string[];
  zonesDict?: Record<string, string>; // <-- NEW (nama -> kode)
  summary: {
    totalPemakaian: number;
    byZone: { zona: string; total: number }[];
    pelangganCount: number;
  };
  pagination?: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
  error?: string;
};

function formatM3(n: number) {
  return `${Number(n || 0).toLocaleString("id-ID")} m³`;
}
function formatNum(n: number) {
  return Number(n || 0).toLocaleString("id-ID");
}

function ZoneCardMobile({
  r,
  zonesDict,
}: {
  r: ZoneRow;
  zonesDict?: Record<string, string>;
}) {
  const avg = r.jumlahPelangganTercatat
    ? (r.totalPemakaian / r.jumlahPelangganTercatat).toFixed(2)
    : "0.00";
  const kode = r.kodeZona ?? zonesDict?.[r.zona] ?? "-";
  return (
    <div className="rounded-2xl border bg-card/60 backdrop-blur p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{kode}</Badge>
          <div className="font-semibold">{r.zona}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Total Pemakaian</div>
          <div className="text-2xl font-bold leading-none">
            {formatNum(r.totalPemakaian)}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">m³</div>
        </div>
      </div>

      <Separator className="my-3" />

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-muted/40 px-3 py-2">
          <div className="text-xs text-muted-foreground">
            Pelanggan Tercatat
          </div>
          <div className="font-medium">
            {formatNum(r.jumlahPelangganTercatat)}
          </div>
        </div>
        <div className="rounded-xl bg-muted/40 px-3 py-2">
          <div className="text-xs text-muted-foreground">
            Rata-rata m³/Pelanggan
          </div>
          <div className="font-medium">{avg}</div>
        </div>
      </div>
    </div>
  );
}

function SummaryBar({
  totalPemakaian,
  pelangganCount,
  month,
}: {
  totalPemakaian: number;
  pelangganCount: number;
  month: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <GlassCard className="p-4 flex items-center gap-3">
        <div className="rounded-2xl p-2 bg-primary/10">
          <Droplets className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">
            Total Pemakaian ({month})
          </div>
          <div className="text-lg font-bold">{formatM3(totalPemakaian)}</div>
        </div>
      </GlassCard>

      <GlassCard className="p-4 flex items-center gap-3">
        <div className="rounded-2xl p-2 bg-primary/10">
          <MapPin className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Jumlah Blok</div>
          <div className="text-lg font-bold">{formatNum(pelangganCount)}</div>
        </div>
      </GlassCard>
    </div>
  );
}

export default function KonsumsiZonaPage() {
  const [month, setMonth] = useState<string>("");
  const [zone, setZone] = useState<string>("ALL");
  const [q, setQ] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [size, setSize] = useState<number>(1000);
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (month) params.set("month", month);
        if (zone && zone !== "ALL") params.set("zone", zone);
        if (q) params.set("q", q);
        params.set("page", String(page));
        params.set("size", String(size));
        const res = await fetch(
          `/api/laporan/konsumsi-zona?${params.toString()}`,
          { cache: "no-store" }
        );
        const json: ApiResponse = await res.json();
        if (!ignore) {
          if (!json.ok) {
            setError(json.error || "Gagal memuat data");
            setData(null);
          } else {
            setData(json);
            if (!month) setMonth(json.month);
          }
        }
      } catch (e: any) {
        if (!ignore) {
          setError(e?.message || "Terjadi kesalahan");
          setData(null);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    run();
    return () => {
      ignore = true;
    };
  }, [month, zone, q, page, size]);

  useEffect(() => {
    function onExcel() {
      const p = new URLSearchParams({ month, zone, q });
      window.open(
        `/api/laporan/konsumsi-zona/export/excel?${p.toString()}`,
        "_blank"
      );
    }
    window.addEventListener("export-kz-excel", onExcel as any);
    return () => window.removeEventListener("export-kz-excel", onExcel as any);
  }, [month, zone, q]);

  const zones = useMemo(() => ["ALL", ...(data?.zones || [])], [data?.zones]);
  const monthOptions = useMemo(
    () => data?.availableMonths || [],
    [data?.availableMonths]
  );
  const rows = data?.rows || [];
  const pagination = data?.pagination;

  return (
    <AuthGuard requiredRole="ADMIN,PETUGAS">
      <AppShell>
        <div className="max-w-6xl mx-auto space-y-6">
          <AppHeader title="Konsumsi Blok" />
          <div className="text-muted-foreground -mt-3">
            Total pemakaian air per blok
          </div>

          {/* Filter */}
          <GlassCard className="p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex gap-2 items-center">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filter</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 md:flex md:flex-1">
                {/* Periode */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Periode</span>
                  <Select
                    value={month}
                    onValueChange={(v) => {
                      setPage(1);
                      setMonth(v);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih bulan" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((m) => (
                        <SelectItem key={m} value={m}>
                          {new Date(m + "-01").toLocaleDateString("id-ID", {
                            month: "long",
                            year: "numeric",
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Zona */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Blok</span>
                  <Select
                    value={zone}
                    onValueChange={(v) => {
                      setPage(1);
                      setZone(v);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Semua blok" />
                    </SelectTrigger>
                    <SelectContent>
                      {zones.map((z) => (
                        <SelectItem key={z} value={z}>
                          {z === "ALL" ? "Semua blok" : z}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cari Zona */}
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-xs text-muted-foreground">
                    Cari Blok
                  </span>
                  <div className="relative">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      value={q}
                      onChange={(e) => {
                        setPage(1);
                        setQ(e.target.value);
                      }}
                      placeholder="Ketik nama blok…"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Select
                  value={String(size)}
                  onValueChange={(v) => {
                    setPage(1);
                    setSize(Number(v));
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Ukuran" />
                  </SelectTrigger>
                  <SelectContent>
                    {[20, 50, 100, 200, 500, 1000].map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* <Button
                  variant="outline"
                  onClick={() => {
                    setMonth(data?.availableMonths?.[0] || "");
                    setZone("ALL");
                    setQ("");
                    setPage(1);
                  }}
                >
                  Reset
                </Button> */}

                <Button
                  onClick={() => {
                    const p = new URLSearchParams({ month, zone, q });
                    window.open(
                      `/api/laporan/konsumsi-zona/export/excel?${p.toString()}`,
                      "_blank"
                    );
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Excel
                </Button>
              </div>
            </div>
          </GlassCard>

          {/* Summary */}
          <SummaryBar
            month={data?.month || month}
            totalPemakaian={data?.summary.totalPemakaian || 0}
            pelangganCount={rows.length}
          />

          {/* ===== Desktop table: match MeterGrid theme ===== */}
          <GlassCard className="hidden md:block p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <div className="backdrop-blur p-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/20">
                      <th className="text-left  py-3 px-2 text-sm font-medium text-muted-foreground">
                        Kode
                      </th>
                      <th className="text-left  py-3 px-2 text-sm font-medium text-muted-foreground">
                        Blok
                      </th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                        Total Pemakaian (m³)
                      </th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                        Pelanggan Tercatat
                      </th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                        Rata-rata m³/Pelanggan
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading && (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-6 text-center text-sm text-muted-foreground"
                        >
                          <Loader2 className="w-4 h-4 mr-2 inline animate-spin" />
                          Memuat data…
                        </td>
                      </tr>
                    )}

                    {!loading && rows.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-6 text-center text-sm text-muted-foreground"
                        >
                          Tidak ada data untuk filter saat ini.
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      rows.map((r) => {
                        const avg = r.jumlahPelangganTercatat
                          ? r.totalPemakaian / r.jumlahPelangganTercatat
                          : 0;
                        const kode =
                          r.kodeZona ?? data?.zonesDict?.[r.zona] ?? "-";
                        return (
                          <tr
                            key={`${kode}-${r.zona}`}
                            className="border-b border-border/10 hover:bg-muted/20"
                          >
                            <td className="py-3 px-2 text-sm font-medium text-primary">
                              {kode}
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">Blok</Badge>
                                <span className="text-sm font-medium text-foreground">
                                  {r.zona}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-sm text-right font-semibold">
                              {Number(r.totalPemakaian).toLocaleString("id-ID")}
                            </td>
                            <td className="py-3 px-2 text-sm text-right">
                              {Number(r.jumlahPelangganTercatat).toLocaleString(
                                "id-ID"
                              )}
                            </td>
                            <td className="py-3 px-2 text-sm text-right">
                              {avg.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}

                    {!loading && rows.length > 0 && (
                      <tr className="border-t border-border/20 bg-muted/20">
                        <td
                          className="py-3 px-2 text-right text-sm font-semibold"
                          colSpan={2}
                        >
                          Total
                        </td>
                        <td className="py-3 px-2 text-sm text-right font-bold">
                          {Number(
                            rows.reduce(
                              (a, b) => a + (b.totalPemakaian || 0),
                              0
                            )
                          ).toLocaleString("id-ID")}{" "}
                          m³
                        </td>
                        <td className="py-3 px-2 text-sm text-right font-bold">
                          {Number(
                            rows.reduce(
                              (a, b) => a + (b.jumlahPelangganTercatat || 0),
                              0
                            )
                          ).toLocaleString("id-ID")}
                        </td>
                        <td className="py-3 px-2" />
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination footer (tetap di luar <table>) */}
            {!loading && data?.pagination && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t bg-muted/30">
                <div className="text-sm text-muted-foreground">
                  Menampilkan{" "}
                  {data.pagination.total === 0
                    ? 0
                    : (data.pagination.page - 1) * data.pagination.size + 1}
                  {"–"}
                  {Math.min(
                    data.pagination.page * data.pagination.size,
                    data.pagination.total
                  )}{" "}
                  dari {data.pagination.total} blok
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={data.pagination.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </Button>
                  <div className="text-sm min-w-[80px] text-center">
                    {data.pagination.page} / {data.pagination.totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      data.pagination.page >= data.pagination.totalPages
                    }
                    onClick={() =>
                      setPage((p) =>
                        Math.min(data.pagination!.totalPages, p + 1)
                      )
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Mobile Cards */}
          <div className="md:hidden grid grid-cols-1 gap-3">
            {loading && (
              <GlassCard className="p-6 text-center text-muted-foreground">
                <Loader2 className="w-4 h-4 mr-2 inline animate-spin" />
                Memuat data…
              </GlassCard>
            )}
            {!loading && rows.length === 0 && (
              <GlassCard className="p-6 text-center text-muted-foreground">
                Tidak ada data untuk filter saat ini.
              </GlassCard>
            )}
            {!loading &&
              rows.map((r) => (
                <ZoneCardMobile
                  key={`${r.kodeZona ?? r.zona}`}
                  r={r}
                  zonesDict={data?.zonesDict}
                />
              ))}
          </div>

          {/* Ringkasan grid */}
          <GlassCard className="p-4">
            <div className="mb-3 font-semibold">Ringkasan (grid)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(data?.summary.byZone || []).map((z) => (
                <div
                  key={z.zona}
                  className="rounded-2xl border bg-card/60 backdrop-blur p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{z.zona}</div>
                    <Badge variant="outline">Blok</Badge>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Total Pemakaian
                  </div>
                  <div className="text-xl font-bold">{formatM3(z.total)}</div>
                </div>
              ))}
            </div>
          </GlassCard>

          {error && (
            <GlassCard className="p-4 border-destructive/40">
              <div className="text-destructive text-sm">{error}</div>
            </GlassCard>
          )}
        </div>
      </AppShell>
    </AuthGuard>
  );
}

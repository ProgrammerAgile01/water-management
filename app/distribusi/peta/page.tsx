"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import * as XLSX from "xlsx";
import dynamic from "next/dynamic";

import { AppShell } from "@/components/app-shell";
import { AppHeader } from "@/components/app-header";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Download,
  Info,
  MapPin,
  RefreshCw,
  Search as SearchIcon,
} from "lucide-react";

// Map client-only
const DistribusiMap = dynamic(() => import("./DistribusiMap"), { ssr: false });
import type { MapPoint } from "./DistribusiMap";

type PetaPoint = {
  pelangganId: string;
  kode: string;
  nama: string;
  zonaId: string | null;
  zonaNama: string | null;
  lat: number | null;
  lng: number | null;
  pemakaianM3: number;
  baselineAvg: number | null;
  baselineCount: number;
  pctChange: number | null;
  status: "NORMAL" | "ANOMALY" | "ZERO";
  color: string;
};
type Resp = {
  ok: boolean;
  periode: string | null; // "YYYY-MM"
  periods: string[];
  zones: { id: string; nama: string }[];
  legend: { color: string; label: string }[];
  missingCoords: number;
  data: PetaPoint[];
  error?: string;
};

const fetcher = (u: string) => fetch(u).then((r) => r.json());
const toPct = (v: number | null) =>
  typeof v === "number" ? `${(v * 100).toFixed(0)}%` : "-";
const MONTHS_ID = [
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
const fmtPeriodeID = (kode?: string | null) => {
  if (!kode) return "-";
  const [y, m] = (kode || "").split("-").map(Number);
  return `${MONTHS_ID[(m || 1) - 1]} ${y}`;
};

export default function DistribusiPetaPage() {
  // ===== Filter state =====
  const [periode, setPeriode] = useState<string>("");
  const [zonaId, setZonaId] = useState<string | "ALL">("ALL");
  const [threshold, setThreshold] = useState<string>("0.75");
  const [baselineN, setBaselineN] = useState<string>("3"); // 3/6/12
  const [query, setQuery] = useState<string>("");
  const [tab, setTab] = useState<"ALL" | "NORMAL" | "ANOMALY" | "ZERO">("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (periode) p.set("periode", periode);
    if (zonaId !== "ALL") p.set("zonaId", zonaId);
    if (threshold) p.set("thresholdPct", threshold);
    if (baselineN) p.set("n", baselineN);
    return p.toString();
  }, [periode, zonaId, threshold, baselineN]);

  const { data, isLoading, mutate } = useSWR<Resp>(
    `/api/distribusi/peta${qs ? `?${qs}` : ""}`,
    fetcher,
    {
      keepPreviousData: true,
    }
  );

  // default periode dari server
  useEffect(() => {
    if (data?.periode && !periode) setPeriode(data.periode);
  }, [data?.periode]); // eslint-disable-line

  // ===== Filter di client =====
  const filtered = useMemo(() => {
    let rows = data?.data || [];
    if (tab !== "ALL") rows = rows.filter((r) => r.status === tab);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.nama.toLowerCase().includes(q) ||
          r.kode.toLowerCase().includes(q) ||
          (r.zonaNama || "").toLowerCase().includes(q)
      );
    }
    return rows;
  }, [data, query, tab]);

  // Statistik ringkas
  const stat = useMemo(() => {
    const all = data?.data || [];
    return {
      total: all.length,
      normal: all.filter((r) => r.status === "NORMAL").length,
      anomaly: all.filter((r) => r.status === "ANOMALY").length,
      zero: all.filter((r) => r.status === "ZERO").length,
      lowHistory: all.filter((r) => r.baselineCount <= 1).length,
      coordsMissing:
        all.length - all.filter((r) => r.lat != null && r.lng != null).length,
    };
  }, [data]);

  // ===== Pagination (tabel) =====
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  // ketika user klik baris tabel/kartu:
  const handleRowClick = (pelangganId: string) => {
    setSelectedId(pelangganId);
    // optional: scroll ke peta
    document
      .getElementById("peta-map")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  function focusOnMap(id: string) {
    setSelectedId(id); // trigger map flyTo + openPopup
    document
      .getElementById("peta-map")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ===== Data untuk peta (yang punya lat/lng) =====
  const mapPoints: MapPoint[] = useMemo(
    () =>
      (filtered || [])
        .filter((p) => p.lat != null && p.lng != null)
        .map((p) => ({
          id: p.pelangganId,
          lat: Number(p.lat!),
          lng: Number(p.lng!),
          nama: p.nama,
          kode: p.kode,
          zonaNama: p.zonaNama ?? null,
          pemakaianM3: p.pemakaianM3,
          baselineAvg: p.baselineAvg,
          baselineCount: p.baselineCount,
          pctChange: p.pctChange,
          status: p.status,
        })),
    [filtered]
  );

  // ===== Export =====
  const exportExcel = () => {
    const rows = filtered.map((r) => ({
      Pelanggan: r.nama,
      Kode: r.kode,
      Zona: r.zonaNama || "-",
      Periode: fmtPeriodeID(data?.periode),
      "Pemakaian (m³)": r.pemakaianM3,
      "Rata-rata Pembanding (m³)": r.baselineAvg ?? "",
      "Jumlah Bulan Pembanding": r.baselineCount,
      "Perubahan vs Rata-rata":
        typeof r.pctChange === "number"
          ? (r.pctChange * 100).toFixed(0) + "%"
          : "",
      Status: r.status,
      Latitude: r.lat ?? "",
      Longitude: r.lng ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Distribusi");
    XLSX.writeFile(
      wb,
      `distribusi-pemakaian-${data?.periode || "latest"}.xlsx`
    );
  };

  return (
    <AppShell>
      <AppHeader title="Peta Pemakaian Air" />

      {/* Toolbar kanan */}
      {/* <div className="p-4 pt-2 flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
        <Button size="sm" onClick={exportExcel}>
          <Download className="w-4 h-4 mr-1" /> Export
        </Button>
      </div> */}

      <div className="space-y-4">
        {/* ===== Banner Info ===== */}
        {!!stat.lowHistory && (
          <GlassCard className="p-3 flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5" />
            <div className="text-sm">
              {stat.lowHistory} pelanggan punya riwayat &le; 1 bulan. Hasil
              deteksi mungkin kurang akurat. Tambahkan data periode sebelumnya
              agar baseline lebih stabil.
            </div>
          </GlassCard>
        )}
        {!!stat.coordsMissing && (
          <GlassCard className="p-3 flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5" />
            <div className="text-sm">
              {stat.coordsMissing} pelanggan belum memiliki koordinat (lat/lng).
              Edit pelanggan untuk mengisi Latitude & Longitude agar muncul di
              peta.
            </div>
          </GlassCard>
        )}

        {/* ===== Ringkasan ===== */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <GlassCard className="p-4 flex items-center gap-3">
            <div className="rounded-2xl p-2 bg-primary/10">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                Periode Saat Ini
              </div>
              <div className="text-lg font-bold">
                {fmtPeriodeID(data?.periode)}
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4 flex items-center justify-between">
            <div className="text-sm">Total Pelanggan</div>
            <div className="text-lg font-bold">{stat.total}</div>
          </GlassCard>
          <GlassCard className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: "#22c55e" }}
              />
              <div className="text-sm">Normal</div>
            </div>
            <div className="text-lg font-bold">{stat.normal}</div>
          </GlassCard>
          <GlassCard className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: "#ef4444" }}
              />
              <div className="text-sm">Abnormal</div>
            </div>
            <div className="text-lg font-bold">{stat.anomaly}</div>
          </GlassCard>
        </div>

        {/* ===== PETA ===== */}
        <GlassCard className="overflow-hidden">
          <div id="peta-map">
            <DistribusiMap
              points={mapPoints}
              selectedId={selectedId}
              onMarkerSelect={(id) => setSelectedId(id)} // klik marker → highlight baris (kalau mau dipakai)
            />
          </div>
        </GlassCard>

        {/* ===== Filter Bar ===== */}
        <GlassCard className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* Periode */}
            <div className="flex flex-col">
              <div className="text-xs text-muted-foreground mb-1">
                Periode Catat
              </div>
              <Select
                value={periode || data?.periode || ""}
                onValueChange={(v) => {
                  setPeriode(v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={fmtPeriodeID(data?.periode)} />
                </SelectTrigger>
                <SelectContent>
                  {(data?.periods || []).map((p) => (
                    <SelectItem key={p} value={p}>
                      {fmtPeriodeID(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Jika kosong, otomatis pakai
                yang terbaru.
              </div>
            </div>

            {/* Zona */}
            <div className="flex flex-col">
              <div className="text-xs text-muted-foreground mb-1">Blok</div>
              <Select
                value={zonaId}
                onValueChange={(v) => {
                  setZonaId(v as any);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua Blok" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Blok</SelectItem>
                  {(data?.zones || []).map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sensitivitas */}
            <div className="flex flex-col">
              <div className="text-xs text-muted-foreground mb-1">
                Sensitivitas Deteksi
              </div>
              <Select
                value={threshold}
                onValueChange={(v) => {
                  setThreshold(v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Threshold" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.3">Ketat (±30%)</SelectItem>
                  <SelectItem value="0.5">Sedang (±50%)</SelectItem>
                  <SelectItem value="0.75">Longgar (±75%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Periode Pembanding */}
            <div className="flex flex-col">
              <div className="text-xs text-muted-foreground mb-1">
                Periode Pembanding
              </div>
              <Select
                value={baselineN}
                onValueChange={(v) => {
                  setBaselineN(v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 bulan terakhir</SelectItem>
                  <SelectItem value="6">6 bulan terakhir</SelectItem>
                  <SelectItem value="12">12 bulan terakhir</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cari */}
            <div className="md:col-span-1 col-span-2">
              <div className="text-xs text-muted-foreground mb-1">
                Cari (nama/kode/blok)
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Ketik untuk mencari…"
                />
                <SearchIcon className="w-4 h-4 opacity-70" />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* ===== Tabs status ===== */}
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as any);
            setPage(1);
          }}
        >
          <TabsList className="grid grid-cols-4 w-full md:w-auto">
            <TabsTrigger value="ALL">Semua</TabsTrigger>
            <TabsTrigger value="NORMAL">Normal</TabsTrigger>
            <TabsTrigger value="ANOMALY">Abnormal</TabsTrigger>
            <TabsTrigger value="ZERO">0 m³</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* ===== MOBILE CARDS (md:hidden) ===== */}
        <div className="grid gap-3 md:hidden">
          {isLoading && (
            <GlassCard className="p-4 text-sm text-muted-foreground">
              Memuat data…
            </GlassCard>
          )}
          {!isLoading && pageRows.length === 0 && (
            <GlassCard className="p-4 text-sm text-muted-foreground">
              Tidak ada data untuk filter saat ini.
            </GlassCard>
          )}
          {pageRows.map((r, idx) => (
            <button
              key={r.pelangganId} // ← kunci di ELEMEN TERLUAR
              type="button"
              onClick={() => focusOnMap(r.pelangganId)}
              className={[
                "w-full text-left",
                selectedId === r.pelangganId
                  ? "ring-1 ring-primary/40 bg-primary/5"
                  : "",
              ].join(" ")}
              aria-label={`Fokus peta ke ${r.nama}`}
            >
              <GlassCard className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {/* <div className="text-xs text-muted-foreground">
                     {(page - 1) * pageSize + idx + 1}
                   </div> */}
                    <div className="font-semibold">{r.nama}</div>
                    <div className="text-sm text-muted-foreground">
                      {r.kode} • {r.zonaNama || "-"}
                    </div>
                  </div>
                  <div>
                    {r.status === "NORMAL" && (
                      <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">
                        Normal
                      </Badge>
                    )}
                    {r.status === "ANOMALY" && (
                      <Badge className="bg-red-500 hover:bg-red-600 text-white">
                        Abnormal
                      </Badge>
                    )}
                    {r.status === "ZERO" && (
                      <Badge className="bg-gray-400 hover:bg-gray-500 text-white">
                        0 m³
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between col-span-2">
                    <span className="text-muted-foreground">Pemakaian</span>
                    <span className="font-medium">{r.pemakaianM3} m³</span>
                  </div>
                  <div className="flex justify-between col-span-2">
                    <span className="text-muted-foreground">
                      Perubahan vs Rata-rata (%)
                    </span>
                    <span className="font-medium">{toPct(r.pctChange)}</span>
                  </div>
                  <div className="flex justify-between col-span-2">
                    <span className="text-muted-foreground">
                      Rata2 Pembanding
                    </span>
                    <span className="font-medium">
                      {r.baselineAvg != null
                        ? `${r.baselineAvg.toFixed(1)} m³ (${
                            r.baselineCount
                          } bln)`
                        : "-"}
                    </span>
                  </div>
                </div>
              </GlassCard>
            </button>
          ))}
        </div>

        {/* ===== DESKTOP TABLE (hidden on mobile) ===== */}
        <GlassCard className="py-3 px-4 overflow-hidden hidden md:block">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center font-bold">
                    No
                  </TableHead>
                  <TableHead className="font-bold">Kode</TableHead>
                  <TableHead className="font-bold">Nama</TableHead>
                  <TableHead className="font-bold">Blok</TableHead>
                  <TableHead className="text-right font-bold">
                    Pemakaian (m³)
                  </TableHead>
                  <TableHead className="text-right font-bold">
                    Rata-rata Pembanding (m³)
                  </TableHead>
                  <TableHead className="text-right font-bold">
                    Perubahan vs Rata-rata (%)
                  </TableHead>
                  <TableHead className="w-40 text-center font-bold">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-10 text-muted-foreground"
                    >
                      Memuat data…
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && pageRows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-10 text-muted-foreground"
                    >
                      Tidak ada data untuk filter saat ini.
                    </TableCell>
                  </TableRow>
                )}
                {pageRows.map((r, idx) => (
                  <TableRow
                    key={r.pelangganId}
                    onClick={() => handleRowClick(r.pelangganId)}
                    className={`cursor-pointer ${
                      selectedId === r.pelangganId
                        ? "bg-primary/10"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <TableCell className="text-center">
                      {(page - 1) * pageSize + idx + 1}
                    </TableCell>
                    <TableCell className="font-medium">{r.kode}</TableCell>
                    <TableCell>{r.nama}</TableCell>
                    <TableCell>{r.zonaNama || "-"}</TableCell>
                    <TableCell className="text-right">
                      {r.pemakaianM3}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.baselineAvg != null
                        ? `${r.baselineAvg.toFixed(1)} m³ (${
                            r.baselineCount
                          } bln)`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {toPct(r.pctChange)}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.status === "NORMAL" && (
                        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">
                          Normal
                        </Badge>
                      )}
                      {r.status === "ANOMALY" && (
                        <Badge className="bg-red-500 hover:bg-red-600 text-white">
                          Abnormal
                        </Badge>
                      )}
                      {r.status === "ZERO" && (
                        <Badge className="bg-gray-400 hover:bg-gray-500 text-white">
                          0 m³
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </GlassCard>

        {/* Pagination (dipakai oleh cards & table) */}
        <div className="flex items-center justify-between px-1 md:px-4">
          <div className="text-xs text-muted-foreground">
            Menampilkan {(page - 1) * pageSize + 1}
            {"–"}
            {Math.min(filtered.length, page * pageSize)} dari {filtered.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Sebelumnya
            </Button>
            <div className="text-sm">
              {page} / {pageCount}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              Selanjutnya
            </Button>
          </div>
        </div>

        {/* Catatan */}
        <div className="text-xs text-muted-foreground">
          Status dihitung dari pemakaian periode ini dibanding{" "}
          <b>rata-rata {baselineN} bulan terakhir</b> yang tersedia. Jika jumlah
          bulan riwayat lebih sedikit dari pilihan, sistem otomatis memakai yang
          ada. Ambang deteksi: <b>±{Number(threshold) * 100}%</b>.
        </div>
      </div>
    </AppShell>
  );
}

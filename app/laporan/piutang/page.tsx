"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AppHeader } from "@/components/app-header";
import { AuthGuard } from "@/components/auth-guard";
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
import {
  Loader2,
  Download,
  Clock,
  AlertTriangle,
  Users,
  Wallet,
  MapPin,
} from "lucide-react";
import * as XLSX from "xlsx";

/* ================== Types ================== */
type Row = {
  id: string;
  periode: string; // "YYYY-MM"
  pelangganId: string;
  pelangganNama: string;
  pelangganKode: string;
  zonaId?: string | null;
  zonaNama?: string | null;
  tglJatuhTempo: string;
  totalTagihanBulanIni: number;
  tagihanLalu: number;
  totalTagihanNett: number;
  totalBayar: number;
  piutang: number;
  overdueDays: number;
  status: "BELUM_BAYAR" | "BELUM_LUNAS";
  meta?: {
    closedByPeriods?: string[];
    credit?: number;
    paidCount?: number;
    lastPaidAt?: string; // ISO
  };
};

type ApiResp = {
  ok: boolean;
  data: {
    rows: Row[];
    summary: {
      totalCount: number;
      totalPiutang: number;
      totalBayar: number;
      totalTagihanNett: number;
      avgOverdueDays: number;
    };
    page: number;
    pageSize: number;
    totalAll: number;
    meta?: {
      months: { kodePeriode: string }[];
      zones: { id: string; nama: string }[];
    };
  };
};

/* ================== Helpers ================== */
function formatRp(n: number) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}
function formatDateISO(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function nowLabel() {
  const dt = new Date();
  return dt.toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
// "YYYY-MM" -> "Agustus 2025"
function formatPeriodeLabel(ym: string) {
  if (!/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [y, m] = ym.split("-").map(Number);
  const namaBulan = [
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
  return `${namaBulan[(m - 1) % 12]} ${y}`;
}
// Tagihan Lalu: negatif => Sisa, positif => Kurang
function formatSaldoLalu(n: number) {
  if (!n) return "Rp 0";
  if (n < 0) return `Sisa ${formatRp(Math.abs(n))}`;
  return `Kurang ${formatRp(n)}`;
}
// merge unique months
function mergeMonths(
  current: { kodePeriode: string }[],
  incoming: { kodePeriode: string }[]
) {
  const set = new Set(current.map((m) => m.kodePeriode));
  for (const m of incoming) set.add(m.kodePeriode);
  return Array.from(set)
    .sort()
    .reverse()
    .map((kodePeriode) => ({ kodePeriode }));
}

/* ================== Page ================== */
export default function PiutangPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [months, setMonths] = useState<{ kodePeriode: string }[]>([]);
  const [zones, setZones] = useState<{ id: string; nama: string }[]>([]);
  const [summary, setSummary] = useState<ApiResp["data"]["summary"] | null>(
    null
  );

  // filters
  const [month, setMonth] = useState<string>("ALL"); // sentinel ALL
  const [zoneId, setZoneId] = useState<string>("ALL");
  const [q, setQ] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [sort, setSort] = useState<string>("overdue_desc,piutang_desc");

  function buildMonthsFromRows(rws: Row[]) {
    const uniq = Array.from(new Set(rws.map((r) => r.periode))).map((k) => ({
      kodePeriode: k,
    }));
    return uniq;
  }

  async function fetchData(opts?: { resetPage?: boolean }) {
    try {
      setLoading(true);
      if (opts?.resetPage) setPage(1);

      const params = new URLSearchParams();
      if (month && month !== "ALL") params.set("month", month);
      if (zoneId && zoneId !== "ALL") params.set("zoneId", zoneId);
      if (q.trim()) params.set("q", q.trim());
      params.set("page", String(opts?.resetPage ? 1 : page));
      params.set("pageSize", String(pageSize));
      params.set("sort", sort);

      const res = await fetch(`/api/laporan/piutang?${params.toString()}`, {
        cache: "no-store",
      });
      const json: ApiResp = await res.json();

      if (!json.ok) throw new Error("Gagal memuat data");
      setRows(json.data.rows);
      setSummary(json.data.summary);

      if (json.data.rows?.length) {
        setMonths((prev) =>
          mergeMonths(prev, buildMonthsFromRows(json.data.rows))
        );
      }
      if (json.data.meta?.zones?.length) {
        setZones((prev) => {
          const merged = new Map<string, string>();
          prev.forEach((z) => merged.set(z.id, z.nama));
          json.data.meta!.zones.forEach((z) => merged.set(z.id, z.nama));
          return Array.from(merged.entries()).map(([id, nama]) => ({
            id,
            nama,
          }));
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // meta global
  async function fetchMeta() {
    try {
      const params = new URLSearchParams();
      params.set("meta", "1");
      params.set("month", "ALL");
      params.set("zoneId", "ALL");
      params.set("page", "1");
      params.set("pageSize", "1");

      const res = await fetch(`/api/laporan/piutang?${params.toString()}`, {
        cache: "no-store",
      });
      const json: ApiResp = await res.json();
      if (!json.ok) throw new Error("Gagal memuat meta");

      if (json.data.meta?.months?.length)
        setMonths((prev) => mergeMonths(prev, json.data.meta!.months));
      if (json.data.meta?.zones?.length) setZones(json.data.meta.zones);
    } catch (e) {
      console.error(e);
    }
  }

  // initial load
  useEffect(() => {
    fetchMeta();
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reload saat filter utama
  useEffect(() => {
    fetchData({ resetPage: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, zoneId, pageSize, sort]);

  // search debounce
  useEffect(() => {
    const t = setTimeout(() => {
      fetchData({ resetPage: true });
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // page only
  useEffect(() => {
    if (page !== 1) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const totalPiutangText = useMemo(
    () => formatRp(summary?.totalPiutang || 0),
    [summary]
  );
  const totalTagihanNettText = useMemo(
    () => formatRp(summary?.totalTagihanNett || 0),
    [summary]
  );
  const totalBayarText = useMemo(
    () => formatRp(summary?.totalBayar || 0),
    [summary]
  );

  /* ============ Export Excel ============ */
  function exportToExcel() {
    if (!rows.length) return;

    const periodeLabel =
      month === "ALL" ? "Semua Periode" : formatPeriodeLabel(month);

    const aoa: (string | number)[][] = [
      ["LAPORAN PIUTANG"],
      [`Periode: ${periodeLabel}   —   Dicetak: ${nowLabel()}`],
      [],
      [
        "No",
        "Pelanggan",
        "Kode",
        "Periode",
        "Zona",
        "Tagihan Bulan Ini",
        "Tagihan Lalu (+/−)",
        "Total Tagihan",
        "Terbayar",
        "Piutang",
        "Jatuh Tempo",
        "Umur (hari)",
        "Status",
      ],
      ...rows.map((r, idx) => [
        (page - 1) * pageSize + idx + 1,
        r.pelangganNama,
        r.pelangganKode,
        formatPeriodeLabel(r.periode),
        r.zonaNama || "-",
        r.totalTagihanBulanIni,
        formatSaldoLalu(r.tagihanLalu),
        r.totalTagihanNett,
        r.totalBayar,
        r.piutang,
        formatDateISO(r.tglJatuhTempo),
        r.overdueDays,
        r.status === "BELUM_BAYAR" ? "Belum Bayar" : "Belum Lunas",
      ]),
      [
        "Total",
        "",
        "",
        "",
        "",
        "",
        "",
        summary?.totalTagihanNett ?? 0,
        summary?.totalBayar ?? 0,
        summary?.totalPiutang ?? 0,
        "",
        "",
        "",
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    (ws as any)["!cols"] = [
      { wch: 5 },
      { wch: 28 },
      { wch: 12 },
      { wch: 16 },
      { wch: 18 },
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
      { wch: 12 },
      { wch: 14 },
    ];

    (ws as any)["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } },
    ];

    const wb = XLSX.utils.book_new();
    const sheetName = periodeLabel.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(
      wb,
      `Laporan-Piutang-${month === "ALL" ? "Semua-Periode" : month}.xlsx`
    );
  }

  /* ============ Small helpers for mobile badges ============ */
  const StatusBadge = ({ s }: { s: Row["status"] }) =>
    s === "BELUM_BAYAR" ? (
      <Badge variant="destructive" className="font-semibold">
        Belum Bayar
      </Badge>
    ) : (
      <Badge variant="outline" className="font-semibold">
        Belum Lunas
      </Badge>
    );

  const UmurBadge = ({ d }: { d: number }) =>
    d > 0 ? (
      <Badge variant="destructive">{d} hari</Badge>
    ) : (
      <Badge variant="secondary">Belum jatuh tempo</Badge>
    );

  return (
    <AuthGuard requiredRole={"ADMIN"}>
      <AppShell>
        <AppHeader title="Laporan Piutang" />
        <div className="space-y-4">
          {/* ======== Header Stats ======== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <GlassCard className="p-4 flex items-center gap-3">
              <div className="rounded-2xl p-2 bg-primary/10">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  Total Piutang
                </div>
                <div className="text-lg font-bold">{totalPiutangText}</div>
              </div>
            </GlassCard>

            <GlassCard className="p-4 flex items-center gap-3">
              <div className="rounded-2xl p-2 bg-primary/10">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  Jumlah Tagihan
                </div>
                <div className="text-lg font-bold">
                  {summary?.totalCount ?? 0}
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4 flex items-center gap-3">
              <div className="rounded-2xl p-2 bg-primary/10">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  Rata Umur Piutang
                </div>
                <div className="text-lg font-bold">
                  {summary?.avgOverdueDays ?? 0} hari
                </div>
              </div>
            </GlassCard>

            {/* <GlassCard className="p-4 hidden md:flex items-center gap-3">
              <div className="rounded-2xl p-2 bg-primary/10">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  Total Tagihan vs Bayar
                </div>
                <div className="text-sm font-medium">
                  Total: {totalTagihanNettText} • Bayar: {totalBayarText}
                </div>
              </div>
            </GlassCard> */}
          </div>

          {/* ======== Filters ======== */}
          <GlassCard className="p-4">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-end">
              {/* Periode */}
              <div className="w-full md:w-56">
                <label className="text-xs text-muted-foreground">Periode</label>
                <Select
                  value={month}
                  onValueChange={(v) => {
                    setMonth(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih periode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Periode</SelectItem>
                    {(months || []).map((m) => (
                      <SelectItem key={m.kodePeriode} value={m.kodePeriode}>
                        {formatPeriodeLabel(m.kodePeriode)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Zona */}
              <div className="w-full md:w-56">
                <label className="text-xs text-muted-foreground">Blok</label>
                <Select
                  value={zoneId}
                  onValueChange={(v) => {
                    setZoneId(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Semua blok" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Blok</SelectItem>
                    {(zones || []).map((z) => (
                      <SelectItem key={z.id} value={z.id}>
                        {z.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Pencarian */}
              <div className="w-full md:flex-1">
                <label className="text-xs text-muted-foreground">Cari</label>
                <Input
                  placeholder="Nama / Kode / WA / Alamat"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              {/* Urutkan */}
              <div className="w-full md:w-56">
                <label className="text-xs text-muted-foreground">Urutkan</label>
                <Select
                  value={sort}
                  onValueChange={(v) => {
                    setSort(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overdue_desc,piutang_desc">
                      Terlama & Terbesar
                    </SelectItem>
                    <SelectItem value="piutang_desc,overdue_desc">
                      Piutang Terbesar
                    </SelectItem>
                    <SelectItem value="nama_asc">Nama A–Z</SelectItem>
                    <SelectItem value="overdue_asc">Umur Terpendek</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Page size + Export */}
              <div className="flex gap-2 md:ml-auto">
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 / halaman</SelectItem>
                    <SelectItem value="50">50 / halaman</SelectItem>
                    <SelectItem value="100">100 / halaman</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={exportToExcel}>
                  <Download className="w-4 h-4 mr-2" />
                  Export (Excel)
                </Button>
              </div>
            </div>
          </GlassCard>

          {/* ======== MOBILE CARDS (sm) ======== */}
          <div className="grid gap-3 md:hidden">
            {loading && (
              <GlassCard className="p-4 text-center">
                <Loader2 className="w-4 h-4 mr-2 inline animate-spin" />
                Memuat data...
              </GlassCard>
            )}

            {!loading && rows.length === 0 && (
              <GlassCard className="p-6 text-center text-muted-foreground">
                Tidak ada data piutang untuk filter saat ini.
              </GlassCard>
            )}

            {!loading &&
              rows.map((r, idx) => {
                const no = (page - 1) * pageSize + idx + 1;
                return (
                  <GlassCard key={r.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs text-muted-foreground">
                          #{no}
                        </div>
                        <div className="text-base font-semibold">
                          {r.pelangganNama}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {r.pelangganKode}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="font-semibold">
                          {formatRp(r.piutang)}
                        </Badge>
                        <div className="mt-1">
                          <StatusBadge s={r.status} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                      <div className="text-muted-foreground">Periode</div>
                      <div className="font-medium">
                        {formatPeriodeLabel(r.periode)}
                      </div>

                      <div className="text-muted-foreground">Blok</div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-medium">{r.zonaNama || "-"}</span>
                      </div>

                      <div className="text-muted-foreground">
                        Tagihan Bulan Ini
                      </div>
                      <div className="font-medium">
                        {formatRp(r.totalTagihanBulanIni)}
                      </div>

                      <div className="text-muted-foreground">Tagihan Lalu</div>
                      <div className="font-medium">
                        {formatSaldoLalu(r.tagihanLalu)}
                      </div>

                      <div className="text-muted-foreground">Total Tagihan</div>
                      <div className="font-medium">
                        {formatRp(r.totalTagihanNett)}
                      </div>

                      <div className="text-muted-foreground">Terbayar</div>
                      <div className="font-medium">
                        {formatRp(r.totalBayar)}
                      </div>

                      <div className="text-muted-foreground">Jatuh Tempo</div>
                      <div className="font-medium">
                        {formatDateISO(r.tglJatuhTempo)}
                      </div>

                      <div className="text-muted-foreground">Umur</div>
                      <div>
                        <UmurBadge d={r.overdueDays} />
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
          </div>

          {/* ======== MOBILE PAGINATION ======== */}
          <div className="md:hidden">
            <div className="mt-2 p-3 flex items-center justify-between border rounded-lg">
              <div className="text-xs text-muted-foreground">
                Menampilkan{" "}
                <span className="font-semibold">{rows.length} item</span> dari{" "}
                <span className="font-semibold">
                  {summary?.totalCount ?? 0} total
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                >
                  Sebelumnya
                </Button>
                <div className="px-2 py-1 text-sm">{page}</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={rows.length < pageSize || loading}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          </div>

          {/* ======== DESKTOP TABLE (md+) ======== */}
          <GlassCard className="p-3 overflow-hidden hidden md:block">
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">No</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead className="w-28">Periode</TableHead>
                    <TableHead className="min-w-[120px]">Blok</TableHead>
                    <TableHead className="text-center w-28">
                      Tagihan Bulan Ini
                    </TableHead>
                    <TableHead className="text-center w-28">
                      Tagihan Lalu
                    </TableHead>
                    <TableHead className="text-center w-32">
                      Total Tagihan
                    </TableHead>
                    <TableHead className="text-center w-28">Terbayar</TableHead>
                    <TableHead className="text-center w-40">Piutang</TableHead>
                    <TableHead className="min-w-[140px]">Jatuh Tempo</TableHead>
                    <TableHead className="w-28 text-center">Umur</TableHead>
                    <TableHead className="w-32 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8">
                        <Loader2 className="w-4 h-4 mr-2 inline animate-spin" />
                        Memuat data...
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading && rows.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={12}
                        className="text-center py-10 text-muted-foreground"
                      >
                        Tidak ada data piutang untuk filter saat ini.
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading &&
                    rows.map((r, idx) => {
                      const rowNumber = (page - 1) * pageSize + idx + 1;

                      return (
                        <TableRow key={r.id}>
                          <TableCell className="text-center">
                            {rowNumber}
                          </TableCell>

                          <TableCell>
                            <div className="font-medium">{r.pelangganNama}</div>
                            <div className="text-xs text-muted-foreground">
                              {r.pelangganKode}
                            </div>
                          </TableCell>

                          <TableCell>{formatPeriodeLabel(r.periode)}</TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-sm">
                                {r.zonaNama || "-"}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-right">
                            {formatRp(r.totalTagihanBulanIni)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div title={String(r.tagihanLalu)}>
                              {formatSaldoLalu(r.tagihanLalu)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatRp(r.totalTagihanNett)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatRp(r.totalBayar)}
                          </TableCell>

                          <TableCell className="text-right">
                            <Badge variant="outline" className="font-semibold">
                              {formatRp(r.piutang)}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <div className="text-sm">
                              {formatDateISO(r.tglJatuhTempo)}
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            <UmurBadge d={r.overdueDays} />
                          </TableCell>

                          <TableCell className="text-center">
                            <StatusBadge s={r.status} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="p-3 flex items-center justify-between border-t">
              <div className="text-xs text-muted-foreground">
                Menampilkan{" "}
                <span className="font-semibold">{rows.length} item</span> dari{" "}
                <span className="font-semibold">
                  {summary?.totalCount ?? 0} total
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                >
                  Sebelumnya
                </Button>
                <div className="px-2 py-1 text-sm">{page}</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={rows.length < pageSize || loading}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>
      </AppShell>
    </AuthGuard>
  );
}

// app/(...)/laporan/hutang/page.tsx
"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { AppHeader } from "@/components/app-header";
import { GlassCard } from "@/components/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Search, Wallet, Calendar } from "lucide-react";
import * as XLSX from "xlsx";

type HutangStatus = "UNPAID" | "PARTIAL" | "PAID";
type Row = {
  id: string;
  tanggal: string;
  deskripsi: string;
  kategori?: string | null;
  refNo?: string | null;
  pihak?: string | null;
  zona?: string | null;
  nominal: number;
  terbayar: number;
  status: HutangStatus;
};
type Resp = {
  ok: true;
  items: Row[];
  summary: {
    totalHutang: number;
    totalTerbayar: number;
    totalSisa: number;
    count: number;
  };
};

const fetcher = (u: string) => fetch(u).then((r) => r.json());
const toIDR = (n = 0) => "Rp " + Number(n || 0).toLocaleString("id-ID");
const fmtCellRp = (n = 0) => "Rp " + Number(n || 0).toLocaleString("id-ID");

const fmt = (iso: string) => {
  const d = new Date(iso);
  const tgl = d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const jam = d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { tgl, jam };
};
const ALL = "__ALL__";

// utils konversi param tanggal -> ISO (server sudah mendukung ISO)
function toStartOfDayISO(dateOnly?: string) {
  if (!dateOnly) return "";
  const d = new Date(`${dateOnly}T00:00:00`);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
}
function toEndOfDayISO(dateOnly?: string) {
  if (!dateOnly) return "";
  const d = new Date(`${dateOnly}T23:59:59.999`);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
}

export default function LaporanHutangPage() {
  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | HutangStatus>("");
  const [zona, setZona] = useState(""); // disimpan untuk future use
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // key untuk fetch (tanpa q; pencarian di client)
  const listKey = useMemo(() => {
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    if (zona) qs.set("zona", zona);
    const fromISO = toStartOfDayISO(dateFrom);
    const toISO = dateTo ? toEndOfDayISO(dateTo) : toEndOfDayISO(dateFrom);
    if (fromISO) qs.set("dateFrom", fromISO);
    if (toISO) qs.set("dateTo", toISO);
    return `/api/laporan/hutang?${qs.toString()}`;
  }, [status, zona, dateFrom, dateTo]);

  const { data, isLoading, error } = useSWR<Resp>(listKey, fetcher, {
    revalidateOnFocus: false,
  });
  const rows = (data?.ok ? data.items : []) as Row[];

  // search filter di client
  const filtered = useMemo(() => {
    if (!rows?.length) return [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.deskripsi || "").toLowerCase().includes(q) ||
        (r.refNo || "").toLowerCase().includes(q) ||
        (r.pihak || "").toLowerCase().includes(q) ||
        (r.kategori || "").toLowerCase().includes(q) ||
        (r.zona || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const statusBadge = (s: HutangStatus) =>
    s === "PAID" ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        Lunas
      </Badge>
    ) : s === "PARTIAL" ? (
      <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
        Cicil
      </Badge>
    ) : (
      <Badge variant="secondary">Belum Bayar</Badge>
    );

  // === Export XLSX seperti Laporan Keuangan ===
  function exportExcel() {
    const items = filtered;
    if (!items.length) return;

    const totalHutang =
      data?.summary?.totalHutang ??
      items.reduce((a, b) => a + (b.nominal || 0), 0);
    const totalTerbayar =
      data?.summary?.totalTerbayar ??
      items.reduce((a, b) => a + (b.terbayar || 0), 0);
    const totalSisa = Math.max(0, totalHutang - totalTerbayar);

    const periodeTxt =
      dateFrom || dateTo
        ? `${dateFrom || "…"} s.d. ${dateTo || "…"}`
        : "Semua Tanggal";

    const aoa: (string | number)[][] = [
      ["LAPORAN HUTANG PENGELOLA"],
      [`Periode: ${periodeTxt}`],
      [status ? `Status: ${status}` : "Status: Semua"],
      [""],
      [
        "Tanggal",
        "Deskripsi",
        "Pengelola/Vendor",
        "Kategori",
        "Ref",
        "Zona",
        "Nominal",
        "Terbayar",
        "Sisa",
        "Status",
      ],
      ...items.map((r) => {
        const { tgl } = fmt(r.tanggal);
        const sisa = Math.max(0, (r.nominal || 0) - (r.terbayar || 0));
        return [
          tgl,
          r.deskripsi || "-",
          r.pihak || "-",
          r.kategori || "-",
          r.refNo || "-",
          r.zona || "-",
          fmtCellRp(r.nominal),
          fmtCellRp(r.terbayar),
          fmtCellRp(sisa),
          r.status === "PAID"
            ? "Lunas"
            : r.status === "PARTIAL"
            ? "Cicil"
            : "Belum Bayar",
        ];
      }),
      [""],
      ["Ringkasan"],
      ["Total Hutang", fmtCellRp(totalHutang)],
      ["Total Terbayar", fmtCellRp(totalTerbayar)],
      ["Total Sisa", fmtCellRp(totalSisa)],
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    (ws as any)["!cols"] = [
      { wch: 12 }, // Tanggal
      { wch: 40 }, // Deskripsi
      { wch: 20 }, // Pihak
      { wch: 18 }, // Kategori
      { wch: 16 }, // Ref
      { wch: 12 }, // Zona
      { wch: 16 }, // Nominal
      { wch: 16 }, // Terbayar
      { wch: 16 }, // Sisa
      { wch: 12 }, // Status
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");
    const fname = `Laporan-Hutang-${(
      dateFrom ||
      dateTo ||
      new Date().toISOString().slice(0, 10)
    ).replaceAll("/", "-")}.xlsx`;
    XLSX.writeFile(wb, fname);
  }

  return (
    <AuthGuard requiredRole="ADMIN">
      <AppShell>
        <div className="max-w-6xl mx-auto space-y-6">
          <AppHeader title="Laporan Hutang Pengelola" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-muted-foreground">Laporan ringkasan hutang</p>
            <div className="flex items-center gap-2">
              <Button
                onClick={exportExcel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!filtered.length}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>

          {/* Filter Card */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Filter
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-y-3 gap-x-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-10 bg-card/50"
                  placeholder="Cari deskripsi/ref/pihak/kategori…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Status */}
              <div className="w-[180px]">
                <Select
                  value={status === "" ? ALL : status}
                  onValueChange={(v) =>
                    setStatus(v === ALL ? "" : (v as HutangStatus))
                  }
                >
                  <SelectTrigger className="bg-card/50 w-full">
                    <SelectValue placeholder="Semua Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Semua Status</SelectItem>
                    <SelectItem value="UNPAID">Belum Bayar</SelectItem>
                    <SelectItem value="PARTIAL">Cicil</SelectItem>
                    <SelectItem value="PAID">Lunas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dari */}
              <div className="relative w-[170px]">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  className="pl-10 bg-card/50 w-full"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              {/* Sampai */}
              <div className="relative w-[170px]">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  className="pl-10 bg-card/50 w-full"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </GlassCard>

          {/* KPI */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white rounded-lg">
              <p className="text-2xl font-bold text-primary">
                {toIDR(data?.summary?.totalHutang ?? 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Hutang</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {toIDR(data?.summary?.totalTerbayar ?? 0)}
              </p>
              <p className="text-sm text-muted-foreground">Terbayar</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">
                {toIDR(
                  (data?.summary?.totalHutang ?? 0) -
                    (data?.summary?.totalTerbayar ?? 0)
                )}
              </p>
              <p className="text-sm text-muted-foreground">Sisa</p>
            </div>
          </div>

          {/* Data */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Wallet className="w-5 h-5" /> Daftar Hutang Pengelola
              </h3>
              <p className="text-sm text-muted-foreground">
                {data?.summary?.count ?? 0} entri
              </p>
            </div>

            {!data && isLoading && (
              <div className="p-4 text-sm text-muted-foreground">
                Memuat data…
              </div>
            )}
            {error && (
              <div className="p-4 text-sm text-destructive">
                Gagal memuat data.
              </div>
            )}

            {data?.ok && (
              <>
                {/* Desktop table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/20">
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                          Tanggal
                        </th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                          Deskripsi
                        </th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                          Pemberi
                        </th>
                        {/* <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                          Kategori
                        </th> */}
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                          Ref
                        </th>
                        <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                          Nominal
                        </th>
                        <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                          Terbayar
                        </th>
                        <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                          Sisa
                        </th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r) => {
                        const { tgl } = fmt(r.tanggal);
                        const sisa = Math.max(
                          0,
                          (r.nominal || 0) - (r.terbayar || 0)
                        );
                        return (
                          <tr
                            key={r.id}
                            className="border-b border-border/10 hover:bg-muted/20"
                          >
                            <td className="py-3 px-2 text-sm">{tgl}</td>
                            <td className="py-3 px-2 text-sm font-medium text-foreground">
                              {r.deskripsi}
                            </td>
                            <td className="py-3 px-2 text-sm">
                              {r.pihak || "-"}
                            </td>
                            {/* <td className="py-3 px-2 text-sm">
                              {r.kategori || "-"}
                            </td> */}
                            <td className="py-3 px-2 text-sm">
                              {r.refNo || "-"}
                            </td>
                            <td className="py-3 px-2 text-sm text-right">
                              {toIDR(r.nominal)}
                            </td>
                            <td className="py-3 px-2 text-sm text-right">
                              {toIDR(r.terbayar)}
                            </td>
                            <td className="py-3 px-2 text-sm text-right font-bold">
                              {toIDR(sisa)}
                            </td>
                            <td className="py-3 px-2 text-center">
                              {statusBadge(r.status)}
                            </td>
                          </tr>
                        );
                      })}
                      {filtered.length === 0 && (
                        <tr>
                          <td
                            colSpan={9}
                            className="py-6 text-center text-sm text-muted-foreground"
                          >
                            Tidak ada data.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="lg:hidden space-y-4">
                  {filtered.map((r) => {
                    const { tgl, jam } = fmt(r.tanggal);
                    const sisa = Math.max(
                      0,
                      (r.nominal || 0) - (r.terbayar || 0)
                    );
                    return (
                      <div
                        key={r.id}
                        className="p-4 bg-muted/20 rounded-lg space-y-4"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-foreground">
                              {r.deskripsi}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {/* {r.pihak || "-"} • {r.kategori || "-"} • Ref:{" "} */}
                              {r.refNo || "-"}
                            </p>
                          </div>
                          {statusBadge(r.status)}
                        </div>
                        <div className="bg-card/50 p-3 rounded-lg grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Tanggal</p>
                            <p className="font-medium">{tgl}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Jam</p>
                            <p className="font-medium">{jam}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Nominal</p>
                            <p className="font-bold">{toIDR(r.nominal)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Terbayar</p>
                            <p className="font-medium">{toIDR(r.terbayar)}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Sisa</p>
                            <p className="font-bold text-primary">
                              {toIDR(sisa)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filtered.length === 0 && (
                    <div className="p-4 text-sm text-muted-foreground bg-muted/20 rounded">
                      Tidak ada data.
                    </div>
                  )}
                </div>
              </>
            )}
          </GlassCard>
        </div>
      </AppShell>
    </AuthGuard>
  );
}

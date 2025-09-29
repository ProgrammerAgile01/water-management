"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";

import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { AppHeader } from "@/components/app-header";
import { GlassCard } from "@/components/glass-card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Calendar, ChevronDown, Download, History, Search } from "lucide-react";

const fetcher = (u: string) => fetch(u).then((r) => r.json());
const toIDR = (n = 0) => "Rp " + Number(n || 0).toLocaleString("id-ID");

// sentinel untuk opsi "Semua"
const ALL_GIVER = "__ALL__";

type Giver = { name: string };

// Tipe data riwayat pembayaran (biarkan fleksibel utk field opsional)
type PaymentDetail = {
  id: string;
  hutangDetailId?: string | null;
  hutangId?: string | null;
  hutangNoBukti?: string | null;
  hutangTanggal?: string | null;
  keterangan?: string | null;
  amount: number;
};

type PaymentRow = {
  id: string;
  refNo?: string | null;
  pemberi: string;
  tanggalBayar: string; // ISO
  createdAt?: string;
  total: number;
  note?: string | null;
  details?: PaymentDetail[];
};

type HistoryResp = {
  ok: boolean;
  items: PaymentRow[];
  summary?: { count: number; total: number };
};

const onlyDate = (iso?: string | null) => {
  if (!iso) return "-";
  if (iso.length >= 10 && iso[4] === "-" && iso[7] === "-")
    return iso.slice(0, 10);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function RiwayatPembayaranHutangPage() {
  // Filter state
  const [giver, setGiver] = useState<string>("");
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // load daftar pemberi (shared endpoint dari halaman pembayaran)
  const { data: giverData } = useSWR<{ ok: boolean; items: Giver[] }>(
    "/api/hutang-pembayaran?mode=givers",
    fetcher,
    { revalidateOnFocus: false }
  );
  const givers = giverData?.items ?? [];

  // key fetch riwayat
  const listKey = useMemo(() => {
    const qs = new URLSearchParams();
    if (giver) qs.set("giver", giver);
    if (q.trim()) qs.set("q", q.trim());
    if (dateFrom) qs.set("dateFrom", dateFrom);
    if (dateTo) qs.set("dateTo", dateTo);
    return `/api/hutang-pembayaran/riwayat?${qs.toString()}`;
  }, [giver, q, dateFrom, dateTo]);

  const { data, isLoading, error, mutate } = useSWR<HistoryResp>(
    listKey,
    fetcher,
    { revalidateOnFocus: false }
  );
  const items = data?.items ?? [];

  // export CSV sederhana dari data yang sedang ditampilkan
  function exportCSV() {
    if (!items.length) return;
    const header = ["Ref", "Tanggal Bayar", "Pemberi", "Total", "Catatan"].join(
      ","
    );
    const rows = items.map((p) =>
      [
        `"${(p.refNo ?? "").replaceAll('"', '""')}"`,
        onlyDate(p.tanggalBayar),
        `"${(p.pemberi ?? "").replaceAll('"', '""')}"`,
        `"${toIDR(p.total)}"`,
        `"${(p.note ?? "").replaceAll('"', '""')}"`,
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const fname = `riwayat-pembayaran-hutang-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.download = fname;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AuthGuard>
      <AppShell>
        <div className="max-w-6xl mx-auto space-y-6">
          <AppHeader title="Riwayat Pembayaran Hutang" />

          {/* action bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-muted-foreground">
              Daftar pembayaran hutang yang sudah dicatat.
            </p>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline">
                <Link href="/hutang-pembayaran">
                  <History className="w-4 h-4 mr-2" />
                  Ke Pembayaran
                </Link>
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={exportCSV}
                disabled={!items.length}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Filter */}
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
                  placeholder="Cari ref/pemberi/catatan…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>

              {/* Giver */}
              <div className="w-[220px]">
                <Label className="sr-only">Pemberi</Label>
                <Select
                  value={giver || ALL_GIVER}
                  onValueChange={(v) => setGiver(v === ALL_GIVER ? "" : v)}
                >
                  <SelectTrigger className="bg-card/50 w-full">
                    <SelectValue placeholder="Semua Pemberi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_GIVER}>Semua Pemberi</SelectItem>
                    {givers.map((g) => (
                      <SelectItem key={g.name} value={g.name}>
                        {g.name}
                      </SelectItem>
                    ))}
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

          {/* Data */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-foreground">
                Daftar Pembayaran
              </h3>
              <p className="text-sm text-muted-foreground">
                {data?.summary?.count ?? items.length} entri
                {data?.summary?.total
                  ? ` • Total ${toIDR(data.summary.total)}`
                  : ""}
              </p>
            </div>

            {error && (
              <div className="p-4 text-sm text-destructive">
                Gagal memuat data.
              </div>
            )}
            {!error && isLoading && (
              <div className="p-4 text-sm text-muted-foreground">
                Memuat data…
              </div>
            )}

            {/* Desktop table */}
            {!isLoading && items.length > 0 && (
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/20">
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                        Ref
                      </th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                        Tanggal Bayar
                      </th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                        Pemberi
                      </th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                        Total Bayar
                      </th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                        Catatan
                      </th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                        Detail
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-border/10 hover:bg-muted/20"
                      >
                        <td className="py-3 px-2 text-sm font-semibold">
                          {p.refNo || "-"}
                        </td>
                        <td className="py-3 px-2 text-sm">
                          {onlyDate(p.tanggalBayar)}
                        </td>
                        <td className="py-3 px-2 text-sm">{p.pemberi}</td>
                        <td className="py-3 px-2 text-sm text-right font-bold">
                          {toIDR(p.total)}
                        </td>
                        <td className="py-3 px-2 text-sm">
                          {p.note || (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() =>
                              setExpanded((s) => ({ ...s, [p.id]: !s[p.id] }))
                            }
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform ${
                                expanded[p.id] ? "rotate-180" : ""
                              }`}
                            />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {items.map(
                      (p) =>
                        expanded[p.id] && (
                          <tr key={`${p.id}-details`} className="bg-primary/5">
                            <td colSpan={6} className="p-4">
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead>
                                    <tr className="border-b border-border/20">
                                      <th className="text-left py-2 px-2 text-sm">
                                        No Bukti Hutang
                                      </th>
                                      <th className="text-left py-2 px-2 text-sm">
                                        Tgl Hutang
                                      </th>
                                      <th className="text-left py-2 px-2 text-sm">
                                        Keterangan Detail
                                      </th>
                                      <th className="text-right py-2 px-2 text-sm">
                                        Nominal Bayar
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(p.details ?? []).map((d) => (
                                      <tr
                                        key={d.id}
                                        className="border-b border-border/10"
                                      >
                                        <td className="py-2 px-2 text-sm">
                                          {d.hutangNoBukti || "-"}
                                        </td>
                                        <td className="py-2 px-2 text-sm">
                                          {onlyDate(d.hutangTanggal)}
                                        </td>
                                        <td className="py-2 px-2 text-sm">
                                          {d.keterangan || "-"}
                                        </td>
                                        <td className="py-2 px-2 text-sm text-right font-medium">
                                          {toIDR(d.amount)}
                                        </td>
                                      </tr>
                                    ))}
                                    {(p.details ?? []).length === 0 && (
                                      <tr>
                                        <td
                                          className="py-3 px-2 text-sm text-muted-foreground"
                                          colSpan={4}
                                        >
                                          Tidak ada detail.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Mobile cards */}
            {!isLoading && items.length > 0 && (
              <div className="lg:hidden space-y-4">
                {items.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 bg-muted/20 rounded-lg space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{p.refNo || "-"}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.pemberi} • {onlyDate(p.tanggalBayar)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-bold text-primary">
                          {toIDR(p.total)}
                        </p>
                      </div>
                    </div>
                    {p.note && (
                      <div className="text-sm text-muted-foreground">
                        {p.note}
                      </div>
                    )}

                    {(p.details ?? []).length > 0 && (
                      <div className="bg-card/50 p-3 rounded-lg space-y-2">
                        {(p.details ?? []).map((d) => (
                          <div
                            key={d.id}
                            className="grid grid-cols-2 gap-2 text-sm border-b last:border-none border-border/20 pb-2 last:pb-0"
                          >
                            <div className="col-span-2 font-medium">
                              {d.keterangan || "-"}
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                No Bukti
                              </span>
                              <div>{d.hutangNoBukti || "-"}</div>
                            </div>
                            <div className="text-right">
                              <span className="text-muted-foreground">
                                Nominal
                              </span>
                              <div className="font-semibold">
                                {toIDR(d.amount)}
                              </div>
                            </div>
                            <div className="col-span-2 text-xs text-muted-foreground">
                              Tgl Hutang: {onlyDate(d.hutangTanggal)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!isLoading && items.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">
                Tidak ada data.
              </div>
            )}
          </GlassCard>
        </div>
      </AppShell>
    </AuthGuard>
  );
}

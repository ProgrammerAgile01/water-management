// app/laporan/laba-rugi/page.tsx
"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { AppShell } from "@/components/app-shell";
import { AppHeader } from "@/components/app-header";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Calendar,
  Wallet,
  Banknote,
  TrendingUp,
  Filter,
} from "lucide-react";

const fetcher = (u: string) => fetch(u).then((r) => r.json());
const toIDR = (n = 0) => "Rp " + Number(n || 0).toLocaleString("id-ID");

type Resp = {
  ok: true;
  periodLabel: string;
  ledger: Array<{
    tanggal: string;
    keterangan: string;
    debit: number;
    kredit: number;
  }>;
  ringkasan: { debitTotal: number; kreditTotal: number; labaBersih: number };
  pemasukan: { total: number; byMetode: Record<string, number> };
  pengeluaran: { total: number; byKategori: { nama: string; total: number }[] };
};

export default function LabaRugiPage() {
  const now = new Date();
  const ymNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
  const [scope, setScope] = useState<"month" | "year">("month");
  const [month, setMonth] = useState(ymNow);
  const [year, setYear] = useState(String(now.getFullYear()));

  const query = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("scope", scope);
    scope === "month" ? qs.set("month", month) : qs.set("year", year);
    return `/api/laporan/laba-rugi?${qs.toString()}`;
  }, [scope, month, year]);
  const exportUrl = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("scope", scope);
    scope === "month" ? qs.set("month", month) : qs.set("year", year);
    return `/api/laporan/laba-rugi/export?${qs.toString()}`;
  }, [scope, month, year]);

  const { data, isLoading } = useSWR<Resp>(query, fetcher, {
    revalidateOnFocus: false,
  });

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">
        <AppHeader title="Laba & Rugi" />

        {/* Filter */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4" />
            <p className="text-sm text-muted-foreground">Filter Periode</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select value={scope} onValueChange={(v: any) => setScope(v)}>
              <SelectTrigger className="h-9 bg-card/50">
                <SelectValue placeholder="Jenis Periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Bulanan</SelectItem>
                <SelectItem value="year">Tahunan</SelectItem>
              </SelectContent>
            </Select>

            {scope === "month" ? (
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="h-9 bg-card/50">
                  <SelectValue placeholder="Pilih Bulan" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 15 }).map((_, i) => {
                    const d = new Date(
                      now.getFullYear(),
                      now.getMonth() - i,
                      1
                    );
                    const ym = `${d.getFullYear()}-${String(
                      d.getMonth() + 1
                    ).padStart(2, "0")}`;
                    return (
                      <SelectItem key={ym} value={ym}>
                        {d.toLocaleDateString("id-ID", {
                          month: "long",
                          year: "numeric",
                        })}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            ) : (
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="h-9 bg-card/50">
                  <SelectValue placeholder="Pilih Tahun" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 7 }).map((_, i) => {
                    const yy = String(now.getFullYear() - i);
                    return (
                      <SelectItem key={yy} value={yy}>
                        {yy}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}

            <div className="flex items-center justify-between md:justify-end">
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{data?.periodLabel || "-"}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="bg-card/50 ml-auto"
                asChild
              >
                <a href={exportUrl}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Excel
                </a>
              </Button>
            </div>
          </div>

          <div className="mt-3 md:hidden flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{data?.periodLabel || "-"}</span>
          </div>
        </GlassCard>

        {/* Ringkasan (tema glass ala meter-grid) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <GlassCard className="p-4">
            <p className="text-xs text-muted-foreground">Pemasukan (Kredit)</p>
            <p className="text-2xl font-bold text-green-600">
              {toIDR(data?.ringkasan.kreditTotal || 0)}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {data?.pemasukan?.byMetode &&
                Object.entries(data.pemasukan.byMetode).map(([k, v]) => (
                  <Badge
                    key={k}
                    className="bg-green-100 text-green-700 hover:bg-green-100"
                  >
                    {k}: {toIDR(v as number)}
                  </Badge>
                ))}
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <p className="text-xs text-muted-foreground">Pengeluaran (Debit)</p>
            <p className="text-2xl font-bold text-red-600">
              {toIDR(data?.ringkasan.debitTotal || 0)}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {data?.pengeluaran?.byKategori?.map((k) => (
                <Badge
                  key={k.nama}
                  variant="secondary"
                  className="bg-red-100 text-red-700 hover:bg-red-100"
                >
                  {k.nama}: {toIDR(k.total)}
                </Badge>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <p className="text-xs text-muted-foreground">Laba Bersih</p>
            <p
              className={`text-2xl font-bold ${
                (data?.ringkasan.labaBersih || 0) >= 0
                  ? "text-primary"
                  : "text-red-600"
              }`}
            >
              {toIDR(data?.ringkasan.labaBersih || 0)}
            </p>
          </GlassCard>
        </div>

        {/* ====== Ledger: Desktop = tabel, Mobile = card ====== */}
        <GlassCard className="p-4">
          <p className="text-sm font-semibold mb-3">
            Jurnal Laba Rugi (Debit / Kredit)
          </p>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border border-border/40 rounded-md">
              <thead>
                <tr className="border-b border-border/20 bg-muted/20">
                  <th className="text-left py-3 px-3 text-sm text-muted-foreground">
                    Tanggal
                  </th>
                  <th className="text-left py-3 px-3 text-sm text-muted-foreground">
                    Keterangan
                  </th>
                  <th className="text-right py-3 px-3 text-sm text-muted-foreground">
                    Debit
                  </th>
                  <th className="text-right py-3 px-3 text-sm text-muted-foreground">
                    Kredit
                  </th>
                </tr>
              </thead>
              <tbody>
                {(data?.ledger || []).map((r, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/10 hover:bg-muted/20"
                  >
                    <td className="py-3 px-3 text-sm">
                      {new Date(r.tanggal).toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-3 text-sm">{r.keterangan}</td>
                    <td className="py-3 px-3 text-sm text-right text-red-700 font-medium">
                      {toIDR(r.debit)}
                    </td>
                    <td className="py-3 px-3 text-sm text-right text-green-700 font-medium">
                      {toIDR(r.kredit)}
                    </td>
                  </tr>
                ))}
                {(data?.ledger?.length ?? 0) === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      Tidak ada data.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-border/20 bg-muted/20">
                  <td
                    className="py-3 px-3 text-right font-semibold"
                    colSpan={2}
                  >
                    TOTAL
                  </td>
                  <td className="py-3 px-3 text-right font-bold">
                    {toIDR(data?.ringkasan.debitTotal || 0)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold">
                    {toIDR(data?.ringkasan.kreditTotal || 0)}
                  </td>
                </tr>
                <tr className="border-t border-border/20">
                  <td
                    className="py-3 px-3 text-right font-semibold"
                    colSpan={2}
                  >
                    LABA BERSIH
                  </td>
                  <td className="py-3 px-3 text-right font-bold" colSpan={2}>
                    {toIDR(
                      (data?.ringkasan.kreditTotal || 0) -
                        (data?.ringkasan.debitTotal || 0)
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {isLoading && (
              <p className="text-sm text-muted-foreground">Memuat…</p>
            )}
            {!isLoading && (data?.ledger?.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">Tidak ada data.</p>
            )}
            {data?.ledger?.map((r, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-card/50">
                <p className="text-xs text-muted-foreground">
                  {new Date(r.tanggal).toLocaleString("id-ID")}
                </p>
                <p className="text-sm font-medium mt-0.5">{r.keterangan}</p>
                <div className="flex items-center justify-between mt-1">
                  <Badge
                    variant="secondary"
                    className="bg-red-100 text-red-700"
                  >
                    Debit: {toIDR(r.debit)}
                  </Badge>
                  <Badge className="bg-green-100 text-green-700">
                    Kredit: {toIDR(r.kredit)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}

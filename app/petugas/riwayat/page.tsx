// app/petugas/riwayat/page.tsx
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
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Download,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Droplets,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

type RiwayatItem = {
  id: string;
  tanggal: string;
  periode: string;
  zona: string;
  pelanggan: string;
  meterAwal: number;
  meterAkhir: number;
  pakai: number;
  total: number;
  status: string;
  kendala?: string | null;
};

type MeLite = { id: string; name: string };

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
} | null;

function fmtRp(n: number) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

function ymToLong(ym?: string) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return "-";
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

export default function RiwayatPetugasPage() {
  const [loading, setLoading] = useState(false);
  const [riwayat, setRiwayat] = useState<RiwayatItem[]>([]);
  const [periode, setPeriode] = useState("");
  const [q, setQ] = useState("");
  const [me, setMe] = useState<MeLite | null>(null);

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [pagination, setPagination] = useState<Pagination>(null);

  // summary (diambil dari data halaman aktif; bisa diganti dari API bila ada)
  const summary = useMemo(() => {
    const totalPakai = riwayat.reduce((s, r) => s + (r.pakai || 0), 0);
    const totalNominal = riwayat.reduce((s, r) => s + (r.total || 0), 0);
    const totalEntri = riwayat.length;
    return { totalPakai, totalNominal, totalEnri: totalEntri };
  }, [riwayat]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("tb_user");
      if (raw) {
        const u = JSON.parse(raw) as { id: string; name: string };
        setMe({ id: u.id, name: u.name });
      }
    } catch {}

    (async () => {
      try {
        const r = await fetch("/api/petugas/profil", { cache: "no-store" });
        const j = await r.json();
        if (j?.ok && j.data?.name) {
          setMe({ id: j.data.id, name: j.data.name });
        }
      } catch {}
    })();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (periode) sp.set("periode", periode);
      if (q) sp.set("q", q);
      sp.set("page", String(page));
      sp.set("pageSize", String(pageSize));

      const r = await fetch("/api/petugas/riwayat?" + sp.toString(), {
        cache: "no-store",
      });
      const j = await r.json();
      if (j?.ok) {
        const items: RiwayatItem[] = Array.isArray(j.items)
          ? j.items
          : Array.isArray(j)
          ? j
          : [];
        setRiwayat(items);

        const pg: Pagination = j.pagination
          ? {
              page: Number(j.pagination.page) || page,
              pageSize: Number(j.pagination.pageSize) || pageSize,
              total: Number(j.pagination.total) || items.length,
              totalPages:
                Number(j.pagination.totalPages) ||
                Math.max(1, Math.ceil(items.length / pageSize)),
            }
          : {
              page,
              pageSize,
              total: items.length,
              totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
            };
        setPagination(pg);
      } else {
        toast.error(j?.message || "Gagal memuat riwayat");
        setRiwayat([]);
        setPagination(null);
      }
    } catch {
      toast.error("Gagal memuat riwayat");
      setRiwayat([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periode, q, page, pageSize]);

  const canPrev = (pagination?.page ?? 1) > 1;
  const canNext = (pagination?.page ?? 1) < (pagination?.totalPages ?? 1);

  return (
    <AuthGuard requiredRole="PETUGAS">
      <AppShell>
        <div className="max-w-7xl mx-auto space-y-6">
          <AppHeader title="Riwayat Pencatatan Petugas" />

          {/* Filter bar */}
          <GlassCard className="p-4">
            <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Petugas
                </label>
                <div className="flex items-center gap-2 rounded-lg border bg-background px-3 h-10">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm">{me?.name || "Akun saya"}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Periode
                </label>
                <Select
                  value={periode}
                  onValueChange={(v) => {
                    setPeriode(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Pilih periode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025-07">Juli 2025</SelectItem>
                    <SelectItem value="2025-08">Agustus 2025</SelectItem>
                    <SelectItem value="2025-09">September 2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 flex-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Pencarian
                </label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8 w-full"
                    placeholder="Cari pelanggan/zona/kendala…"
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={loadData}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Terapkan Filter
                </Button>
                <Button variant="outline" className="bg-transparent">
                  <Download className="w-4 h-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            </div>
          </GlassCard>

          {/* Stat cards ala Catat Meter */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassCard className="p-4">
              <div className="text-xs text-muted-foreground">Periode</div>
              <div className="text-lg font-semibold">
                {periode ? ymToLong(periode) : "—"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Riwayat pencatatan
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="text-xs text-muted-foreground">
                Total Pemakaian
              </div>
              <div className="text-lg font-semibold">
                {summary.totalPakai} m³
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Akumulasi dari hasil catat (halaman ini)
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="text-xs text-muted-foreground">Total Nominal</div>
              <div className="text-lg font-semibold">
                {fmtRp(summary.totalNominal)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Dari total pada snapshot entri
              </div>
            </GlassCard>
          </div>

          {/* Desktop: Tabel */}
          <GlassCard className="p-6 hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 text-sm text-muted-foreground">
                    <th className="text-left py-3 px-2">Tanggal &amp; Jam</th>
                    <th className="text-left py-3 px-2">Periode</th>
                    <th className="text-left py-3 px-2">Zona</th>
                    <th className="text-left py-3 px-2">Pelanggan</th>
                    <th className="text-left py-3 px-2">Meter Awal</th>
                    <th className="text-left py-3 px-2">Meter Akhir</th>
                    <th className="text-left py-3 px-2">Pemakaian (m³)</th>
                    <th className="text-left py-3 px-2">Total</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-left py-3 px-2">Kendala</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="py-6 text-center text-sm text-muted-foreground"
                      >
                        Memuat data…
                      </td>
                    </tr>
                  ) : riwayat.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="py-6 text-center text-sm text-muted-foreground"
                      >
                        Tidak ada riwayat pada filter ini.
                      </td>
                    </tr>
                  ) : (
                    riwayat.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-border/30 hover:bg-muted/20 text-sm"
                      >
                        <td className="py-3 px-2">
                          {new Date(r.tanggal).toLocaleString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-2">{r.periode}</td>
                        <td className="py-3 px-2">{r.zona}</td>
                        <td className="py-3 px-2">{r.pelanggan}</td>
                        <td className="py-3 px-2">{r.meterAwal}</td>
                        <td className="py-3 px-2">{r.meterAkhir}</td>
                        <td className="py-3 px-2 text-primary">{r.pakai} m³</td>
                        <td className="py-3 px-2 font-semibold">
                          {fmtRp(r.total)}
                        </td>
                        <td className="py-3 px-2">
                          <span
                            className={
                              r.status === "DONE"
                                ? "inline-flex items-center rounded-full border border-emerald-300 bg-white/60 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
                                : "inline-flex items-center rounded-full border border-gray-300 bg-white/60 px-2.5 py-0.5 text-xs font-medium text-slate-600"
                            }
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 px-2 max-w-[360px] truncate">
                          {r.kendala || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            <div className="mt-4 flex items-center justify-between text-sm">
              <div className="text-muted-foreground">
                {pagination
                  ? `Menampilkan ${
                      riwayat.length === 0
                        ? 0
                        : (pagination.page - 1) * pagination.pageSize + 1
                    }–${
                      (pagination.page - 1) * pagination.pageSize +
                      riwayat.length
                    } dari ${pagination.total}`
                  : `Total ${riwayat.length} entri`}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canPrev}
                  onClick={() => canPrev && setPage((p) => p - 1)}
                  className="bg-transparent"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Sebelumnya
                </Button>
                <div className="px-2">
                  Halaman{" "}
                  <span className="font-medium">{pagination?.page ?? 1}</span>{" "}
                  dari{" "}
                  <span className="font-medium">
                    {pagination?.totalPages ?? 1}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canNext}
                  onClick={() => canNext && setPage((p) => p + 1)}
                  className="bg-transparent"
                >
                  Berikutnya
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </GlassCard>

          {/* ===== Mobile: single card themed like Catat Meter ===== */}
          <div className="space-y-3 md:hidden">
            {loading ? (
              <GlassCard className="p-4 text-center text-sm text-muted-foreground">
                Memuat data…
              </GlassCard>
            ) : riwayat.length === 0 ? (
              <GlassCard className="p-4 text-center text-sm text-muted-foreground">
                Tidak ada riwayat pada filter ini.
              </GlassCard>
            ) : (
              riwayat.map((r) => (
                <GlassCard key={r.id} className="p-3">
                  {/* Bar atas: waktu + status */}
                  <div className="flex items-start justify-between">
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(r.tanggal).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <span
                      className={
                        r.status === "DONE"
                          ? "inline-flex items-center rounded-full border border-emerald-300 bg-white/60 px-2 py-0.5 text-[10px] font-medium text-emerald-700"
                          : "inline-flex items-center rounded-full border border-gray-300 bg-white/60 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                      }
                    >
                      {r.status}
                    </span>
                  </div>

                  {/* Nama + subline */}
                  <div className="mt-1 flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-[15px] leading-tight">
                        {r.pelanggan}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {r.zona} • {ymToLong(r.periode)}
                      </div>
                    </div>

                    {/* Tombol detail opsional
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs bg-transparent"
                      onClick={() => {
                        // TODO: buka modal/detail
                      }}
                    >
                      Detail
                    </Button> */}
                  </div>

                  {/* Grid angka tanpa kotak */}
                  <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div>
                      <div className="text-[11px] text-muted-foreground">
                        Meter Awal
                      </div>
                      <div className="font-semibold">{r.meterAwal}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">
                        Meter Akhir
                      </div>
                      <div className="font-semibold">{r.meterAkhir}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">
                        Pemakaian (m³)
                      </div>
                      <div className="font-semibold text-primary">
                        {r.pakai} m³
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">
                        Total
                      </div>
                      <div className="font-semibold text-emerald-700">
                        {fmtRp(r.total)}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              ))
            )}

            {/* Pagination mobile */}
            {riwayat.length > 0 && (
              <div className="flex items-center justify-between px-1 py-2 text-sm">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canPrev}
                  onClick={() => canPrev && setPage((p) => p - 1)}
                  className="bg-transparent"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Prev
                </Button>
                <div>
                  {pagination?.page ?? 1} / {pagination?.totalPages ?? 1}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canNext}
                  onClick={() => canNext && setPage((p) => p + 1)}
                  className="bg-transparent"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}

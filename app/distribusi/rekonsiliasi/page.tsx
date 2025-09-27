"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle2,
  Search,
  TrendingDown,
  TrendingUp,
  Info,
  Users,
} from "lucide-react";

/* ================= Helpers ================= */
const fetcher = (url: string, init?: RequestInit) =>
  fetch(url, init).then((r) => r.json());

const BULAN_ID = [
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
function formatPeriodeID(p?: string) {
  if (!p || !/^\d{4}-\d{2}$/.test(p)) return "";
  const [y, m] = p.split("-").map(Number);
  return `${BULAN_ID[m - 1]} ${y}`;
}
function signedPct(n: number) {
  const s = Math.round(n * 10) / 10;
  return (s > 0 ? `+${s}` : `${s}`).replace(".", ",") + "%";
}

/* =============== Types (API) =============== */
type FiltersResp = {
  ok: true;
  periods: string[];
  zonas: Array<{ id: string; nama: string }>;
};

type Row = {
  pelangganId: string;
  pelangganNama: string;
  pelangganKode: string;
  m3Now: number;
  avg3: number;
  avg6: number;
  deltaPctVs3: number;
  zScore: number;
  zeroStreak: number;
  flags: Array<"ZERO" | "DROP" | "SPIKE">;
  history: Array<{ periode: string; m3: number }>;
  // tambahan untuk ALL blok (diisi client-side)
  zonaNama?: string;
};

type Summary = {
  zonaId: string;
  zonaNama: string;
  totalNow: number;
  avg3: number;
  deltaPctVs3: number;
  zeroCount: number;
  outlierCount: number;
};

type AnomaliResp = {
  ok: true;
  periode: string;
  zona: { id: string; nama: string } | null;
  summary?: Summary;
  rows: Row[];
};

/* ===== Label ramah untuk Flags ===== */
function FlagBadgesUserFriendly({ flags }: { flags: Row["flags"] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {flags.includes("ZERO") && (
        <Badge
          variant="destructive"
          title="Tercatat 0 m³ beberapa bulan berturut-turut. Perlu pengecekan meter."
        >
          0 m³ berulang
        </Badge>
      )}
      {flags.includes("DROP") && (
        <Badge
          className="bg-amber-500 text-amber-50 hover:bg-amber-600"
          title="Pemakaian turun jauh dibanding kebiasaan. Pastikan pembacaan & instalasi aman."
        >
          Turun jauh
        </Badge>
      )}
      {flags.includes("SPIKE") && (
        <Badge
          variant="secondary"
          title="Pemakaian naik tinggi. Cek kemungkinan kebocoran."
        >
          Naik tinggi
        </Badge>
      )}
      {!flags.length && <Badge variant="outline">Normal</Badge>}
    </div>
  );
}

/* =========================================== */

export default function RekonsiliasiPage() {
  // filter state
  const [periods, setPeriods] = useState<string[]>([]);
  const [zonas, setZonas] = useState<Array<{ id: string; nama: string }>>([]);
  const [periode, setPeriode] = useState<string>("");
  const [zonaId, setZonaId] = useState<string>(""); // "ALL" = semua blok

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [detail, setDetail] = useState<Row | null>(null);

  // fetch filters awal
  useEffect(() => {
    (async () => {
      const res: FiltersResp = await fetcher("/api/rekon/anomali", {
        method: "POST",
        body: JSON.stringify({ type: "filters" }),
        headers: { "Content-Type": "application/json" },
      });
      if (res?.ok) {
        setPeriods(res.periods || []);
        setZonas(res.zonas || []);
        if (res.periods?.length && !periode) setPeriode(res.periods[0]);
        // default: ALL blok
        if (!zonaId) setZonaId("ALL");
      }
    })();
  }, []); // eslint-disable-line

  /* ====== Ambil data untuk SINGLE zona via SWR ====== */
  const singleKey =
    periode && zonaId && zonaId !== "ALL"
      ? `/api/rekon/anomali?periode=${periode}&zonaId=${zonaId}`
      : null;
  const {
    data: singleData,
    isLoading: isLoadingSingle,
    mutate,
  } = useSWR<AnomaliResp>(singleKey, fetcher, { revalidateOnFocus: false });

  /* ====== Ambil data untuk ALL blok (gabungan client-side) ====== */
  const [allData, setAllData] = useState<AnomaliResp | null>(null);
  const [isLoadingAll, setIsLoadingAll] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!periode || zonaId !== "ALL" || zonas.length === 0) {
        setAllData(null);
        return;
      }
      setIsLoadingAll(true);
      try {
        const results = await Promise.all(
          zonas.map((z) =>
            fetcher(`/api/rekon/anomali?periode=${periode}&zonaId=${z.id}`)
              .then((r: AnomaliResp) => ({ z, r }))
              .catch(() => ({ z, r: null as any }))
          )
        );

        // gabungkan rows + summary
        const rows: Row[] = [];
        let totalNow = 0,
          sumAvg3 = 0,
          zeroCount = 0,
          outlierCount = 0;

        results.forEach(({ z, r }) => {
          if (!r?.ok) return;
          totalNow += r.summary?.totalNow ?? 0;
          sumAvg3 += r.summary?.avg3 ?? 0;
          zeroCount += r.summary?.zeroCount ?? 0;
          outlierCount += r.summary?.outlierCount ?? 0;

          (r.rows || []).forEach((row) => {
            rows.push({ ...row, zonaNama: z.nama });
          });
        });

        // aproksimasi delta% vs avg3 total
        const deltaPctVs3 =
          sumAvg3 > 0
            ? ((totalNow - sumAvg3) / sumAvg3) * 100
            : totalNow > 0
            ? 100
            : 0;

        setAllData({
          ok: true,
          periode,
          zona: { id: "ALL", nama: "Semua Blok" },
          summary: {
            zonaId: "ALL",
            zonaNama: "Semua Blok",
            totalNow: Math.round(totalNow * 100) / 100,
            avg3: Math.round(sumAvg3 * 100) / 100,
            deltaPctVs3: Math.round(deltaPctVs3 * 10) / 10,
            zeroCount,
            outlierCount,
          },
          rows: rows.sort((a, b) => {
            const score = (r: Row) =>
              (r.flags.includes("ZERO") ? 3 : 0) +
              (r.flags.includes("DROP") ? 2 : 0) +
              (r.flags.includes("SPIKE") ? 1 : 0);
            const s = score(b) - score(a);
            if (s !== 0) return s;
            return a.m3Now - b.m3Now;
          }),
        });
      } finally {
        setIsLoadingAll(false);
      }
    };
    run();
  }, [periode, zonaId, zonas]);

  // pilih sumber data yang dipakai UI
  const data = zonaId === "ALL" ? allData : singleData;
  const isLoading = zonaId === "ALL" ? isLoadingAll : isLoadingSingle;

  // filter + paginate
  const filtered = useMemo(() => {
    const src = data?.rows || [];
    const qq = q.trim().toLowerCase();
    return qq
      ? src.filter(
          (r) =>
            r.pelangganNama.toLowerCase().includes(qq) ||
            r.pelangganKode.toLowerCase().includes(qq) ||
            (r.zonaNama || "").toLowerCase().includes(qq)
        )
      : src;
  }, [data?.rows, q]);

  const totalPages = Math.max(1, Math.ceil((filtered?.length || 0) / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages]);
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const periodeLabel = formatPeriodeID(periode);
  const delta = data?.summary?.deltaPctVs3 ?? 0;
  const deltaWord = delta >= 0 ? "naik" : "turun";

  // Nama blok terpilih (fallback dari daftar dropdown)
  const selectedZonaName = useMemo(() => {
    if (zonaId === "ALL") return "Semua Blok";
    const fromList = zonas.find((z) => z.id === zonaId)?.nama;
    return fromList || data?.zona?.nama || "-";
  }, [zonaId, zonas, data?.zona]);

  return (
    <AppShell>
      <AppHeader title="Rekonsiliasi" />

      <div className="space-y-4">
        {/* Filter bar */}
        <GlassCard className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
            <div>
              <label className="text-sm font-medium">Periode Catat</label>
              <Select value={periode} onValueChange={setPeriode}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p} value={p}>
                      {formatPeriodeID(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Blok</label>
              <Select value={zonaId} onValueChange={setZonaId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih blok/zona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Blok</SelectItem>
                  {zonas.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-1 flex gap-2 items-end">
              <div className="flex-1 relative">
              <label className="text-sm font-medium">Cari</label>
                <Search className="w-4 h-4 absolute left-2 top-1/2 mt-1 opacity-60" />
                <Input
                  className="pl-8"
                  placeholder="Cari pelanggan / kode / blok"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              {/* <Button variant="outline" onClick={() => (zonaId==="ALL" ? setAllData(null) : mutate())}>
                Refresh
              </Button> */}
            </div>
          </div>
        </GlassCard>

        {/* KPI Ringkas – bahasa natural */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <GlassCard className="p-4 flex items-center gap-3">
            <div className="rounded-2xl p-2 bg-primary/10">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                Total pemakaian air ({periodeLabel || "-"})
              </div>
              <div className="text-lg font-bold">
                {isLoading
                  ? "-"
                  : (data?.summary?.totalNow ?? 0).toLocaleString("id-ID")}
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4 flex items-center gap-3">
            <div className="rounded-2xl p-2 bg-primary/10">
              {delta >= 0 ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                Perbandingan vs rata-rata 3 bulan
              </div>
              <div
                className={`text-lg font-bold ${
                  delta < -30 ? "text-amber-500" : ""
                }`}
              >
                {isLoading ? "-" : `${deltaWord} ${signedPct(delta)}`}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {zonaId === "ALL"
                  ? "Gabungan semua blok"
                  : "Dibanding kebiasaan zona dalam 3 bulan terakhir"}
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4 flex items-center gap-3">
            <div className="rounded-2xl p-2 bg-primary/10">
              {(data?.summary?.zeroCount ?? 0) +
                (data?.summary?.outlierCount ?? 0) >
              0 ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                Jumlah yang perlu dicek
              </div>
              <div className="text-lg font-bold">
                {isLoading
                  ? "-"
                  : `${data?.summary?.zeroCount ?? 0} (0 m³) / ${
                      data?.summary?.outlierCount ?? 0
                    } (turun/naik)`}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {zonaId === "ALL"
                  ? "Akumulasi semua blok"
                  : "Prioritas inspeksi lapangan"}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* ===== Desktop: Tabel ===== */}
        <GlassCard className="p-4 overflow-hidden hidden md:block">
          <div className="p-2 border-b flex items-center justify-between">
            <div className="font-semibold">
              Pantauan pemakaian {selectedZonaName} - Periode Catat{" "}
              {periodeLabel || "-"}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Info className="w-4 h-4" />
              “0 m³ berulang” = 0 m³ ≥ 3 bulan • “Turun jauh” ≈ turun ≥ 50% •
              “Naik tinggi” ≈ naik ≥ 100%
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-3 py-2 w-12">No</th>
                  <th className="text-left px-3 py-2">Pelanggan</th>
                  <th className="text-left px-3 py-2">Blok</th>
                  <th className="text-right px-3 py-2">
                    Pemakaian {periodeLabel || "-"} (m³)
                  </th>
                  <th className="text-right px-3 py-2">Rata-rata 3 Bulan</th>
                  <th className="text-right px-3 py-2">Rata-rata 6 Bulan</th>
                  <th className="text-right px-3 py-2">Banding 3 bln</th>
                  <th className="text-left px-3 py-2">Indikasi</th>
                  <th className="text-right px-3 py-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(isLoading ? [] : pageRows).map((r, idx) => (
                  <tr
                    key={r.pelangganId + (r.zonaNama || "")}
                    className="border-b last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-3 py-2">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.pelangganNama}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.pelangganKode}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {r.zonaNama || selectedZonaName}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.m3Now.toLocaleString("id-ID")} m³
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.avg3.toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.avg6.toLocaleString("id-ID")}
                    </td>
                    <td
                      className={`px-3 py-2 text-right ${
                        r.deltaPctVs3 <= -50
                          ? "text-amber-500 font-semibold"
                          : ""
                      }`}
                    >
                      {signedPct(r.deltaPctVs3)}
                    </td>
                    <td className="px-3 py-2">
                      <FlagBadgesUserFriendly flags={r.flags} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDetail(r)}
                      >
                        Detail
                      </Button>
                    </td>
                  </tr>
                ))}
                {!isLoading && pageRows.length === 0 && (
                  <tr>
                    <td
                      className="px-3 py-4 text-center text-muted-foreground"
                      colSpan={9}
                    >
                      Tidak ada data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* pagination */}
          <div className="p-3 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {isLoading
                ? "Memuat…"
                : `Menampilkan ${pageRows.length} dari ${filtered.length} pelanggan`}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Sebelumnya
              </Button>
              <div className="text-sm">
                {page} / {totalPages}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* ===== Mobile: Cards ===== */}
        <div className="md:hidden space-y-2">
          {(isLoading ? [] : pageRows).map((r, idx) => (
            <GlassCard key={r.pelangganId + (r.zonaNama || "")} className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  {/* <div className="text-xs text-muted-foreground">
                    #{(page - 1) * pageSize + idx + 1}
                  </div> */}
                  <div className="font-semibold">{r.pelangganNama}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.pelangganKode} • {r.zonaNama || selectedZonaName}
                  </div>
                </div>
                <FlagBadgesUserFriendly flags={r.flags} />
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <GlassCard className="p-2">
                  <div className="text-[11px] text-muted-foreground">
                    Pemakaian {periodeLabel}
                  </div>
                  <div className="font-bold">
                    {r.m3Now.toLocaleString("id-ID")} m³
                  </div>
                </GlassCard>
                <GlassCard className="p-2">
                  <div className="text-[11px] text-muted-foreground">
                    Banding 3 bln
                  </div>
                  <div
                    className={`font-bold ${
                      r.deltaPctVs3 <= -50 ? "text-amber-500" : ""
                    }`}
                  >
                    {signedPct(r.deltaPctVs3)}
                  </div>
                </GlassCard>
                <GlassCard className="p-2">
                  <div className="text-[11px] text-muted-foreground">
                    Rata2 3 bln
                  </div>
                  <div className="font-bold">
                    {r.avg3.toLocaleString("id-ID")}
                  </div>
                </GlassCard>
                <GlassCard className="p-2">
                  <div className="text-[11px] text-muted-foreground">
                    Rata2 6 bln
                  </div>
                  <div className="font-bold">
                    {r.avg6.toLocaleString("id-ID")}
                  </div>
                </GlassCard>
              </div>

              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDetail(r)}
                >
                  Detail
                </Button>
              </div>
            </GlassCard>
          ))}

          {/* pagination mobile */}
          <div className="p-1 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {isLoading
                ? "Memuat…"
                : `Menampilkan ${pageRows.length} dari ${filtered.length}`}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Sebelumnya
              </Button>
              <div className="text-sm">
                {page} / {totalPages}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        </div>

        {/* Modal detail */}
        <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detail pelanggan</DialogTitle>
            </DialogHeader>
            {detail && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{detail.pelangganNama}</div>
                    <div className="text-xs text-muted-foreground">
                      {detail.pelangganKode} •{" "}
                      {detail.zonaNama || selectedZonaName}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <FlagBadgesUserFriendly flags={detail.flags} />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <GlassCard className="p-3">
                    <div className="text-xs text-muted-foreground">
                      m³ ({periodeLabel || "-"})
                    </div>
                    <div className="text-lg font-bold">
                      {detail.m3Now.toLocaleString("id-ID")}
                    </div>
                  </GlassCard>
                  <GlassCard className="p-3">
                    <div className="text-xs text-muted-foreground">
                      rata2 3 bulan
                    </div>
                    <div className="text-lg font-bold">
                      {detail.avg3.toLocaleString("id-ID")}
                    </div>
                  </GlassCard>
                  <GlassCard className="p-3">
                    <div className="text-xs text-muted-foreground">
                      rata2 6 bulan
                    </div>
                    <div className="text-lg font-bold">
                      {detail.avg6.toLocaleString("id-ID")}
                    </div>
                  </GlassCard>
                  <GlassCard className="p-3">
                    <div className="text-xs text-muted-foreground">
                      banding 3 bulan
                    </div>
                    <div
                      className={`text-lg font-bold ${
                        Math.abs(detail.deltaPctVs3) >= 50
                          ? "text-amber-500"
                          : ""
                      }`}
                    >
                      {signedPct(detail.deltaPctVs3)}
                    </div>
                  </GlassCard>
                </div>

                <GlassCard className="p-0 overflow-hidden max-w-92 md:max-w-100">
                  <div className="p-2 border-b text-sm font-semibold">
                    Riwayat 6 bulan
                  </div>

                  {/* Hanya bagian ini yang horizontal-scroll */}
                  <div className="overflow-x-auto overscroll-x-contain -mx-2">
                    <div className="px-2">
                      <table className="min-w-max text-sm">
                        <thead className="bg-muted/40">
                          <tr>
                            {detail.history.map((h) => (
                              <th
                                key={h.periode}
                                className="px-3 py-2 text-right whitespace-nowrap"
                              >
                                {formatPeriodeID(h.periode)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {detail.history.map((h) => (
                              <td
                                key={h.periode}
                                className="px-3 py-2 text-right whitespace-nowrap"
                              >
                                {h.m3.toLocaleString("id-ID")}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </GlassCard>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

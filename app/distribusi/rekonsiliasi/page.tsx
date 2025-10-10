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
  Download,
  RefreshCw,
  Search,
  Users,
  Droplets,
  Grid2X2,
} from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";

/* ================= Helpers ================= */
const fetcher = (u: string) => fetch(u).then((r) => r.json());
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
function num(n: number) {
  return (n ?? 0).toLocaleString("id-ID");
}
function pct(n: number) {
  const x = Math.round((n ?? 0) * 10) / 10;
  return `${x.toString().replace(".", ",")}%`;
}

function StatusBadge({ s }: { s: "OK" | "WARNING" | "ALERT" }) {
  if (s === "ALERT") return <Badge variant="destructive">ALERT</Badge>;
  if (s === "WARNING")
    return <Badge className="bg-amber-500 text-amber-50">WARNING</Badge>;
  return <Badge variant="secondary">OK</Badge>;
}

/* ====== Types ====== */
type TandonRow = {
  tandonId: string;
  tandonNama: string;
  inputM3: number;
  outputBlokM3: number;
  lossM3: number;
  lossPct: number;
  status: "OK" | "WARNING" | "ALERT";
};
type BlokRow = {
  zonaId: string;
  zonaNama: string;
  tandonId: string;
  tandonNama: string;
  inputBlokM3: number;
  outputRumahM3: number;
  lossM3: number;
  lossPct: number;
  status: "OK" | "WARNING" | "ALERT";
};
type PelangganRow = {
  pelangganId: string;
  pelangganNama: string;
  pelangganKode: string;
  m3Now: number;
};

/* ====== Small UI helpers (mobile headers & chips) ====== */
function SectionTitleMobile({
  icon,
  title,
  count,
  accent = "blue",
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  accent?: "blue" | "green";
}) {
  const ring =
    accent === "blue"
      ? "ring-blue-500/20 bg-blue-500/5"
      : "ring-emerald-500/20 bg-emerald-500/5";
  return (
    <div
      className={`flex items-center justify-between px-2 py-2 rounded-xl mb-2 ring-1 ${ring}`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <div className="font-medium">{title}</div>
      </div>
      {typeof count === "number" && (
        <span className="text-xs text-muted-foreground">{count} item</span>
      )}
    </div>
  );
}

function Chip({
  children,
  color = "blue",
}: {
  children: React.ReactNode;
  color?: "blue" | "green";
}) {
  const cls =
    color === "blue"
      ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {children}
    </span>
  );
}

/* ================= Page ================= */
export default function RekonsiliasiPage() {
  /* ===== State filter ===== */
  const [periods, setPeriods] = useState<string[]>([]);
  const [periode, setPeriode] = useState<string>("");
  const [tandonId, setTandonId] = useState<string>("ALL");
  const [q, setQ] = useState("");

  /* ===== Drilldown state ===== */
  const [openRumah, setOpenRumah] = useState(false);
  const [blokSelected, setBlokSelected] = useState<{
    id: string;
    nama: string;
  } | null>(null);
  const [qRumah, setQRumah] = useState("");
  const [pageRumah, setPageRumah] = useState(1);
  const pageSizeRumah = 12;

  /* ===== Periode list ===== */
  useEffect(() => {
    (async () => {
      // Reuse endpoint filter yang sudah ada
      const res = await fetch("/api/rekon/anomali", {
        method: "POST",
        body: JSON.stringify({ type: "filters" }),
        headers: { "Content-Type": "application/json" },
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      const ps: string[] = res?.periods || [];
      setPeriods(ps);
      if (ps.length && !periode) setPeriode(ps[0]);
    })();
  }, []); // eslint-disable-line

  const periodeLabel = formatPeriodeID(periode);

  /* ===== Fetch data utama ===== */
  const {
    data: td,
    isLoading: l1,
    mutate: refTandon,
  } = useSWR(
    periode ? `/api/distribusi/rekonsiliasi/tandon?periode=${periode}` : null,
    fetcher
  );
  const tandonRows: TandonRow[] = td?.rows || [];

  const tandonOptions = useMemo(
    () => tandonRows.map((r) => ({ id: r.tandonId, nama: r.tandonNama })),
    [tandonRows]
  );

  const blokUrl = useMemo(() => {
    if (!periode) return null;
    const base = `/api/distribusi/rekonsiliasi/blok?periode=${periode}`;
    return tandonId && tandonId !== "ALL"
      ? `${base}&tandonId=${tandonId}`
      : base;
  }, [periode, tandonId]);

  const { data: bk, isLoading: l2, mutate: refBlok } = useSWR(blokUrl, fetcher);
  const blokRowsRaw: BlokRow[] = bk?.rows || [];

  /* ===== Search blok ===== */
  const blokRows = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return blokRowsRaw;
    return blokRowsRaw.filter(
      (r) =>
        r.zonaNama.toLowerCase().includes(qq) ||
        r.tandonNama.toLowerCase().includes(qq)
    );
  }, [blokRowsRaw, q]);

  const loading = l1 || l2;

  /* ===== KPI total ===== */
  const totalInputTandon = (tandonRows || []).reduce(
    (a, b) => a + (b.inputM3 || 0),
    0
  );
  const totalOutputBlok = (tandonRows || []).reduce(
    (a, b) => a + (b.outputBlokM3 || 0),
    0
  );
  const totalLossTandon = totalInputTandon - totalOutputBlok;
  const totalLossPct =
    totalInputTandon > 0 ? (totalLossTandon / totalInputTandon) * 100 : 0;

  /* ===== Drilldown (per rumah) ===== */
  const rumahUrl = useMemo(() => {
    if (!openRumah || !blokSelected || !periode) return null;
    return `/api/distribusi/rekonsiliasi/pelanggan?periode=${periode}&zonaId=${blokSelected.id}`;
  }, [openRumah, blokSelected, periode]);
  const {
    data: pr,
    isLoading: l3,
    mutate: refRumah,
  } = useSWR(rumahUrl, fetcher);
  const rumahAll: PelangganRow[] = pr?.rows || [];

  const rumahFiltered = useMemo(() => {
    const qq = qRumah.trim().toLowerCase();
    return qq
      ? rumahAll.filter(
          (r) =>
            r.pelangganNama.toLowerCase().includes(qq) ||
            r.pelangganKode.toLowerCase().includes(qq)
        )
      : rumahAll;
  }, [rumahAll, qRumah]);

  const totalPages = Math.max(
    1,
    Math.ceil((rumahFiltered.length || 0) / pageSizeRumah)
  );
  useEffect(() => {
    if (pageRumah > totalPages) setPageRumah(1);
  }, [totalPages, pageRumah]);
  const rumahPage = useMemo(() => {
    const start = (pageRumah - 1) * pageSizeRumah;
    return rumahFiltered.slice(start, start + pageSizeRumah);
  }, [rumahFiltered, pageRumah]);

  return (
    <AuthGuard requiredRole={"ADMIN"}>
      <AppShell>
        {/* ===== Header ===== */}
        <AppHeader title="Rekonsiliasi" />

        {/* ===== Filters ===== */}
        <div className="px-0 pb-4">
          <GlassCard className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  Periode catat meter
                </div>
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
                <div className="text-xs text-muted-foreground mb-1">
                  Filter tandon (untuk tabel blok)
                </div>
                <Select value={tandonId} onValueChange={setTandonId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih tandon" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Tandon</SelectItem>
                    {tandonOptions.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-1 col-span-2 flex gap-2">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 opacity-60" />
                  <Input
                    className="pl-8"
                    placeholder="Cari nama blok / tandon"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
                {/* <Button
                  variant="outline"
                  onClick={() => {
                    refTandon();
                    refBlok();
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-1" /> Export
                </Button> */}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* ===== KPI ===== */}
        <div className="px-0 grid grid-cols-1 md:grid-cols-3 gap-3 pb-4">
          <GlassCard className="p-4">
            <div className="text-xs text-muted-foreground">
              Total air masuk (semua tandon) – {periodeLabel || "-"}
            </div>
            <div className="text-lg font-bold">
              {loading ? "-" : num(totalInputTandon)}
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="text-xs text-muted-foreground">
              Total air keluar ke blok
            </div>
            <div className="text-lg font-bold">
              {loading ? "-" : num(totalOutputBlok)}
            </div>
          </GlassCard>
          <GlassCard className="p-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">
                Selisih total (m³ / %)
              </div>
              <div className="text-lg font-bold">
                {loading
                  ? "-"
                  : `${num(totalLossTandon)} • ${pct(totalLossPct)}`}
              </div>
            </div>
            {totalLossTandon > 0 ? (
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
            )}
          </GlassCard>
        </div>

        {/* ===== Ringkasan Tandon — Desktop ===== */}
        <div className="px-0 pb-4">
          <GlassCard className="p-3 overflow-hidden hidden md:block">
            <div className="p-3 border-b font-semibold">
              Ringkasan Tandon (Air masuk → Total ke blok)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-3 py-2">Tandon</th>
                    <th className="text-right py-2">Air masuk tandon (m³)</th>
                    <th className="text-right py-2">
                      Total masuk ke blok (m³)
                    </th>
                    <th className="text-right px-3 py-2">Selisih (m³)</th>
                    <th className="text-right px-3 py-2">Selisih (%)</th>
                    <th className="text-left px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(loading ? [] : tandonRows).map((r) => (
                    <tr
                      key={r.tandonId}
                      className="border-b last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-3 py-2">{r.tandonNama}</td>
                      <td className="px-3 py-2 text-right">{num(r.inputM3)}</td>
                      <td className="px-3 py-2 text-right">
                        {num(r.outputBlokM3)}
                      </td>
                      <td className="px-3 py-2 text-right">{num(r.lossM3)}</td>
                      <td className="px-3 py-2 text-right">{pct(r.lossPct)}</td>
                      <td className="px-3 py-2">
                        <StatusBadge s={r.status} />
                      </td>
                    </tr>
                  ))}
                  {!loading && !tandonRows.length && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-6 text-center text-muted-foreground"
                      >
                        Belum ada data tandon (DONE) untuk periode ini
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>

        {/* ===== Ringkasan Tandon — Mobile (Cards) ===== */}
        <div className="md:hidden px-0 pb-2">
          <SectionTitleMobile
            icon={<Droplets className="w-4 h-4" />}
            title="Ringkasan Tandon"
            count={(tandonRows ?? []).length}
            accent="blue"
          />
          <div className="space-y-2">
            {(loading ? [] : tandonRows).map((r) => (
              <GlassCard
                key={r.tandonId}
                className="p-3 ring-1 ring-blue-500/10 border-l-4 border-blue-500"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <Chip color="blue">RINGKASAN TANDON</Chip>
                    <div className="font-semibold">{r.tandonNama}</div>
                  </div>
                  <StatusBadge s={r.status} />
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <GlassCard className="p-2">
                    <div className="text-[11px] text-muted-foreground">
                      Air masuk tandon
                    </div>
                    <div className="font-bold">{num(r.inputM3)} m³</div>
                  </GlassCard>
                  <GlassCard className="p-2">
                    <div className="text-[11px] text-muted-foreground">
                      Total masuk ke blok
                    </div>
                    <div className="font-bold">{num(r.outputBlokM3)} m³</div>
                  </GlassCard>
                  <GlassCard className="p-2">
                    <div className="text-[11px] text-muted-foreground">
                      Selisih (m³)
                    </div>
                    <div className="font-bold">{num(r.lossM3)}</div>
                  </GlassCard>
                  <GlassCard className="p-2">
                    <div className="text-[11px] text-muted-foreground">
                      Selisih (%)
                    </div>
                    <div className="font-bold">{pct(r.lossPct)}</div>
                  </GlassCard>
                </div>
              </GlassCard>
            ))}
            {!loading && !tandonRows.length && (
              <div className="text-center text-sm text-muted-foreground py-6">
                Belum ada data tandon untuk periode ini
              </div>
            )}
          </div>
        </div>

        {/* ===== Perincian Blok — Desktop ===== */}
        <div className="px-0 pb-6 hidden md:block">
          <GlassCard className="p-3 overflow-hidden">
            <div className="p-3 border-b font-semibold">
              Perincian Blok (Air ke blok → Total pemakaian rumah)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-3 py-2">Blok</th>
                    <th className="text-left px-3 py-2">Tandon</th>
                    <th className="text-right px-3 py-2">Air ke blok (m³)</th>
                    <th className="text-right px-3 py-2">
                      Total pemakaian rumah (m³)
                    </th>
                    <th className="text-right px-3 py-2">Selisih (m³)</th>
                    <th className="text-right px-3 py-2">Selisih (%)</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-right px-3 py-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {(loading ? [] : blokRows).map((r) => (
                    <tr
                      key={r.zonaId}
                      className="border-b last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-3 py-2">{r.zonaNama}</td>
                      <td className="px-3 py-2">{r.tandonNama}</td>
                      <td className="px-3 py-2 text-right">
                        {num(r.inputBlokM3)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {num(r.outputRumahM3)}
                      </td>
                      <td className="px-3 py-2 text-right">{num(r.lossM3)}</td>
                      <td className="px-3 py-2 text-right">{pct(r.lossPct)}</td>
                      <td className="px-3 py-2">
                        <StatusBadge s={r.status} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setBlokSelected({ id: r.zonaId, nama: r.zonaNama });
                            setOpenRumah(true);
                          }}
                        >
                          Lihat pelanggan
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!loading && !blokRows.length && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-3 py-6 text-center text-muted-foreground"
                      >
                        Belum ada data blok (DONE) untuk periode ini
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>

        {/* ===== Perincian Blok — Mobile (Cards) ===== */}
        <div className="md:hidden px-0 pb-6">
          <SectionTitleMobile
            icon={<Grid2X2 className="w-4 h-4" />}
            title="Perincian Blok"
            count={(blokRows ?? []).length}
            accent="green"
          />
          <div className="space-y-2">
            {(loading ? [] : blokRows).map((r) => (
              <GlassCard
                key={r.zonaId}
                className="p-3 ring-1 ring-emerald-500/10 border-l-4 border-emerald-500"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <Chip color="green">BLOK</Chip>
                    <div className="font-semibold">{r.zonaNama}</div>
                    <div className="text-xs text-muted-foreground">
                      Tandon: {r.tandonNama}
                    </div>
                  </div>
                  <StatusBadge s={r.status} />
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <GlassCard className="p-2">
                    <div className="text-[11px] text-muted-foreground">
                      Air ke blok
                    </div>
                    <div className="font-bold">{num(r.inputBlokM3)} m³</div>
                  </GlassCard>
                  <GlassCard className="p-2">
                    <div className="text-[11px] text-muted-foreground">
                      Total pemakaian rumah
                    </div>
                    <div className="font-bold">{num(r.outputRumahM3)} m³</div>
                  </GlassCard>
                  <GlassCard className="p-2">
                    <div className="text-[11px] text-muted-foreground">
                      Selisih (m³)
                    </div>
                    <div className="font-bold">{num(r.lossM3)}</div>
                  </GlassCard>
                  <GlassCard className="p-2">
                    <div className="text-[11px] text-muted-foreground">
                      Selisih (%)
                    </div>
                    <div className="font-bold">{pct(r.lossPct)}</div>
                  </GlassCard>
                </div>

                <div className="mt-2 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setBlokSelected({ id: r.zonaId, nama: r.zonaNama });
                      setOpenRumah(true);
                    }}
                  >
                    Lihat pelanggan
                  </Button>
                </div>
              </GlassCard>
            ))}

            {!loading && !blokRows.length && (
              <div className="text-center text-sm text-muted-foreground py-6">
                Belum ada data blok untuk periode ini
              </div>
            )}
          </div>
        </div>

        {/* ===== Dialog: Daftar Rumah / Pelanggan ===== */}
        <Dialog
          open={openRumah}
          onOpenChange={(o) => {
            setOpenRumah(o);
            if (!o) {
              setQRumah("");
              setPageRumah(1);
            }
          }}
        >
          <DialogContent className="w-[92vw] max-w-3xl max-h-[85vh] overflow-y-auto p-3 sm:p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle>
                Daftar pelanggan di {blokSelected?.nama ?? "-"}
              </DialogTitle>
            </DialogHeader>

            <div className="mt-2 flex items-end gap-2">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 opacity-60" />
                <Input
                  className="pl-8"
                  placeholder="Cari pelanggan (nama/kode)"
                  value={qRumah}
                  onChange={(e) => setQRumah(e.target.value)}
                />
              </div>
              <Button variant="outline" onClick={() => refRumah()}>
                <RefreshCw className="w-4 h-4 mr-1" /> Refresh
              </Button>
            </div>

            <GlassCard className="mt-3 p-3 overflow-hidden">
              <div className="p-2 border-b text-sm text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" /> {rumahFiltered.length} pelanggan
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left px-3 py-2 w-10">No</th>
                      <th className="text-left px-3 py-2">Pelanggan</th>
                      <th className="text-right px-3 py-2">
                        Pemakaian {periodeLabel || "-"} (m³)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(l3 ? [] : rumahPage).map((r, idx) => (
                      <tr
                        key={r.pelangganId}
                        className="border-b last:border-0 hover:bg-muted/20"
                      >
                        <td className="px-3 py-2">
                          {(pageRumah - 1) * pageSizeRumah + idx + 1}
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{r.pelangganNama}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.pelangganKode}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">{num(r.m3Now)}</td>
                      </tr>
                    ))}
                    {!l3 && rumahPage.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-3 py-6 text-center text-muted-foreground"
                        >
                          Tidak ada pelanggan untuk blok ini
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* pagination */}
              <div className="p-3 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {l3
                    ? "Memuat…"
                    : `Menampilkan ${rumahPage.length} dari ${rumahFiltered.length} pelanggan`}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPageRumah((p) => Math.max(1, p - 1))}
                    disabled={pageRumah <= 1}
                  >
                    Sebelumnya
                  </Button>
                  <div className="text-sm">
                    {pageRumah} / {totalPages}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setPageRumah((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={pageRumah >= totalPages}
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            </GlassCard>
          </DialogContent>
        </Dialog>
      </AppShell>
    </AuthGuard>
  );
}

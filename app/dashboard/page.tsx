// app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { StatCard } from "@/components/stat-card";
import { DataTable } from "@/components/data-table";
import { UsageLineChart } from "@/components/charts/line-chart";
import { BillingBarChart } from "@/components/charts/bar-chart";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  InfoDot,
} from "@/components/ui/radix-tooltip";
import { Input } from "@/components/ui/input";

type UsageItem = { month: string; usage: number };
type BillingItem = { month: string; amount: number };
type TableRow = {
  id: string;
  periode: string;
  totalM3: number;
  tagihan: number;
  sudahBayar: number;
  belumBayar: number;
  status: "paid" | "partial" | "unpaid";
};
type TopUser = { name: string; usage: number; address: string };
type UnpaidRow = { name: string; amount: number; period: string };
type IssueRow = { issue: string; status: string; date: string };

type LRRow = {
  tanggal: string | Date;
  keterangan: string;
  debit: number;
  kredit: number;
};
type LRRingkasan = {
  pendapatanTotal: number;
  bebanTotal: number;
  labaBersih: number;
  periodLabel: string;
};
type LRMonth = {
  ym: string;
  label: string;
  pendapatan: number;
  beban: number;
  laba: number;
};

/* ===== Utils YM (YYYY-MM) ===== */
function fmtYm(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function ymAdd(ym: string, deltaMonths: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, (m || 1) - 1, 1));
  d.setUTCMonth(d.getUTCMonth() + deltaMonths);
  return fmtYm(d);
}
function ymLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, (m || 1) - 1, 1));
  return d.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function DashboardPage() {
  const [usageData, setUsageData] = useState<UsageItem[]>([]);
  const [billingData, setBillingData] = useState<BillingItem[]>([]);
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [unpaidList, setUnpaidList] = useState<UnpaidRow[]>([]);
  const [waterIssues, setWaterIssues] = useState<IssueRow[]>([]);
  const [cards, setCards] = useState<{
    totalTagihanBulanIni: number;
    totalTagihanCount: number;
    totalTagihanBulanLalu: number;
    totalTagihanBulanLaluCount: number;
    totalBelumBayarAmount: number;
    totalBelumBayarCount: number;
    totalPelanggan: number;
    payingRate: number;
    trends: {
      totalTagihan: { value: number; isPositive: boolean };
      totalBelumBayar: { value: number; isPositive: boolean };
      pelanggan: { value: number; isPositive: boolean };
      payingRate: { value: number; isPositive: boolean };
    };
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [openUnpaidModal, setOpenUnpaidModal] = useState(false);

  // Laba–Rugi states
  const [lr, setLR] = useState<LRRingkasan | null>(null);
  const [lrLedger, setLRLedger] = useState<LRRow[]>([]);
  const [openLRModal, setOpenLRModal] = useState(false);
  const [lrSearch, setLRSearch] = useState("");

  // Freeze current YM so deps array stabil
  const ymNowRef = useRef<string>(fmtYm(new Date()));
  const ymNow = ymNowRef.current;

  // Periode yang ditampilkan di Ringkasan L/R (mengikuti laporan)
  const [selectedYm, setSelectedYm] = useState<string>(ymNow);
  const [lrMonths, setLRMonths] = useState<LRMonth[]>([]);

  const year = useMemo(() => new Date().getFullYear(), []);
  const rupiah = (n: number) => "Rp " + Number(n || 0).toLocaleString("id-ID");

  /* ===== Load 1 bulan (untuk modal) ===== */
  async function loadLRMonth(ym: string) {
    const res = await fetch(`/api/laporan/laba-rugi?scope=month&month=${ym}`, {
      cache: "no-store",
    });
    const j = await res.json();
    if (j?.ok || j?.ringkasan) {
      setLR({
        pendapatanTotal: j.ringkasan?.pendapatanTotal ?? 0,
        bebanTotal: j.ringkasan?.bebanTotal ?? 0,
        labaBersih: j.ringkasan?.labaBersih ?? 0,
        periodLabel: j.periodLabel ?? ymLabel(ym),
      });
      setLRLedger(Array.isArray(j.ledger) ? j.ledger : []);
    } else {
      setLR(null);
      setLRLedger([]);
    }
  }

  /* ===== Cek apakah response bulan tsb punya data ===== */
  function hasLRData(j: any): boolean {
    const pend = j?.ringkasan?.pendapatanTotal ?? 0;
    const beb = j?.ringkasan?.bebanTotal ?? 0;
    const lab = j?.ringkasan?.labaBersih ?? 0;
    const hasLedger = Array.isArray(j?.ledger) && j.ledger.length > 0;
    return hasLedger || pend !== 0 || beb !== 0 || lab !== 0;
  }

  /* ===== Ambil daftar bulan dari API laporan (kalau ada) ===== */
  async function fetchReportMonths(): Promise<string[] | null> {
    const scopes = ["months", "available-months", "periods"];
    for (const scope of scopes) {
      try {
        const r = await fetch(`/api/laporan/laba-rugi?scope=${scope}`, {
          cache: "no-store",
        });
        if (!r.ok) continue;
        const j = await r.json();

        // bisa {months:[...]} atau {periods:[...]} atau langsung array
        const arr: unknown = Array.isArray(j)
          ? j
          : j?.months ?? j?.periods ?? j?.data;

        if (Array.isArray(arr) && arr.every((x) => typeof x === "string")) {
          // unique + sort ASC (YYYY-MM)
          const uniq = Array.from(new Set(arr as string[])).sort();
          if (uniq.length) return uniq;
        }
      } catch {
        // ignore & try next scope
      }
    }
    return null;
  }

  /* ===== Discovery bulan yg ada data (fallback jika scope bulan tidak ada) =====
     - Cek mundur 12 bulan dari bulan sekarang (tidak ambil bulan depan)
     - Hanya ambil bulan yang benar-benar punya data (ledger/total ≠ 0)
  */
  async function discoverMonthsWithData(centerYm: string): Promise<string[]> {
    const candidates: string[] = [];
    for (let back = 12; back >= 0; back--) {
      candidates.push(ymAdd(centerYm, -back));
    }
    const res = await Promise.all(
      candidates.map(async (m) => {
        const r = await fetch(`/api/laporan/laba-rugi?scope=month&month=${m}`, {
          cache: "no-store",
        });
        if (!r.ok) return null;
        const j = await r.json();
        return hasLRData(j) ? m : null;
      })
    );
    return res.filter(Boolean) as string[]; // tanpa bulan kosong
  }

  /* ===== Build LRMonth untuk daftar YM tertentu (skip bulan kosong) ===== */
  async function loadLRByMonths(months: string[]) {
    const results: LRMonth[] = [];
    await Promise.all(
      months.map(async (m) => {
        const r = await fetch(`/api/laporan/laba-rugi?scope=month&month=${m}`, {
          cache: "no-store",
        });
        if (!r.ok) return;
        const j = await r.json();
        if (!hasLRData(j)) return; // <-- filter: jangan masukkan bulan kosong
        const pendapatan = j?.ringkasan?.pendapatanTotal ?? 0;
        const beban = j?.ringkasan?.bebanTotal ?? 0;
        const laba = j?.ringkasan?.labaBersih ?? pendapatan - beban;
        results.push({ ym: m, label: ymLabel(m), pendapatan, beban, laba });
      })
    );
    // ikut urutan laporan (diasumsikan sudah ASC)
    setLRMonths(results);
  }

  /* ===== Effect utama: load dashboard + LR (mengikuti laporan) ===== */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);

        const dashRes = await fetch(`/api/dashboard?year=${year}`, {
          cache: "no-store",
        });

        if (dashRes.ok) {
          const data = await dashRes.json();
          if (!cancelled) {
            setUsageData(data.usageData ?? []);
            setBillingData(data.billingData ?? []);
            setTableData(data.tableData ?? []);
            setTopUsers(data.topUsers ?? []);
            setUnpaidList(data.unpaidList ?? []);
            setWaterIssues(data.waterIssues ?? []);
            setCards(data.statCards ?? null);
          }
        } else if (!cancelled) {
          setUsageData([]);
          setBillingData([]);
          setTableData([]);
          setTopUsers([]);
          setUnpaidList([]);
          setWaterIssues([]);
          setCards(null);
        }

        // 1) coba baca daftar bulan dari laporan
        let months = await fetchReportMonths();

        // 2) kalau tidak ada, discovery bulan yg ada data (tanpa bulan depan)
        if (!months || months.length === 0) {
          months = await discoverMonthsWithData(ymNow);
        }

        // 3) muat sesuai urutan dan pilih default ke bulan terakhir yg ada data
        if (!cancelled) {
          await loadLRByMonths(months);
          const latest = months[months.length - 1] ?? ymNow;
          setSelectedYm(latest);
          await loadLRMonth(latest);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setUsageData([]);
          setBillingData([]);
          setTableData([]);
          setTopUsers([]);
          setUnpaidList([]);
          setWaterIssues([]);
          setCards(null);
          setLR(null);
          setLRLedger([]);
          setLRMonths([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [year, ymNow]);

  /* ===== Filter & saldo berjalan ledger (modal) ===== */
  const lrLedgerFiltered = useMemo(() => {
    const q = lrSearch.trim().toLowerCase();
    if (!q) return lrLedger;
    return lrLedger.filter(
      (r) =>
        (r.keterangan || "").toLowerCase().includes(q) ||
        new Date(r.tanggal as any).toISOString().slice(0, 10).includes(q)
    );
  }, [lrLedger, lrSearch]);

  const lrLedgerWithSaldo = useMemo(() => {
    let saldo = 0;
    return lrLedgerFiltered.map((r) => {
      const debit = Number(r.debit || 0);
      const kredit = Number(r.kredit || 0);
      saldo += kredit - debit;
      return { ...r, _saldo: saldo };
    });
  }, [lrLedgerFiltered]);

  /* ===== TOTAL untuk Ringkasan L/R ===== */
  const lrTotals = useMemo(() => {
    const pendapatan = lrMonths.reduce((s, m) => s + (m.pendapatan || 0), 0);
    const beban = lrMonths.reduce((s, m) => s + (m.beban || 0), 0);
    const laba = lrMonths.reduce((s, m) => s + (m.laba || 0), 0);
    return { pendapatan, beban, laba };
  }, [lrMonths]);

  return (
    <AuthGuard requiredRole={"ADMIN"}>
      <AppShell>
        <div className="max-w-7xl mx-auto space-y-6">
          <AppHeader
            title="Dashboard"
            showBackButton={false}
            showBreadcrumb={false}
          />

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Tagihan Bulan Lalu"
              value={
                cards
                  ? rupiah(cards.totalTagihanBulanLalu ?? 0)
                  : loading
                  ? "…"
                  : "Rp 0"
              }
              subtitle={`${cards?.totalTagihanBulanLaluCount ?? 0} pelanggan`}
              trend={
                // bandingkan dengan trend.totalTagihan (kamu sudah punya trends.totalTagihan yang bandingkan sekarang vs lalu)
                // namun di UI ini kita bisa menampilkan kebalikan: apakah sekarang naik dari lalu ?
                cards?.trends?.totalTagihan ?? { value: 0, isPositive: true }
              }
              icon={
                <svg
                  className="w-6 h-6 text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 6h18M3 12h18M3 18h18"
                  />
                </svg>
              }
            />

            <StatCard
              title="Total Tagihan Bulan Ini"
              value={
                cards
                  ? rupiah(cards.totalTagihanBulanIni)
                  : loading
                  ? "…"
                  : "Rp 0"
              }
              subtitle={`${cards?.totalTagihanCount ?? 0} pelanggan`}
              trend={
                cards?.trends?.totalTagihan ?? { value: 0, isPositive: true }
              }
              icon={
                <svg
                  className="w-6 h-6 text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              }
            />

            <div className="relative">
              <StatCard
                title="Total Belum Terbayar Bulan Ini"
                value={
                  cards
                    ? rupiah(cards.totalBelumBayarAmount)
                    : loading
                    ? "…"
                    : "Rp 0"
                }
                subtitle={`${cards?.totalBelumBayarCount ?? 0} tagihan aktif`}
                trend={
                  cards?.trends?.totalBelumBayar ?? {
                    value: 0,
                    isPositive: false,
                  }
                }
                icon={
                  <svg
                    className="w-6 h-6 text-primary"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01M5.062 19h13.876c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.33 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                }
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-7 px-2 text-xs"
                onClick={() => setOpenUnpaidModal(true)}
              >
                Selengkapnya
              </Button>
            </div>

            <StatCard
              title="Jumlah Pengguna Aktif"
              value={cards ? String(cards.totalPelanggan) : loading ? "…" : "0"}
              subtitle="Total pelanggan"
              trend={cards?.trends?.pelanggan ?? { value: 0, isPositive: true }}
              icon={
                <svg
                  className="w-6 h-6 text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0zM7 10a2 2 0 11-4 0 2 2 0z"
                  />
                </svg>
              }
            />

            {/* <StatCard
              title="Tingkat Pembayaran"
              value={
                cards
                  ? `${Math.round((cards.payingRate || 0) * 100)}%`
                  : loading
                  ? "…"
                  : "0%"
              }
              subtitle="Tahun berjalan"
              trend={
                cards?.trends?.payingRate ?? { value: 0, isPositive: true }
              }
              icon={
                <svg
                  className="w-6 h-6 text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3v18h18M7 15l4-4 3 3 5-6"
                  />
                </svg>
              }
            /> */}
          </div>

          {/* Data Table Tagihan */}
          <DataTable title="Ringkasan Periode Tagihan" data={tableData} />

          {/* ===== Ringkasan Laba–Rugi (mengikuti periode laporan) ===== */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-foreground">
                Ringkasan Laba–Rugi
                <span className="ml-2 text-xs text-muted-foreground">
                  {/* (mengikuti periode di halaman Laporan) */}
                </span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/20">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                      Periode
                    </th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                      Pemasukan
                    </th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                      Pengeluaran
                    </th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                      Laba / (Rugi)
                    </th>
                    <th className="w-28"></th>
                  </tr>
                </thead>
                <tbody>
                  {lrMonths.map((m) => (
                    <tr key={m.ym} className="border-b border-border/10">
                      <td className="py-3 px-2 text-sm text-foreground">
                        {m.label}
                      </td>
                      <td className="py-3 px-2 text-sm text-right text-green-700">
                        {rupiah(m.pendapatan)}
                      </td>
                      <td className="py-3 px-2 text-sm text-right text-red-700">
                        {rupiah(m.beban)}
                      </td>
                      <td
                        className={`py-3 px-2 text-sm text-right ${
                          m.laba >= 0 ? "text-green-700" : "text-red-700"
                        }`}
                      >
                        {rupiah(m.laba)}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            setSelectedYm(m.ym);
                            await loadLRMonth(m.ym);
                            setOpenLRModal(true);
                          }}
                        >
                          Detail
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {/* TOTAL */}
                  {lrMonths.length > 0 && (
                    <tr className="border-t border-border/30 bg-muted/20">
                      <td className="py-3 px-2 text-sm font-semibold text-foreground">
                        Total
                      </td>
                      <td className="py-3 px-2 text-sm font-bold text-right text-green-700">
                        {rupiah(lrTotals.pendapatan)}
                      </td>
                      <td className="py-3 px-2 text-sm font-bold text-right text-red-700">
                        {rupiah(lrTotals.beban)}
                      </td>
                      <td
                        className={`py-3 px-2 text-sm font-bold text-right ${
                          lrTotals.laba >= 0 ? "text-green-700" : "text-red-700"
                        }`}
                      >
                        {rupiah(lrTotals.laba)}
                      </td>
                      <td className="py-3 px-2" />
                    </tr>
                  )}

                  {lrMonths.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-6 text-center text-sm text-muted-foreground"
                      >
                        Tidak ada data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Pemakaian Air (m³){" "}
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoDot label="Info Ringkasan Periode" />
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      align="start"
                      className="max-w-xs"
                    >
                      Data ini diambil dari <b>periode catat meter</b>.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </h3>
              <UsageLineChart data={usageData} />
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Total Tagihan per Bulan{" "}
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoDot label="Info Ringkasan Periode" />
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      align="start"
                      className="max-w-xs"
                    >
                      Data ini diambil dari <b>periode tagihan</b>.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </h3>
              <BillingBarChart data={billingData} />
            </GlassCard>
          </div>

          {/* Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Users */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  5 Pemakai Terbanyak
                </h3>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/laporan/pemakai-terbanyak">Selengkapnya</Link>
                </Button>
              </div>
              <div className="space-y-3">
                {topUsers.map((user, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">
                        {user.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.address}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{user.usage} m³</p>
                    </div>
                  </div>
                ))}
                {!loading && topUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Tidak ada data.
                  </p>
                )}
              </div>
            </GlassCard>

            {/* Unpaid List */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Daftar Belum Bayar (5 Tertinggi)
                </h3>
              </div>
              <div className="space-y-3">
                {unpaidList.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-red-50/50 rounded-lg border border-red-100/50"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">
                        {item.name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          {item.period}
                        </p>
                        {typeof (item as any).carry === "number" &&
                        (item as any).carry < 0 ? (
                          <span
                            title={`Sisa tagihan lalu: Rp ${Math.abs(
                              (item as any).carry
                            ).toLocaleString("id-ID")}`}
                            className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-medium"
                          >
                            Belum Lunas
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600 text-sm">
                        {rupiah(item.amount)}
                      </p>
                    </div>
                  </div>
                ))}

                {!loading && unpaidList.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Tidak ada tagihan tertunda.
                  </p>
                )}
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/laporan/piutang">Buka Halaman</Link>
                  </Button>
                </div>
              </div>
            </GlassCard>

            {/* Water Issues */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Kendala Air
                </h3>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/kendala">Selengkapnya</Link>
                </Button>
              </div>
              <div className="space-y-3">
                {waterIssues.map((issue, index) => (
                  <div
                    key={index}
                    className="p-3 bg-yellow-50/50 rounded-lg border border-yellow-100/50"
                  >
                    <p className="font-medium text-foreground text-sm mb-1">
                      {issue.issue}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {issue.date}
                      </p>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        Belum Selesai
                      </span>
                    </div>
                  </div>
                ))}
                {!loading && waterIssues.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Tidak ada kendala tercatat.
                  </p>
                )}
              </div>
            </GlassCard>
          </div>
        </div>

        {/* ===== Modal Belum Bayar ===== */}
        <Dialog open={openUnpaidModal} onOpenChange={setOpenUnpaidModal}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Daftar Belum Bayar (5 Tertinggi)</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {unpaidList.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Tidak ada tagihan tertunda.
                </p>
              ) : (
                unpaidList.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-red-50/50 rounded-lg border border-red-100/50"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">
                        {item.name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          {item.period}
                        </p>
                        {typeof (item as any).carry === "number" &&
                        (item as any).carry < 0 ? (
                          <span
                            title={`Sisa tagihan lalu: Rp ${Math.abs(
                              (item as any).carry
                            ).toLocaleString("id-ID")}`}
                            className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-medium"
                          >
                            Belum Lunas
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p className="font-bold text-red-600 text-sm">
                      {rupiah(item.amount)}
                    </p>
                  </div>
                ))
              )}
              <div className="flex justify-end pt-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setOpenUnpaidModal(false)}
                >
                  Tutup
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/laporan/piutang">Buka Halaman</Link>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ===== Modal Detail Laba–Rugi ===== */}
        <Dialog open={openLRModal} onOpenChange={setOpenLRModal}>
          <DialogContent className="w-full max-w-[95vw] sm:max-w-[90vw] lg:max-w-[1200px] p-4 sm:p-6 overflow-hidden">
            <DialogHeader>
              <DialogTitle>
                Detail Laba–Rugi {lr?.periodLabel ? `(${lr.periodLabel})` : ""}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 overflow-hidden">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm text-muted-foreground">
                  Pemasukan: <b>{lr ? rupiah(lr.pendapatanTotal) : "Rp 0"}</b> ·
                  Pengeluaran: <b>{lr ? rupiah(lr.bebanTotal) : "Rp 0"}</b> ·
                  Laba/Rugi:{" "}
                  <b
                    className={
                      (lr?.labaBersih ?? 0) >= 0
                        ? "text-green-700"
                        : "text-red-700"
                    }
                  >
                    {lr ? rupiah(lr.labaBersih) : "Rp 0"}
                  </b>
                </div>
                <Input
                  placeholder="Cari deskripsi / tanggal (YYYY-MM-DD)…"
                  value={lrSearch}
                  onChange={(e) => setLRSearch(e.target.value)}
                  className="w-full max-w-[220px] md:w-72 flex-shrink"
                />
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <div className="overflow-x-auto max-h-[70vh]">
                  <table className="w-full table-fixed">
                    <colgroup>
                      {[
                        "w-[120px]",
                        "",
                        "w-[180px] lg:w-[220px]",
                        "w-[190px] lg:w-[230px]",
                        "w-[180px] lg:w-[220px]",
                      ].map((cls, i) => (
                        <col key={i} className={cls || undefined} />
                      ))}
                    </colgroup>
                    <thead>
                      <tr className="border-b border-border/20">
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                          Tanggal
                        </th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                          Keterangan
                        </th>
                        <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                          Kredit (Biaya)
                        </th>
                        <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                          Debit (Pendapatan)
                        </th>
                        <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                          Saldo
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lrLedgerWithSaldo.map((r, i) => {
                        const d = new Date(r.tanggal as any);
                        const tgl = isNaN(+d)
                          ? "-"
                          : d.toISOString().slice(0, 10);
                        const saldo = (r as any)._saldo || 0;
                        return (
                          <tr
                            key={i}
                            className="border-b border-border/10 align-top"
                          >
                            <td className="py-3 px-2 text-sm text-foreground whitespace-nowrap">
                              {tgl}
                            </td>
                            <td className="py-3 px-2 text-sm text-foreground whitespace-normal break-words">
                              {r.keterangan}
                            </td>
                            <td className="py-3 px-2 text-sm text-right text-red-700 whitespace-nowrap">
                              {rupiah(r.debit || 0)}
                            </td>
                            <td className="py-3 px-2 text-sm text-right text-green-700 whitespace-nowrap">
                              {rupiah(r.kredit || 0)}
                            </td>
                            <td
                              className={`py-3 px-2 text-sm text-right whitespace-nowrap ${
                                saldo >= 0 ? "text-green-700" : "text-red-700"
                              }`}
                            >
                              {rupiah(saldo)}
                            </td>
                          </tr>
                        );
                      })}
                      {lrLedgerWithSaldo.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-6 text-center text-sm text-muted-foreground"
                          >
                            Tidak ada data.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden">
                <div className="space-y-3 max-h-[60vh] overflow-y-auto px-0">
                  {lrLedgerWithSaldo.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Tidak ada data.
                    </p>
                  ) : (
                    lrLedgerWithSaldo.map((r, i) => {
                      const d = new Date(r.tanggal as any);
                      const tgl = isNaN(+d)
                        ? "-"
                        : d.toISOString().slice(0, 10);
                      const saldo = (r as any)._saldo || 0;
                      const posSaldo = saldo >= 0;
                      return (
                        <div
                          key={i}
                          className="rounded-xl border border-border/40 bg-card/60 p-3 shadow-sm w-full"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-muted-foreground">
                              {tgl}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                posSaldo
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              Saldo: {rupiah(saldo)}
                            </span>
                          </div>
                          <p className="text-sm text-foreground mb-2 break-words">
                            {r.keterangan}
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-lg bg-red-50/60 border border-red-100/60 p-2">
                              <div className="text-[10px] text-muted-foreground">
                                Kredit (Biaya)
                              </div>
                              <div className="text-sm font-semibold text-red-700">
                                {rupiah(r.debit || 0)}
                              </div>
                            </div>
                            <div className="rounded-lg bg-green-50/60 border border-green-100/60 p-2">
                              <div className="text-[10px] text-muted-foreground">
                                Debit (Pendapatan)
                              </div>
                              <div className="text-sm font-semibold text-green-700">
                                {rupiah(r.kredit || 0)}
                              </div>
                            </div>
                            <div className="rounded-lg bg-muted/40 border border-border/40 p-2">
                              <div className="text-[10px] text-muted-foreground">
                                Saldo
                              </div>
                              <div
                                className={`text-sm font-semibold ${
                                  posSaldo ? "text-green-700" : "text-red-700"
                                }`}
                              >
                                {rupiah(saldo)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setOpenLRModal(false)}>
                  Tutup
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </AppShell>
    </AuthGuard>
  );
}

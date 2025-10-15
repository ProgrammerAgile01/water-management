"use client";

import { useEffect, useMemo, useState } from "react";
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

  const year = useMemo(() => new Date().getFullYear(), []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/dashboard?year=${year}`, {
          cache: "no-store",
        });
        const data = await res.json();
        setUsageData(data.usageData ?? []);
        setBillingData(data.billingData ?? []);
        setTableData(data.tableData ?? []);
        setTopUsers(data.topUsers ?? []);
        setUnpaidList(data.unpaidList ?? []);
        setWaterIssues(data.waterIssues ?? []);
        setCards(data.statCards ?? null);
      } catch (e) {
        console.error(e);
        setUsageData([]);
        setBillingData([]);
        setTableData([]);
        setTopUsers([]);
        setUnpaidList([]);
        setWaterIssues([]);
        setCards(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [year]);

  const rupiah = (n: number) => "Rp " + Number(n || 0).toLocaleString("id-ID");

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

            {/* ==== Total Belum Bayar + tombol 'Selengkapnya' DI DALAM card ==== */}
            <div className="relative">
              <StatCard
                title="Total Belum Bayar"
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
              {/* tombol kecil ditempatkan di pojok kanan atas di DALAM kartu */}
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

            <StatCard
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
            />
          </div>

          {/* Data Table */}
          <DataTable title="Ringkasan Periode Tagihan" data={tableData} />

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

                        {/* BADGE: Belum Lunas jika carry < 0 (sesuai kebijakanmu) */}
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

        {/* ===== Modal Daftar Belum Bayar (dibuka dari tombol di card) ===== */}
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

                        {/* BADGE: Belum Lunas jika carry < 0 */}
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
      </AppShell>
    </AuthGuard>
  );
}

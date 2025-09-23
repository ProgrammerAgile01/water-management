// app/dashboard-warga/page.tsx
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TirtaLogo } from "@/components/tirta-logo";
import { useWaterIssuesStore } from "@/lib/water-issues-store";
import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import {
  DropletIcon,
  CreditCard,
  AlertTriangle,
  Phone,
  LogOut,
  Calendar,
  TrendingUp,
  CheckCircle,
  Clock,
} from "lucide-react";

type DashboardResp = {
  ok: boolean;
  data?: {
    resident: {
      customerId: string;
      name: string;
      address: string;
      phone: string;
    };
    currentUsage: {
      period: string;
      meterAwal: number;
      meterAkhir: number;
      pemakaian: number;
      totalTagihan: number;
      status: "lunas" | "belum_bayar";
      jatuhTempo: string | null;
    } | null;
    yearlyUsage: Array<{
      month: string;
      usage: number;
      bill: number;
      status: "paid" | "unpaid" | "pending";
    }>;
    paymentHistory: Array<{
      id: string;
      period: string; // "YYYY-MM"
      amount: number;
      paymentDate: string; // "YYYY-MM-DD"
      status: "lunas";
      method: string;
    }>;
  };
  message?: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function WargaDashboardPage() {
  const { getIssuesByCustomer } = useWaterIssuesStore();
  const [customerIssues, setCustomerIssues] = useState<any[]>([]);

  // Ambil data dari API – user diidentifikasi via cookie (getAuthUserId)
  const { data, isLoading, error } = useSWR<DashboardResp>(
    "/api/warga/dashboard",
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  const resident = data?.data?.resident;
  const current = data?.data?.currentUsage ?? null;
  const yearly = data?.data?.yearlyUsage ?? [];
  const payments = data?.data?.paymentHistory ?? [];

  // Issues lokal, tapi kunci sesuai customerId yang diambil dari API
  useEffect(() => {
    if (resident?.customerId) {
      setCustomerIssues(getIssuesByCustomer(resident.customerId));
    } else {
      setCustomerIssues([]);
    }
  }, [resident?.customerId, getIssuesByCustomer]);

  const handleLogout = () => {
    // kalau kamu sudah punya endpoint logout, panggil di sini
    // sementara cukup clear local item & reload
    try {
      localStorage.removeItem("tb_user");
    } catch {}
    window.location.href = "/";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "lunas":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Lunas
          </Badge>
        );
      case "belum_bayar":
        return <Badge variant="destructive">Belum Bayar</Badge>;
      case "pending":
        return <Badge variant="outline">Belum Ada Data</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getIssueStatusBadge = (status: string) =>
    status === "solved" ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        <CheckCircle className="w-3 h-3 mr-1" />
        Selesai
      </Badge>
    ) : (
      <Badge variant="secondary">
        <Clock className="w-3 h-3 mr-1" />
        Dalam Proses
      </Badge>
    );

  const avgUsage = useMemo(() => {
    const used = yearly.filter((m) => m.usage > 0).map((m) => m.usage);
    return used.length
      ? Math.round(used.reduce((a, b) => a + b, 0) / used.length)
      : 0;
  }, [yearly]);

  const totalPaidThisYear = useMemo(() => {
    return yearly
      .filter((m) => m.status === "paid")
      .reduce((s, m) => s + (m.bill || 0), 0);
  }, [yearly]);

  return (
    <AuthGuard requiredRole="WARGA">
      <AppShell>
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <TirtaLogo size="md" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Dashboard Warga
                </h1>
                <p className="text-muted-foreground">
                  {isLoading
                    ? "Memuat…"
                    : resident
                    ? `Selamat datang, ${resident.name}`
                    : "Tidak ada data"}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="bg-transparent"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Keluar
            </Button>
          </div>

          {/* Error */}
          {error && (
            <GlassCard className="p-6">
              <p className="text-destructive">Gagal memuat data dashboard.</p>
            </GlassCard>
          )}

          {/* Customer Info */}
          {!error && resident && (
            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Informasi Pelanggan
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Kode Pelanggan
                  </p>
                  <p className="font-medium text-primary">
                    {resident.customerId}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nama</p>
                  <p className="font-medium text-foreground">{resident.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Alamat</p>
                  <p className="font-medium text-foreground">
                    {resident.address}
                  </p>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Current Bill
          {!error && (
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">
                  Tagihan Terkini
                </h2>
                {current
                  ? getStatusBadge(current.status)
                  : getStatusBadge("pending")}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-4 bg-primary/10 rounded-lg">
                  <DropletIcon className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-primary">
                    {current?.pemakaian ?? 0} m³
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Pemakaian {current?.period ?? "-"}
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50/50 rounded-lg">
                  <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-lg font-bold text-blue-600">
                    {current?.jatuhTempo ?? "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">Jatuh Tempo</p>
                </div>
                <div className="text-center p-4 bg-green-50/50 rounded-lg">
                  <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">
                    {avgUsage} m³
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Rata-rata/Bulan
                  </p>
                </div>
                <div className="text-center p-4 bg-red-50/50 rounded-lg">
                  <CreditCard className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-600">
                    Rp {(current?.totalTagihan ?? 0).toLocaleString("id-ID")}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Tagihan</p>
                </div>
              </div>

              <div className="bg-muted/20 p-4 rounded-lg">
                <h3 className="font-medium text-foreground mb-2">
                  Detail Pemakaian {current?.period ?? "-"}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Meter Awal</p>
                    <p className="font-medium">{current?.meterAwal ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Meter Akhir</p>
                    <p className="font-medium">{current?.meterAkhir ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pemakaian</p>
                    <p className="font-medium text-primary">
                      {current?.pemakaian ?? 0} m³
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    {current
                      ? getStatusBadge(current.status)
                      : getStatusBadge("pending")}
                  </div>
                </div>
              </div>
            </GlassCard>
          )} */}
          {/* Current Bill */}
          {!error && (
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">
                  Tagihan Terkini
                </h2>
                {current ? getStatusBadge(current.status) : null}
              </div>

              {current ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {/* Pemakaian */}
                    <div className="text-center p-4 bg-primary/10 rounded-lg">
                      <DropletIcon className="w-8 h-8 text-primary mx-auto mb-2" />
                      <p className="text-2xl font-bold text-primary">
                        {current.pemakaian} m³
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Pemakaian {current.period}
                      </p>
                    </div>

                    {/* Jatuh Tempo */}
                    <div className="text-center p-4 bg-blue-50/50 rounded-lg">
                      <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-lg font-bold text-blue-600">
                        {current.jatuhTempo ?? "-"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Jatuh Tempo
                      </p>
                    </div>

                    {/* Rata-rata/Bulan */}
                    <div className="text-center p-4 bg-green-50/50 rounded-lg">
                      <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-green-600">
                        {avgUsage} m³
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Rata-rata/Bulan
                      </p>
                    </div>

                    {/* Total Tagihan */}
                    <div className="text-center p-4 bg-red-50/50 rounded-lg">
                      <CreditCard className="w-8 h-8 text-red-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-red-600">
                        Rp {current.totalTagihan.toLocaleString("id-ID")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Total Tagihan
                      </p>
                    </div>
                  </div>

                  {/* Detail */}
                  <div className="bg-muted/20 p-4 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">
                      Detail Pemakaian {current.period}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Meter Awal</p>
                        <p className="font-medium">{current.meterAwal}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Meter Akhir</p>
                        <p className="font-medium">{current.meterAkhir}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Pemakaian</p>
                        <p className="font-medium text-primary">
                          {current.pemakaian} m³
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        {getStatusBadge(current.status)}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-4 rounded-lg bg-muted/20 text-muted-foreground text-center">
                  Belum ada tagihan terbaru.
                </div>
              )}
            </GlassCard>
          )}

          {/* Yearly Usage */}
          {!error && (
            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Pemakaian Meteran Tahun Ini
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {yearly.map((m, i) => (
                  <div
                    key={i}
                    className="text-center p-3 bg-muted/20 rounded-lg"
                  >
                    <p className="text-sm font-medium text-foreground mb-1">
                      {m.month}
                    </p>
                    <p className="text-lg font-bold text-primary">
                      {m.usage || "-"} m³
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.bill > 0
                        ? `Rp ${m.bill.toLocaleString("id-ID")}`
                        : "-"}
                    </p>
                    <div className="mt-1">
                      {getStatusBadge(m.status === "paid" ? "lunas" : m.status)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-primary/5 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Total dibayar tahun ini:{" "}
                  <span className="font-bold text-primary">
                    Rp {totalPaidThisYear.toLocaleString("id-ID")}
                  </span>
                </p>
              </div>
            </GlassCard>
          )}

          {/* Payment History */}
          {!error && (
            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Histori Pembayaran
              </h2>
              <div className="space-y-3">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-foreground">{p.period}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(p.paymentDate).toLocaleDateString("id-ID")} •{" "}
                        {p.method}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">
                        Rp {p.amount.toLocaleString("id-ID")}
                      </p>
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        Lunas
                      </Badge>
                    </div>
                  </div>
                ))}
                {payments.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Belum ada pembayaran.
                  </p>
                )}
              </div>
            </GlassCard>
          )}

          {/* Water Issues (local store) */}
          {!error && (
            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Histori Kendala Air
              </h2>
              {customerIssues.length > 0 ? (
                <div className="space-y-3">
                  {customerIssues.map((issue) => (
                    <div key={issue.id} className="p-3 bg-muted/20 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-foreground">
                            {issue.issue}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {issue.description}
                          </p>
                        </div>
                        {getIssueStatusBadge(issue.status)}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <p className="text-muted-foreground">
                          Dilaporkan: {issue.date}
                        </p>
                        {issue.status === "solved" && issue.solvedDate && (
                          <p className="text-green-600">
                            Diselesaikan: {issue.solvedDate}
                          </p>
                        )}
                      </div>
                      {issue.status === "solved" && issue.solution && (
                        <div className="mt-2 p-2 bg-green-50/50 rounded border border-green-100/50">
                          <p className="text-sm text-green-800">
                            <strong>Solusi:</strong> {issue.solution}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Tidak ada kendala yang dilaporkan
                  </p>
                </div>
              )}
            </GlassCard>
          )}
        </div>
      </AppShell>
    </AuthGuard>
  );
}

import { AuthGuard } from "@/components/auth-guard"
import { AppShell } from "@/components/app-shell"
import { GlassCard } from "@/components/glass-card"
import { StatCard } from "@/components/stat-card"
import { DataTable } from "@/components/data-table"
import { UsageLineChart } from "@/components/charts/line-chart"
import { BillingBarChart } from "@/components/charts/bar-chart"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AppHeader } from "@/components/app-header"

// Mock data
const usageData = [
  { month: "Jan", usage: 1250 },
  { month: "Feb", usage: 1180 },
  { month: "Mar", usage: 1320 },
  { month: "Apr", usage: 1450 },
  { month: "Mei", usage: 1380 },
  { month: "Jun", usage: 1520 },
  { month: "Jul", usage: 1480 },
  { month: "Agu", usage: 1600 },
  { month: "Sep", usage: 1550 },
  { month: "Okt", usage: 1420 },
  { month: "Nov", usage: 1380 },
  { month: "Des", usage: 1450 },
]

const billingData = [
  { month: "Jan", amount: 2500000 },
  { month: "Feb", amount: 2300000 },
  { month: "Mar", amount: 2800000 },
  { month: "Apr", amount: 3100000 },
  { month: "Mei", amount: 2900000 },
  { month: "Jun", amount: 3200000 },
  { month: "Jul", amount: 3000000 },
  { month: "Agu", amount: 3400000 },
  { month: "Sep", amount: 3300000 },
  { month: "Okt", amount: 3000000 },
  { month: "Nov", amount: 2800000 },
  { month: "Des", amount: 3100000 },
]

const tableData = [
  {
    id: "1",
    periode: "Januari 2024",
    totalM3: 1250,
    tagihan: 2500000,
    sudahBayar: 2200000,
    belumBayar: 300000,
    status: "partial" as const,
  },
  {
    id: "2",
    periode: "Februari 2024",
    totalM3: 1180,
    tagihan: 2300000,
    sudahBayar: 2300000,
    belumBayar: 0,
    status: "paid" as const,
  },
  {
    id: "3",
    periode: "Maret 2024",
    totalM3: 1320,
    tagihan: 2800000,
    sudahBayar: 0,
    belumBayar: 2800000,
    status: "unpaid" as const,
  },
  {
    id: "4",
    periode: "April 2024",
    totalM3: 1450,
    tagihan: 3100000,
    sudahBayar: 3100000,
    belumBayar: 0,
    status: "paid" as const,
  },
  {
    id: "5",
    periode: "Mei 2024",
    totalM3: 1380,
    tagihan: 2900000,
    sudahBayar: 1500000,
    belumBayar: 1400000,
    status: "partial" as const,
  },
]

const topUsers = [
  { name: "Budi Santoso", usage: 45, address: "Jl. Merdeka No. 12" },
  { name: "Siti Aminah", usage: 42, address: "Jl. Sudirman No. 8" },
  { name: "Ahmad Rahman", usage: 38, address: "Jl. Diponegoro No. 15" },
  { name: "Dewi Sartika", usage: 35, address: "Jl. Kartini No. 22" },
  { name: "Joko Widodo", usage: 33, address: "Jl. Pahlawan No. 5" },
]

const unpaidList = [
  { name: "Andi Wijaya", amount: 150000, period: "Jan 2024" },
  { name: "Maya Sari", amount: 200000, period: "Feb 2024" },
  { name: "Rudi Hartono", amount: 175000, period: "Jan 2024" },
  { name: "Linda Kusuma", amount: 225000, period: "Mar 2024" },
]

const waterIssues = [
  { issue: "Pipa bocor di Jl. Merdeka", status: "unresolved", date: "2024-01-15" },
  { issue: "Tekanan air rendah di RT 05", status: "unresolved", date: "2024-01-18" },
  { issue: "Meter rusak - Budi Santoso", status: "unresolved", date: "2024-01-20" },
]

export default function DashboardPage() {
  return (
    <AuthGuard>
      <AppShell>
        <div className="max-w-7xl mx-auto space-y-6">
          <AppHeader title="Dashboard" showBackButton={false} showBreadcrumb={false} />

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Tagihan Bulan Ini"
              value="Rp 3.1M"
              subtitle="156 pelanggan"
              trend={{ value: 12, isPositive: true }}
              icon={
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              }
            />

            <StatCard
              title="Total Belum Bayar"
              value="Rp 750K"
              subtitle="23 pelanggan"
              trend={{ value: 5, isPositive: false }}
              icon={
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              }
            />

            <StatCard
              title="Jumlah Pengguna Aktif"
              value="156"
              subtitle="Total pelanggan"
              trend={{ value: 3, isPositive: true }}
              icon={
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              }
            />

            <StatCard
              title="Tingkat Pembayaran"
              value="89%"
              subtitle="Sudah bayar"
              trend={{ value: 2, isPositive: true }}
              icon={
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />
          </div>

          {/* Data Table */}
          <DataTable title="Ringkasan Periode" data={tableData} />

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Pemakaian Air (m³)</h3>
              <UsageLineChart data={usageData} />
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Total Tagihan per Bulan</h3>
              <BillingBarChart data={billingData} />
            </GlassCard>
          </div>

          {/* Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Users */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">5 Pemakai Terbanyak</h3>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/laporan/pemakai-terbanyak">Selengkapnya</Link>
                </Button>
              </div>
              <div className="space-y-3">
                {topUsers.map((user, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.address}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{user.usage} m³</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Unpaid List */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Daftar Belum Bayar</h3>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/laporan/belum-bayar">Selengkapnya</Link>
                </Button>
              </div>
              <div className="space-y-3">
                {unpaidList.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-red-50/50 rounded-lg border border-red-100/50"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.period}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600 text-sm">Rp {item.amount.toLocaleString("id-ID")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Water Issues */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Kendala Air</h3>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/kendala">Selengkapnya</Link>
                </Button>
              </div>
              <div className="space-y-3">
                {waterIssues.map((issue, index) => (
                  <div key={index} className="p-3 bg-yellow-50/50 rounded-lg border border-yellow-100/50">
                    <p className="font-medium text-foreground text-sm mb-1">{issue.issue}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{issue.date}</p>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        Belum Selesai
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Quick Actions */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Menu Utama</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button asChild variant="outline" className="h-20 flex-col gap-2 bg-transparent">
                <Link href="/pelanggan">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span className="text-sm">Pelanggan</span>
                </Link>
              </Button>

              <Button asChild variant="outline" className="h-20 flex-col gap-2 bg-transparent">
                <Link href="/catat-meter">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                  <span className="text-sm">Catat Meter</span>
                </Link>
              </Button>

              <Button asChild variant="outline" className="h-20 flex-col gap-2 bg-transparent">
                <Link href="/pelunasan">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                  <span className="text-sm">Pelunasan</span>
                </Link>
              </Button>

              <Button asChild variant="outline" className="h-20 flex-col gap-2 bg-transparent">
                <Link href="/pengaturan">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c.426 1.756 2.924 1.756 0 3.35a1.724 1.724 0 00-1.066 2.573c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                  </svg>
                  <span className="text-sm">Pengaturan</span>
                </Link>
              </Button>
            </div>
          </GlassCard>
        </div>
      </AppShell>
    </AuthGuard>
  )
}

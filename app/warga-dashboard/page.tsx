"use client"

import { AuthGuard } from "@/components/auth-guard"
import { AppShell } from "@/components/app-shell"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useWaterIssuesStore } from "@/lib/water-issues-store"
import { useState, useEffect } from "react"
import { TirtaLogo } from "@/components/tirta-logo"
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
} from "lucide-react"

// Mock data for resident - in real app, this would come from API based on logged-in user
const mockResidentData = {
  customerId: "TB240001",
  name: "Budi Santoso",
  address: "Jl. Merdeka No. 12",
  phone: "081234567890",
  currentUsage: {
    period: "Agustus 2025",
    meterAwal: 1075,
    meterAkhir: 1120,
    pemakaian: 45,
    totalTagihan: 122500,
    status: "belum_bayar" as const,
    jatuhTempo: "2025-09-09",
  },
  yearlyUsage: [
    { month: "Jan", usage: 38, bill: 105000, status: "paid" },
    { month: "Feb", usage: 42, bill: 115000, status: "paid" },
    { month: "Mar", usage: 35, bill: 97500, status: "paid" },
    { month: "Apr", usage: 40, bill: 110000, status: "paid" },
    { month: "Mei", usage: 44, bill: 120000, status: "paid" },
    { month: "Jun", usage: 39, bill: 107500, status: "paid" },
    { month: "Jul", usage: 41, bill: 112500, status: "paid" },
    { month: "Agu", usage: 45, bill: 122500, status: "unpaid" },
    { month: "Sep", usage: 0, bill: 0, status: "pending" },
    { month: "Okt", usage: 0, bill: 0, status: "pending" },
    { month: "Nov", usage: 0, bill: 0, status: "pending" },
    { month: "Des", usage: 0, bill: 0, status: "pending" },
  ],
  paymentHistory: [
    {
      id: "1",
      period: "Juli 2025",
      amount: 112500,
      paymentDate: "2025-08-05",
      status: "lunas" as const,
      method: "Transfer Bank",
    },
    {
      id: "2",
      period: "Juni 2025",
      amount: 107500,
      paymentDate: "2025-07-08",
      status: "lunas" as const,
      method: "Tunai",
    },
    {
      id: "3",
      period: "Mei 2025",
      amount: 120000,
      paymentDate: "2025-06-10",
      status: "lunas" as const,
      method: "E-Wallet",
    },
    {
      id: "4",
      period: "April 2025",
      amount: 110000,
      paymentDate: "2025-05-07",
      status: "lunas" as const,
      method: "Transfer Bank",
    },
  ],
}

export default function WargaDashboardPage() {
  const [user, setUser] = useState<any>(null)
  const { getIssuesByCustomer } = useWaterIssuesStore()
  const [customerIssues, setCustomerIssues] = useState<any[]>([])

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem("tb_user")
    if (userData) {
      setUser(JSON.parse(userData))
    }

    // Get customer issues
    const issues = getIssuesByCustomer(mockResidentData.customerId)
    setCustomerIssues(issues)
  }, [getIssuesByCustomer])

  const handleLogout = () => {
    localStorage.removeItem("user")
    window.location.href = "/"
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "lunas":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Lunas</Badge>
      case "belum_bayar":
        return <Badge variant="destructive">Belum Bayar</Badge>
      case "pending":
        return <Badge variant="outline">Belum Ada Data</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getIssueStatusBadge = (status: string) => {
    return status === "solved" ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        <CheckCircle className="w-3 h-3 mr-1" />
        Selesai
      </Badge>
    ) : (
      <Badge variant="secondary">
        <Clock className="w-3 h-3 mr-1" />
        Dalam Proses
      </Badge>
    )
  }

  const totalPaidThisYear = mockResidentData.yearlyUsage
    .filter((m) => m.status === "paid")
    .reduce((sum, m) => sum + m.bill, 0)

  const averageUsage = Math.round(
    mockResidentData.yearlyUsage.filter((m) => m.usage > 0).reduce((sum, m) => sum + m.usage, 0) /
      mockResidentData.yearlyUsage.filter((m) => m.usage > 0).length,
  )

  return (
    <AuthGuard requiredRole="WARGA">
      <AppShell>
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <TirtaLogo size="md" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Dashboard Warga</h1>
                <p className="text-muted-foreground">Selamat datang, {mockResidentData.name}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} className="bg-transparent">
              <LogOut className="w-4 h-4 mr-2" />
              Keluar
            </Button>
          </div>

          {/* Customer Info */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Informasi Pelanggan</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Kode Pelanggan</p>
                <p className="font-medium text-primary">{mockResidentData.customerId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nama</p>
                <p className="font-medium text-foreground">{mockResidentData.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Alamat</p>
                <p className="font-medium text-foreground">{mockResidentData.address}</p>
              </div>
            </div>
          </GlassCard>

          {/* Current Bill */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Tagihan Terkini</h2>
              {getStatusBadge(mockResidentData.currentUsage.status)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <DropletIcon className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-primary">{mockResidentData.currentUsage.pemakaian} m³</p>
                <p className="text-sm text-muted-foreground">Pemakaian {mockResidentData.currentUsage.period}</p>
              </div>
              <div className="text-center p-4 bg-blue-50/50 rounded-lg">
                <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-lg font-bold text-blue-600">{mockResidentData.currentUsage.jatuhTempo}</p>
                <p className="text-sm text-muted-foreground">Jatuh Tempo</p>
              </div>
              <div className="text-center p-4 bg-green-50/50 rounded-lg">
                <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{averageUsage} m³</p>
                <p className="text-sm text-muted-foreground">Rata-rata/Bulan</p>
              </div>
              <div className="text-center p-4 bg-red-50/50 rounded-lg">
                <CreditCard className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">
                  Rp {mockResidentData.currentUsage.totalTagihan.toLocaleString("id-ID")}
                </p>
                <p className="text-sm text-muted-foreground">Total Tagihan</p>
              </div>
            </div>

            <div className="bg-muted/20 p-4 rounded-lg">
              <h3 className="font-medium text-foreground mb-2">
                Detail Pemakaian {mockResidentData.currentUsage.period}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Meter Awal</p>
                  <p className="font-medium">{mockResidentData.currentUsage.meterAwal}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Meter Akhir</p>
                  <p className="font-medium">{mockResidentData.currentUsage.meterAkhir}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pemakaian</p>
                  <p className="font-medium text-primary">{mockResidentData.currentUsage.pemakaian} m³</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  {getStatusBadge(mockResidentData.currentUsage.status)}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Yearly Usage Chart */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Pemakaian Meteran 2025</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {mockResidentData.yearlyUsage.map((month, index) => (
                <div key={index} className="text-center p-3 bg-muted/20 rounded-lg">
                  <p className="text-sm font-medium text-foreground mb-1">{month.month}</p>
                  <p className="text-lg font-bold text-primary">{month.usage || "-"} m³</p>
                  <p className="text-xs text-muted-foreground">
                    {month.bill > 0 ? `Rp ${month.bill.toLocaleString("id-ID")}` : "-"}
                  </p>
                  <div className="mt-1">{getStatusBadge(month.status)}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 bg-primary/5 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Total dibayar tahun ini:{" "}
                <span className="font-bold text-primary">Rp {totalPaidThisYear.toLocaleString("id-ID")}</span>
              </p>
            </div>
          </GlassCard>

          {/* Payment History */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Histori Pembayaran</h2>
            <div className="space-y-3">
              {mockResidentData.paymentHistory.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{payment.period}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(payment.paymentDate).toLocaleDateString("id-ID")} • {payment.method}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">Rp {payment.amount.toLocaleString("id-ID")}</p>
                    {getStatusBadge(payment.status)}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Water Issues */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Histori Kendala Air</h2>
            {customerIssues.length > 0 ? (
              <div className="space-y-3">
                {customerIssues.map((issue) => (
                  <div key={issue.id} className="p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-foreground">{issue.issue}</p>
                        <p className="text-sm text-muted-foreground">{issue.description}</p>
                      </div>
                      {getIssueStatusBadge(issue.status)}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <p className="text-muted-foreground">Dilaporkan: {issue.date}</p>
                      {issue.status === "solved" && issue.solvedDate && (
                        <p className="text-green-600">Diselesaikan: {issue.solvedDate}</p>
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
                <p className="text-muted-foreground">Tidak ada kendala yang dilaporkan</p>
              </div>
            )}
          </GlassCard>

          {/* Contact Admin */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Kontak Admin</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/20 rounded-lg">
                <h3 className="font-medium text-foreground mb-2">Customer Service</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Untuk pertanyaan umum, keluhan, atau bantuan teknis
                </p>
                <Button
                  className="w-full"
                  onClick={() =>
                    window.open("https://wa.me/6281234567890?text=Halo, saya memerlukan bantuan terkait layanan air.")
                  }
                >
                  <Phone className="w-4 h-4 mr-2" />
                  WhatsApp CS
                </Button>
              </div>
              <div className="p-4 bg-muted/20 rounded-lg">
                <h3 className="font-medium text-foreground mb-2">Lapor Kendala</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Laporkan masalah air, pipa bocor, atau kendala lainnya
                </p>
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() =>
                    window.open(
                      `https://wa.me/6281234567890?text=Halo, saya ${mockResidentData.name} (${mockResidentData.customerId}) ingin melaporkan kendala air di ${mockResidentData.address}.`,
                    )
                  }
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Lapor Kendala
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>
      </AppShell>
    </AuthGuard>
  )
}

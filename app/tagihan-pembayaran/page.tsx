"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  RefreshCw,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppHeader } from "@/components/app-header";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { BillingTable } from "@/components/billing-table";
import { BillingFilters } from "@/components/billing-filters";
import { useBillingStore } from "@/lib/billing-store";
import { useToast } from "@/hooks/use-toast";

export default function TagihanPembayaranPage() {
  const { refreshData, isLoading } = useBillingStore();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // load data saat halaman dibuka
  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      toast({
        title: "Berhasil",
        description: "Data tagihan berhasil diperbarui.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Gagal memuat data tagihan.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExport = (format: "excel" | "pdf") => {
    toast({
      title: "Export",
      description: `Mengunduh data dalam format ${format.toUpperCase()}...`,
    });
    // hookup ke endpoint export kalau sudah ada
  };

  return (
    <div className="space-y-6">
      <AuthGuard requiredRole="ADMIN">
        <AppShell className="space-y-6">
          <AppHeader title="Tagihan & Pembayaran" />

          {/* Header Section */}
          <GlassCard className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    Tagihan & Pembayaran
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Kelola tagihan air, upload bukti transfer, dan verifikasi
                    pembayaran.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing || isLoading}
                  className="bg-white/50 border-white/20 hover:bg-white/70"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${
                      isRefreshing ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="bg-white/95 backdrop-blur-md border-white/20"
                  >
                    <DropdownMenuItem
                      onClick={() => handleExport("excel")}
                      className="cursor-pointer"
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleExport("pdf")}
                      className="cursor-pointer"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Export PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </GlassCard>

          {/* Filters */}
          <BillingFilters />

          {/* Billing Table */}
          <BillingTable />
        </AppShell>
      </AuthGuard>
    </div>
  );
}

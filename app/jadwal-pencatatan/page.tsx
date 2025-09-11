// app/jadwal-pencatatan/page.tsx
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
import { ScheduleFilters } from "@/components/schedule-filters";
import { ScheduleTable } from "@/components/schedule-table";
import { useScheduleStore } from "@/lib/schedule-store";
import { useToast } from "@/hooks/use-toast";
import { ScheduleGenerateBar } from "@/components/schedule-generate-bar";

export default function JadwalPencatatanPage() {
  const {
    schedules,
    isLoading,
    getFilteredSchedules,
    refreshSchedules,
    filters,
  } = useScheduleStore();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await refreshSchedules();
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.month,
    filters.zonaId,
    filters.petugasId,
    filters.status,
    filters.search,
    refreshSchedules,
  ]);

  const filteredSchedules = getFilteredSchedules();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshSchedules();
      toast({
        title: "Berhasil",
        description: "Data jadwal berhasil diperbarui",
      });
    } catch {
      toast({
        title: "Error",
        description: "Gagal memperbarui data jadwal",
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
  };

  return (
    <AuthGuard>
      <AppShell>
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
          <div className="container mx-auto px-4 py-6">
            <AppHeader title="Jadwal Pencatatan" />

            {/* Header Section */}
            <GlassCard className="p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/20 rounded-lg">
                    <CalendarDays className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">
                      Jadwal Pencatatan
                    </h1>
                    <p className="text-muted-foreground">
                      Kelola jadwal bulanan, status, dan aksi catat meter
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
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
                      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
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
            <ScheduleFilters />

            {/* Generate Bar */}
            <ScheduleGenerateBar />

            {/* Content */}
            <ScheduleTable
              schedules={filteredSchedules}
              isLoading={isLoading}
            />
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}

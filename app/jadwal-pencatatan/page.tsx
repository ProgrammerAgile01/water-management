// // app/jadwal-pencatatan/page.tsx
// "use client";

// import { useEffect, useState } from "react";
// import {
//   CalendarDays,
//   RefreshCw,
//   Download,
//   FileSpreadsheet,
//   FileText,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { AppHeader } from "@/components/app-header";
// import { AuthGuard } from "@/components/auth-guard";
// import { AppShell } from "@/components/app-shell";
// import { GlassCard } from "@/components/glass-card";
// import { ScheduleFilters } from "@/components/schedule-filters";
// import { ScheduleTable } from "@/components/schedule-table";
// import { useScheduleStore } from "@/lib/schedule-store";
// import { useToast } from "@/hooks/use-toast";
// import { ScheduleGenerateBar } from "@/components/schedule-generate-bar";

// export default function JadwalPencatatanPage() {
//   const { isLoading, getFilteredSchedules, refreshSchedules, filters } =
//     useScheduleStore();
//   const { toast } = useToast();
//   const [isRefreshing, setIsRefreshing] = useState(false);

//   // 1) Ambil data saat mount & setiap filter berubah
//   useEffect(() => {
//     refreshSchedules().catch(() => {});
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [
//     filters.month,
//     filters.zonaId,
//     filters.petugasId,
//     filters.status,
//     filters.search,
//   ]);

//   // 2) Dengarkan event global dari halaman Catat Meter agar jadwal auto-refresh
//   useEffect(() => {
//     const onRefresh = () => refreshSchedules().catch(() => {});
//     window.addEventListener("jadwal:refresh", onRefresh);

//     // 3) Saat user balik ke tab ini, perbarui juga (mis. selesai catat di tab lain)
//     const onVisible = () => {
//       if (document.visibilityState === "visible") {
//         refreshSchedules().catch(() => {});
//       }
//     };
//     document.addEventListener("visibilitychange", onVisible);

//     return () => {
//       window.removeEventListener("jadwal:refresh", onRefresh);
//       document.removeEventListener("visibilitychange", onVisible);
//     };
//   }, [refreshSchedules]);

//   const filteredSchedules = getFilteredSchedules();

//   const handleRefresh = async () => {
//     setIsRefreshing(true);
//     try {
//       await refreshSchedules();
//       toast({
//         title: "Berhasil",
//         description: "Data jadwal berhasil diperbarui",
//       });
//     } catch {
//       toast({
//         title: "Error",
//         description: "Gagal memperbarui data jadwal",
//         variant: "destructive",
//       });
//     } finally {
//       setIsRefreshing(false);
//     }
//   };

//   const handleExport = (format: "excel" | "pdf") => {
//     toast({
//       title: "Export",
//       description: `Mengunduh data dalam format ${format.toUpperCase()}...`,
//     });
//   };

//   return (
//     <AuthGuard requiredRole={["ADMIN", "PETUGAS"]}>
//       <AppShell>
//         <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
//           <div className="container mx-auto px-4 py-6">
//             <AppHeader title="Jadwal Pencatatan" />

//             {/* Header Section */}
//             <GlassCard className="p-6 mb-6">
//               <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
//                 <div className="flex items-start gap-4">
//                   <div className="p-3 bg-primary/20 rounded-lg">
//                     <CalendarDays className="h-8 w-8 text-primary" />
//                   </div>
//                   <div>
//                     <h1 className="text-3xl font-bold text-foreground mb-2">
//                       Jadwal Pencatatan
//                     </h1>
//                     <p className="text-muted-foreground">
//                       Kelola jadwal bulanan, status, dan aksi catat meter
//                     </p>
//                   </div>
//                 </div>

//                 <div className="flex items-center gap-2">
//                   <Button
//                     variant="outline"
//                     onClick={handleRefresh}
//                     disabled={isRefreshing}
//                     className="bg-white/50 border-white/20 hover:bg-white/70"
//                   >
//                     <RefreshCw
//                       className={`h-4 w-4 mr-2 ${
//                         isRefreshing ? "animate-spin" : ""
//                       }`}
//                     />
//                     Refresh
//                   </Button>

//                   <DropdownMenu>
//                     <DropdownMenuTrigger asChild>
//                       <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
//                         <Download className="h-4 w-4 mr-2" />
//                         Export
//                       </Button>
//                     </DropdownMenuTrigger>
//                     <DropdownMenuContent
//                       align="end"
//                       className="bg-white/95 backdrop-blur-md border-white/20"
//                     >
//                       <DropdownMenuItem
//                         onClick={() => handleExport("excel")}
//                         className="cursor-pointer"
//                       >
//                         <FileSpreadsheet className="h-4 w-4 mr-2" />
//                         Export Excel
//                       </DropdownMenuItem>
//                       <DropdownMenuItem
//                         onClick={() => handleExport("pdf")}
//                         className="cursor-pointer"
//                       >
//                         <FileText className="h-4 w-4 mr-2" />
//                         Export PDF
//                       </DropdownMenuItem>
//                     </DropdownMenuContent>
//                   </DropdownMenu>
//                 </div>
//               </div>
//             </GlassCard>

//             {/* Filters */}
//             <ScheduleFilters />

//             {/* Generate Bar */}
//             <ScheduleGenerateBar />

//             {/* Content */}
//             <ScheduleTable
//               schedules={filteredSchedules}
//               isLoading={isLoading}
//             />
//           </div>
//         </div>
//       </AppShell>
//     </AuthGuard>
//   );
// }

// app/jadwal-pencatatan/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  RefreshCw,
  Download,
  FileSpreadsheet,
  FileText,
  Info,
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

// Tooltip (desktop) + Dialog (mobile)
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ========= Helper Tooltip: desktop=Tooltip, mobile=Dialog ========= */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return isMobile;
}

function InfoTip({
  ariaLabel,
  children,
  open,
  onOpenChange,
  className = "",
}: {
  ariaLabel: string;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  className?: string;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          aria-label={ariaLabel}
          className={`inline-flex items-center justify-center rounded-full p-1.5 hover:bg-muted/50 ${className}`}
          onClick={() => onOpenChange?.(true)}
        >
          <Info className="h-4 w-4 opacity-70" />
        </button>
        <Dialog open={!!open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Info</DialogTitle>
            </DialogHeader>
            <div className="text-sm">{children}</div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // DESKTOP: pakai fixed + z-index maksimum supaya TIDAK KETUTUP card mana pun
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            className={`inline-flex items-center justify-center rounded-full p-1.5 hover:bg-muted/50 ${className}`}
          >
            <Info className="h-4 w-4 opacity-70" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          sideOffset={10}
          collisionPadding={16}
          className="rounded-md break-words whitespace-normal leading-relaxed p-3 shadow-lg pointer-events-auto"
          // ⬇️ selalu paling depan + lebar adaptif (maks 420px, min 92vw di mobile)
          style={{
            position: "fixed",
            zIndex: 2147483647,
            width: "min(92vw, 420px)",
          }}
        >
          <div className="text-sm justify-center">{children}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function JadwalPencatatanPage() {
  const { isLoading, getFilteredSchedules, refreshSchedules, filters } =
    useScheduleStore();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // state untuk tooltip title (mobile dialog)
  const [openTip, setOpenTip] = useState(false);

  // 1) Ambil data saat mount & setiap filter berubah
  useEffect(() => {
    refreshSchedules().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.month,
    filters.zonaId,
    filters.petugasId,
    filters.status,
    filters.search,
  ]);

  // 2) Dengarkan event global dari halaman Catat Meter agar jadwal auto-refresh
  useEffect(() => {
    const onRefresh = () => refreshSchedules().catch(() => {});
    window.addEventListener("jadwal:refresh", onRefresh);

    // 3) Saat user balik ke tab ini, perbarui juga
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refreshSchedules().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("jadwal:refresh", onRefresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshSchedules]);

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
    <AuthGuard requiredRole={["ADMIN", "PETUGAS"]}>
      <AppShell>
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
          <div className="container mx-auto px-4 py-6">
            {/* Bungkus header dengan z tinggi supaya layer di atas sibling */}
            <div className="relative z-20">
              <AppHeader
                title="Jadwal Pencatatan"
                titleExtra={
                  <InfoTip
                    ariaLabel="Apa itu Jadwal Pencatatan?"
                    open={openTip}
                    onOpenChange={setOpenTip}
                  >
                    <strong>Jadwal Pencatatan</strong> dipakai untuk membuat
                    rencana pencatatan meter bagi petugas. Klik{" "}
                    <em>Generate Jadwal</em> pada bar di bawah, pilih periode
                    dan cakupan yang diinginkan, lalu sistem akan otomatis
                    membuatkan daftar jadwal. Jadwal yang terbuat akan tampil di
                    tabel dan bisa langsung dipakai untuk aksi catat meter.
                  </InfoTip>
                }
              />
            </div>

            {/* Header Section (tetap) */}
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

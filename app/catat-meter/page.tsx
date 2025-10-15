// import { AuthGuard } from "@/components/auth-guard"
// import { AppShell } from "@/components/app-shell"
// import { GlassCard } from "@/components/glass-card"
// import { MeterReadingForm } from "@/components/meter-reading-form"
// import { MeterGrid } from "@/components/meter-grid"
// import { WAButton } from "@/components/wa-button"
// import { AppHeader } from "@/components/app-header"
// import { Send } from "lucide-react"

// export default function CatatMeterPage() {
//   return (
//     <AuthGuard requiredRole="PETUGAS">
//       <AppShell>
//         <div className="max-w-6xl mx-auto space-y-6">
//           <AppHeader title="Catat Meter" />

//           {/* Header Actions */}
//           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
//             <p className="text-muted-foreground">Pencatatan meter air bulanan</p>
//             <div className="flex items-center gap-3">
//               {/* <WAButton
//                 message="Tagihan air bulan ini sudah tersedia. Silakan cek aplikasi Tirta Bening."
//                 className="flex items-center gap-2"
//               >
//                 <Send className="w-4 h-4" />
//                 Kirim Tagihan Air
//               </WAButton> */}
//             </div>
//           </div>

//           {/* Period Selection */}
//           <GlassCard className="p-6">
//             <h2 className="text-xl font-semibold text-foreground mb-4">Pilih Periode Pencatatan</h2>
//             <MeterReadingForm />
//           </GlassCard>

//           {/* Meter Reading Grid */}
//           <MeterGrid />
//         </div>
//       </AppShell>
//     </AuthGuard>
//   )
// }
// app/catat-meter/page.tsx
"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { MeterReadingForm } from "@/components/meter-reading-form";
import { MeterGrid } from "@/components/meter-grid";
// import { WAButton } from "@/components/wa-button"
import { AppHeader } from "@/components/app-header";
import { Send, Info } from "lucide-react";

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

  // Desktop: fixed + z-index tinggi agar tidak ketutup card
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
          style={{
            position: "fixed",
            zIndex: 2147483647,
            width: "min(92vw, 420px)",
          }}
        >
          <div className="text-sm">{children}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function CatatMeterPage() {
  const [openTip, setOpenTip] = useState(false);

  return (
    <AuthGuard requiredRole="PETUGAS">
      <AppShell>
        <div className="max-w-6xl mx-auto space-y-6">
          <AppHeader
            title="Catat Meter"
            titleExtra={
              <InfoTip
                ariaLabel="Apa itu Catat Meter per periode?"
                open={openTip}
                onOpenChange={setOpenTip}
              >
                Catat meter dilakukan per <b>periode</b>. Pilih periode, lalu
                isi angka meter tiap pelanggan. Jika status periode <b>Final</b>
                , data tidak bisa diubah.
              </InfoTip>
            }
          />

          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-muted-foreground">
              Pencatatan meter air bulanan
            </p>
            <div className="flex items-center gap-3">
              {/* 
              <WAButton
                message="Tagihan air bulan ini sudah tersedia. Silakan cek aplikasi Tirta Bening."
                className="flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Kirim Tagihan Air
              </WAButton> 
              */}
            </div>
          </div>

          {/* Period Selection */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Pilih Periode Pencatatan
            </h2>
            <MeterReadingForm />
          </GlassCard>

          {/* Meter Reading Grid */}
          <MeterGrid />
        </div>
      </AppShell>
    </AuthGuard>
  );
}

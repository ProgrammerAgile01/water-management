import { AuthGuard } from "@/components/auth-guard"
import { AppShell } from "@/components/app-shell"
import { GlassCard } from "@/components/glass-card"
import { MeterReadingForm } from "@/components/meter-reading-form"
import { MeterGrid } from "@/components/meter-grid"
import { WAButton } from "@/components/wa-button"
import { AppHeader } from "@/components/app-header"
import { Send } from "lucide-react"

export default function CatatMeterPage() {
  return (
    <AuthGuard requiredRole="petugas">
      <AppShell>
        <div className="max-w-6xl mx-auto space-y-6">
          <AppHeader title="Catat Meter" />

          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-muted-foreground">Pencatatan meter air bulanan</p>
            <div className="flex items-center gap-3">
              <WAButton
                message="Tagihan air bulan ini sudah tersedia. Silakan cek aplikasi Tirta Bening."
                className="flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Kirim Tagihan Air
              </WAButton>
            </div>
          </div>

          {/* Period Selection */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Pilih Periode Pencatatan</h2>
            <MeterReadingForm />
          </GlassCard>

          {/* Meter Reading Grid */}
          <MeterGrid />
        </div>
      </AppShell>
    </AuthGuard>
  )
}

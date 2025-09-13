// app/catat-meter-blok/page.tsx
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { AppHeader } from "@/components/app-header";

// ⬇️ perhatikan: default import, nama bebas tapi konsisten
import { MeterBlokForm } from "@/components/meter-blok-form";
import { MeterBlokGrid } from "@/components/meter-blok-grid";

export default function CatatMeterBlokPage() {
  return (
    <AuthGuard requiredRole="petugas">
      <AppShell>
        <div className="max-w-6xl mx-auto space-y-6">
          <AppHeader title="Catat Meter Blok" />

          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Pilih Periode & Blok
            </h2>
            <MeterBlokForm />
          </GlassCard>

          <MeterBlokGrid />
        </div>
      </AppShell>
    </AuthGuard>
  );
}

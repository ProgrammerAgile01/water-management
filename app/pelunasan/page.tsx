import { AuthGuard } from "@/components/auth-guard"
import { AppShell } from "@/components/app-shell"
import { GlassCard } from "@/components/glass-card"
import { PaymentForm } from "@/components/payment-form"
import { PaymentList } from "@/components/payment-list"
import { Button } from "@/components/ui/button"
import { AppHeader } from "@/components/app-header"
import { Plus } from "lucide-react"

export default function PelunasanPage() {
  return (
    <AuthGuard>
      <AppShell>
        <div className="max-w-6xl mx-auto space-y-6">
          <AppHeader title="Input Pelunasan" />

          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-muted-foreground">Kelola pembayaran tagihan air</p>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Tambah Pelunasan
            </Button>
          </div>

          {/* Payment Form */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Tambah Pelunasan Baru</h2>
            <PaymentForm />
          </GlassCard>

          {/* Payment List */}
          <PaymentList />
        </div>
      </AppShell>
    </AuthGuard>
  )
}

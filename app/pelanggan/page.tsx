import { AuthGuard } from "@/components/auth-guard"
import { AppShell } from "@/components/app-shell"
import { GlassCard } from "@/components/glass-card"
import { CustomerList } from "@/components/customer-list"
import { CustomerForm } from "@/components/customer-form"
import { Button } from "@/components/ui/button"
import { AppHeader } from "@/components/app-header"
import { Plus } from "lucide-react"

export default function PelangganPage() {
  return (
    <AuthGuard>
      <AppShell>
        <div className="max-w-6xl mx-auto space-y-6">
          {/* AppHeader with navigation */}
          <AppHeader title="Kelola Pelanggan" />

          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-muted-foreground">Manajemen data pelanggan Tirta Bening</p>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Tambah Pelanggan
            </Button>
          </div>

          {/* Customer Form */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Tambah Pelanggan Baru</h2>
            <CustomerForm />
          </GlassCard>

          {/* Customer List */}
          <CustomerList />
        </div>
      </AppShell>
    </AuthGuard>
  )
}

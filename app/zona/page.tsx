// app/zona/page.tsx

import { AuthGuard } from "@/components/auth-guard"
import { AppShell } from "@/components/app-shell"
import { GlassCard } from "@/components/glass-card"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

// ⬇️ Nanti kamu buat di Step 2 & 3
import { ZonaForm } from "@/components/zona-form"
import { ZonaList } from "@/components/zona-list"

export default function ZonaPage() {
  return (
    <AuthGuard>
      <AppShell>
        <div className="max-w-6xl mx-auto space-y-6">
          <AppHeader title="Kelola Zona" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-muted-foreground">
              Manajemen data zona & penanggung jawab (petugas).
            </p>
            <Button className="flex items-center gap-2" form="zona-form">
              <Plus className="w-4 h-4" />
              Tambah Zona
            </Button>
          </div>

          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Tambah Zona Baru</h2>
            <ZonaForm />
          </GlassCard>

          <ZonaList />
        </div>
      </AppShell>
    </AuthGuard>
  )
}
import { AuthGuard } from "@/components/auth-guard"
import { AppShell } from "@/components/app-shell"
import { AppHeader } from "@/components/app-header"
import { GlassCard } from "@/components/glass-card"
import { ContactAdmin } from "@/components/contact-admin"

export default function HubungiAdminPage() {
  return (
    <AuthGuard>
      <AppShell>
        <div className="max-w-4xl mx-auto space-y-6">
          <AppHeader
            title="Hubungi Admin"
            breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Hubungi Admin" }]}
          />

          <GlassCard className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-foreground mb-2">Hubungi Admin Tirta Bening</h2>
              <p className="text-muted-foreground">
                Butuh bantuan atau ada pertanyaan? Tim admin kami siap membantu Anda 24/7 untuk masalah darurat.
              </p>
            </div>

            <ContactAdmin />
          </GlassCard>
        </div>
      </AppShell>
    </AuthGuard>
  )
}

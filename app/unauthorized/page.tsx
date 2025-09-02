import { AppShell } from "@/components/app-shell"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function UnauthorizedPage() {
  return (
    <AppShell>
      <div className="max-w-md mx-auto pt-20">
        <GlassCard className="p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Akses Ditolak</h1>
          <p className="text-muted-foreground mb-6 text-pretty">
            Anda tidak memiliki izin untuk mengakses halaman ini.
          </p>
          <Button asChild className="w-full">
            <Link href="/dashboard">Kembali ke Dashboard</Link>
          </Button>
        </GlassCard>
      </div>
    </AppShell>
  )
}

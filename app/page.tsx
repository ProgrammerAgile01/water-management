import { AppShell } from "@/components/app-shell"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { TirtaLogo } from "@/components/tirta-logo"
import Link from "next/link"

export default function HomePage() {
  return (
    <AppShell>
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-8">
          <TirtaLogo size="lg" className="mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-primary mb-2 text-balance">Tirta Bening</h1>
          <p className="text-lg text-muted-foreground text-pretty">Sistem Manajemen Tagihan Air</p>
        </div>

        {/* Welcome Card */}
        <GlassCard className="p-6">
          <div className="text-center space-y-4">
            <TirtaLogo size="md" className="mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Selamat Datang</h2>
            <p className="text-muted-foreground text-pretty">Kelola tagihan air dengan mudah dan efisien</p>
            <Button asChild className="w-full text-lg py-6" size="lg">
              <Link href="/login">Masuk ke Sistem</Link>
            </Button>
          </div>
        </GlassCard>

        {/* Features Preview */}
        <div className="grid grid-cols-2 gap-4">
          <GlassCard className="p-4 text-center">
            <div className="w-12 h-12 mx-auto bg-secondary/20 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 8.172V5L8 4z"
                />
              </svg>
            </div>
            <h3 className="font-medium text-foreground">Dashboard</h3>
            <p className="text-sm text-muted-foreground">Statistik & Laporan</p>
          </GlassCard>

          <GlassCard className="p-4 text-center">
            <div className="w-12 h-12 mx-auto bg-secondary/20 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="font-medium text-foreground">Pelanggan</h3>
            <p className="text-sm text-muted-foreground">Kelola Data</p>
          </GlassCard>
        </div>
      </div>
    </AppShell>
  )
}

// Import komponen-komponen yang dipakai di halaman pelanggan
import { AuthGuard } from "@/components/auth-guard"; // Komponen pembungkus, cek user sudah login/authorized
import { AppShell } from "@/components/app-shell"; // Layout utama aplikasi (sidebar, header, dll)
import { GlassCard } from "@/components/glass-card"; // Kartu transparan bergaya "glassmorphism"
import { CustomerList } from "@/components/customer-list"; // Komponen untuk menampilkan daftar pelanggan
import { CustomerForm } from "@/components/customer-form"; // Komponen form tambah pelanggan
import { MassResetBar } from "@/components/mass-reset-bar";
import { Button } from "@/components/ui/button"; // Komponen tombol standar
import { AppHeader } from "@/components/app-header"; // Header aplikasi dengan judul/navigasi
import { Plus } from "lucide-react"; // Ikon "Plus" (tanda tambah) dari lucide-react

// Komponen halaman utama untuk modul pelanggan
export default function PelangganPage() {
  return (
    <AuthGuard requiredRole="ADMIN">
      {/* Semua isi halaman dilindungi oleh AuthGuard */}
      <AppShell>
        {/* AppShell memberi kerangka layout aplikasi */}
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Bagian header halaman dengan judul */}
          <AppHeader title="Kelola Pelanggan" />

          {/* Baris aksi header: deskripsi singkat + tombol tambah */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-muted-foreground">
              Manajemen data pelanggan Tirta Bening
            </p>
            <Button className="flex items-center gap-2">
              {/* Ikon tambah + teks */}
              <Plus className="w-4 h-4" />
              Tambah Pelanggan
            </Button>
          </div>

          {/* Kartu berisi form tambah pelanggan baru */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Tambah Pelanggan Baru
            </h2>
            <CustomerForm />
          </GlassCard>

          {/* Baris aksi (client component) */}
          <MassResetBar />

          {/* Daftar pelanggan ditampilkan di bawah form */}
          <CustomerList />
        </div>
      </AppShell>
    </AuthGuard>
  );
}

// app/warga/profil/page.tsx
"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Phone, MapPin, Droplet, Barcode, User } from "lucide-react";
import { WAButton } from "@/components/wa-button";

type WargaProfile = {
  customerId: string;
  name: string;
  code: string;
  zone: string;
  meterSerial: string;
  address: string;
  phone?: string | null;
};

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 mt-1 text-muted-foreground" />
      <div className="text-sm">
        <div className="text-muted-foreground">{label}</div>
        <div className="font-medium break-words">{value || "-"}</div>
      </div>
    </div>
  );
}

export default function ProfilWargaPage() {
  const [data, setData] = useState<WargaProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadProfile() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/warga/profil", { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal mengambil profil");
      const json = await res.json();
      setData(json.data as WargaProfile);
    } catch (e: any) {
      setError(e?.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  return (
    <AuthGuard requiredRole="WARGA">
      <AppShell>
        <div className="max-w-6xl mx-auto space-y-6">
          <AppHeader title="Profil Pelanggan" />
          <p className="text-muted-foreground">
            Data identitas pelanggan & informasi meter air Anda.
          </p>

          <GlassCard className="p-6">
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-6 w-40 rounded bg-muted" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="h-4 w-56 rounded bg-muted" />
                    <div className="h-4 w-48 rounded bg-muted" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 w-44 rounded bg-muted" />
                    <div className="h-4 w-80 rounded bg-muted" />
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="text-sm text-red-600">{error}</div>
            ) : data ? (
              <div className="space-y-6">
                {/* Header Identitas */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-semibold">{data.name}</h2>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Kode Pelanggan:{" "}
                    <span className="font-medium">{data.code}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Droplet className="w-4 h-4 text-cyan-500" />
                    <Badge variant="secondary">Zona: {data.zone}</Badge>
                  </div>
                </div>

                <Separator />

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <InfoRow
                      icon={Barcode}
                      label="Serial Meter"
                      value={data.meterSerial}
                    />
                    <InfoRow
                      icon={MapPin}
                      label="Alamat"
                      value={data.address}
                    />
                  </div>
                  <div className="space-y-4">
                    <InfoRow
                      icon={Phone}
                      label="Nomor Telepon"
                      value={data.phone || "-"}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </GlassCard>

          {/* Tombol Aksi Desktop */}
          <div className="hidden md:flex items-center justify-end gap-3">
            <Button variant="outline">Hubungi Admin</Button>
            <Button
              onClick={() => (window.location.href = "/warga/profil/edit")}
            >
              Edit Profil
            </Button>
          </div>

          {/* Tombol Aksi Mobile (Sticky) */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="mx-auto max-w-6xl p-4 flex items-center gap-3">
              <Button variant="outline" className="flex-1">
                Hubungi Admin
              </Button>
              <Button
                className="flex-1"
                onClick={() => (window.location.href = "/warga/profil/edit")}
              >
                Edit Profil
              </Button>
            </div>
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}

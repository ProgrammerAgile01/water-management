// app/warga/profil/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Phone, MapPin, Droplet, Barcode, User, Crosshair } from "lucide-react";

type WargaProfile = {
  customerId: string;
  name: string;
  code: string;
  zone: string;
  meterSerial: string;
  address: string;
  phone?: string | null;
  lat?: number | null;
  lng?: number | null;
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
  const abortRef = useRef<AbortController | null>(null);

  async function loadProfile() {
    try {
      setLoading(true);
      setError(null);

      // batalkan request sebelumnya jika ada
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const res = await fetch("/api/warga/profil", {
        cache: "no-store",
        signal: ac.signal,
      });

      if (!res.ok) {
        // bisa tambahkan handling 401/403 jika dibutuhkan
        throw new Error("Gagal mengambil profil");
      }

      const json = (await res.json()) as { data?: WargaProfile };
      // fallback aman jika API mengembalikan null/undefined
      const payload = json?.data ?? null;
      setData(payload);
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setError(e?.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
    return () => {
      abortRef.current?.abort();
    };
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
                <div className="flex justify-between">
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
                  <Button
                    className="px-6 shadow-lg"
                    onClick={() =>
                      (window.location.href = "/warga-profil/edit")
                    }
                  >
                    Edit Profil
                  </Button>
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
                    <InfoRow
                      icon={Crosshair}
                      label="Koordinat (Latitude, Longitude)"
                      value={
                        data.lat != null && data.lng != null
                          ? `${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}`
                          : "-"
                      }
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

          {/* Tombol Aksi Desktop (Hubungi Admin dihapus) */}
          {/* <div className="hidden md:flex items-center justify-end gap-3">
            <Button
              onClick={() => (window.location.href = "/warga-profil/edit")}
            >
              Edit Profil
            </Button>
          </div> */}

          {/* Spacer agar konten tidak ketutup bottom nav (khusus mobile) */}
          <div className="md:hidden h-28" />
        </div>
      </AppShell>
    </AuthGuard>
  );
}

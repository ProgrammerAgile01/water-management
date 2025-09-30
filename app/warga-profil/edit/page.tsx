"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Barcode, Droplet, Crosshair, LocateFixed } from "lucide-react";
import { useRouter } from "next/navigation";

// PETA: client-only dynamic import
const LocationPicker = dynamic(() => import("./LocationPicker"), { ssr: false });

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

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
function parseNum(v: string): number | null {
  if (v == null || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function EditProfilWargaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoErr, setGeoErr] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    lat: "",
    lng: "",
  });
  const [readonly, setReadonly] = useState<{
    code: string;
    zone: string;
    meterSerial: string;
  }>({ code: "-", zone: "-", meterSerial: "-" });

  // load profil awal
  useEffect(() => {
    let abort = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/warga/profil", {
          cache: "no-store",
          signal: abort.signal,
        });
        if (!res.ok) throw new Error("Gagal memuat data profil");
        const json = (await res.json()) as { data?: WargaProfile };
        if (!json?.data) throw new Error("Data profil tidak ditemukan");

        setForm({
          name: json.data.name || "",
          phone: json.data.phone || "",
          address: json.data.address || "",
          lat: json.data.lat != null ? json.data.lat.toString() : "",
          lng: json.data.lng != null ? json.data.lng.toString() : "",
        });
        setReadonly({
          code: json.data.code,
          zone: json.data.zone,
          meterSerial: json.data.meterSerial || "-",
        });
      } catch (e: any) {
        if (e?.name !== "AbortError")
          setError(e?.message || "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    })();
    return () => abort.abort();
  }, []);

  const canSave = useMemo(() => {
    return (form.name ?? "").trim().length > 0 && !saving;
  }, [form, saving]);

  function validateLatLng(latStr: string, lngStr: string): string | null {
    const lat = parseNum(latStr);
    const lng = parseNum(lngStr);
    if (latStr.trim() === "" && lngStr.trim() === "") return null; // tidak mengubah koordinat
    if (lat == null || lng == null) return "Latitude/Longitude harus berupa angka yang valid.";
    if (lat < -90 || lat > 90) return "Latitude harus di antara -90 hingga 90.";
    if (lng < -180 || lng > 180) return "Longitude harus di antara -180 hingga 180.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;

    const latLngErr = validateLatLng(form.lat, form.lng);
    if (latLngErr) {
      setError(latLngErr);
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const body: any = {
        name: form.name?.trim(),
        phone: (form.phone ?? "").trim(),
        address: (form.address ?? "").trim(),
      };
      if (form.lat.trim() !== "" && form.lng.trim() !== "") {
        body.lat = clamp(Number(form.lat), -90, 90);
        body.lng = clamp(Number(form.lng), -180, 180);
      }

      const res = await fetch("/api/warga/profil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Gagal menyimpan perubahan");
      }

      router.push("/warga-profil");
    } catch (e: any) {
      setError(e?.message || "Terjadi kesalahan saat menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function fillFromMyLocation() {
    setGeoErr(null);
    if (!("geolocation" in navigator)) {
      setGeoErr("Perangkat tidak mendukung geolokasi.");
      return;
    }
    setGeoBusy(true);
    try {
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            setForm((s) => ({
              ...s,
              lat: latitude.toFixed(6),
              lng: longitude.toFixed(6),
            }));
            resolve();
          },
          (err) => {
            let msg = "Gagal mengambil lokasi.";
            if (err.code === err.PERMISSION_DENIED) msg = "Izin lokasi ditolak. Aktifkan izin di pengaturan browser.";
            if (err.code === err.POSITION_UNAVAILABLE) msg = "Lokasi tidak tersedia.";
            if (err.code === err.TIMEOUT) msg = "Pengambilan lokasi melebihi batas waktu.";
            reject(new Error(msg));
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });
    } catch (e: any) {
      setGeoErr(e?.message || "Tidak bisa mengambil lokasi saat ini.");
    } finally {
      setGeoBusy(false);
    }
  }

  const latNum = parseNum(form.lat);
  const lngNum = parseNum(form.lng);

  return (
    <AuthGuard requiredRole="WARGA">
      <AppShell>
        <div className="max-w-6xl mx-auto space-y-6">
          <AppHeader title="Edit Profil Pelanggan" />
          <p className="text-muted-foreground">
            Perbarui data identitas, kontak, dan koordinat lokasi rumah Anda.
          </p>

          <GlassCard className="p-6">
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-6 w-52 bg-muted rounded" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="h-10 w-full bg-muted rounded" />
                    <div className="h-10 w-full bg-muted rounded" />
                    <div className="h-20 w-full bg-muted rounded" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-9 w-56 bg-muted rounded" />
                    <div className="h-9 w-48 bg-muted rounded" />
                    <div className="h-9 w-64 bg-muted rounded" />
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 pb-[calc(env(safe-area-inset-bottom)+80px)] md:pb-0">
                {/* Header identitas ringkas */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-semibold">Data Pelanggan</h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <div className="text-muted-foreground">
                      Kode: <span className="font-medium">{readonly.code}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-2">
                      <Droplet className="w-4 h-4 text-cyan-500" />
                      <Badge variant="secondary">Zona: {readonly.zone}</Badge>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Barcode className="w-4 h-4" />
                      <span>Serial Meter: {readonly.meterSerial}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Form Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nama</label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                        placeholder="Nama lengkap"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nomor Telepon (WA)</label>
                      <Input
                        value={form.phone}
                        onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                        placeholder="08xxxxxxxxxx"
                        inputMode="tel"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Alamat</label>
                      <textarea
                        value={form.address}
                        onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
                        placeholder="Alamat lengkap"
                        rows={5}
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                    </div>
                  </div>

                  {/* Koordinat + Peta */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Crosshair className="w-4 h-4 text-primary" />
                      <div className="font-medium">Koordinat Lokasi</div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Latitude (-90…90)</label>
                        <Input
                          value={form.lat}
                          onChange={(e) => setForm((s) => ({ ...s, lat: e.target.value }))}
                          inputMode="decimal"
                          placeholder="-7.557123"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Longitude (-180…180)</label>
                        <Input
                          value={form.lng}
                          onChange={(e) => setForm((s) => ({ ...s, lng: e.target.value }))}
                          inputMode="decimal"
                          placeholder="110.823456"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button type="button" variant="default" onClick={fillFromMyLocation} disabled={geoBusy}>
                        <LocateFixed className="w-4 h-4 mr-2" />
                        {geoBusy ? "Mengambil lokasi…" : "Ambil dari Lokasi Saya"}
                      </Button>
                      {geoErr && <div className="text-xs text-destructive">{geoErr}</div>}
                    </div>

                    {/* PETA PICKER */}
                    <div className="rounded-lg overflow-hidden border border-border/30">
                      <LocationPicker
                        lat={latNum}
                        lng={lngNum}
                        onChange={(la, lo) =>
                          setForm((s) => ({ ...s, lat: la.toFixed(6), lng: lo.toFixed(6) }))
                        }
                        height={300}
                      />
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Tips: Klik pada peta untuk mengubah titik. Aktifkan GPS & izin lokasi untuk akurasi lebih baik.
                    </div>
                  </div>
                </div>

                {error && <div className="text-sm text-red-600">{error}</div>}

                {/* Aksi Desktop */}
                <div className="hidden md:flex items-center justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => router.back()}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={!canSave}>
                    {saving ? "Menyimpan..." : "Simpan Perubahan"}
                  </Button>
                </div>

                {/* Aksi Mobile (Sticky) */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                  <div className="mx-auto max-w-6xl p-4 flex items-center gap-3">
                    <Button className="flex-1" type="button" variant="outline" onClick={() => router.back()}>
                      Batal
                    </Button>
                    <Button className="flex-1" type="submit" disabled={!canSave}>
                      {saving ? "Menyimpan..." : "Simpan"}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </GlassCard>
        </div>
      </AppShell>
    </AuthGuard>
  );
}

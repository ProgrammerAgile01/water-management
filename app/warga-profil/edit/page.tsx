// app/warga/profil/edit/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Barcode, Droplet } from "lucide-react";
import { useRouter } from "next/navigation";

type WargaProfile = {
  customerId: string;
  name: string;
  code: string;
  zone: string;
  meterSerial: string;
  address: string;
  phone?: string | null;
};

export default function EditProfilWargaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [readonly, setReadonly] = useState<{
    code: string;
    zone: string;
    meterSerial: string;
  }>({ code: "-", zone: "-", meterSerial: "-" });

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;

    try {
      setSaving(true);
      setError(null);

      const res = await fetch("/api/warga/profil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name?.trim(),
          phone: (form.phone ?? "").trim(),
          address: (form.address ?? "").trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Gagal menyimpan perubahan");
      }

      // kembali ke halaman profil
      router.push("/warga-profil");
    } catch (e: any) {
      setError(e?.message || "Terjadi kesalahan saat menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard requiredRole="WARGA">
      <AppShell>
        <div className="max-w-6xl mx-auto space-y-6">
          <AppHeader title="Edit Profil Pelanggan" />
          <p className="text-muted-foreground">
            Perbarui data identitas dan kontak Anda. Kode pelanggan, zona, dan
            serial meter bersifat hanya-baca.
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
              <form onSubmit={handleSubmit} className="space-y-6">
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
                        onChange={(e) =>
                          setForm((s) => ({ ...s, name: e.target.value }))
                        }
                        placeholder="Nama lengkap"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Nomor Telepon (WA)
                      </label>
                      <Input
                        value={form.phone}
                        onChange={(e) =>
                          setForm((s) => ({ ...s, phone: e.target.value }))
                        }
                        placeholder="08xxxxxxxxxx"
                        inputMode="tel"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Alamat</label>
                      <textarea
                        value={form.address}
                        onChange={(e) =>
                          setForm((s) => ({ ...s, address: e.target.value }))
                        }
                        placeholder="Alamat lengkap"
                        rows={5}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                {error && <div className="text-sm text-red-600">{error}</div>}

                {/* Aksi Desktop */}
                <div className="hidden md:flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={!canSave}>
                    {saving ? "Menyimpan..." : "Simpan Perubahan"}
                  </Button>
                </div>

                {/* Aksi Mobile (Sticky) */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                  <div className="mx-auto max-w-6xl p-4 flex items-center gap-3">
                    <Button
                      className="flex-1"
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                    >
                      Batal
                    </Button>
                    <Button
                      className="flex-1"
                      type="submit"
                      disabled={!canSave}
                    >
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

"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { AppHeader } from "@/components/app-header";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save, Shield, UserCog } from "lucide-react";

type ZonaLite = { id: string; kode: string; nama: string };
type Profil = {
  id: string;
  username: string;
  name: string;
  phone: string | null;
  role: "ADMIN" | "PETUGAS" | "WARGA";
  createdAt: string;
  zonas: ZonaLite[];
};

export default function ProfilPetugasPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  const [data, setData] = useState<Profil | null>(null);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [pwd, setPwd] = useState({
    oldPassword: "",
    newPassword: "",
    confirm: "",
  });

  // load profil
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/petugas/profil", { cache: "no-store" });
        const j = await r.json();
        if (j?.ok) {
          setData(j.data);
          setForm({
            name: j.data.name ?? "",
            phone: j.data.phone ?? "",
          });
        } else {
          toast.error(j?.message || "Gagal memuat profil");
        }
      } catch {
        toast.error("Gagal memuat profil");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSave() {
    setSaving(true);
    try {
      const r = await fetch("/api/petugas/profil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
        }),
      });
      const j = await r.json();
      if (j?.ok) {
        toast.success("Profil diperbarui");
        setData((d) =>
          d ? { ...d, name: form.name, phone: form.phone || null } : d
        );
      } else toast.error(j?.message || "Gagal menyimpan");
    } catch {
      toast.error("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function onChangePassword() {
    if (!pwd.oldPassword || !pwd.newPassword) {
      toast.info("Isi sandi lama & baru");
      return;
    }
    if (pwd.newPassword.length < 6) {
      toast.info("Sandi baru minimal 6 karakter");
      return;
    }
    if (pwd.newPassword !== pwd.confirm) {
      toast.info("Konfirmasi sandi tidak sama");
      return;
    }
    setSavingPass(true);
    try {
      const r = await fetch("/api/petugas/profil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPassword: pwd.oldPassword,
          newPassword: pwd.newPassword,
        }),
      });
      const j = await r.json();
      if (j?.ok) {
        toast.success("Sandi berhasil diubah");
        setPwd({ oldPassword: "", newPassword: "", confirm: "" });
      } else toast.error(j?.message || "Gagal mengubah sandi");
    } catch {
      toast.error("Gagal mengubah sandi");
    } finally {
      setSavingPass(false);
    }
  }

  return (
    <AuthGuard requiredRole="PETUGAS">
      <AppShell>
        <div className="max-w-6xl mx-auto space-y-6">
          <AppHeader title="Profil Petugas" />

          {/* Deskripsi singkat */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-muted-foreground">
              Kelola informasi akun petugas catat meter.
            </p>
          </div>

          {/* Kartu Profil Dasar */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <UserCog className="w-5 h-5 text-emerald-700" />
              <h2 className="text-xl font-semibold">Informasi Akun</h2>
            </div>

            {loading ? (
              <div className="text-sm text-muted-foreground">Memuat…</div>
            ) : !data ? (
              <div className="text-sm text-muted-foreground">
                Data tidak tersedia
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Username
                    </label>
                    <Input value={data.username} disabled />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Role
                    </label>
                    <Input value={data.role} disabled />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Nama
                    </label>
                    <Input
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="Nama lengkap"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      No. WhatsApp
                    </label>
                    <Input
                      value={form.phone}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, phone: e.target.value }))
                      }
                      placeholder="08xxxxxxxxxx"
                    />
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Dibuat:{" "}
                  {new Date(data.createdAt).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={onSave}
                    disabled={saving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Menyimpan…" : "Simpan Perubahan"}
                  </Button>
                </div>

                <Separator />

                {/* Zona yang dipegang */}
                <div className="space-y-2">
                  <div className="font-medium">Zona yang Dipegang</div>
                  {data.zonas?.length ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {data.zonas.map((z) => (
                        <div
                          key={z.id}
                          className="rounded-lg border px-3 py-2 text-sm bg-muted/40"
                        >
                          <div className="font-medium">{z.nama}</div>
                          <div className="text-xs text-muted-foreground">
                            {z.kode}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Belum ada zona yang ditugaskan.
                    </div>
                  )}
                </div>
              </div>
            )}
          </GlassCard>

          {/* Kartu Ubah Password */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-emerald-700" />
              <h2 className="text-xl font-semibold">Keamanan Akun</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Sandi Lama
                </label>
                <Input
                  type="password"
                  value={pwd.oldPassword}
                  onChange={(e) =>
                    setPwd((p) => ({ ...p, oldPassword: e.target.value }))
                  }
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Sandi Baru
                </label>
                <Input
                  type="password"
                  value={pwd.newPassword}
                  onChange={(e) =>
                    setPwd((p) => ({ ...p, newPassword: e.target.value }))
                  }
                  placeholder="Minimal 6 karakter"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Konfirmasi Sandi Baru
                </label>
                <Input
                  type="password"
                  value={pwd.confirm}
                  onChange={(e) =>
                    setPwd((p) => ({ ...p, confirm: e.target.value }))
                  }
                  placeholder="Ulangi sandi baru"
                />
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button
                onClick={onChangePassword}
                disabled={savingPass}
                variant="outline"
                className="bg-transparent"
              >
                {savingPass ? "Menyimpan…" : "Ubah Sandi"}
              </Button>
            </div>
          </GlassCard>
        </div>
      </AppShell>
    </AuthGuard>
  );
}

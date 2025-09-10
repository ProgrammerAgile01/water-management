"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, Settings, Image as ImageIcon } from "lucide-react";

type SystemFormState = {
  namaPerusahaan: string;
  alamat: string;
  telepon: string;
  email: string;
  logoUrl: string;
};

export function SystemForm() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState<SystemFormState>({
    namaPerusahaan: "",
    alamat: "",
    telepon: "",
    email: "",
    logoUrl: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load awal
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/setting-form", { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as Partial<SystemFormState>;
        setFormData({
          namaPerusahaan: data.namaPerusahaan ?? "",
          alamat: data.alamat ?? "",
          telepon: data.telepon ?? "",
          email: data.email ?? "",
          logoUrl: data.logoUrl ?? "",
        });
      } catch (e) {
        console.error(e);
        toast({ title: "Gagal memuat profil", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/setting-form", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Berhasil", description: "Pengaturan sistem tersimpan" });
    } catch (e) {
      console.error(e);
      toast({ title: "Gagal menyimpan", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const onLogoChange = async (file?: File) => {
    if (!file) return;
    // Preview lokal. Jika ada endpoint upload, ganti logic di sini.
    const url = URL.createObjectURL(file);
    setFormData((p) => ({ ...p, logoUrl: url }));
  };

  if (loading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Memuat pengaturan…
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">Pengaturan Sistem</h2>
      </div>

      {/* Upload Logo */}
      <div className="space-y-2">
        <Label>Logo Perusahaan</Label>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded bg-muted/40 flex items-center justify-center overflow-hidden">
            {formData.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={formData.logoUrl} alt="logo" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex gap-2">
            <Input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onLogoChange(e.target.files?.[0])}
            />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
              Pilih Logo
            </Button>
            {formData.logoUrl && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setFormData((p) => ({ ...p, logoUrl: "" }))}
              >
                Hapus
              </Button>
            )}
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="nama-perusahaan">Nama Perusahaan</Label>
        <Input
          id="nama-perusahaan"
          value={formData.namaPerusahaan}
          onChange={(e) => setFormData((p) => ({ ...p, namaPerusahaan: e.target.value }))}
          placeholder="Tirta Bening"
        />
      </div>

      <div>
        <Label htmlFor="alamat">Alamat</Label>
        <Input
          id="alamat"
          value={formData.alamat}
          onChange={(e) => setFormData((p) => ({ ...p, alamat: e.target.value }))}
          placeholder="Jl. Air Bersih No. 123"
        />
      </div>

      <div>
        <Label htmlFor="telepon">Telepon</Label>
        <Input
          id="telepon"
          value={formData.telepon}
          onChange={(e) => setFormData((p) => ({ ...p, telepon: e.target.value }))}
          placeholder="(021) 123-4567"
        />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
          placeholder="info@tirtabening.com"
        />
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Menyimpan…" : "Simpan Pengaturan"}
      </Button>
    </form>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, Settings, Image as ImageIcon, Wallet } from "lucide-react";

type SystemFormState = {
  namaPerusahaan: string;
  alamat: string;
  telepon: string;
  email: string;
  logoUrl: string;

  // baru:
  namaBankPembayaran: string;
  norekPembayaran: string;
  anNorekPembayaran: string;
  namaBendahara: string;
  whatsappCs: string;
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

    namaBankPembayaran: "",
    norekPembayaran: "",
    anNorekPembayaran: "",
    namaBendahara: "",
    whatsappCs: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/setting-form", { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as Partial<SystemFormState>;
        setFormData((prev) => ({
          ...prev,
          namaPerusahaan: data.namaPerusahaan ?? "",
          alamat: data.alamat ?? "",
          telepon: data.telepon ?? "",
          email: data.email ?? "",
          logoUrl: data.logoUrl ?? "",

          namaBankPembayaran: data.namaBankPembayaran ?? "",
          norekPembayaran: data.norekPembayaran ?? "",
          anNorekPembayaran: data.anNorekPembayaran ?? "",
          namaBendahara: data.namaBendahara ?? "",
          whatsappCs: data.whatsappCs ?? "",
        }));
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
        <h2 className="text-xl font-semibold text-foreground">
          Pengaturan Sistem
        </h2>
      </div>

      {/* Upload Logo */}
      <div className="space-y-2">
        <Label>Logo Perusahaan</Label>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded bg-muted/40 flex items-center justify-center overflow-hidden">
            {formData.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={formData.logoUrl}
                alt="logo"
                className="w-full h-full object-cover"
              />
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
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
            >
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

      {/* Profil Perusahaan */}
      <div>
        <Label htmlFor="nama-perusahaan">Nama Perusahaan</Label>
        <Input
          id="nama-perusahaan"
          value={formData.namaPerusahaan}
          onChange={(e) =>
            setFormData((p) => ({ ...p, namaPerusahaan: e.target.value }))
          }
          placeholder="Tirta Bening"
        />
      </div>

      <div>
        <Label htmlFor="alamat">Alamat</Label>
        <Input
          id="alamat"
          value={formData.alamat}
          onChange={(e) =>
            setFormData((p) => ({ ...p, alamat: e.target.value }))
          }
          placeholder="Jl. Air Bersih No. 123"
        />
      </div>

      <div>
        <Label htmlFor="telepon">Telepon</Label>
        <Input
          id="telepon"
          value={formData.telepon}
          onChange={(e) =>
            setFormData((p) => ({ ...p, telepon: e.target.value }))
          }
          placeholder="(021) 123-4567"
        />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) =>
            setFormData((p) => ({ ...p, email: e.target.value }))
          }
          placeholder="info@tirtabening.com"
        />
      </div>

      {/* Informasi Pembayaran & Kontak */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-4 h-4 text-primary" />
          <h3 className="font-medium">Informasi Pembayaran & Kontak</h3>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="nama-bank-pembayaran">Nama Bank Pembayaran</Label>
            <Input
              id="nama-bank-pembayaran"
              value={formData.namaBankPembayaran}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  namaBankPembayaran: e.target.value,
                }))
              }
              placeholder="BCA / BRI / Mandiri / dsb."
            />
          </div>

          <div>
            <Label htmlFor="norek-pembayaran">No Rekening Pembayaran</Label>
            <Input
              id="norek-pembayaran"
              value={formData.norekPembayaran}
              onChange={(e) =>
                setFormData((p) => ({ ...p, norekPembayaran: e.target.value }))
              }
              placeholder="1234567890"
            />
          </div>

          <div>
            <Label htmlFor="an-norek-pembayaran">
              a.n. No Rekening Pembayaran
            </Label>
            <Input
              id="an-norek-pembayaran"
              value={formData.anNorekPembayaran}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  anNorekPembayaran: e.target.value,
                }))
              }
              placeholder="Nama Pemilik Rekening"
            />
          </div>

          <div>
            <Label htmlFor="nama-bendahara">Nama Bendahara</Label>
            <Input
              id="nama-bendahara"
              value={formData.namaBendahara}
              onChange={(e) =>
                setFormData((p) => ({ ...p, namaBendahara: e.target.value }))
              }
              placeholder="Nama Bendahara"
            />
          </div>

          <div>
            <Label htmlFor="whatsapp-cs">Whatsapp CS</Label>
            <Input
              id="whatsapp-cs"
              value={formData.whatsappCs}
              onChange={(e) =>
                setFormData((p) => ({ ...p, whatsappCs: e.target.value }))
              }
              placeholder="08xxxxxxxxxx"
            />
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Menyimpan…" : "Simpan Pengaturan"}
      </Button>
    </form>
  );
}

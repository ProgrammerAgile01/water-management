// components/schedule-settings-form.tsx
"use client";
import type React from "react";
import { useEffect, useState } from "react";
import { CalendarDays, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useScheduleSettingsStore } from "@/lib/schedule-setting-store";

export function ScheduleSettingsForm() {
  const { settings, isLoading, loadSettings, updateSettings } =
    useScheduleSettingsStore();
  const { toast } = useToast();

  const [formData, setFormData] = useState<{
    tanggalCatatDefault: number | null;
  }>({
    tanggalCatatDefault: settings.tanggalCatatDefault ?? null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings().catch(() => {});
  }, []);
  useEffect(() => {
    setFormData({ tanggalCatatDefault: settings.tanggalCatatDefault ?? null });
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings({
        tanggalCatatDefault: formData.tanggalCatatDefault,
      });
      toast({ title: "Berhasil", description: "Pengaturan jadwal disimpan" });
    } catch (err: any) {
      toast({
        title: "Gagal",
        description: err?.message ?? "Tidak bisa menyimpan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">
          Pengaturan Jadwal Pencatatan
        </h2>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="tanggal-catat">Hari Pencatatan (1–31)</Label>
          <Input
            id="tanggal-catat"
            type="number"
            min={1}
            max={31}
            value={formData.tanggalCatatDefault ?? ""}
            onChange={(e) =>
              setFormData({
                tanggalCatatDefault: e.target.value
                  ? Math.max(1, Math.min(31, Number(e.target.value)))
                  : null,
              })
            }
            className="w-full"
            disabled={isLoading || saving}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Sistem akan otomatis menyesuaikan jika bulan tidak punya tanggal tsb
            (mis. 30/31 → jatuh ke 28/29 di Februari).
          </p>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Menyimpan..." : "Simpan Pengaturan"}
      </Button>
    </form>
  );
}

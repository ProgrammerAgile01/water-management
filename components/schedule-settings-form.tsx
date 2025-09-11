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
  const [formData, setFormData] = useState(settings);
  const [saving, setSaving] = useState(false);

  // Load from API on mount
  useEffect(() => {
    // hanya load sekali waktu pertama mount
    loadSettings().catch(() => {
      // diamkan atau tampilkan toast kecil
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Jika settings berubah setelah load, sinkronkan ke form
  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings({
        periode: formData.periode,
        tanggalCatatDefault: formData.tanggalCatatDefault,
      });
      toast({
        title: "Berhasil",
        description: "Pengaturan jadwal pencatatan berhasil disimpan",
      });
    } catch (err: any) {
      toast({
        title: "Gagal",
        description: err?.message ?? "Tidak bisa menyimpan pengaturan",
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
          <Label htmlFor="periode">Periode Pencatatan</Label>
          <Input
            id="periode"
            type="month"
            value={formData.periode}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, periode: e.target.value }))
            }
            className="w-full"
            disabled={isLoading || saving}
          />
        </div>

        <div>
          <Label htmlFor="tanggal-catat">Tanggal Catat Meter</Label>
          <Input
            id="tanggal-catat"
            type="date"
            value={formData.tanggalCatatDefault}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                tanggalCatatDefault: e.target.value,
              }))
            }
            className="w-full"
            disabled={isLoading || saving}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Tanggal ini akan dipakai otomatis pada menu Jadwal Pencatatan.
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

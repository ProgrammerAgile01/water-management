// components/schedule-generate-bar.tsx
"use client";

import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/glass-card";
import { useToast } from "@/hooks/use-toast";
import { useScheduleStore } from "@/lib/schedule-store";
import { useEffect, useState } from "react";

type Sett = { periode: string; tanggalCatatDefault: string };

export function ScheduleGenerateBar() {
  const { toast } = useToast();
  const { filters, refreshSchedules } = useScheduleStore();
  const [sett, setSett] = useState<Sett | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Ambil setting untuk menampilkan tanggal default (periode mengikuti filter aktif)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/setting", { cache: "no-store" });
        const j = await r.json();
        setSett({
          periode: filters.month, // tampilkan bulan yang sedang dipilih
          tanggalCatatDefault:
            j?.tanggalCatatDefault ?? new Date().toISOString().slice(0, 10),
        });
      } catch {
        // ignore
      }
    })();
  }, [filters.month]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/jadwal?month=${encodeURIComponent(filters.month)}`,
        { method: "POST" }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.ok === false) {
        throw new Error(j?.message ?? "Tidak bisa generate jadwal");
      }
      await refreshSchedules();
      toast({
        title: "Berhasil",
        description: j?.message ?? "Jadwal berhasil digenerate.",
      });
    } catch (e: any) {
      toast({
        title: "Gagal",
        description: e?.message ?? "Gagal generate jadwal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncTanggal = async () => {
    setSyncing(true);
    try {
      const res = await fetch(
        `/api/jadwal/sync-tanggal?bulan=${encodeURIComponent(filters.month)}`,
        { method: "POST" }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.ok === false)
        throw new Error(j?.message ?? "Sync gagal");

      await refreshSchedules();
      toast({
        title: "Berhasil",
        description: j?.message ?? "Tanggal tersinkron.",
      });
    } catch (e: any) {
      toast({
        title: "Gagal",
        description: e?.message ?? "Tidak bisa sync tanggal",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <GlassCard className="p-4 mb-4">
      <div className="flex flex-col gap-3">
        {/* Buttons row */}
        <div className="flex flex-col md:flex-row gap-2 w-full">
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 w-full md:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            {loading ? "Generating..." : "Generate Jadwal"}
          </Button>

          <Button
            onClick={handleSyncTanggal}
            disabled={syncing}
            variant="outline"
            className="w-full md:w-auto"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`}
            />
            {syncing ? "Syncing..." : "Sync Tanggal"}
          </Button>
        </div>

        {sett && (
          <p className="text-sm text-muted-foreground">
            Menggunakan pengaturan: Periode <b>{sett.periode}</b>, Tanggal{" "}
            <b>{sett.tanggalCatatDefault}</b>
          </p>
        )}
      </div>
    </GlassCard>
  );
}

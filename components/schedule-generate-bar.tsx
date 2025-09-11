// components/schedule-generate-bar.tsx
"use client";

import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/glass-card";
import { useToast } from "@/hooks/use-toast";
import { useScheduleStore } from "@/lib/schedule-store";
import { useEffect, useState } from "react";

type S = { periode: string; tanggalCatatDefault: string };

export function ScheduleGenerateBar() {
  const { toast } = useToast();
  const { generateSchedules, filters, refreshSchedules } = useScheduleStore();
  const [sett, setSett] = useState<S | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // ambil pengaturan dari /api/setting untuk ditampilkan
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/setting", { cache: "no-store" });
        const j = await r.json();
        setSett({
          periode:
            j?.periodeJadwalAktif ?? new Date().toISOString().slice(0, 7),
          tanggalCatatDefault:
            j?.tanggalCatatDefault ?? new Date().toISOString().slice(0, 10),
        });
      } catch {}
    })();
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      await generateSchedules(); // backend POST /api/jadwal
      await refreshSchedules();
      toast({ title: "Berhasil", description: "Jadwal berhasil digenerate." });
    } catch (e: any) {
      toast({
        title: "Gagal",
        description: e?.message ?? "Tidak bisa generate jadwal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncTanggal = async () => {
    setSyncing(true);
    try {
      // 🔹 Panggil endpoint sync-tanggal pakai bulan dari filters
      const res = await fetch(
        `/api/jadwal/sync-tanggal?bulan=${encodeURIComponent(filters.month)}`,
        { method: "POST" }
      );
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.message ?? "Sync gagal");

      await refreshSchedules(); // reload data jadwal
      toast({ title: "Berhasil", description: j.message });
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
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            {loading ? "Generating..." : "Generate Jadwal"}
          </Button>

          <Button
            onClick={handleSyncTanggal}
            disabled={syncing}
            variant="outline"
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

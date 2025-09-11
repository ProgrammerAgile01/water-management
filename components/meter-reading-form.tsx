// components/meter-reading-form.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSWRConfig } from "swr";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FinalizePeriodModal } from "./finalize-period-modal";
import { useToast } from "@/hooks/use-toast";
import { User, Lock } from "lucide-react";
import { usePeriodStore } from "@/lib/period-store";

type PeriodOpt = {
  value: string;
  catatLabel: string;
  tagihanLabel: string;
};
const ZONA_ALL = "__ALL__";

export function MeterReadingForm() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { mutate } = useSWRConfig();
  const { toast } = useToast();

  // ====== local state
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedZona, setSelectedZona] = useState<string>(""); // ⬅️ NEW
  const [officerName, setOfficerName] = useState<string>("");

  const [isLoading, setIsLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [isFinalizingPeriod, setIsFinalizingPeriod] = useState(false);
  const [serverLocked, setServerLocked] = useState(false);
  const [finalizeTotal, setFinalizeTotal] = useState(0);
  const [finalizeSelesai, setFinalizeSelesai] = useState(0);
  const selectZonaValue = selectedZona ? selectedZona : ZONA_ALL;

  const [readingDate, setReadingDate] = useState<string>(() => {
    const d = new Date();
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-");
  });

  // ====== period store
  const {
    currentPeriod,
    setCurrentPeriod,
    isFinalPeriod,
    finalizePeriod: finalizePeriodLocally,
  } = usePeriodStore();

  // ====== utils
  function toDateYYYYMMDDSafe(input: string) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }

  // Update query string praktis
  function setQuery(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(sp?.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (!v) params.delete(k);
      else params.set(k, v);
    });
    router.replace(`${pathname}?${params.toString()}`);
  }

  // ====== Prefill dari localStorage (nama petugas)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tb_user");
      if (raw) {
        const u = JSON.parse(raw) as { name?: string };
        if (u?.name) setOfficerName(u.name);
      }
    } catch {}
  }, []);

  // ====== Prefill dari query (?periode, ?tanggal, ?petugas, ?zona)
  useEffect(() => {
    if (!sp) return;

    const qp = sp.get("periode") ?? "";
    const qt = sp.get("tanggal") ?? "";
    const qn = sp.get("petugas") ?? "";
    const qz = sp.get("zona") ?? "";

    if (qp) {
      setSelectedPeriod(qp);
      setCurrentPeriod(qp);
    }
    if (qt) {
      const normalized = toDateYYYYMMDDSafe(qt);
      if (normalized) setReadingDate(normalized);
    }
    if (qn) setOfficerName(qn);
    if (qz) setSelectedZona(qz); // ⬅️ zona
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  // Sinkronisasi period lokal dengan store jika kosong
  useEffect(() => {
    if (!selectedPeriod && currentPeriod) setSelectedPeriod(currentPeriod);
  }, [currentPeriod, selectedPeriod]);

  // Cek status lock periode di server tiap kali periode berubah
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!selectedPeriod) return setServerLocked(false);
      setChecking(true);
      try {
        const res = await fetch(`/api/catat-meter?periode=${selectedPeriod}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!cancelled && data?.ok) {
          const locked = !!data.locked;
          setServerLocked(locked);
          if (locked) finalizePeriodLocally(selectedPeriod, "server");
          setCurrentPeriod(selectedPeriod);
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [selectedPeriod, finalizePeriodLocally, setCurrentPeriod]);

  // Tulis periode/zona ke URL agar MeterGrid ikut baca
  useEffect(() => {
    if (selectedPeriod) setQuery({ periode: selectedPeriod });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod]);
  useEffect(() => {
    setQuery({ zona: selectedZona || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedZona]);

  // ====== Periode options (6 bulan ke depan mulai dari bulan berjalan/aturanmu)
  const periodOptions = useMemo<PeriodOpt[]>(() => {
    const opts: PeriodOpt[] = [];
    const now = new Date();
    const y = now.getFullYear();
    const startMonth = y === 2025 ? 6 : now.getMonth(); // contoh aturan
    for (let i = 0; i < 6; i++) {
      const catat = new Date(y, startMonth + i, 1);
      const tagih = new Date(catat.getFullYear(), catat.getMonth() + 1, 1);
      const value = `${catat.getFullYear()}-${String(
        catat.getMonth() + 1
      ).padStart(2, "0")}`;
      opts.push({
        value,
        catatLabel: catat.toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        }),
        tagihanLabel: tagih.toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        }),
      });
    }
    return opts;
  }, []);

  const selectedOption = useMemo(
    () => periodOptions.find((o) => o.value === selectedPeriod),
    [periodOptions, selectedPeriod]
  );
  const tagihanText = selectedOption
    ? `Untuk Penagihan ${selectedOption.tagihanLabel}`
    : "";

  // ====== Actions
  const handleStartReading = async () => {
    if (!selectedPeriod) {
      toast({
        title: "Periode belum dipilih",
        description: "Silakan pilih periode dulu",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/catat-meter?periode=${selectedPeriod}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ officerName, readingDate }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok)
        throw new Error(data?.message || "Gagal memuat data");
      setCurrentPeriod(selectedPeriod);
      await mutate(`/api/catat-meter?periode=${selectedPeriod}`);
      toast({
        title: "Siap dicatat",
        description: `Periode ${selectedPeriod} • Petugas: ${
          officerName || "-"
        } • Tgl: ${readingDate}`,
      });
    } catch (e: any) {
      toast({
        title: "Gagal memuat data",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openFinalizeModal = async () => {
    if (!selectedPeriod) return;
    try {
      const res = await fetch(`/api/catat-meter?periode=${selectedPeriod}`);
      const data = await res.json();
      if (res.ok && data?.ok) {
        setFinalizeTotal(data.progress?.total ?? 0);
        setFinalizeSelesai(data.progress?.selesai ?? 0);
      } else {
        setFinalizeTotal(0);
        setFinalizeSelesai(0);
      }
    } finally {
      setShowFinalizeModal(true);
    }
  };

  const handleFinalizePeriod = async () => {
    if (!selectedPeriod) return;
    setIsFinalizingPeriod(true);
    try {
      const res = await fetch(`/api/finalize?periode=${selectedPeriod}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (!res.ok || !data?.ok)
        throw new Error(data?.message || "Gagal finalize");
      await mutate(`/api/catat-meter?periode=${selectedPeriod}`);
      finalizePeriodLocally(selectedPeriod, "system");
      toast({
        title: "Terkunci",
        description: `Berhasil mengunci ${data.lockedRows} pelanggan DONE`,
      });
      setShowFinalizeModal(false);
    } catch (e: any) {
      toast({
        title: "Gagal finalize",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setIsFinalizingPeriod(false);
    }
  };

  const isCurrentPeriodFinal =
    !!selectedPeriod && (isFinalPeriod(selectedPeriod) || serverLocked);

  // ====== RENDER
  return (
    <div className="space-y-4">
      {/* Status */}
      {selectedPeriod && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Status Periode:</span>
          <Badge
            variant={isCurrentPeriodFinal ? "default" : "secondary"}
            className={
              isCurrentPeriodFinal
                ? "bg-green-100 text-green-800 hover:bg-green-100"
                : "bg-gray-100 text-gray-800 hover:bg-gray-100"
            }
          >
            {isCurrentPeriodFinal ? "FINAL" : "DRAFT"}
          </Badge>
          {officerName && (
            <span className="inline-flex items-center text-sm text-muted-foreground ml-2">
              <User className="w-4 h-4 mr-1" /> Petugas:
              <span className="ml-1 font-medium text-foreground">
                {officerName}
              </span>
            </span>
          )}
        </div>
      )}

      {/* Baris utama */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
        {/* Periode */}
        <div className="space-y-2">
          <Label htmlFor="period" className="text-base font-medium">
            Periode Pencatatan
          </Label>
          <Select
            value={selectedPeriod}
            onValueChange={setSelectedPeriod}
            disabled={isFinalizingPeriod || isLoading}
          >
            <SelectTrigger className="h-12 bg-card/50">
              <SelectValue placeholder="Pilih periode..." />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.catatLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedOption && (
            <p className="text-xs text-muted-foreground">
              Untuk Penagihan {selectedOption.tagihanLabel}
            </p>
          )}
          {checking && (
            <p className="text-xs text-muted-foreground">
              Mengecek status periode…
            </p>
          )}
        </div>

        {/* Tanggal catat */}
        <div className="space-y-2">
          <Label htmlFor="readingDate" className="text-base font-medium">
            Tanggal Catat
          </Label>
          <Input
            id="readingDate"
            type="date"
            value={readingDate}
            onChange={(e) => setReadingDate(e.target.value)}
            className="h-12 bg-card/50"
            disabled={isFinalizingPeriod || isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Tanggal rencana pencatatan bulan ini.
          </p>
        </div>

        {/* Petugas */}
        <div className="space-y-2">
          <Label className="text-base font-medium">Petugas</Label>
          <div className="h-12 px-3 rounded-md bg-muted/40 border flex items-center">
            <User className="w-4 h-4 mr-2 text-muted-foreground" />
            <span className="text-sm">{officerName || "-"}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Diambil otomatis dari akun yang login.
          </p>
        </div>
      </div>

      {/* Filter Zona */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-base font-medium">Filter Zona</Label>
          <Select
            value={selectZonaValue}
            onValueChange={(val) =>
              setSelectedZona(val === ZONA_ALL ? "" : val)
            }
            disabled={isFinalizingPeriod || isLoading}
          >
            <SelectTrigger className="h-10 bg-card/50">
              <SelectValue placeholder="Semua Zona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ZONA_ALL}>Semua Zona</SelectItem>
              {selectedZona && (
                <SelectItem value={selectedZona}>{selectedZona}</SelectItem>
              )}
              {/* TODO: isi opsi zona lain dari endpoint bila diperlukan */}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Menyaring pelanggan pada periode ini berdasarkan zona.
          </p>
        </div>
      </div>

      {/* Tombol */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={handleStartReading}
          className="h-12 w-full sm:flex-1"
          disabled={isLoading || checking || !selectedPeriod}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Memuat...
            </div>
          ) : (
            "Mulai Pencatatan"
          )}
        </Button>

        {selectedPeriod && (
          <Button
            onClick={openFinalizeModal}
            variant="outline"
            className="h-12 w-full sm:w-auto bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
            disabled={checking}
          >
            <Lock className="w-4 h-4 mr-2" /> Finalize & Kunci
          </Button>
        )}
      </div>

      {isCurrentPeriodFinal && (
        <div className="p-4 bg-green-50/50 border border-green-200/50 rounded-lg">
          <p className="text-sm font-medium text-green-800">
            Periode telah dikunci penuh
          </p>
          <p className="text-xs text-green-700">Seluruh baris terkunci.</p>
        </div>
      )}

      <FinalizePeriodModal
        isOpen={showFinalizeModal}
        onClose={() => setShowFinalizeModal(false)}
        onConfirm={handleFinalizePeriod}
        period={selectedPeriod}
        isLoading={isFinalizingPeriod}
        total={finalizeTotal}
        selesai={finalizeSelesai}
      />
    </div>
  );
}

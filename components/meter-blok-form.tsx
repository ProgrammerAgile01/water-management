// components/meter-blok-form.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSWRConfig } from "swr";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePeriodBlokStore } from "@/lib/meter-blok-store"; // dari lib yang kita buat
import { User } from "lucide-react";

type PeriodOpt = { value: string; label: string };

type ZoneOpt = { id: string; kode: string; nama: string };

const ZONA_ALL = "__ALL__";

export function MeterBlokForm() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { mutate } = useSWRConfig();
  const { toast } = useToast();

  const { currentPeriodBlok, setCurrentPeriodBlok } = usePeriodBlokStore();

  const [officerName, setOfficerName] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedZona, setSelectedZona] = useState<string>("");
  const [readingDate, setReadingDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const [zones, setZones] = useState<ZoneOpt[]>([]);
  const zonaSelectValue = selectedZona || ZONA_ALL;

  // ————— Utils —————
  const safePeriod = (p: string) =>
    (p || "").replace(/[^0-9-]/g, "").slice(0, 7); // <- singkirkan “:1” dll

  const setQuery = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams(sp?.toString());
    Object.entries(next).forEach(([k, v]) =>
      v ? params.set(k, v) : params.delete(k)
    );
    router.replace(`${pathname}?${params.toString()}`);
  };

  // ————— Prefill —————
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tb_user");
      if (raw) {
        const u = JSON.parse(raw) as { name?: string };
        if (u?.name) setOfficerName(u.name);
      }
    } catch {}
  }, []);

  useEffect(() => {
    // baca dari query
    const qp = safePeriod(sp?.get("periode") ?? "");
    const qz = sp?.get("zona") ?? "";
    if (qp) {
      setSelectedPeriod(qp);
      setCurrentPeriodBlok(qp);
    }
    if (qz) setSelectedZona(qz);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  // sinkron state -> URL
  useEffect(() => {
    if (selectedPeriod) setQuery({ periode: selectedPeriod });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod]);

  useEffect(() => {
    setQuery({ zona: selectedZona || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedZona]);

  // jika store sudah punya period
  useEffect(() => {
    if (!selectedPeriod && currentPeriodBlok)
      setSelectedPeriod(currentPeriodBlok);
  }, [currentPeriodBlok, selectedPeriod]);

  // Periode options: 2 bulan ke belakang + 4 ke depan (6 item total)
  const periodOptions = useMemo<PeriodOpt[]>(() => {
    const now = new Date();
    const list: PeriodOpt[] = [];
    for (let offset = -2; offset <= 3; offset++) {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      const label = d.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      });
      list.push({ value: val, label });
    }
    return list;
  }, []);

  // ambil daftar zona (untuk filter)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/zona?page=1&pageSize=300", {
          cache: "no-store",
        });
        const json = await res.json();
        const arr = Array.isArray(json?.items)
          ? json.items
          : Array.isArray(json)
          ? json
          : [];
        const z: ZoneOpt[] = arr.map((i: any) => ({
          id: String(i.id ?? i.kode),
          kode: String(i.kode ?? ""),
          nama: String(i.nama ?? ""),
        }));
        setZones(z);
      } catch {
        setZones([]);
      }
    })();
  }, []);

  const handleInit = async () => {
    const p = safePeriod(selectedPeriod);
    if (!p) {
      toast({ title: "Periode belum dipilih", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(`/api/catat-meter-blok?periode=${p}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ officerName, readingDate }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.message || "Gagal memuat");
      setCurrentPeriodBlok(p);
      await mutate(
        `/api/catat-meter-blok?periode=${p}${
          selectedZona ? `&zona=${encodeURIComponent(selectedZona)}` : ""
        }`
      );
      toast({ title: "Siap dicatat", description: `Periode ${p}` });
    } catch (e: any) {
      toast({
        title: "Gagal",
        description: e?.message ?? "Error",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* status ringkas */}
      {selectedPeriod && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Periode:</span>
          <Badge variant="secondary">{selectedPeriod}</Badge>
          {officerName && (
            <span className="inline-flex items-center text-sm text-muted-foreground ml-2">
              <User className="w-4 h-4 mr-1" /> {officerName}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
        <div className="space-y-2">
          <Label>Periode</Label>
          <Select
            value={selectedPeriod}
            onValueChange={(v) => setSelectedPeriod(safePeriod(v))}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Pilih periode..." />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedPeriod && (
            <p className="text-xs text-muted-foreground">
              Untuk Penagihan{" "}
              {(() => {
                const [y, m] = selectedPeriod.split("-").map(Number);
                const d = new Date(y, m ?? 1, 1);
                return d.toLocaleDateString("id-ID", {
                  month: "long",
                  year: "numeric",
                });
              })()}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Tanggal Catat</Label>
          <Input
            type="date"
            value={readingDate}
            onChange={(e) => setReadingDate(e.target.value)}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label>Filter Zona</Label>
          <Select
            value={zonaSelectValue}
            onValueChange={(v) => setSelectedZona(v === ZONA_ALL ? "" : v)}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Semua Zona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ZONA_ALL}>Semua Zona</SelectItem>
              {zones.map((z) => (
                <SelectItem key={z.id} value={z.kode}>
                  {z.nama ? `${z.nama} (Blok ${z.kode})` : `Blok ${z.kode}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Menyaring pelanggan berdasarkan blok (kode zona).
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          className="h-11"
          onClick={handleInit}
          disabled={!selectedPeriod}
        >
          Mulai Pencatatan
        </Button>
      </div>
    </div>
  );
}

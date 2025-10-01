"use client";

import React, { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Network,
  Droplets,
  MapPin,
  Home,
  Search,
  Layers,
  Users,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";

import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { AppHeader } from "@/components/app-header";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";

/* =========================
   Types & fetcher
========================= */
type Pel = {
  id: string;
  kode: string;
  nama: string;
  alamat: string;
  noUrut?: number | null;
};
type ZonaNode = {
  id: string;
  kode?: string | null;
  nama: string;
  totalPelanggan: number;
  pelanggan: Pel[];
};
type TandonNode = {
  id: string;
  kode: string;
  nama: string;
  deskripsi?: string | null;
  initialMeter: number;
  totalZona: number;
  totalPelanggan: number;
  zonas: ZonaNode[];
};
type ApiResp = { ok: true; items: TandonNode[] };

const fetcher = (u: string) => fetch(u).then((r) => r.json());

/* =========================
   Helpers & small UI
========================= */
function clsx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}
function KpiBadge({
  icon,
  label,
  tone = "primary",
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  tone?: "primary" | "muted" | "card";
}) {
  const base =
    tone === "primary"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : tone === "muted"
      ? "bg-gray-100 text-gray-700 border-gray-200"
      : "bg-white/70 backdrop-blur text-foreground/80 border-border/30 shadow-sm";
  return (
    <Badge className={clsx(base, "gap-1.5 font-medium h-6 px-2 text-[11px]")}>
      {icon}
      {label}
    </Badge>
  );
}

/* =========================
   Cards (punya mode compact)
========================= */
function TandonCard({
  t,
  active,
  onClick,
  compact = false,
}: {
  t: TandonNode;
  active?: boolean;
  onClick?: () => void;
  compact?: boolean;
}) {
  return (
    <m.button
      layout
      onClick={onClick}
      className={clsx(
        "text-left rounded-2xl border transition-all w-full",
        compact ? "p-3" : "p-4",
        "bg-primary/5 hover:bg-primary/10",
        active ? "ring-2 ring-primary border-transparent" : "border-border/40"
      )}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.995 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={clsx(
              "rounded-2xl bg-primary/10 flex items-center justify-center",
              compact ? "p-1.5" : "p-2"
            )}
          >
            <Droplets className={clsx(compact ? "w-4 h-4" : "w-5 h-5")} />
          </div>
          <div className="min-w-0">
            <div
              className={clsx(
                "text-primary font-semibold leading-tight truncate",
                compact ? "text-[13px]" : "text-sm sm:text-base"
              )}
            >
              {t.kode}
            </div>
            <div
              className={clsx(
                "font-semibold text-foreground leading-tight truncate",
                compact ? "text-[14px]" : "text-base sm:text-lg"
              )}
            >
              {t.nama}
            </div>
            {t.deskripsi && !compact && (
              <div className="text-xs text-muted-foreground line-clamp-1">
                {t.deskripsi}
              </div>
            )}
          </div>
        </div>

        {/* di compact: ringkas badge biar tidak melebar */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {!compact && (
            <>
              <KpiBadge
                icon={<Layers className="w-3.5 h-3.5" />}
                label={`${t.totalZona} Blok`}
                tone="card"
              />
              <KpiBadge
                icon={<Users className="w-3.5 h-3.5" />}
                label={`${t.totalPelanggan} Rumah`}
                tone="muted"
              />
            </>
          )}
          <KpiBadge
            icon={<Droplets className="w-3.5 h-3.5" />}
            label={`Init ${t.initialMeter}`}
            tone="primary"
          />
        </div>
      </div>
    </m.button>
  );
}
function ZonaCard({
  z,
  active,
  onClick,
  compact = false,
}: {
  z: ZonaNode;
  active?: boolean;
  onClick?: () => void;
  compact?: boolean;
}) {
  return (
    <m.button
      layout
      onClick={onClick}
      className={clsx(
        "text-left rounded-2xl border transition-all w-full",
        compact ? "p-3" : "p-4",
        "bg-card/60 hover:bg-card",
        active ? "ring-2 ring-primary border-transparent" : "border-border/40"
      )}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.995 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={clsx(
              "rounded-2xl bg-primary/10 flex items-center justify-center",
              compact ? "p-1.5" : "p-2"
            )}
          >
            <MapPin className={clsx(compact ? "w-4 h-4" : "w-5 h-5")} />
          </div>
          <div className="min-w-0">
            <div className="text-primary font-medium leading-tight text-sm truncate">
              {z.kode || "-"}
            </div>
            <div
              className={clsx(
                "font-semibold text-foreground leading-tight truncate",
                compact ? "text-[14px]" : "text-[15px] sm:text-base"
              )}
            >
              {z.nama}
            </div>
            {!compact && (
              <div className="text-xs text-muted-foreground">
                {z.totalPelanggan} pelanggan aktif
              </div>
            )}
          </div>
        </div>

        {/* di compact, badge kecil supaya tidak nabrak */}
        <Badge className="h-6 px-2 text-[11px] bg-primary/10 text-primary border-primary/20">
          <Users className="w-3.5 h-3.5 mr-1" />
          {z.totalPelanggan}
        </Badge>
      </div>
    </m.button>
  );
}
function PelCard({ p, compact = false }: { p: Pel; compact?: boolean }) {
  return (
    <m.div
      layout
      className={clsx(
        "rounded-2xl border bg-muted/30 border-border/40 w-full",
        compact ? "p-3" : "p-4"
      )}
      whileHover={{ scale: 1.005 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={clsx(
              "rounded-2xl bg-primary/10 flex items-center justify-center",
              compact ? "p-1.5" : "p-2"
            )}
          >
            <Home className={clsx(compact ? "w-4 h-4" : "w-5 h-5")} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-primary font-medium leading-tight text-sm truncate">
            {p.kode}
          </div>
          <div
            className={clsx(
              "font-medium text-foreground leading-tight truncate",
              compact ? "text-[14px]" : "text-[15px]"
            )}
          >
            {p.nama}
          </div>
          {!compact && (
            <div className="text-xs text-muted-foreground line-clamp-1">
              {p.alamat}
            </div>
          )}
        </div>
        {p.noUrut != null && (
          <Badge variant="secondary" className="bg-muted/50 h-6">
            No. {p.noUrut}
          </Badge>
        )}
      </div>
    </m.div>
  );
}

/* =========================
   TAB 1 — List Tree
========================= */
function TreeConnector({ level = 0 }: { level: number }) {
  return (
    <div
      className="relative"
      style={{ width: level === 0 ? 0 : 20, minWidth: level === 0 ? 0 : 20 }}
    >
      {level > 0 && (
        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-border/50" />
      )}
    </div>
  );
}
function RowHeader({
  leftIcon,
  title,
  subtitle,
  right,
  onToggle,
  expanded,
  level,
  tone = "default",
}: {
  leftIcon: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  onToggle?: () => void;
  expanded?: boolean;
  level: number;
  tone?: "default" | "primary" | "muted";
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary/10"
      : tone === "muted"
      ? "bg-muted/40"
      : "bg-card/50";
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg ${toneClass} text-sm`}
    >
      <TreeConnector level={level} />
      {onToggle ? (
        <button
          onClick={onToggle}
          className="shrink-0 w-7 h-7 rounded-md border flex items-center justify-center hover:bg-muted/70"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
        </button>
      ) : (
        <div className="shrink-0 w-7 h-7" />
      )}

      <div className="shrink-0 w-8 h-8 rounded-2xl bg-primary/10 flex items-center justify-center">
        {leftIcon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-medium text-foreground truncate">{title}</div>
          {subtitle && (
            <div className="text-xs text-muted-foreground truncate">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">{right}</div>
    </div>
  );
}
function PelItem({ p, level }: { p: Pel; level: number }) {
  return (
    <div className="pl-6">
      <RowHeader
        level={level}
        leftIcon={<Home className="w-4 h-4" />}
        title={
          <span className="flex items-center gap-2">
            <span className="text-primary font-medium">{p.kode}</span>
            <span>{p.nama}</span>
          </span>
        }
        subtitle={<span className="truncate">{p.alamat}</span>}
        right={
          p.noUrut != null ? (
            <Badge variant="secondary" className="bg-muted/50 h-6">
              No. {p.noUrut}
            </Badge>
          ) : null
        }
      />
    </div>
  );
}
function ZonaListNode({ z, level }: { z: ZonaNode; level: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      <RowHeader
        level={level}
        onToggle={() => setOpen((o) => !o)}
        expanded={open}
        leftIcon={<MapPin className="w-4 h-4" />}
        title={
          <span className="flex items-center gap-2">
            <span className="text-primary font-medium">{z.kode ?? "-"}</span>
            <span>{z.nama}</span>
          </span>
        }
        subtitle={<span>{z.totalPelanggan} pelanggan</span>}
        right={
          <Badge className="bg-primary/10 text-primary border-primary/20 h-6">
            {z.totalPelanggan} Rumah
          </Badge>
        }
        tone="muted"
      />
      {open && (
        <div className="pl-8 space-y-2">
          {z.pelanggan.length ? (
            z.pelanggan.map((p) => (
              <PelItem key={p.id} p={p} level={level + 2} />
            ))
          ) : (
            <div className="pl-6 text-xs text-muted-foreground">
              Belum ada pelanggan.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function ListTreeView({ data }: { data: TandonNode[] }) {
  return (
    <GlassCard className="p-4">
      {data.length === 0 ? (
        <div className="p-3 text-sm text-muted-foreground">Tidak ada data.</div>
      ) : (
        <div className="space-y-4">
          {data.map((t) => (
            <div key={t.id} className="space-y-3">
              <RowHeader
                level={0}
                leftIcon={<Droplets className="w-4 h-4" />}
                title={
                  <span className="flex items-center gap-2">
                    <span className="text-primary font-semibold">{t.kode}</span>
                    <span className="font-semibold">{t.nama}</span>
                  </span>
                }
                subtitle={
                  <span>
                    {t.totalZona} blok • {t.totalPelanggan} pelanggan
                  </span>
                }
                right={
                  <Badge variant="secondary" className="bg-card/60 h-6">
                    Initial: {t.initialMeter}
                  </Badge>
                }
                tone="primary"
              />
              <div className="pl-8 space-y-2">
                {t.zonas.length ? (
                  t.zonas.map((z) => (
                    <ZonaListNode key={z.id} z={z} level={1} />
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground pl-6">
                    Belum ada blok/zona.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

/* =========================
   TAB 2 — Motion Cards
========================= */
function CardsTreeView({
  data,
  q,
  limit,
  onReset,
}: {
  data: TandonNode[];
  q: string;
  limit: string;
  onReset: () => void;
}) {
  const tandons = data;
  const [selTandonId, setSelTandonId] = useState<string>("");
  const [selZonaId, setSelZonaId] = useState<string>("");
  const activeTandon = useMemo(
    () => tandons.find((t) => t.id === selTandonId) || tandons[0],
    [tandons, selTandonId]
  );
  const zonas = activeTandon?.zonas ?? [];
  const activeZona = useMemo(
    () => zonas.find((z) => z.id === selZonaId) || zonas[0],
    [zonas, selZonaId]
  );

  const [step, setStep] = useState<0 | 1 | 2>(0);
  useEffect(() => {
    setStep(0);
    setSelTandonId("");
    setSelZonaId("");
  }, [q, limit]);

  return (
    <GlassCard className="p-4">
      {/* Desktop: 3 kolom dengan jarak vertikal */}
      <div className="hidden lg:grid grid-cols-3 gap-4">
        <div className="space-y-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tandon
          </div>
          <LazyMotion features={domAnimation}>
            <AnimatePresence initial={false}>
              {tandons.map((t) => (
                <m.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  <TandonCard
                    t={t}
                    active={t.id === (activeTandon?.id ?? "")}
                    onClick={() => {
                      setSelTandonId(t.id);
                      setSelZonaId("");
                    }}
                  />
                </m.div>
              ))}
            </AnimatePresence>
          </LazyMotion>
        </div>

        <div className="space-y-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Blok
          </div>
          <LazyMotion features={domAnimation}>
            <AnimatePresence initial={false}>
              {zonas.length ? (
                zonas.map((z) => (
                  <m.div
                    key={z.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                  >
                    <ZonaCard
                      z={z}
                      active={z.id === (activeZona?.id ?? "")}
                      onClick={() => setSelZonaId(z.id)}
                    />
                  </m.div>
                ))
              ) : (
                <div className="p-3 text-sm text-muted-foreground">
                  Belum ada blok.
                </div>
              )}
            </AnimatePresence>
          </LazyMotion>
        </div>

        <div className="space-y-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Rumah / Pelanggan
          </div>
          <LazyMotion features={domAnimation}>
            <AnimatePresence initial={false}>
              {!activeZona ? (
                <div className="p-3 text-sm text-muted-foreground">
                  Pilih blok.
                </div>
              ) : activeZona.pelanggan.length ? (
                activeZona.pelanggan.map((p) => (
                  <m.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                  >
                    <PelCard p={p} />
                  </m.div>
                ))
              ) : (
                <div className="p-3 text-sm text-muted-foreground">
                  Belum ada pelanggan.
                </div>
              )}
            </AnimatePresence>
          </LazyMotion>
        </div>
      </div>

      {/* Mobile: stepper + spacing */}
      <div className="lg:hidden space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-foreground">
            {step === 0
              ? "Pilih Tandon"
              : step === 1
              ? "Pilih blok"
              : "Daftar Pelanggan"}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStep((s) => (s - 1) as any)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Kembali
              </Button>
            )}
            {step < 2 && (
              <Button
                size="sm"
                variant="outline"
                disabled={step === 0 ? !activeTandon : !activeZona}
                onClick={() => setStep((s) => (s + 1) as any)}
              >
                Lanjut <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onReset}>
              <RefreshCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>

        {step === 0 && (
          <div className="grid gap-3">
            {tandons.map((t) => (
              <TandonCard
                key={t.id}
                t={t}
                active={t.id === (activeTandon?.id ?? "")}
                onClick={() => {
                  setSelTandonId(t.id);
                  setSelZonaId("");
                  setStep(1);
                }}
              />
            ))}
          </div>
        )}
        {step === 1 && (
          <div className="grid gap-3">
            {zonas.length ? (
              zonas.map((z) => (
                <ZonaCard
                  key={z.id}
                  z={z}
                  active={z.id === (activeZona?.id ?? "")}
                  onClick={() => {
                    setSelZonaId(z.id);
                    setStep(2);
                  }}
                />
              ))
            ) : (
              <div className="p-3 text-sm text-muted-foreground">
                Belum ada blok.
              </div>
            )}
          </div>
        )}
        {step === 2 && (
          <div className="grid gap-3">
            {!activeZona ? (
              <div className="p-3 text-sm text-muted-foreground">
                Pilih blok dahulu.
              </div>
            ) : activeZona.pelanggan.length ? (
              activeZona.pelanggan.map((p) => <PelCard key={p.id} p={p} />)
            ) : (
              <div className="p-3 text-sm text-muted-foreground">
                Belum ada pelanggan.
              </div>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
}

/* =========================
   TAB 3 — Org Chart (semua pelanggan ditampilkan)
========================= */
function OrgChartView({ data }: { data: TandonNode[] }) {
  const [selTandonId, setSelTandonId] = useState<string>(data[0]?.id ?? "");
  const tandon = useMemo(
    () => data.find((t) => t.id === selTandonId) || data[0],
    [data, selTandonId]
  );
  const zonas = tandon?.zonas ?? [];

  return (
    <GlassCard className="p-4">
      {data.length === 0 ? (
        <div className="p-3 text-sm text-muted-foreground">Tidak ada data.</div>
      ) : (
        <>
          {/* Picker tandon */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tandon
            </div>
            <Select value={selTandonId} onValueChange={setSelTandonId}>
              <SelectTrigger className="w-[260px] bg-card/50">
                <SelectValue placeholder="Pilih tandon" />
              </SelectTrigger>
              <SelectContent>
                {data.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.kode} • {t.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* MOBILE: satu kolom */}
          <div className="md:hidden space-y-4">
            <div className="rounded-lg border p-3 bg-card/60">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Tandon
              </div>
              <TandonCard t={tandon} compact />
            </div>
            <div className="rounded-lg border p-3 bg-card/60">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Blok & Pelanggan
              </div>
              <div className="space-y-6">
                {zonas.map((z) => (
                  <div key={z.id}>
                    <ZonaCard z={z} compact />
                    <div className="relative pl-6 mt-2">
                      <div className="absolute left-2 top-0 bottom-0 w-px bg-border/40" />
                      {z.pelanggan.map((p) => (
                        <div key={p.id} className="relative mb-2">
                          <div className="absolute left-1 top-5 -translate-x-1/2 w-2 h-2 rounded-full bg-primary/60" />
                          <PelCard p={p} compact />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* DESKTOP: Zona = kolom, pelanggan vertikal semua */}
          <div className="hidden md:block">
            <div className="overflow-x-auto pb-2">
              <div className="min-w-[1100px] px-4">
                <div className="flex justify-center">
                  <div className="w-[300px]">
                    <TandonCard t={tandon} compact />
                  </div>
                </div>

                <div className="relative mt-8">
                  {zonas.length > 0 && (
                    <div className="absolute left-0 right-0 -top-6 h-px bg-border/60 z-0" />
                  )}
                  <div
                    className={clsx(
                      "grid gap-4 justify-center",
                      zonas.length <= 2
                        ? "grid-cols-2"
                        : zonas.length <= 4
                        ? "grid-cols-4"
                        : "grid-cols-6"
                    )}
                  >
                    {zonas.map((z) => (
                      <div key={z.id} className="relative z-10">
                        <div className="absolute left-1/2 -translate-x-1/2 -top-6 h-6 w-px bg-border/60 z-0" />
                        <div className="w-[200px] mx-auto">
                          <ZonaCard z={z} compact />
                        </div>

                        <div className="relative mt-3 pl-0 w-[260px] mx-auto">
                          {/* <div className="absolute left-2 top-0 bottom-0 w-px bg-border/40" /> */}
                          <div className="space-y-3">
                            {z.pelanggan.map((p) => (
                              <div key={p.id} className="relative">
                                <div className="absolute left-2 top-5 -translate-x-1/2 w-2 h-2 rounded-full bg-primary/60" />
                                <div className="w-[200px]">
                                  <PelCard p={p} compact />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </GlassCard>
  );
}

/* =========================
   MAIN PAGE
========================= */
export default function HirarkiDistribusiTabsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [tab, setTab] = useState<"list" | "cards" | "org">(
    (sp?.get("tab") as any) || "list"
  );
  const [q, setQ] = useState(sp?.get("q") ?? "");
  const [limit, setLimit] = useState(sp?.get("limit") ?? "50");

  function setQuery(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(sp?.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (!v) params.delete(k);
      else params.set(k, v);
    });
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }
  useEffect(() => {
    setQuery({ tab, q: q || undefined, limit: limit || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, q, limit]);

  const listKey = useMemo(() => {
    const params = new URLSearchParams();
    if (q) params.set("keyword", q);
    if (limit) params.set("limitPelanggan", limit);
    return `/api/distribusi/hirarki?${params.toString()}`;
  }, [q, limit]);

  const { data, isLoading, error, mutate } = useSWR<ApiResp>(listKey, fetcher, {
    revalidateOnFocus: false,
  });
  const items = (data?.ok ? data.items : []) as TandonNode[];

  const totalTandon = items.length;
  const totalZona = items.reduce((a, t) => a + t.totalZona, 0);
  const totalPelanggan = items.reduce((a, t) => a + t.totalPelanggan, 0);

  return (
    <AuthGuard requiredRole="ADMIN">
      <AppShell>
        <div className="max-w-7xl mx-auto space-y-6 pb-28">
          <AppHeader title="Hirarki Distribusi" />

          {/* Header KPIs, Search, Tabs */}
          <GlassCard className="p-6">
            <div className="flex flex-col gap-4">
              {/* KPIs + Search */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                {/* ...bagian KPI + search persis seperti sebelumnya... */}
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Network className="w-4 h-4" />
                    <span className="text-sm">
                      Visual: <b>Tandon → Blok → Rumah/Pelanggan</b>
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <KpiBadge
                      icon={<Network className="w-3.5 h-3.5" />}
                      label={`${totalTandon} Tandon`}
                      tone="card"
                    />
                    <KpiBadge
                      icon={<Layers className="w-3.5 h-3.5" />}
                      label={`${totalZona} Blok`}
                      tone="muted"
                    />
                    <KpiBadge
                      icon={<Users className="w-3.5 h-3.5" />}
                      label={`${totalPelanggan} Rumah`}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Cari tandon/blok/pelanggan/alamat…"
                      className="pl-10 w-full bg-card/50"
                    />
                  </div>
                  <Select value={limit} onValueChange={setLimit}>
                    <SelectTrigger className="w-[150px] bg-card/50">
                      <SelectValue placeholder="Limit rumah" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="all">Semua</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    className="bg-muted/40"
                    onClick={() => {
                      setQ("");
                      setLimit("50");
                      mutate();
                    }}
                  >
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </div>

              {/* Segmented tab — FIX: stack di mobile, 3 kolom mulai sm */}
              <div className="w-full">
                <div className="rounded-lg border bg-card/50 overflow-hidden">
                  <div className="grid grid-cols-1 sm:grid-cols-3">
                    <Button
                      className="h-10 w-full rounded-none text-[13px] sm:text-sm whitespace-nowrap"
                      variant={tab === "list" ? "default" : "ghost"}
                      onClick={() => setTab("list")}
                    >
                      <span className="truncate">1. List Tree</span>
                    </Button>
                    <Button
                      className="h-10 w-full rounded-none text-[13px] sm:text-sm whitespace-nowrap sm:border-l sm:border-border/40"
                      variant={tab === "cards" ? "default" : "ghost"}
                      onClick={() => setTab("cards")}
                    >
                      <span className="truncate">2. Motion Cards</span>
                    </Button>
                    <Button
                      className="h-10 w-full rounded-none text-[13px] sm:text-sm whitespace-nowrap sm:border-l sm:border-border/40"
                      variant={tab === "org" ? "default" : "ghost"}
                      onClick={() => setTab("org")}
                    >
                      <span className="truncate">3. Org Chart</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Content */}
          {isLoading && (
            <GlassCard className="p-4">
              <div className="p-3 text-sm text-muted-foreground">Memuat…</div>
            </GlassCard>
          )}
          {error && (
            <GlassCard className="p-4">
              <div className="p-3 text-sm text-destructive">
                Gagal memuat data.
              </div>
            </GlassCard>
          )}

          {!isLoading && !error && (
            <>
              {tab === "list" && <ListTreeView data={items} />}
              {tab === "cards" && (
                <CardsTreeView
                  data={items}
                  q={q}
                  limit={limit}
                  onReset={() => {
                    setQ("");
                    setLimit("50");
                    mutate();
                  }}
                />
              )}
              {/* kalau komponen OrgChartView-mu tidak menerima prop 'maxPelPerZona', hapus saja argumen itu */}
              {tab === "org" && <OrgChartView data={items} />}
            </>
          )}
        </div>
      </AppShell>
    </AuthGuard>
  );
}

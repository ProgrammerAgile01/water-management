"use client";

import { useEffect, useState } from "react";
import { Search, Calendar, Users, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlassCard } from "@/components/glass-card";
import { useScheduleStore } from "@/lib/schedule-store";
import {
  fetchJadwal,
  fetchPetugasOptions,
  fetchZonaOptions,
} from "@/lib/jadwal-api";

const statusTabs = [
  { value: "all", label: "Semua" },
  { value: "waiting", label: "Waiting" },
  { value: "in-progress", label: "In Progress" },
  { value: "non-progress", label: "Non-Progress" },
  { value: "finished", label: "Finished" },
  { value: "overdue", label: "Overdue" },
];

type PetugasOpt = { id: string; nama: string; avatar?: string };
type ZonaOpt = { id: string; nama: string };

export function ScheduleFilters() {
  const { filters, setFilters } = useScheduleStore();

  const [petugasOptions, setPetugasOptions] = useState<PetugasOpt[]>([]);
  const [zonaOptions, setZonaOptions] = useState<ZonaOpt[]>([]);
  const [loadingOpts, setLoadingOpts] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingOpts(true);
      try {
        const [p, z] = await Promise.all([
          fetchPetugasOptions(),
          fetchZonaOptions(),
          fetchJadwal,
        ]);
        setPetugasOptions(p);
        setZonaOptions(z);
      } finally {
        setLoadingOpts(false);
      }
    })();
  }, []);

  const handleMonthChange = (value: string) => {
    // nilai dari <input type="month" /> sudah "YYYY-MM"
    setFilters({ month: value });
  };

  const handleZonaChange = (value: string) => {
    setFilters({ zonaId: value === "all" ? "" : value });
  };

  const handlePetugasChange = (value: string) => {
    setFilters({ petugasId: value === "all" ? "" : value });
  };

  const handleSearchChange = (value: string) => {
    setFilters({ search: value });
  };

  const handleStatusChange = (value: string) => {
    setFilters({ status: value });
  };

  return (
    <GlassCard className="p-6 mb-6">
      {/* First Row - Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {/* Bulan */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Bulan
          </label>
          <Input
            type="month"
            value={filters.month}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="bg-white/50 border-white/20"
          />
        </div>

        {/* Zona (by ID) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Blok
          </label>
          <Select
            value={filters.zonaId || "all"}
            onValueChange={handleZonaChange}
            disabled={loadingOpts}
          >
            <SelectTrigger className="bg-white/50 border-white/20">
              <SelectValue placeholder="Pilih blok" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Blok</SelectItem>
              {zonaOptions.map((z) => (
                <SelectItem key={z.id} value={z.id}>
                  {z.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Petugas (by ID) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            Petugas
          </label>
          <Select
            value={filters.petugasId || "all"}
            onValueChange={handlePetugasChange}
            disabled={loadingOpts}
          >
            <SelectTrigger className="bg-white/50 border-white/20">
              <SelectValue placeholder="Pilih petugas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Petugas</SelectItem>
              {petugasOptions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Pencarian */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Search className="h-4 w-4" />
            Pencarian
          </label>
          <Input
            placeholder="Cari blok/alamat/petugas..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="bg-white/50 border-white/20"
          />
        </div>
      </div>

      {/* Second Row - Status Tabs (responsive, left align desktop) */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Status</label>
        <Tabs value={filters.status} onValueChange={handleStatusChange}>
          <div className="-mx-4 px-4 md:m-0 md:p-0">
            <div className="overflow-x-auto md:overflow-visible">
              <TabsList
                className="
            bg-white/30 p-1
            inline-flex gap-1
            md:flex md:flex-wrap md:justify-start
          "
              >
                {statusTabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="
                h-8 px-3 shrink-0 whitespace-nowrap
                data-[state=active]:bg-primary
                data-[state=active]:text-primary-foreground
              "
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>
        </Tabs>
      </div>
    </GlassCard>
  );
}

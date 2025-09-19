"use client";

import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { AppHeader } from "@/components/app-header";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWaterIssuesStore } from "@/lib/water-issues-store";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Filter } from "lucide-react";

// ⬇️ file lain dan UI dibiarkan apa adanya

export default function KendalaPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"unresolved" | "solved">(
    "unresolved"
  );
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [solution, setSolution] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIssue, setNewIssue] = useState({
    issue: "",
    description: "",
    reporter: "",
    phone: "",
    address: "",
    priority: "medium" as const,
  });

  const { issues, addIssue, solveIssue, updateIssue, setIssues } =
    useWaterIssuesStore();
  const { toast } = useToast();

  // === HYDRATE dari API (selalu replace mock jika ada) ===
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/kendala", { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();

        // ambil manual reports yang sudah ada di store agar tidak hilang
        const manual = issues.filter((i) => i.source === "manual_report");

        // normalisasi dari API (struktur sudah sama dengan store oleh route.ts yang kita buat)
        const fromApi: typeof manual = (data.items ?? []).map((it: any) => ({
          id: it.id,
          issue: it.issue,
          description: it.description ?? null,
          reporter: it.reporter,
          phone: it.phone,
          address: it.address,
          priority: it.priority,
          status: it.status, // "unresolved"
          source: it.source, // "meter_reading" / "meter_reading_blok"
          date: it.date,
          solution: it.solution ?? null,
          solvedDate: it.solvedDate ?? null,
        }));

        // merge: API + MANUAL (hindari duplikat id)
        const map = new Map<string, any>();
        for (const x of fromApi) map.set(x.id, x);
        for (const m of manual) map.set(m.id, m);

        if (!cancelled) setIssues(Array.from(map.values()));
      } catch (e) {
        console.error("Gagal memuat kendala dari API:", e);
        // tidak mengganti store jika gagal — biarkan isi sebelumnya (mungkin manual)
      }
    })();
    return () => {
      cancelled = true;
    };
    // dependencies sengaja tidak memasukkan `issues` agar tidak loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ====== (UI kamu tetap) ======
  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      issue.issue.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.reporter.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (issue.description || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesTab = issue.status === activeTab;
    const matchesPriority =
      priorityFilter === "all" || issue.priority === priorityFilter;

    return matchesSearch && matchesTab && matchesPriority;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      case "low":
        return "outline";
      default:
        return "outline";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high":
        return "Tinggi";
      case "medium":
        return "Sedang";
      case "low":
        return "Rendah";
      default:
        return "Normal";
    }
  };

  const handleSolveIssue = (issueId: string) => {
    if (solution.trim()) {
      solveIssue(issueId, solution.trim());
      setSelectedIssue(null);
      setSolution("");
      toast({
        title: "Kendala Diselesaikan",
        description: "Kendala telah ditandai sebagai selesai",
      });
    }
  };

  const handleAddIssue = () => {
    if (
      newIssue.issue.trim() &&
      newIssue.reporter.trim() &&
      newIssue.phone.trim()
    ) {
      addIssue({
        ...newIssue,
        status: "unresolved",
        source: "manual_report",
      } as any);

      setNewIssue({
        issue: "",
        description: "",
        reporter: "",
        phone: "",
        address: "",
        priority: "medium",
      });
      setShowAddForm(false);

      toast({
        title: "Kendala Ditambahkan",
        description: "Kendala baru berhasil ditambahkan ke sistem",
      });
    }
  };

  const unresolvedCount = useMemo(
    () => issues.filter((i) => i.status === "unresolved").length,
    [issues]
  );
  const solvedCount = useMemo(
    () => issues.filter((i) => i.status === "solved").length,
    [issues]
  );

  return (
    <AuthGuard>
      <AppShell>
        <div className="max-w-7xl mx-auto space-y-6">
          <AppHeader
            title="Kendala Air"
            breadcrumbs={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Kendala Air" },
            ]}
          />

          {/* --- UI DI BAWAH INI TIDAK DIUBAH --- */}
          <GlassCard className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Manajemen Kendala Air
                </h2>
                <p className="text-muted-foreground">
                  Kelola dan pantau kendala air pelanggan
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Kendala
                </Button>
              </div>
            </div>

            {showAddForm && (
              <div className="mb-6 p-4 bg-muted/20 rounded-lg">
                <h3 className="text-lg font-medium text-foreground mb-4">
                  Tambah Kendala Baru
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Judul Kendala *
                    </label>
                    <Input
                      value={newIssue.issue}
                      onChange={(e) =>
                        setNewIssue((prev) => ({
                          ...prev,
                          issue: e.target.value,
                        }))
                      }
                      placeholder="Contoh: Pipa bocor di Jl. Merdeka"
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Prioritas
                    </label>
                    <Select
                      value={newIssue.priority}
                      onValueChange={(value: any) =>
                        setNewIssue((prev) => ({ ...prev, priority: value }))
                      }
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">Tinggi</SelectItem>
                        <SelectItem value="medium">Sedang</SelectItem>
                        <SelectItem value="low">Rendah</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Nama Pelapor *
                    </label>
                    <Input
                      value={newIssue.reporter}
                      onChange={(e) =>
                        setNewIssue((prev) => ({
                          ...prev,
                          reporter: e.target.value,
                        }))
                      }
                      placeholder="Nama lengkap pelapor"
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      No. Telepon *
                    </label>
                    <Input
                      value={newIssue.phone}
                      onChange={(e) =>
                        setNewIssue((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      placeholder="081234567890"
                      className="h-10"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Alamat
                    </label>
                    <Input
                      value={newIssue.address}
                      onChange={(e) =>
                        setNewIssue((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                      placeholder="Alamat lengkap lokasi kendala"
                      className="h-10"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Deskripsi Kendala
                    </label>
                    <Textarea
                      value={newIssue.description}
                      onChange={(e) =>
                        setNewIssue((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Jelaskan kendala secara detail..."
                      className="h-20"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={handleAddIssue}
                    disabled={
                      !newIssue.issue.trim() ||
                      !newIssue.reporter.trim() ||
                      !newIssue.phone.trim()
                    }
                  >
                    Simpan Kendala
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                    className="bg-transparent"
                  >
                    Batal
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari kendala, pelapor, atau alamat..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64 bg-card/50"
                  />
                </div>
                <Select
                  value={priorityFilter}
                  onValueChange={setPriorityFilter}
                >
                  <SelectTrigger className="w-32 bg-card/50">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="high">Tinggi</SelectItem>
                    <SelectItem value="medium">Sedang</SelectItem>
                    <SelectItem value="low">Rendah</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 mb-6">
              <Button
                variant={activeTab === "unresolved" ? "default" : "outline"}
                onClick={() => setActiveTab("unresolved")}
              >
                Belum Selesai ({unresolvedCount})
              </Button>
              <Button
                variant={activeTab === "solved" ? "default" : "outline"}
                onClick={() => setActiveTab("solved")}
              >
                Sudah Selesai ({solvedCount})
              </Button>
            </div>

            <div className="space-y-4">
              {filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  className={`p-4 rounded-lg border ${
                    issue.status === "unresolved"
                      ? "bg-yellow-50/50 border-yellow-100/50"
                      : "bg-green-50/50 border-green-100/50"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium text-foreground mb-1">
                            {issue.issue}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {issue.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge
                              variant={getPriorityColor(issue.priority) as any}
                            >
                              Prioritas {getPriorityLabel(issue.priority)}
                            </Badge>
                            <Badge
                              variant={
                                issue.status === "unresolved"
                                  ? "secondary"
                                  : "default"
                              }
                            >
                              {issue.status === "unresolved"
                                ? "Belum Selesai"
                                : "Selesai"}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {issue.source === "meter_reading"
                                ? "Dari Catat Meter"
                                : issue.source === "meter_reading_blok"
                                ? "Dari Catat Meter (Blok)"
                                : "Laporan Manual"}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                            <div>
                              <p className="text-muted-foreground">Pelapor:</p>
                              <p className="font-medium">{issue.reporter}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Alamat:</p>
                              <p className="font-medium">{issue.address}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">
                                Tanggal Lapor:
                              </p>
                              <p className="font-medium">{issue.date}</p>
                            </div>
                          </div>
                          {issue.status === "solved" && issue.solution && (
                            <div className="mt-3 p-3 bg-green-100/50 rounded-lg">
                              <p className="text-sm text-muted-foreground mb-1">
                                Solusi:
                              </p>
                              <p className="text-sm font-medium">
                                {issue.solution}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Diselesaikan: {issue.solvedDate}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          window.open(
                            `https://wa.me/${issue.phone.replace(
                              /^0/,
                              "62"
                            )}?text=Halo ${issue.reporter}, terkait kendala: ${
                              issue.issue
                            }. Tim kami akan segera menindaklanjuti.`
                          )
                        }
                      >
                        WhatsApp
                      </Button>
                      {issue.status === "unresolved" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            setSelectedIssue(
                              selectedIssue === issue.id ? null : issue.id
                            )
                          }
                        >
                          {selectedIssue === issue.id ? "Batal" : "Selesaikan"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {selectedIssue === issue.id && (
                    <div className="mt-4 p-4 bg-muted/20 rounded-lg">
                      <h4 className="font-medium mb-2">
                        Tandai Sebagai Selesai
                      </h4>
                      <Textarea
                        placeholder="Jelaskan solusi yang telah dilakukan..."
                        value={solution}
                        onChange={(e) => setSolution(e.target.value)}
                        className="mb-3"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSolveIssue(issue.id)}
                          disabled={!solution.trim()}
                        >
                          Selesai
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedIssue(null);
                            setSolution("");
                          }}
                        >
                          Batal
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {filteredIssues.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {activeTab === "unresolved"
                    ? "Tidak ada kendala yang belum selesai"
                    : "Tidak ada kendala yang sudah selesai"}
                </p>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-border/20">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-red-100/50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">
                    {
                      issues.filter(
                        (i) =>
                          i.status === "unresolved" && i.priority === "high"
                      ).length
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Prioritas Tinggi
                  </p>
                </div>
                <div className="text-center p-4 bg-yellow-100/50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">
                    {unresolvedCount}
                  </p>
                  <p className="text-sm text-muted-foreground">Belum Selesai</p>
                </div>
                <div className="text-center p-4 bg-green-100/50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {solvedCount}
                  </p>
                  <p className="text-sm text-muted-foreground">Sudah Selesai</p>
                </div>
                <div className="text-center p-4 bg-primary/10 rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    {Math.round(
                      (solvedCount / (solvedCount + unresolvedCount)) * 100
                    ) || 0}
                    %
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tingkat Penyelesaian
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </AppShell>
    </AuthGuard>
  );
}

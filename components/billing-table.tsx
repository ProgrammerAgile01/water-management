"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "./glass-card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  Eye,
  FileText,
  CreditCard,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  MessageCircle,
  ChevronDown,
  Send,
  FileLock2,
} from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

/* =========================
   TYPES & HELPERS
========================= */
type Role = "ADMIN" | "PETUGAS" | "WARGA";
type AuthUser = { id: string; name: string; role: Role; username?: string };

type BillingItem = {
  id: string;
  periode: string;
  pelangganId: string;
  pelangganIdUser?: string | null;
  pelangganKode?: string | null;
  namaWarga: string;
  zona: string;
  wa?: string | null;
  meterAwal: number | null;
  meterAkhir: number | null;
  pemakaian: number | null;
  tarifPerM3: number;
  abonemen: number;
  denda: number;
  totalTagihan: number;
  status: "lunas" | "belum-lunas";
  statusVerif: "VERIFIED" | "UNVERIFIED";
  tagihanBulanIni: number;
  tagihanLalu: number;
  tglJatuhTempo: string | Date;
  tanggalBayar: string | Date | null;
  jumlahBayar: number;
  buktiPembayaran: string | null;
  metode: string | null;
  keterangan: string | null;
  canInputPayment?: boolean;
  info?: string | null;
  sisaKurang?: number;
};

type Option = { value: string; label: string };

/* ==== parser helpers (unchanged) ==== */
function parsePrevCleared(info?: string | null): string[] {
  if (!info) return [];
  const m = info.match(/\[PREV_CLEARED:([0-9,\-\s]+)\]/);
  if (!m) return [];
  return m[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
function parseClosedBy(info?: string | null): string | null {
  if (!info) return null;
  const m = info.match(/\[CLOSED_BY:([0-9]{4}-[0-9]{2})\]/);
  return m ? m[1] : null;
}
function parsePaidAt(info?: string | null): Date | null {
  if (!info) return null;
  const m = info.match(/\[PAID_AT:([^\]]+)\]/);
  if (!m) return null;
  const d = new Date(m[1]);
  return isNaN(d.getTime()) ? null : d;
}
function formatTanggalID(d: Date) {
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const ID_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const MONTH_INDEX: Record<string, number> = {
  januari: 1,
  februari: 2,
  maret: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  agustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  desember: 12,
};

function formatPeriode(p?: string | null): string {
  if (!p) return "-";
  const s = String(p).trim();
  const m1 = /^(\d{4})-(\d{1,2})$/.exec(s);
  if (m1) {
    const y = m1[1];
    const m = Math.min(Math.max(parseInt(m1[2], 10), 1), 12);
    return `${ID_MONTHS[m - 1]} ${y}`;
  }
  const norm = s.replace("-", " ").replace(/\s+/, " ");
  const [mon, y] = norm.split(" ");
  if (mon && y && MONTH_INDEX[mon.toLowerCase()]) {
    return `${ID_MONTHS[MONTH_INDEX[mon.toLowerCase()] - 1]} ${y}`;
  }
  return s;
}

/* =========================
   LITTLE BADGES
========================= */
function StatusBadge({ s }: { s: "lunas" | "belum-lunas" }) {
  return s === "lunas" ? (
    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
      Lunas
    </Badge>
  ) : (
    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
      Belum Lunas
    </Badge>
  );
}
function VerifBadge({ v }: { v: "VERIFIED" | "UNVERIFIED" }) {
  return v === "VERIFIED" ? (
    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
      Terverifikasi
    </Badge>
  ) : (
    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
      Menunggu Verifikasi
    </Badge>
  );
}

/* =========================
   FILTERS BAR (unchanged)
========================= */
type FiltersBarProps = {
  periodeOptions: Option[];
  selectedPeriode: string;
  setSelectedPeriode: (v: string) => void;
  statusOptions: Option[];
  selectedStatus: "semua" | "lunas" | "belum-lunas";
  setSelectedStatus: (v: "semua" | "lunas" | "belum-lunas") => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onRefresh: () => void;
};
function FiltersBar(props: FiltersBarProps) {
  const {
    periodeOptions,
    selectedPeriode,
    setSelectedPeriode,
    statusOptions,
    selectedStatus,
    setSelectedStatus,
    searchQuery,
    setSearchQuery,
    onRefresh,
  } = props;
  return (
    <GlassCard className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Periode</label>
          <Select value={selectedPeriode} onValueChange={setSelectedPeriode}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih periode" />
            </SelectTrigger>
            <SelectContent>
              {periodeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Status</label>
          <Select
            value={selectedStatus}
            onValueChange={(v) => setSelectedStatus(v as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Cari Warga/Kode/Blok
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nama warga, kode pelanggan, atau zona..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onRefresh();
              }}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground opacity-0">
            Actions
          </label>
          <Button
            onClick={onRefresh}
            className="w-full bg-transparent"
            variant="outline"
          >
            Refresh Data
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}

/* =========================
   PAGINATION (unchanged)
========================= */
type PaginationBarProps = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  setPage: (v: number) => void;
  setPerPage: (v: number) => void;
};
function PaginationBar({
  page,
  perPage,
  total,
  totalPages,
  setPage,
  setPerPage,
}: PaginationBarProps) {
  const from = (page - 1) * perPage + (total ? 1 : 0);
  const to = Math.min(
    (page - 1) * perPage + Math.max(total % perPage || perPage, 1),
    total
  );
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4">
      <div className="text-sm text-muted-foreground">
        Menampilkan <span className="font-medium">{total ? from : 0}</span>–
        <span className="font-medium">{total ? to : 0}</span> dari{" "}
        <span className="font-medium">{total}</span> data
      </div>
      <div className="flex items-center gap-2">
        <Select
          value={String(perPage)}
          onValueChange={(v) => {
            setPerPage(parseInt(v));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="per halaman" />
          </SelectTrigger>
          <SelectContent>
            {[5, 10, 20, 50].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => setPage(Math.max(page - 1, 1))}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Sebelumnya
        </Button>
        <div className="text-sm w-16 text-center">
          {page} / {Math.max(totalPages, 1)}
        </div>
        <Button
          variant="outline"
          onClick={() => setPage(Math.min(page + 1, Math.max(totalPages, 1)))}
          disabled={page >= totalPages}
        >
          Selanjutnya <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

/* =========================
   PAYMENT PROOF MODAL (unchanged)
========================= */
function PaymentProofModal({
  selected,
  onClose,
  getStatus,
  fmtRp,
  renderSisaKurang,
  formatPeriode,
}: {
  selected: BillingItem | null;
  onClose: () => void;
  getStatus: (b: BillingItem) => "lunas" | "belum-lunas";
  fmtRp: (n: number) => string;
  renderSisaKurang: (n: number) => React.ReactNode;
  formatPeriode: (p?: string | null) => string;
}) {
  return (
    <Dialog open={!!selected} onOpenChange={onClose}>
      <DialogContent className="max-w-[92vw] md:max-w-4xl p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg">
            Bukti Pembayaran
          </DialogTitle>
        </DialogHeader>
        {selected ? (
          <div className="grid gap-3 md:gap-4 md:grid-cols-2">
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge s={getStatus(selected)} />
                <VerifBadge v={selected.statusVerif} />
              </div>
              <div className="text-[13px] leading-relaxed md:text-sm space-y-1.5 md:space-y-2">
                <p>
                  <span className="font-medium">Nama:</span>{" "}
                  {selected.namaWarga}
                </p>
                <p>
                  <span className="font-medium">Periode:</span>{" "}
                  {formatPeriode(selected.periode)}
                </p>
                <p>
                  <span className="font-medium">Tagihan Bulan Lalu:</span>{" "}
                  {renderSisaKurang(selected.tagihanLalu)}
                </p>
                <p>
                  <span className="font-medium">Total Tagihan:</span>{" "}
                  {fmtRp(selected.totalTagihan)}
                </p>
                <p>
                  <span className="font-medium">Jumlah Bayar:</span>{" "}
                  {fmtRp(selected.jumlahBayar)}
                </p>
                {selected.tanggalBayar && (
                  <p>
                    <span className="font-medium">Tanggal Bayar:</span>{" "}
                    {new Date(selected.tanggalBayar).toLocaleString("id-ID")}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Tutup
                </Button>
              </div>
            </div>
            <div className="rounded-lg border bg-muted/20 p-1.5 md:p-2">
              {selected.buktiPembayaran ? (
                <div className="max-h-[55vh] md:max-h-[70vh] overflow-auto flex items-center justify-center">
                  <img
                    src={selected.buktiPembayaran || "/placeholder.svg"}
                    alt="Bukti Pembayaran"
                    className="w-auto max-w-[86vw] md:max-w-full h-auto max-h-[52vh] md:max-h-[68vh] object-contain"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="flex h-48 md:h-64 items-center justify-center text-sm text-muted-foreground">
                  Tidak ada bukti terlampir
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/* =========================
   MAIN COMPONENT
========================= */
export function BillingTable() {
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useMobile();

  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [items, setItems] = useState<BillingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<BillingItem | null>(null);

  // Filters
  const [selectedPeriode, setSelectedPeriode] = useState<string>("semua");
  const [selectedStatus, setSelectedStatus] = useState<
    "semua" | "lunas" | "belum-lunas"
  >("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  const [periodeOptions, setPeriodeOptions] = useState<Option[]>([]);
  const statusOptions: Option[] = [
    { value: "semua", label: "Semua Status" },
    { value: "belum-lunas", label: "Belum Lunas" },
    { value: "lunas", label: "Lunas" },
  ];

  // Pagination (FE)
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // latest periode from API
  const [latestPeriode, setLatestPeriode] = useState("");

  // Row loading states
  const [loadingTagihan, setLoadingTagihan] = useState<Set<string>>(new Set());
  const [loadingKwitansi, setLoadingKwitansi] = useState<Set<string>>(
    new Set()
  );

  // kirim wa
  const [loadingWATagihan, setLoadingWATagihan] = useState<Set<string>>(
    new Set()
  );
  const [loadingWAKwitansi, setLoadingWAKwitansi] = useState<Set<string>>(
    new Set()
  );

  function setRowLoading(
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    id: string,
    on: boolean
  ) {
    setter((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  // Refs
  const firstLoadRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  // Helpers
  const fmtRp = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n || 0);

  const getPelunasanStatus = (b: BillingItem): "lunas" | "belum-lunas" => {
    if (parseClosedBy(b.info)) return "lunas";
    if (typeof b.sisaKurang === "number") {
      return b.sisaKurang <= 0 ? "lunas" : "belum-lunas";
    }
    return b.status;
  };

  function renderSisaKurang(n: number) {
    if (n > 0) return <span className="text-red-600">Kurang {fmtRp(n)}</span>;
    if (n < 0) return <span className="text-green-600">Sisa {fmtRp(-n)}</span>;
    return <span className="text-green-600">{fmtRp(0)}</span>;
  }

  const canInput = (b: BillingItem) =>
    b.canInputPayment ?? (latestPeriode && b.periode === latestPeriode);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQuery.trim()), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [selectedPeriode, selectedStatus, debouncedQ]);

  // load user
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("tb_user");
      if (raw) setAuthUser(JSON.parse(raw));
    } catch {}
  }, []);

  const refreshData = async () => {
    setIsLoading(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const headers: HeadersInit = authUser
        ? { "x-user-id": authUser.id, "x-user-role": authUser.role }
        : {};

      const qs = new URLSearchParams();
      if (selectedPeriode && selectedPeriode !== "semua")
        qs.set("periode", selectedPeriode);
      if (debouncedQ) qs.set("q", debouncedQ);
      qs.set("page", String(1));
      qs.set("perPage", String(1000));

      const res = await fetch(
        `/api/tagihan${qs.toString() ? `?${qs.toString()}` : ""}`,
        {
          cache: "no-store",
          headers,
          signal: controller.signal,
        }
      );
      const json = await res.json();

      const data: BillingItem[] = json?.data ?? [];
      setItems(data);

      const periodes: string[] = json?.meta?.periodes ?? [];
      const latest: string = json?.meta?.latestPeriode ?? "";
      setLatestPeriode(latest);

      const options = periodes.map((p) => ({
        value: p,
        label: formatPeriode(p),
      }));
      setPeriodeOptions(options);

      if (
        firstLoadRef.current &&
        (!selectedPeriode || selectedPeriode === "semua")
      ) {
        setSelectedPeriode(latest || "semua");
      }
      firstLoadRef.current = false;
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.error("fetch tagihan error:", e);
        setItems([]);
      }
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  };

  // fetch
  useEffect(() => {
    if (authUser) refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, selectedPeriode, debouncedQ]);

  /* =========================
     FILTER & PAGINATE DI FE
  ========================= */
  const filteredByStatus = useMemo(() => {
    if (selectedStatus === "semua") return items;
    return items.filter((b) => getPelunasanStatus(b) === selectedStatus);
  }, [items, selectedStatus]);

  const totalFiltered = filteredByStatus.length;
  const totalPagesFiltered = Math.max(Math.ceil(totalFiltered / perPage), 1);
  const rows = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredByStatus.slice(start, start + perPage);
  }, [filteredByStatus, page, perPage]);

  // downloads
  async function forceDownload(url: string, filename?: string) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Gagal mengambil file");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      if (filename) a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  }
  async function handleUnduhTagihan(b: BillingItem) {
    try {
      setRowLoading(setLoadingTagihan, b.id, true);
      const q = new URLSearchParams({ tagihanId: b.id });
      const res = await fetch(`/api/unduh/tagihan?${q.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (json?.ok && json.url) {
        const fname = `tagihan-${b.periode}-${b.namaWarga}-${
          b.pelangganKode || "CUST"
        }.jpg`;
        await forceDownload(json.url, fname);
      } else if (json?.message) {
        alert(json.message);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRowLoading(setLoadingTagihan, b.id, false);
    }
  }
  async function handleUnduhKwitansi(b: BillingItem) {
    try {
      setRowLoading(setLoadingKwitansi, b.id, true);
      const q = new URLSearchParams({ tagihanId: b.id });
      const res = await fetch(`/api/unduh/kwitansi?${q.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (json?.ok && json.url) {
        const fname = `kwitansi-${b.periode}-${b.namaWarga}-${
          b.pelangganKode || "CUST"
        }.jpg`;
        await forceDownload(json.url, fname);
      } else if (json?.message) {
        alert(json.message);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRowLoading(setLoadingKwitansi, b.id, false);
    }
  }

  // kirim WA Tagihan(teks + gambar)
  async function handleKirimWATagihan(b: BillingItem) {
    try {
      setRowLoading(setLoadingWATagihan, b.id, true);
      const res = await fetch(`/api/tagihan/kirim-wa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagihanId: b.id }),
      });
      const json = await res.json();
      if (res.ok && json?.ok) {
        toast({
          title: "Berhasil",
          description: "Notifikasi WhatsApp tagihan sedang dikirim.",
        });
      } else {
        toast({
          title: "Gagal mengirim",
          description: json?.message || "Terjadi kesalahan saat mengirim WA.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Terjadi kesalahan jaringan/server.",
        variant: "destructive",
      });
    } finally {
      setRowLoading(setLoadingWATagihan, b.id, false);
    }
  }

  // kirim wa Kwitansi (teks + gambar)
  async function handleKirimWAKwitansi(b: BillingItem) {
    try {
      setRowLoading(setLoadingWAKwitansi, b.id, true);
      const res = await fetch(`/api/tagihan/kirim-wa-kwitansi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagihanId: b.id }),
      });
      const json = await res.json();
      if (res.ok && json?.ok) {
        toast({
          title: "Berhasil",
          description: "Kwitansi sedang dikirim via WhatsApp.",
        });
      } else {
        toast({
          title: "Gagal mengirim",
          description: json?.message || "Terjadi kesalahan saat mengirim WA.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Terjadi kesalahan jaringan/server.",
        variant: "destructive",
      });
    } finally {
      setRowLoading(setLoadingWAKwitansi, b.id, false);
    }
  }

  // tampilkan loading di trigger "Unduh" bila salah satu unduh sedang berjalan
  const isAnyDownloadLoading = (id: string) =>
    loadingTagihan.has(id) || loadingKwitansi.has(id);

  // helper untuk tombol trigger menunjukkan loading bila salah satu proses jalan
  const isAnyWALoading = (id: string) =>
    loadingWATagihan.has(id) || loadingWAKwitansi.has(id);

  /* =========================
     RENDER
  ========================= */
  if (isLoading) {
    return (
      <>
        <FiltersBar
          periodeOptions={periodeOptions}
          selectedPeriode={selectedPeriode}
          setSelectedPeriode={setSelectedPeriode}
          statusOptions={statusOptions}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onRefresh={refreshData}
        />
        <GlassCard className="p-6 mt-4">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded" />
              ))}
            </div>
          </div>
        </GlassCard>
      </>
    );
  }

  if (!authUser || rows.length === 0) {
    return (
      <>
        <FiltersBar
          periodeOptions={periodeOptions}
          selectedPeriode={selectedPeriode}
          setSelectedPeriode={setSelectedPeriode}
          statusOptions={statusOptions}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onRefresh={refreshData}
        />
        <GlassCard className="p-8 text-center mt-4">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Tidak Ada Tagihan
          </h3>
          <p className="text-muted-foreground">
            Tidak ada tagihan yang sesuai dengan filter/akses Anda.
          </p>
        </GlassCard>
        <GlassCard className="overflow-hidden">
          <PaginationBar
            page={page}
            perPage={perPage}
            total={totalFiltered}
            totalPages={totalPagesFiltered}
            setPage={setPage}
            setPerPage={setPerPage}
          />
        </GlassCard>
      </>
    );
  }

  // Mobile
  if (isMobile) {
    return (
      <div className="space-y-4">
        <FiltersBar
          periodeOptions={periodeOptions}
          selectedPeriode={selectedPeriode}
          setSelectedPeriode={setSelectedPeriode}
          statusOptions={statusOptions}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onRefresh={refreshData}
        />

        {rows.map((b) => {
          const pelunasan = getPelunasanStatus(b);
          return (
            <GlassCard key={b.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">
                    Periode: {formatPeriode(b.periode)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Nama Warga: {b.namaWarga}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Blok: {b.zona}
                  </p>
                  {(() => {
                    if (pelunasan !== "lunas") return null;
                    const paidAt =
                      parsePaidAt(b.info) ||
                      (b.tanggalBayar ? new Date(b.tanggalBayar) : null);
                    if (!paidAt) return null;
                    return (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        Dibayar tanggal {formatTanggalID(paidAt)}
                      </Badge>
                    );
                  })()}
                </div>
                <div className="flex flex-col justify-center items-end gap-1.5">
                  <StatusBadge s={pelunasan} />
                  <VerifBadge v={b.statusVerif} />
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Meter Awal:</span>
                    <p className="font-medium">{b.meterAwal ?? "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Meter Akhir:</span>
                    <p className="font-medium">{b.meterAkhir ?? "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pemakaian:</span>
                    <p className="font-medium">
                      {b.pemakaian ?? "-"} {b.pemakaian != null ? "m³" : ""}
                    </p>
                  </div>
                </div>

                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">Rincian Tagihan:</p>
                  <div className="pl-2 space-y-1">
                    <p>
                      • {b.pemakaian ?? 0} x {fmtRp(b.tarifPerM3)} ={" "}
                      {fmtRp(b.tarifPerM3 * (b.pemakaian ?? 0))}
                    </p>
                    <p>• Abonemen = {fmtRp(b.abonemen)}</p>
                    <hr />
                    <p>• Tagihan Bulan Ini = {fmtRp(b.tagihanBulanIni)}</p>
                    <p>
                      • Tagihan Bulan Lalu (+/-) ={" "}
                      {renderSisaKurang(b.tagihanLalu)}
                    </p>
                    <hr />
                    <p className="font-semibold">
                      • Total Tagihan = {fmtRp(b.totalTagihan)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                {/* === Dropdown Unduh === */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      {isAnyDownloadLoading(b.id) ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Menyiapkan…
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Unduh
                          <ChevronDown className="h-4 w-4 ml-1 opacity-80" />
                        </>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() => handleUnduhTagihan(b)}
                      disabled={loadingTagihan.has(b.id)}
                    >
                      <FileText />
                      Tagihan (JPG)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleUnduhKwitansi(b)}
                      disabled={
                        getPelunasanStatus(b) !== "lunas" ||
                        loadingKwitansi.has(b.id)
                      }
                      title={
                        getPelunasanStatus(b) !== "lunas"
                          ? "Kwitansi bisa diunduh setelah lunas"
                          : undefined
                      }
                    >
                      <FileLock2 />
                      Kwitansi (JPG)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {b.buktiPembayaran && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelected(b)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" /> Lihat Bukti
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/input-pembayaran/${b.id}`)}
                  className="flex-1"
                  disabled={!canInput(b)}
                  title={
                    !canInput(b)
                      ? "Pembayaran hanya untuk periode terakhir"
                      : undefined
                  }
                >
                  <CreditCard className="h-4 w-4 mr-2" /> Input Pembayaran
                </Button>

                {/* Kirim Tagihan via WA (ADMIN) */}
                {authUser?.role === "ADMIN" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-green-500 text-white"
                        disabled={!b.wa}
                        title={
                          !b.wa ? "Nomor WA pelanggan tidak ada" : undefined
                        }
                      >
                        {isAnyWALoading(b.id) ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                            Mengirim…
                          </>
                        ) : (
                          <>
                            <MessageCircle className="h-4 w-4 mr-2" /> Kirim WA
                            <ChevronDown className="h-4 w-4 ml-1 opacity-80" />
                          </>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem
                        onClick={() => handleKirimWATagihan(b)}
                        disabled={
                          loadingWATagihan.has(b.id) ||
                          !b.wa ||
                          getPelunasanStatus(b) === "lunas"
                        }
                        title={
                          !b.wa
                            ? "Nomor WA pelanggan tidak ada"
                            : getPelunasanStatus(b) === "lunas"
                            ? "Tagihan sudah lunas"
                            : undefined
                        }
                      >
                        <Send />
                        Kirim WA Tagihan
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleKirimWAKwitansi(b)}
                        disabled={
                          loadingWAKwitansi.has(b.id) ||
                          !b.wa ||
                          getPelunasanStatus(b) === "belum-lunas"
                        }
                        title={
                          !b.wa
                            ? "Nomor WA pelanggan tidak ada"
                            : getPelunasanStatus(b) === "belum-lunas"
                            ? "Tagihan belum lunas"
                            : undefined
                        }
                      >
                        <Send />
                        Kirim WA Kwitansi
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </GlassCard>
          );
        })}

        <GlassCard className="overflow-hidden">
          <PaginationBar
            page={page}
            perPage={perPage}
            total={totalFiltered}
            totalPages={totalPagesFiltered}
            setPage={setPage}
            setPerPage={setPerPage}
          />
        </GlassCard>

        <PaymentProofModal
          selected={selected}
          onClose={() => setSelected(null)}
          getStatus={getPelunasanStatus}
          fmtRp={fmtRp}
          renderSisaKurang={renderSisaKurang}
          formatPeriode={formatPeriode}
        />
      </div>
    );
  }

  // Desktop
  return (
    <div className="space-y-4">
      <FiltersBar
        periodeOptions={periodeOptions}
        selectedPeriode={selectedPeriode}
        setSelectedPeriode={setSelectedPeriode}
        statusOptions={statusOptions}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onRefresh={refreshData}
      />

      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/20">
                <th className="text-left p-4 font-semibold text-foreground">
                  Info Tagihan
                </th>
                <th className="text-left p-4 font-semibold text-foreground">
                  Meter & Pemakaian
                </th>
                <th className="text-left p-4 font-semibold text-foreground">
                  Rincian Tagihan
                </th>
                <th className="text-left p-4 font-semibold text-foreground">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const pelunasan = getPelunasanStatus(b);
                return (
                  <tr
                    key={b.id}
                    className="border-b border-border/10 hover:bg-white/5"
                  >
                    <td className="p-4">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">
                          Periode: {formatPeriode(b.periode)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Nama Warga: {b.namaWarga}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Blok: {b.zona}
                        </p>
                        <div className="mt-2 flex gap-2 items-center">
                          <StatusBadge s={pelunasan} />
                          <VerifBadge v={b.statusVerif} />
                        </div>
                        {(() => {
                          if (pelunasan !== "lunas") return null;
                          const paidAt =
                            parsePaidAt(b.info) ||
                            (b.tanggalBayar ? new Date(b.tanggalBayar) : null);
                          if (!paidAt) return null;
                          return (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              Dibayar tanggal {formatTanggalID(paidAt)}
                            </Badge>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1 text-sm">
                        <p>
                          Meter Awal:{" "}
                          <span className="font-medium">
                            {b.meterAwal ?? "-"}
                          </span>
                        </p>
                        <p>
                          Meter Akhir:{" "}
                          <span className="font-medium">
                            {b.meterAkhir ?? "-"}
                          </span>
                        </p>
                        <p>
                          Pemakaian:{" "}
                          <span className="font-medium">
                            {b.pemakaian ?? "-"}{" "}
                            {b.pemakaian != null ? "m³" : ""}
                          </span>
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1 text-sm">
                        <p>
                          {b.pemakaian ?? 0} x {fmtRp(b.tarifPerM3)} ={" "}
                          {fmtRp(b.tarifPerM3 * (b.pemakaian ?? 0))}
                        </p>
                        <p>Abonemen = {fmtRp(b.abonemen)}</p>
                        <hr />
                        <p>Tagihan Bulan Ini = {fmtRp(b.tagihanBulanIni)}</p>
                        <p>
                          Tagihan Bulan Lalu (+/-) ={" "}
                          {renderSisaKurang(b.tagihanLalu)}
                        </p>
                        <hr />
                        <p className="font-semibold">
                          Total Tagihan = {fmtRp(b.totalTagihan)}
                        </p>
                      </div>
                    </td>
                    <td className="p-4 w-96">
                      <div className="flex flex-wrap gap-2">
                        {/* === Dropdown Unduh === */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              {isAnyDownloadLoading(b.id) ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Menyiapkan…
                                </>
                              ) : (
                                <>
                                  <Download className="h-4 w-4 mr-2" />
                                  Unduh
                                  <ChevronDown className="h-4 w-4 ml-1 opacity-80" />
                                </>
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                              onClick={() => handleUnduhTagihan(b)}
                              disabled={loadingTagihan.has(b.id)}
                            >
                              <FileText />
                              Tagihan (JPG)
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleUnduhKwitansi(b)}
                              disabled={
                                getPelunasanStatus(b) !== "lunas" ||
                                loadingKwitansi.has(b.id)
                              }
                              title={
                                getPelunasanStatus(b) !== "lunas"
                                  ? "Kwitansi bisa diunduh setelah lunas"
                                  : undefined
                              }
                            >
                              <FileLock2 />
                              Kwitansi (JPG)
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {b.buktiPembayaran && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelected(b)}
                          >
                            <Eye className="h-4 w-4 mr-2" /> Lihat Bukti
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(`/input-pembayaran/${b.id}`)
                          }
                          disabled={!canInput(b)}
                          title={
                            !canInput(b)
                              ? "Pembayaran hanya untuk periode terakhir"
                              : undefined
                          }
                        >
                          <CreditCard className="h-4 w-4 mr-2" /> Input
                          Pembayaran
                        </Button>

                        {/* Kirim Tagihan via WA */}
                        {authUser?.role === "ADMIN" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-green-500 text-white"
                                disabled={!b.wa}
                                title={
                                  !b.wa
                                    ? "Nomor WA pelanggan tidak ada"
                                    : undefined
                                }
                              >
                                {isAnyWALoading(b.id) ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                                    Mengirim…
                                  </>
                                ) : (
                                  <>
                                    <MessageCircle className="h-4 w-4 mr-2" />{" "}
                                    Kirim WA
                                    <ChevronDown className="h-4 w-4 ml-1 opacity-80" />
                                  </>
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem
                                onClick={() => handleKirimWATagihan(b)}
                                disabled={
                                  loadingWATagihan.has(b.id) ||
                                  !b.wa ||
                                  getPelunasanStatus(b) === "lunas"
                                }
                                title={
                                  !b.wa
                                    ? "Nomor WA pelanggan tidak ada"
                                    : getPelunasanStatus(b) === "lunas"
                                    ? "Tagihan sudah lunas"
                                    : undefined
                                }
                              >
                                <Send />
                                Kirim WA Tagihan
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleKirimWAKwitansi(b)}
                                disabled={
                                  loadingWAKwitansi.has(b.id) ||
                                  !b.wa ||
                                  getPelunasanStatus(b) === "belum-lunas"
                                }
                                title={
                                  !b.wa
                                    ? "Nomor WA pelanggan tidak ada"
                                    : getPelunasanStatus(b) === "belum-lunas"
                                    ? "Tagihan belum lunas"
                                    : undefined
                                }
                              >
                                <Send />
                                Kirim WA Kwitansi
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <PaginationBar
          page={page}
          perPage={perPage}
          total={totalFiltered}
          totalPages={totalPagesFiltered}
          setPage={setPage}
          setPerPage={setPerPage}
        />

        <PaymentProofModal
          selected={selected}
          onClose={() => setSelected(null)}
          getStatus={getPelunasanStatus}
          fmtRp={fmtRp}
          renderSisaKurang={renderSisaKurang}
          formatPeriode={formatPeriode}
        />
      </GlassCard>
    </div>
  );
}

// app/(...)/laporan-keuangan/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { AppHeader } from "@/components/app-header";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

/* ===== Types ===== */
type MoneyFlow = "ALL" | "IN" | "OUT";

type Mutasi = {
  id: string;
  tanggal: string;
  jam?: string | null;
  tipe: "IN" | "OUT";
  kategori?: string | null;
  metode?: string | null;
  keterangan?: string | null;
  jumlah: number;
  refCode?: string | null; // biasanya Tagihan.id atau "YYYY-MM"
  createdAt?: string | null;
  statusVerif?: string | null;
};

type Summary = {
  periode: string;
  saldoAwal: number;
  totalMasuk: number;
  totalKeluar: number;
  saldoAkhir: number;
};

/* ===== Utils ===== */
const fmtRp = (n: number) => "Rp " + Number(n || 0).toLocaleString("id-ID");
const fmtRpTxt = (n: number) => "Rp " + Number(n || 0).toLocaleString("id-ID");

function ymToLong(ym: string) {
  if (!ym) return "";
  const m = ym.match(/^(\d{4})-(\d{1,2})$/);
  const fixed = m ? `${m[1]}-${String(Number(m[2])).padStart(2, "0")}` : ym;
  const d = new Date(`${fixed}-01T00:00:00`);
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}
function joinDateTime(tgl?: string, jam?: string | null) {
  if (!tgl) return null;
  const t = jam && /^\d{2}:\d{2}/.test(jam) ? jam : "00:00:00";
  return new Date(`${tgl}T${t}`);
}
function formatDt(tgl?: string, jam?: string | null) {
  const d = joinDateTime(tgl, jam);
  if (!d) return "-";
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
const isYm = (s?: string | null) => !!s && /^\d{4}-\d{2}$/.test(s || "");

// debounce sederhana
function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function LaporanKeuanganPage() {
  const [selectedYM, setSelectedYM] = useState<string>("");
  const [months, setMonths] = useState<string[]>([]);
  const [flow, setFlow] = useState<MoneyFlow>("ALL");
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const qDebounced = useDebounced(q, 300);

  const [summary, setSummary] = useState<Summary>({
    periode: "",
    saldoAwal: 0,
    totalMasuk: 0,
    totalKeluar: 0,
    saldoAkhir: 0,
  });

  const [mutasi, setMutasi] = useState<Mutasi[]>([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Mutasi | null>(null);

  // pagination (client)
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  useEffect(() => {
    setCurrentPage(1);
  }, [flow, qDebounced, dateFrom, dateTo, selectedYM]);

  // load daftar bulan
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/laporan/keuangan/months");
        const j = await r.json();
        if (j?.ok && Array.isArray(j.periods) && j.periods.length) {
          setMonths(j.periods);
          setSelectedYM(j.periods[0]);
        } else {
          const now = new Date();
          const fallback = `${now.getUTCFullYear()}-${String(
            now.getUTCMonth() + 1
          ).padStart(2, "0")}`;
          setMonths([fallback]);
          setSelectedYM(fallback);
        }
      } catch {
        const now = new Date();
        const fallback = `${now.getUTCFullYear()}-${String(
          now.getUTCMonth() + 1
        ).padStart(2, "0")}`;
        setMonths([fallback]);
        setSelectedYM(fallback);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedYM) loadData();
  }, [selectedYM]);
  useEffect(() => {
    if (selectedYM) loadData();
  }, [flow, qDebounced, dateFrom, dateTo]);

  const API_PAGE_SIZE = 1000;
  const MODE = "accrual"; // <- DI-LOCK ACCRUAL

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        periode: selectedYM,
        flow,
        mode: MODE, // pakai accrual
        q: qDebounced,
        page: "1",
        pageSize: String(API_PAGE_SIZE),
        ...(dateFrom ? { from: dateFrom } : {}),
        ...(dateTo ? { to: dateTo } : {}),
      }).toString();

      const [r1, r2] = await Promise.all([
        fetch(`/api/laporan/keuangan/summary?${params}`),
        fetch(`/api/laporan/keuangan/mutasi?${params}`),
      ]);
      const j1 = await r1.json();
      const j2 = await r2.json();

      if (j1?.ok) setSummary(j1.data);
      setMutasi(j2?.ok ? j2.rows || [] : []);
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  // keterangan tampilan; untuk pembayaran tagihan → “Pembayaran Tagihan <Bulan Tahun>”
  const displayKet = (m: Mutasi) => {
    if ((m.kategori || "").toLowerCase() === "pembayaran tagihan") {
      const per = isYm(m.refCode) ? (m.refCode as string) : selectedYM;
      return `Pembayaran Tagihan ${ymToLong(per)}`;
      // kalau perlu tambahkan nama pelanggan: "Pembayaran Tagihan September 2025 — By <nama>"
    }
    return m.keterangan || "-";
  };

  // filter + SORT ASCENDING by tanggal+jam (dan createdAt)
  const filtered = useMemo(() => {
    let data = [...mutasi];
    if (flow !== "ALL") data = data.filter((d) => d.tipe === flow);
    if (qDebounced.trim()) {
      const s = qDebounced.toLowerCase();
      data = data.filter(
        (d) =>
          (d.kategori || "").toLowerCase().includes(s) ||
          (d.metode || "").toLowerCase().includes(s) ||
          displayKet(d).toLowerCase().includes(s) ||
          (d.refCode || "").toLowerCase().includes(s) ||
          (d.statusVerif || "").toLowerCase().includes(s)
      );
    }
    if (dateFrom) {
      const fromTs = new Date(`${dateFrom}T00:00:00`).getTime();
      data = data.filter(
        (d) => (joinDateTime(d.tanggal, d.jam)?.getTime() || 0) >= fromTs
      );
    }
    if (dateTo) {
      const toTs = new Date(`${dateTo}T23:59:59`).getTime();
      data = data.filter(
        (d) => (joinDateTime(d.tanggal, d.jam)?.getTime() || 0) <= toTs
      );
    }

    // ASC
    data.sort((a, b) => {
      const ta = new Date(`${a.tanggal}T${a.jam || "00:00:00"}`).getTime();
      const tb = new Date(`${b.tanggal}T${b.jam || "00:00:00"}`).getTime();
      if (ta !== tb) return ta - tb;
      const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ca - cb;
    });

    return data;
  }, [mutasi, flow, qDebounced, dateFrom, dateTo, selectedYM]);

  // pagination & totals
  const totalRows = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const paged = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, currentPage, rowsPerPage]);

  const totalIn = useMemo(
    () => filtered.reduce((a, b) => a + (b.tipe === "IN" ? b.jumlah : 0), 0),
    [filtered]
  );
  const totalOut = useMemo(
    () => filtered.reduce((a, b) => a + (b.tipe === "OUT" ? b.jumlah : 0), 0),
    [filtered]
  );

  // export
  function exportExcel() {
    if (!filtered.length) {
      toast.info("Tidak ada data untuk diekspor");
      return;
    }
    const aoa: (string | number)[][] = [
      ["LAPORAN KEUANGAN"],
      [`Periode: ${ymToLong(selectedYM)} | Mode: Accrual`],
      [""],
      [
        "Tanggal & Jam",
        "Tipe",
        "Kategori",
        "Keterangan",
        "Uang Masuk",
        "Uang Keluar",
        "Saldo",
        "Status",
      ],
      ...filtered.map((m) => [
        formatDt(m.tanggal, m.jam),
        m.tipe === "IN" ? "Masuk" : "Keluar",
        m.kategori || "-",
        displayKet(m),
        m.tipe === "IN" ? fmtRpTxt(m.jumlah) : "-",
        m.tipe === "OUT" ? fmtRpTxt(m.jumlah) : "-",
        m.tipe === "IN" ? fmtRpTxt(m.jumlah) : `- ${fmtRpTxt(m.jumlah)}`,
        m.statusVerif || "-",
      ]),
      [""],
      ["Ringkasan"],
      ["Saldo Awal", fmtRpTxt(summary.saldoAwal)],
      ["Total Uang Masuk", fmtRpTxt(totalIn)],
      ["Total Uang Keluar", fmtRpTxt(totalOut)],
      [
        "Saldo Akhir (Awal + Masuk - Keluar)",
        fmtRpTxt(summary.saldoAwal + (totalIn - totalOut)),
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    (ws as any)["!cols"] = [
      { wch: 22 },
      { wch: 10 },
      { wch: 22 },
      { wch: 40 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, ymToLong(selectedYM));
    XLSX.writeFile(wb, `Laporan-Keuangan-${selectedYM}.xlsx`);
  }

  const PaginationFooter = () => (
    <GlassCard className="p-3 mt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="text-sm text-muted-foreground">
        Menampilkan{" "}
        <span className="font-medium">
          {totalRows ? (currentPage - 1) * rowsPerPage + 1 : 0}–
          {Math.min(currentPage * rowsPerPage, totalRows)}
        </span>{" "}
        dari <span className="font-medium">{totalRows}</span> data
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Baris/hal.</span>
          <Select
            value={String(rowsPerPage)}
            onValueChange={(v) => {
              setRowsPerPage(Number(v));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="Baris/hal." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </Button>
          <div className="px-2 text-sm">
            Hal. <span className="font-medium">{currentPage}</span> /{" "}
            {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </GlassCard>
  );

  return (
    <AuthGuard>
      <AppShell>
        <div className="max-w-7xl mx-auto space-y-6">
          <AppHeader title="Laporan Keuangan" />

          {/* Controls */}
          <GlassCard className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
                <div className="flex flex-wrap items-end gap-3">
                  {/* Periode */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Periode
                    </label>
                    <Select value={selectedYM} onValueChange={setSelectedYM}>
                      <SelectTrigger className="w-[210px]">
                        <SelectValue placeholder="Pilih periode" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((m) => (
                          <SelectItem key={m} value={m}>
                            {ymToLong(m)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Jenis Mutasi */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Jenis Mutasi
                    </label>
                    <Select
                      value={flow}
                      onValueChange={(v: MoneyFlow) => setFlow(v)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Semua" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Semua</SelectItem>
                        <SelectItem value="IN">Masuk</SelectItem>
                        <SelectItem value="OUT">Keluar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dari */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Dari Tanggal
                    </label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-[160px]"
                    />
                  </div>

                  {/* Sampai */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Sampai
                    </label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-[160px]"
                    />
                  </div>

                  {/* Pencarian */}
                  <div className="space-y-1 min-w-[220px] flex-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Pencarian
                    </label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-8 w-full"
                        placeholder="Cari kategori/keterangan/status..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="bg-transparent"
                    onClick={loadData}
                    disabled={loading || !selectedYM}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    {loading ? "Memuat..." : "Terapkan Filter"}
                  </Button>
                  <Button
                    onClick={exportExcel}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={!filtered.length}
                  >
                    <Download className="h-4 w-4 mr-2" /> Export Excel
                  </Button>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <GlassCard className="p-4">
              <div className="text-sm text-muted-foreground">Saldo Awal</div>
              <div className="mt-1 text-2xl font-semibold">
                {fmtRp(summary.saldoAwal)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Akumulasi sebelum{" "}
                {ymToLong(selectedYM || summary.periode || "")}
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="text-sm text-muted-foreground">Uang Masuk</div>
              <div className="mt-1 text-2xl font-semibold flex items-center gap-2">
                <ArrowDownRight className="h-5 w-5" />{" "}
                {fmtRp(summary.totalMasuk)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {ymToLong(selectedYM || summary.periode || "")}
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="text-sm text-muted-foreground">Uang Keluar</div>
              <div className="mt-1 text-2xl font-semibold flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5" />{" "}
                {fmtRp(summary.totalKeluar)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {ymToLong(selectedYM || summary.periode || "")}
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="text-sm text-muted-foreground">Saldo Akhir</div>
              <div className="mt-1 text-2xl font-semibold">
                {fmtRp(summary.saldoAkhir)}
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Info className="h-3.5 w-3.5" /> (Saldo Awal + Masuk − Keluar) •
                Mode: Accrual
              </div>
            </GlassCard>
          </div>

          {/* Desktop Table */}
          <GlassCard className="p-6 hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 text-sm text-muted-foreground">
                    <th className="text-left py-3 px-2">Tanggal &amp; Jam</th>
                    <th className="text-left py-3 px-2">Tipe</th>
                    <th className="text-left py-3 px-2">Kategori</th>
                    <th className="text-left py-3 px-2">Keterangan</th>
                    <th className="text-right py-3 px-2">Uang Masuk</th>
                    <th className="text-right py-3 px-2">Uang Keluar</th>
                    <th className="text-right py-3 px-2">Saldo</th>
                    <th className="text-left py-3 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-border/30 hover:bg-muted/20 text-sm"
                    >
                      <td className="py-3 px-2">
                        {formatDt(m.tanggal, m.jam)}
                      </td>

                      <td className="py-3 px-2">
                        {m.tipe === "IN" ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-700">
                            Masuk
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-red-600 text-white hover:bg-red-700"
                          >
                            Keluar
                          </Badge>
                        )}
                      </td>

                      <td className="py-3 px-2">{m.kategori || "-"}</td>
                      <td className="py-3 px-2 max-w-[380px] truncate">
                        {displayKet(m)}
                      </td>

                      <td className="py-3 px-2 text-right">
                        {m.tipe === "IN" ? fmtRp(m.jumlah) : "-"}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {m.tipe === "OUT" ? fmtRp(m.jumlah) : "-"}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {m.tipe === "IN"
                          ? fmtRp(m.jumlah)
                          : `- ${fmtRp(m.jumlah)}`}
                      </td>

                      <td className="py-3 px-2">
                        {m.statusVerif ? (
                          <Badge
                            variant="outline"
                            className={
                              m.statusVerif === "VERIFIED"
                                ? "border-emerald-400 text-emerald-700"
                                : "border-slate-300 text-slate-700"
                            }
                          >
                            {m.statusVerif}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}

                  {!paged.length && (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-6 text-center text-sm text-muted-foreground"
                      >
                        Tidak ada data mutasi pada filter ini.
                      </td>
                    </tr>
                  )}
                </tbody>

                {!!paged.length && (
                  <tfoot>
                    <tr className="border-t-2 border-primary/20 bg-muted/10 font-semibold text-sm">
                      <td className="py-3 px-2">Total</td>
                      <td colSpan={3} />
                      <td className="py-3 px-2 text-right">{fmtRp(totalIn)}</td>
                      <td className="py-3 px-2 text-right">
                        {fmtRp(totalOut)}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {fmtRp(summary.saldoAwal + (totalIn - totalOut))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Pagination footer */}
            <PaginationFooter />
          </GlassCard>
        </div>
        {/* Mobile List (<= md) */}
        <GlassCard className="p-3 space-y-3 md:hidden">
          {paged.length ? (
            paged.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setDetail(m);
                  setOpen(true);
                }}
                className="w-full text-left rounded-xl border border-border/50 p-3 hover:bg-muted/30 transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">
                    {formatDt(m.tanggal, m.jam)}
                  </div>
                  {m.tipe === "IN" ? (
                    <Badge className="bg-emerald-600 hover:bg-emerald-700">
                      Masuk
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      Keluar
                    </Badge>
                  )}
                </div>

                <div className="mt-1 text-xs text-muted-foreground">
                  {m.kategori || "-"}
                </div>

                <div className="mt-1 text-sm truncate">{displayKet(m)}</div>

                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div>
                    {m.statusVerif ? (
                      <Badge
                        variant="outline"
                        className={
                          m.statusVerif === "VERIFIED"
                            ? "border-emerald-400 text-emerald-700"
                            : "border-slate-300 text-slate-700"
                        }
                      >
                        {m.statusVerif}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <div className="text-sm font-medium">Nominal</div>
                  <div
                    className={`text-sm font-semibold ${
                      m.tipe === "OUT" ? "text-red-600" : "text-emerald-700"
                    }`}
                  >
                    {m.tipe === "IN" ? fmtRp(m.jumlah) : `- ${fmtRp(m.jumlah)}`}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Tidak ada data mutasi pada filter ini.
            </div>
          )}

          {/* Pagination footer (mobile) */}
          <PaginationFooter />
        </GlassCard>

        {/* Detail Modal */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-2xl overflow-y-auto backdrop-blur-xl bg-background/70">
            <DialogHeader>
              <DialogTitle className="text-emerald-700">
                Detail Mutasi
              </DialogTitle>
              <DialogDescription>
                {ymToLong(selectedYM || "")}
              </DialogDescription>
            </DialogHeader>
            {!detail ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Memuat rincian…
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Tanggal & Jam
                    </div>
                    <div className="font-semibold">
                      {formatDt(detail.tanggal, detail.jam)}
                    </div>
                  </div>
                  {detail.tipe === "IN" ? (
                    <Badge className="bg-emerald-600 hover:bg-emerald-700">
                      Masuk
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      Keluar
                    </Badge>
                  )}
                </div>
                <Separator />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-muted/40">
                    <div className="text-muted-foreground">Kategori</div>
                    <div className="font-medium">{detail.kategori || "-"}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40">
                    <div className="text-muted-foreground">Jumlah</div>
                    <div className="font-semibold">{fmtRp(detail.jumlah)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 col-span-2 sm:col-span-3">
                    <div className="text-muted-foreground">Keterangan</div>
                    <div className="font-medium">{displayKet(detail)}</div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </AppShell>
    </AuthGuard>
  );
}

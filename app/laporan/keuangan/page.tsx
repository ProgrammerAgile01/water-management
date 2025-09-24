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

/* ========================
   Types
   ======================== */
type MoneyFlow = "ALL" | "IN" | "OUT";

type Mutasi = {
  id: string;
  tanggal: string; // "YYYY-MM-DD"
  jam?: string | null; // "HH:mm:ss"
  tipe: "IN" | "OUT";
  kategori?: string | null;
  metode?: string | null;
  keterangan?: string | null;
  jumlah: number;
  refCode?: string | null;
  createdAt?: string | null;
  statusVerif?: string | null; // VERIFIKASI tagihan (IN saja)
};

type Summary = {
  periode: string; // "YYYY-MM"
  totalMasuk: number;
  totalKeluar: number;
  saldoAkhir: number;
};

/* ========================
   Utils
   ======================== */
const fmtRp = (n: number) => "Rp " + Number(n || 0).toLocaleString("id-ID");
const fmtRpTxt = (n: number) => "Rp " + Number(n || 0).toLocaleString("id-ID"); // untuk Excel (string)
function ymToLong(ym: string) {
  if (!ym) return "";
  const d = new Date(`${ym}-01T00:00:00`);
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

/* ========================
   Page
   ======================== */
export default function LaporanKeuanganPage() {
  const [selectedYM, setSelectedYM] = useState<string>("");
  const [months, setMonths] = useState<string[]>([]);
  const [flow, setFlow] = useState<MoneyFlow>("ALL");
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const [summary, setSummary] = useState<Summary>({
    periode: "",
    totalMasuk: 0,
    totalKeluar: 0,
    saldoAkhir: 0,
  });

  const [mutasi, setMutasi] = useState<Mutasi[]>([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Mutasi | null>(null);

  // INIT: load daftar bulan
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/laporan/keuangan/months");
        const j = await r.json();
        if (j?.ok) {
          setMonths(j.periods || []);
          if (j.periods?.length) setSelectedYM(j.periods[0]);
        }
      } catch {
        setMonths([]);
      }
    })();
  }, []);

  // AUTO load saat periode berubah
  useEffect(() => {
    if (!selectedYM) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYM]);

  async function loadData() {
    if (!selectedYM) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        periode: selectedYM,
        flow,
        q,
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

  // filter client-side tambahan + sort
  const filtered = useMemo(() => {
    let data = [...mutasi];
    if (flow !== "ALL") data = data.filter((d) => d.tipe === flow);
    if (q.trim()) {
      const s = q.toLowerCase();
      data = data.filter(
        (d) =>
          (d.kategori || "").toLowerCase().includes(s) ||
          (d.metode || "").toLowerCase().includes(s) ||
          (d.keterangan || "").toLowerCase().includes(s) ||
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
    // urut terbaru (tema sama dengan halaman status)
    data.sort((a, b) => {
      const da = new Date(`${a.tanggal}T${a.jam || "00:00:00"}`).getTime();
      const db = new Date(`${b.tanggal}T${b.jam || "00:00:00"}`).getTime();
      if (db !== da) return db - da;
      const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return cb - ca;
    });
    return data;
  }, [mutasi, flow, q, dateFrom, dateTo]);

  // total per kolom dari data yang sedang tampil (filtered)
  const totalIn = useMemo(
    () => filtered.reduce((a, b) => a + (b.tipe === "IN" ? b.jumlah : 0), 0),
    [filtered]
  );
  const totalOut = useMemo(
    () => filtered.reduce((a, b) => a + (b.tipe === "OUT" ? b.jumlah : 0), 0),
    [filtered]
  );
  const totalSaldo = useMemo(() => totalIn - totalOut, [totalIn, totalOut]);

  function exportExcel() {
    if (!filtered.length) {
      toast.info("Tidak ada data untuk diekspor");
      return;
    }

    const aoa: (string | number)[][] = [
      ["LAPORAN KEUANGAN"],
      [`Periode: ${ymToLong(selectedYM)}`],
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
        m.keterangan || "-",
        m.tipe === "IN" ? fmtRpTxt(m.jumlah) : "-",
        m.tipe === "OUT" ? fmtRpTxt(m.jumlah) : "-",
        m.tipe === "IN" ? fmtRpTxt(m.jumlah) : `- ${fmtRpTxt(m.jumlah)}`,
        m.statusVerif || "-",
      ]),
      [""],
      ["Ringkasan"],
      ["Total Uang Masuk", fmtRpTxt(totalIn)],
      ["Total Uang Keluar", fmtRpTxt(totalOut)],
      ["Total Saldo", fmtRpTxt(totalSaldo)],
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    (ws as any)["!cols"] = [
      { wch: 22 }, // tanggal
      { wch: 10 }, // tipe
      { wch: 22 }, // kategori
      { wch: 40 }, // ket
      { wch: 16 }, // in
      { wch: 16 }, // out
      { wch: 16 }, // saldo
      { wch: 14 }, // status
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, ymToLong(selectedYM));
    XLSX.writeFile(wb, `Laporan-Keuangan-${selectedYM}.xlsx`);
  }

  function openDetail(m: Mutasi) {
    setDetail(m);
    setOpen(true);
  }

  return (
    <AuthGuard>
      <AppShell>
        <div className="max-w-7xl mx-auto space-y-6">
          <AppHeader title="Laporan Keuangan" />

          {/* Controls */}
          <GlassCard className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
                {/* kiri: filter fields */}
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
                      <SelectTrigger className="w-[120px] sm:w-[140px]">
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

                {/* kanan: actions */}
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
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Excel
                  </Button>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <GlassCard className="p-4">
              <div className="text-sm text-muted-foreground">Uang Masuk</div>
              <div className="mt-1 text-2xl font-semibold flex items-center gap-2">
                <ArrowDownRight className="h-5 w-5" />
                {fmtRp(summary.totalMasuk)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {ymToLong(selectedYM || summary.periode || "")}
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="text-sm text-muted-foreground">Uang Keluar</div>
              <div className="mt-1 text-2xl font-semibold flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5" />
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
                <Info className="h-3.5 w-3.5" />
                Total Masuk − Total Keluar
              </div>
            </GlassCard>
          </div>

          {/* Desktop Table — kolom Tipe dikembalikan */}
          <GlassCard className="p-6 hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 text-sm text-muted-foreground">
                    <th className="text-left py-3 px-2">Tanggal & Jam</th>
                    <th className="text-left py-3 px-2">Tipe</th>
                    <th className="text-left py-3 px-2">Kategori</th>
                    <th className="text-left py-3 px-2">Keterangan</th>
                    <th className="text-right py-3 px-2">Uang Masuk</th>
                    <th className="text-right py-3 px-2">Uang Keluar</th>
                    <th className="text-right py-3 px-2">Saldo</th>
                    <th className="text-left py-3 px-2">Status</th>
                    {/* <th className="text-right py-3 px-2">Aksi</th> */}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
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
                        {m.keterangan || "-"}
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

                      {/* <td className="py-3 px-2 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-transparent"
                          onClick={() => openDetail(m)}
                        >
                          Detail
                        </Button>
                      </td> */}
                    </tr>
                  ))}

                  {!filtered.length && (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-6 text-center text-sm text-muted-foreground"
                      >
                        Tidak ada data mutasi pada filter ini.
                      </td>
                    </tr>
                  )}
                </tbody>

                {!!filtered.length && (
                  <tfoot>
                    <tr className="border-t-2 border-primary/20 bg-muted/10 font-semibold text-sm">
                      <td className="py-3 px-2">Total</td>
                      <td colSpan={3} />
                      <td className="py-3 px-2 text-right">{fmtRp(totalIn)}</td>
                      <td className="py-3 px-2 text-right">
                        {fmtRp(totalOut)}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {fmtRp(totalSaldo)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </GlassCard>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            <div className="px-1 text-xs text-muted-foreground">
              Urut: terbaru • {filtered.length} data
            </div>

            {filtered.map((m) => (
              <GlassCard key={m.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold">
                      {m.kategori || "-"}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {formatDt(m.tanggal, m.jam)}
                    </div>
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

                <Separator />

                <div className="grid grid-cols-2 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Keterangan</span>
                  <span className="truncate">{m.keterangan || "-"}</span>

                  <span className="text-muted-foreground">Uang Masuk</span>
                  <span className="font-medium">
                    {m.tipe === "IN" ? fmtRp(m.jumlah) : "-"}
                  </span>

                  <span className="text-muted-foreground">Uang Keluar</span>
                  <span className="font-medium">
                    {m.tipe === "OUT" ? fmtRp(m.jumlah) : "-"}
                  </span>

                  <span className="text-muted-foreground">Saldo</span>
                  <span className="font-semibold">
                    {m.tipe === "IN" ? fmtRp(m.jumlah) : `- ${fmtRp(m.jumlah)}`}
                  </span>

                  <span className="text-muted-foreground">Status</span>
                  <span>{m.statusVerif || "-"}</span>
                </div>

                {/* <div className="pt-2 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-transparent"
                    onClick={() => openDetail(m)}
                  >
                    Detail
                  </Button>
                </div> */}
              </GlassCard>
            ))}

            {!filtered.length && (
              <GlassCard className="p-6 text-center text-sm text-muted-foreground">
                Tidak ada data mutasi pada filter ini.
              </GlassCard>
            )}
          </div>
        </div>

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
                    <div className="font-medium">
                      {detail.keterangan || "-"}
                    </div>
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

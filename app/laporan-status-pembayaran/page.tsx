"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { AppHeader } from "@/components/app-header";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

type Row = {
  no: number;
  nama: string;
  pemakaianM3: number;
  tagihanAwal: number;
  abonemen: number;
  tagihanLalu: number; // << baru
  totalTagihan: number;
  sudahBayar: number;
  sisaKurang: number; // << baru
  tglPengecekan: string | null;
  meterSaatPengecekan: number;
  tglBayar: string | null;
  belumBayar: number;
  kembalian: number;
  // id untuk fetch detail
  tagihanId?: string;
  pelangganId?: string;
};

// helper periode
function formatPeriode(kode: string) {
  // kode format "YYYY-MM"
  const [tahun, bulan] = kode.split("-");
  const bulanNama = [
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
  ][parseInt(bulan, 10) - 1];
  return `${bulanNama} ${tahun}`;
}

export default function LaporanStatusPembayaranPage() {
  const [months, setMonths] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    tagihanAwal: 0,
    abonemen: 0,
    tagihanLalu: 0, // << baru
    totalTagihan: 0,
    sudahBayar: 0,
    sisaKurang: 0, // << baru
  });

  // state modal
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // load daftar bulan
  useEffect(() => {
    (async () => {
      const r = await fetch("/api/laporan/status/months");
      const j = await r.json();
      if (j?.ok) {
        setMonths(j.periods);
        if (j.periods.length) setSelectedPeriod(j.periods[0]); // default terbaru
      }
    })();
  }, []);

  async function fetchData(period?: string) {
    const per = period ?? selectedPeriod;
    if (!per) return;
    setLoading(true);
    try {
      const r = await fetch(
        `/api/laporan/status?periode=${encodeURIComponent(per)}`
      );
      const j = await r.json();
      if (j?.ok) {
        setRows(j.rows);
        setSummary(j.summary);
      } else {
        setRows([]);
        setSummary({
          tagihanAwal: 0,
          abonemen: 0,
          tagihanLalu: 0,
          totalTagihan: 0,
          sudahBayar: 0,
          sisaKurang: 0,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  // 1) Saat halaman pertama kali buka:
  //    - ambil daftar bulan
  //    - set default periode
  //    - LANGSUNG ambil datanya (tanpa menunggu tombol).
  useEffect(() => {
    (async () => {
      const r = await fetch("/api/laporan/status/months");
      const j = await r.json();
      if (j?.ok && j.periods?.length) {
        const def = j.periods[0]; // biasanya bulan terbaru
        setMonths(j.periods);
        setSelectedPeriod(def);
        fetchData(def); // <-- AUTO LOAD SEKARANG
      } else {
        setMonths([]);
      }
    })();
  }, []);

  function fmtRp(n: number) {
    return (n ?? 0).toLocaleString("id-ID");
  }
  function fmtDate(d?: string | null) {
    return d ? new Date(d).toLocaleDateString("id-ID") : "-";
  }

  // helper format sisa kurang
  function renderSisaKurang(n: number) {
    if (n > 0) {
      return <span className="text-red-600">Kurang Rp {fmtRp(n)}</span>;
    }
    if (n < 0) {
      return <span className="text-green-600">Sisa Rp {fmtRp(-n)}</span>;
    }
    return <span className="text-green-600">Rp 0</span>;
  }

  function renderTotalSisaKurang(n: number) {
    if (n > 0) {
      return <span>Rp {fmtRp(n)}</span>;
    }
    if (n < 0) {
      return <span>Rp {fmtRp(n)}</span>;
    }
    return <span>Rp 0</span>;
  }

  function labelSisaKurang(n: number) {
    if (n > 0) return `Kurang Rp ${fmtRp(n)}`;
    if (n < 0) return `Sisa Rp ${fmtRp(-n)}`;
    return "Rp 0";
  }

  function labelTotalSisaKurang(n: number) {
    if (n > 0) return `Rp ${fmtRp(n)}`;
    if (n < 0) return `Rp ${fmtRp(n)}`;
    return "Rp 0";
  }

  function todayLabel() {
    return new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  function exportToExcel() {
    if (!rows.length) {
      toast.info("Tidak ada data untuk diekspor");
      return;
    }

    const aoa: (string | number)[][] = [
      ["LAPORAN STATUS PEMBAYARAN"],
      [
        `Periode: ${formatPeriode(
          selectedPeriod
        )}   —   Dicetak: ${todayLabel()}`,
      ],
      [],
      [
        "No",
        "Nama",
        "Pemakaian (m³)",
        "Tagihan Bulan Ini (Pemakaian × Tarif/m³)",
        "Tagihan Lalu (+/−)",
        "Total Tagihan",
        "Dibayar",
        "Sisa/Kurang", // langsung pakai label
      ],
      ...rows.map((r) => [
        r.no,
        r.nama,
        r.pemakaianM3,
        r.tagihanAwal,
        labelSisaKurang(r.tagihanLalu),
        r.totalTagihan,
        r.sudahBayar,
        labelSisaKurang(r.sisaKurang),
      ]),
      [
        "Total",
        "",
        "",
        summary.tagihanAwal,
        "",
        summary.totalTagihan,
        summary.sudahBayar,
        labelTotalSisaKurang(summary.sisaKurang),
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    (ws as any)["!cols"] = [
      { wch: 5 },
      { wch: 28 },
      { wch: 14 },
      { wch: 34 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
      { wch: 22 },
    ];

    (ws as any)["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, formatPeriode(selectedPeriod));
    XLSX.writeFile(wb, `Laporan-Status-Pembayaran-${selectedPeriod}.xlsx`);
  }

  const footerTotals = useMemo(
    () => ({
      totalTagihan: fmtRp(summary.totalTagihan),
      sudahBayar: fmtRp(summary.sudahBayar),
      belumBayar: fmtRp(summary.belumBayar),
      sisaKurang: renderTotalSisaKurang(summary.sisaKurang),
    }),
    [summary]
  );

  async function openDetail(row: Row) {
    setOpen(true);
    setLoadingDetail(true);
    try {
      const qs = new URLSearchParams({
        periode: selectedPeriod,
        ...(row.tagihanId ? { tagihanId: String(row.tagihanId) } : {}),
        ...(row.pelangganId ? { pelangganId: String(row.pelangganId) } : {}),
      }).toString();
      const res = await fetch(`/api/laporan/status/detail?${qs}`);
      const json = await res.json();
      if (json?.ok) setDetail(json.detail);
      else {
        setDetail(null);
        toast.error(json?.message || "Gagal memuat detail");
      }
    } catch (e) {
      setDetail(null);
      toast.error("Gagal memuat detail");
    } finally {
      setLoadingDetail(false);
    }
  }

  return (
    <AuthGuard>
      <AppShell>
        <div className="max-w-7xl mx-auto space-y-6">
          <AppHeader title="Laporan Status Pembayaran" />

          {/* Filter */}
          <GlassCard className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm font-medium">Periode</label>
                <Select
                  value={selectedPeriod}
                  onValueChange={(v) => {
                    setSelectedPeriod(v);
                    fetchData(v); // <-- AUTO LOAD SAAT GANTI PERIODE
                  }} 
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Pilih periode" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m} value={m}>
                        {formatPeriode(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchData()}
                  disabled={!selectedPeriod || loading}
                  className="bg-transparent"
                >
                  {loading ? "Memuat..." : "Tampilkan"}
                </Button>
              </div>

              <Button
                onClick={() => {
                  exportToExcel();
                  toast.success("Data berhasil diekspor ke Excel");
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </GlassCard>

          {/* Desktop Table */}
          <GlassCard className="p-6 hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 text-sm text-muted-foreground">
                    <th className="text-left py-3 px-2">No</th>
                    <th className="text-left py-3 px-2">Nama</th>
                    {/* <th className="text-left py-3 px-2">
                      Tgl Pengecekan Petugas
                    </th> */}
                    {/* <th className="text-left py-3 px-2">
                      Meter Saat Pengecekan
                    </th> */}
                    <th className="text-left py-3 px-2">Pemakaian (m³)</th>
                    <th className="text-left py-3 px-2">
                      <p>Tagihan Bulan Ini</p>
                      <p>(Pemakaian × Tarif/m³)</p>
                    </th>
                    <th className="text-left py-3 px-2">Tagihan Lalu</th>
                    {/* <th className="text-left py-3 px-2">Abonemen</th> */}
                    <th className="text-left py-3 px-2">Total Tagihan</th>
                    {/* <th className="text-left py-3 px-2">Tgl Bayar</th> */}
                    <th className="text-left py-3 px-2">Dibayar</th>
                    <th className="text-left py-3 px-2">Sisa/Kurang</th>
                    <th className="text-left py-3 px-2">Aksi</th>
                    {/* <th className="text-left py-3 px-2">Belum Bayar</th>
                    <th className="text-left py-3 px-2">Kembalian</th> */}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.no}
                      className="border-b border-border/30 hover:bg-muted/20 text-sm"
                    >
                      <td className="py-3 px-2">{r.no}</td>
                      <td className="py-3 px-2 font-medium">{r.nama}</td>
                      {/* <td className="py-3 px-2">{fmtDate(r.tglPengecekan)}</td> */}
                      {/* <td className="py-3 px-2">{r.meterSaatPengecekan}</td> */}
                      <td className="py-3 px-2 text-center">{r.pemakaianM3}</td>
                      <td className="py-3 px-2 text-center">
                        Rp {fmtRp(r.tagihanAwal)}
                      </td>
                      {/* <td className="py-3 px-2">Rp {fmtRp(r.abonemen)}</td> */}
                      <td className="text-center">
                        {renderSisaKurang(r.tagihanLalu)}
                      </td>
                      <td className="py-3 px-2 font-semibold text-center">
                        Rp {fmtRp(r.totalTagihan)}
                      </td>
                      {/* <td className="py-3 px-2">{fmtDate(r.tglBayar)}</td> */}
                      <td className="py-3 px-2 text-center">
                        Rp {fmtRp(r.sudahBayar)}
                      </td>
                      <td className="text-center">
                        {renderSisaKurang(r.sisaKurang)}
                      </td>
                      <td className="py-3 px-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-transparent"
                          onClick={() => openDetail(r)}
                        >
                          Detail
                        </Button>
                      </td>
                      {/* <td className="py-3 px-2 text-red-600">
                        Rp {fmtRp(r.belumBayar)}
                      </td> */}
                      {/* <td className="py-3 px-2">Rp {fmtRp(r.kembalian)}</td> */}
                    </tr>
                  ))}
                  {/* totals baris bawah */}
                  {!!rows.length && (
                    <tr className="border-t-2 border-primary/20 bg-muted/10 font-semibold text-sm">
                      <td className="py-3 px-2">Total</td>
                      <td colSpan={2} />
                      <td className="py-3 px-2 text-center">
                        Rp {fmtRp(summary.tagihanAwal)}
                      </td>
                      {/* <td className="py-3 px-2">
                        Rp {fmtRp(summary.abonemen)}
                      </td> */}
                      {/* <td className="text-center">
                        Rp {fmtRp(summary.tagihanLalu)}
                      </td> */}
                      <td></td>
                      <td className="py-3 px-2 text-center">
                        Rp {fmtRp(summary.totalTagihan)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        Rp {fmtRp(summary.sudahBayar)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {renderTotalSisaKurang(summary.sisaKurang)}
                      </td>
                      {/* <td className="py-3 px-2">
                        Rp {fmtRp(summary.belumBayar)}
                      </td> */}
                      {/* <td className="py-3 px-2">
                        Rp {fmtRp(summary.kembalian)}
                      </td> */}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {/* <GlassCard className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">
                  Laporan Status Pembayaran
                </h3>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={exportToExcel}
                >
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedPeriod}
                  onValueChange={setSelectedPeriod}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Pilih bulan" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m} value={m}>
                        {formatPeriode(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" className="bg-transparent" size="sm" onClick={fetchData}>
                  Tampilkan
                </Button>
              </div>
            </GlassCard> */}

            {rows.map((r) => (
              <GlassCard key={r.no} className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{r.nama}</h4>
                    <p className="text-xs text-muted-foreground">
                      {formatPeriode(selectedPeriod)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-transparent"
                    onClick={() => openDetail(r)}
                  >
                    Detail
                  </Button>
                </div>

                {/* Body */}
                <div className="grid grid-cols-2 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Pemakaian (m³)</span>
                  <span>{r.pemakaianM3}</span>

                  <span className="text-muted-foreground">Tagihan Bulan Ini</span>
                  <span>Rp {fmtRp(r.tagihanAwal)}</span>

                  <span className="text-muted-foreground">Tagihan Lalu</span>
                  <span>
                    Rp {renderSisaKurang(r.tagihanLalu)}
                  </span>

                  <span className="text-muted-foreground">Total Tagihan</span>
                  <span className="font-semibold">
                    Rp {fmtRp(r.totalTagihan)}
                  </span>

                  <span className="text-muted-foreground">Dibayar</span>
                  <span>Rp {fmtRp(r.sudahBayar)}</span>

                  <span className="text-muted-foreground">Sisa/Kurang</span>
                  <span
                    className={
                      r.sisaKurang < 0
                        ? "text-green-600"
                        : r.sisaKurang > 0
                        ? "text-red-600"
                        : ""
                    }
                  >
                    {renderSisaKurang(r.sisaKurang)}
                  </span>
                </div>
              </GlassCard>
            ))}

            {!!rows.length && (
              <GlassCard className="p-4">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Total Tagihan</span>
                    <b>Rp {footerTotals.totalTagihan}</b>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Dibayar</span>
                    <b>Rp {footerTotals.sudahBayar}</b>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Sisa/Kurang</span>
                    <b className="">{footerTotals.sisaKurang}</b>
                  </div>
                </div>
              </GlassCard>
            )}
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-2xl overflow-y-auto backdrop-blur-xl bg-background/70">
            <DialogHeader>
              <DialogTitle className="text-emerald-700">
                Detail Tagihan
              </DialogTitle>
              <DialogDescription>
                {formatPeriode(selectedPeriod)}
              </DialogDescription>
            </DialogHeader>

            {!detail || loadingDetail ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Memuat rincian…
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header pelanggan */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-base font-semibold">{detail.nama}</div>
                    {detail.alamat && (
                      <div className="text-xs text-muted-foreground">
                        {detail.alamat}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-sm">
                    <div>Total Ditagih</div>
                    <div className="text-lg font-semibold">
                      Rp {fmtRp(detail.totalTagihanDue)}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Grid angka utama */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-muted/40">
                    <div className="text-muted-foreground">Meter Awal</div>
                    <div className="font-medium">{detail.meterAwal}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40">
                    <div className="text-muted-foreground">Meter Akhir</div>
                    <div className="font-medium">{detail.meterAkhir}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40">
                    <div className="text-muted-foreground">Pemakaian</div>
                    <div className="font-medium">{detail.pemakaianM3} m³</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40">
                    <div className="text-muted-foreground">Tarif/m³</div>
                    <div className="font-medium">
                      Rp {fmtRp(detail.tarifPerM3)}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40">
                    <div className="text-muted-foreground">Abonemen</div>
                    <div className="font-medium">
                      Rp {fmtRp(detail.abonemen)}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40">
                    <div className="text-muted-foreground">Denda</div>
                    <div className="font-medium">Rp {fmtRp(detail.denda)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40">
                    <div className="text-muted-foreground">
                      Tagihan Lalu (+/−)
                    </div>
                    <div
                      className={`font-medium ${
                        detail.tagihanLalu < 0
                          ? "text-red-600"
                          : detail.tagihanLalu > 0
                          ? "text-green-600"
                          : ""
                      }`}
                    >
                      {renderSisaKurang(detail.tagihanLalu)}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40">
                    <div className="text-muted-foreground">
                      Tagihan Bulan Ini
                    </div>
                    <div className="font-medium">
                      Rp {fmtRp(detail.totalBulanIni)}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40">
                    <div className="text-muted-foreground">
                      Sisa/Kurang (+/−)
                    </div>
                    <div>
                      {renderSisaKurang(detail.sisaKurang)}
                    </div>
                  </div>
                </div>

                {/* Tabel pembayaran */}
                <div className="rounded-lg border">
                  <div className="px-4 py-2 text-sm font-medium bg-muted/40">
                    Pembayaran
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 px-3">Tanggal</th>
                          <th className="text-left py-2 px-3">Metode</th>
                          {/* <th className="text-left py-2 px-3">Keterangan</th> */}
                          <th className="text-right py-2 px-3">Jumlah</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.pembayaran.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="py-3 px-3 text-center text-muted-foreground"
                            >
                              Belum ada pembayaran
                            </td>
                          </tr>
                        ) : (
                          detail.pembayaran.map((p: any) => (
                            <tr key={p.id} className="border-b">
                              <td className="py-2 px-3">
                                {p.tanggalBayar
                                  ? new Date(p.tanggalBayar).toLocaleDateString(
                                      "id-ID"
                                    )
                                  : "-"}
                              </td>
                              <td className="py-2 px-3">{p.metode}</td>
                              {/* <td className="py-2 px-3">
                                {p.keterangan || "-"}
                              </td> */}
                              <td className="py-2 px-3 text-right">
                                Rp {fmtRp(p.jumlahBayar)}
                              </td>
                            </tr>
                          ))
                        )}
                        <tr className="font-semibold">
                          <td className="py-2 px-3" colSpan={2}>
                            Total Dibayar
                          </td>
                          <td className="py-2 px-3 text-right">
                            Rp {fmtRp(detail.dibayar)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Tgl pengecekan:{" "}
                  {detail.tglPengecekan
                    ? new Date(detail.tglPengecekan).toLocaleDateString("id-ID")
                    : "-"}{" "}
                  • Jatuh tempo:{" "}
                  {detail.tglJatuhTempo
                    ? new Date(detail.tglJatuhTempo).toLocaleDateString("id-ID")
                    : "-"}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </AppShell>
    </AuthGuard>
  );
}

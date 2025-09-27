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
import { Input } from "@/components/ui/input";
import { Download, Search } from "lucide-react";
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
  tagihanLalu: number;
  totalTagihan: number;
  sudahBayar: number;
  sisaKurang: number;
  tglPengecekan: string | null;
  meterSaatPengecekan: number;
  tglBayar: string | null;
  belumBayar: number;
  kembalian: number;
  tagihanId?: string;
  pelangganId?: string;
  info?: string | null;
};

type Summary = {
  tagihanAwal: number;
  abonemen: number;
  tagihanLalu: number;
  totalTagihan: number;
  sudahBayar: number;
  sisaKurang: number;
  belumBayar: number;
};

// ================= helpers =================
function formatPeriode(kode: string) {
  const [tahun, bulan] = kode.split("-");
  const bulanNama = [
    "Januari","Februari","Maret","April","Mei","Juni",
    "Juli","Agustus","September","Oktober","November","Desember",
  ][parseInt(bulan, 10) - 1];
  return `${bulanNama} ${tahun}`;
}
function parsePaidAt(info?: string | null): Date | null {
  if (!info) return null;
  const m = info.match(/\[PAID_AT:([^\]]+)\]/);
  if (!m) return null;
  const d = new Date(m[1]);
  return isNaN(d.getTime()) ? null : d;
}
function formatTanggalID(d: Date) {
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}
function todayLabel() {
  return new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
function fmtRp(n: number) {
  return (n ?? 0).toLocaleString("id-ID");
}
function renderSisaKurang(n: number) {
  if (n > 0) return <span className="text-red-600">Kurang Rp {fmtRp(n)}</span>;
  if (n < 0) return <span className="text-green-600">Sisa Rp {fmtRp(-n)}</span>;
  return <span className="text-green-600">Rp 0</span>;
}
function renderTotalSisaKurang(n: number) {
  if (n > 0) return <span>Rp {fmtRp(n)}</span>;
  if (n < 0) return <span>Rp {fmtRp(n)}</span>;
  return <span>Rp 0</span>;
}
const calcSummary = (rs: Row[]): Summary =>
  rs.reduce<Summary>(
    (a, r) => ({
      tagihanAwal: a.tagihanAwal + r.tagihanAwal,
      abonemen: a.abonemen + r.abonemen,
      tagihanLalu: a.tagihanLalu + r.tagihanLalu,
      totalTagihan: a.totalTagihan + r.totalTagihan,
      sudahBayar: a.sudahBayar + r.sudahBayar,
      sisaKurang: a.sisaKurang + r.sisaKurang,
      belumBayar: a.belumBayar + Math.max(r.totalTagihan - r.sudahBayar, 0),
    }),
    {
      tagihanAwal: 0,
      abonemen: 0,
      tagihanLalu: 0,
      totalTagihan: 0,
      sudahBayar: 0,
      sisaKurang: 0,
      belumBayar: 0,
    }
  );

// =============== component ===============
export default function LaporanStatusPembayaranPage() {
  const [months, setMonths] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Summary>({
    tagihanAwal: 0,
    abonemen: 0,
    tagihanLalu: 0,
    totalTagihan: 0,
    sudahBayar: 0,
    sisaKurang: 0,
    belumBayar: 0,
  });

  // NEW: state search
  const [q, setQ] = useState("");

  // modal detail
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // load bulan + auto fetch periode terbaru (rapihin yang dobel)
  useEffect(() => {
    (async () => {
      const r = await fetch("/api/laporan/status/months");
      const j = await r.json();
      if (j?.ok && j.periods?.length) {
        const def = j.periods[0];
        setMonths(j.periods);
        setSelectedPeriod(def);
        fetchData(def);
      } else {
        setMonths([]);
      }
    })();
  }, []);

  async function fetchData(period?: string) {
    const per = period ?? selectedPeriod;
    if (!per) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/laporan/status?periode=${encodeURIComponent(per)}`);
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
          belumBayar: 0,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  // ======== filtering (client-side) ========
  const filteredRows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => {
      // saat ini pasti ada r.nama; tambahin nomor urut biar gampang dicari
      return (
        (r.nama || "").toLowerCase().includes(term) ||
        String(r.no).includes(term)
      );
    });
  }, [rows, q]);

  // Summary untuk tampilan (kalau ada filter → pakai summary yang difilter)
  const filteredSummary = useMemo(() => calcSummary(filteredRows), [filteredRows]);
  const viewSummary: Summary = q ? filteredSummary : summary;

  const footerTotals = useMemo(
    () => ({
      totalTagihan: fmtRp(viewSummary.totalTagihan),
      sudahBayar: fmtRp(viewSummary.sudahBayar),
      belumBayar: fmtRp(viewSummary.belumBayar),
      sisaKurang: renderTotalSisaKurang(viewSummary.sisaKurang),
    }),
    [viewSummary]
  );

  function exportToExcel() {
    if (!filteredRows.length) {
      toast.info("Tidak ada data untuk diekspor");
      return;
    }

    const aoa: (string | number)[][] = [
      ["LAPORAN STATUS PEMBAYARAN"],
      [
        `Periode: ${formatPeriode(selectedPeriod)}   —   Dicetak: ${todayLabel()}${
          q ? `   —   Filter: ${q}` : ""
        }`,
      ],
      [],
      [
        "No",
        "Nama",
        "Pemakaian (m³)",
        "Tagihan Bulan Ini (Pemakaian × Tarif/m³)",
        "Tagihan Lalu",
        "Total Tagihan",
        "Dibayar",
        "Sisa/Kurang",
      ],
      ...filteredRows.map((r) => [
        r.no,
        r.nama,
        r.pemakaianM3,
        r.tagihanAwal,
        // tampilkan label +/−
        r.sisaKurang >= 0 ? `Kurang Rp ${fmtRp(r.tagihanLalu)}` : `Sisa Rp ${fmtRp(-r.tagihanLalu)}`,
        r.totalTagihan,
        r.sudahBayar,
        r.sisaKurang >= 0 ? `Kurang Rp ${fmtRp(r.sisaKurang)}` : `Sisa Rp ${fmtRp(-r.sisaKurang)}`,
      ]),
      [
        "Total",
        "",
        "",
        viewSummary.tagihanAwal,
        "",
        viewSummary.totalTagihan,
        viewSummary.sudahBayar,
        viewSummary.sisaKurang >= 0
          ? `Rp ${fmtRp(viewSummary.sisaKurang)}`
          : `Rp ${fmtRp(viewSummary.sisaKurang)}`,
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
    XLSX.writeFile(wb, `Laporan-Status-Pembayaran-${selectedPeriod}${q ? `-filter-${q}` : ""}.xlsx`);
  }

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
    } catch {
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
                <label className="text-sm font-medium">Periode Tagihan</label>
                <Select
                  value={selectedPeriod}
                  onValueChange={(v) => {
                    setSelectedPeriod(v);
                    fetchData(v); // auto refresh saat ganti periode
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

                {/* NEW: Search bar (client-side filter) */}
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Cari nama"
                    className="pl-8 w-56"
                  />
                </div>

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

            {/* Info jumlah hasil filter */}
            <div className="mt-2 text-xs text-muted-foreground">
              Menampilkan <b>{filteredRows.length}</b> dari <b>{rows.length}</b> data
              {q ? <> (filter: “{q}”)</> : null}
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
                    <th className="text-left py-3 px-2">Pemakaian (m³)</th>
                    <th className="text-left py-3 px-2">
                      <p>Tagihan Bulan Ini</p>
                      <p>(Pemakaian × Tarif/m³)</p>
                    </th>
                    <th className="text-center py-3 px-2">Tagihan Lalu</th>
                    <th className="text-left py-3 px-2">Total Tagihan</th>
                    <th className="text-left py-3 px-2">Dibayar</th>
                    <th className="text-left py-3 px-2">Sisa/Kurang</th>
                    <th className="text-left py-3 px-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r) => (
                    <tr
                      key={r.no}
                      className="border-b border-border/30 hover:bg-muted/20 text-sm"
                    >
                      <td className="py-3 px-2">{r.no}</td>
                      <td className="py-3 px-2 font-medium">{r.nama}</td>
                      <td className="py-3 px-2 text-center">{r.pemakaianM3}</td>
                      <td className="py-3 px-2 text-center">Rp {fmtRp(r.tagihanAwal)}</td>
                      <td className="text-center">
                        {renderSisaKurang(r.tagihanLalu)}
                        {(() => {
                          if (r.tagihanLalu <= 0) return null;
                          const paidAt = parsePaidAt(r.info) || (r.tglBayar ? new Date(r.tglBayar) : null);
                          if (!paidAt) return null;
                          return (
                            <div className="mt-1 text-[11px] text-green-600">
                              Dibayar tanggal {formatTanggalID(paidAt)}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-2 font-semibold text-center">Rp {fmtRp(r.totalTagihan)}</td>
                      <td className="py-3 px-2 text-center">Rp {fmtRp(r.sudahBayar)}</td>
                      <td className="text-center">
                        {renderSisaKurang(r.sisaKurang)}
                        {(() => {
                          if (r.sisaKurang <= 0) return null;
                          const paidAt = parsePaidAt(r.info) || (r.tglBayar ? new Date(r.tglBayar) : null);
                          if (!paidAt) return null;
                          return (
                            <div className="mt-1 text-[11px] text-green-600">
                              Dibayar tanggal {formatTanggalID(paidAt)}
                            </div>
                          );
                        })()}
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
                    </tr>
                  ))}

                  {!!filteredRows.length && (
                    <tr className="border-t-2 border-primary/20 bg-muted/10 font-semibold text-sm">
                      <td className="py-3 px-2">Total</td>
                      <td colSpan={2} />
                      <td className="py-3 px-2 text-center">Rp {fmtRp(viewSummary.tagihanAwal)}</td>
                      <td></td>
                      <td className="py-3 px-2 text-center">Rp {fmtRp(viewSummary.totalTagihan)}</td>
                      <td className="py-3 px-2 text-center">Rp {fmtRp(viewSummary.sudahBayar)}</td>
                      <td className="py-3 px-2 text-center">{renderTotalSisaKurang(viewSummary.sisaKurang)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {filteredRows.map((r) => (
              <GlassCard key={r.no} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{r.nama}</h4>
                    <p className="text-xs text-muted-foreground">{formatPeriode(selectedPeriod)}</p>
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

                <div className="grid grid-cols-2 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Pemakaian (m³)</span>
                  <span>{r.pemakaianM3}</span>

                  <span className="text-muted-foreground">Tagihan Bulan Ini</span>
                  <span>Rp {fmtRp(r.tagihanAwal)}</span>

                  <span className="text-muted-foreground">Tagihan Lalu</span>
                  <span>
                    {renderSisaKurang(r.tagihanLalu)}
                    {(() => {
                      if (r.tagihanLalu <= 0) return null;
                      const paidAt = parsePaidAt(r.info) || (r.tglBayar ? new Date(r.tglBayar) : null);
                      if (!paidAt) return null;
                      return (
                        <div className="mt-1 text-[11px] text-green-500">
                          Dibayar tanggal {formatTanggalID(paidAt)}
                        </div>
                      );
                    })()}
                  </span>

                  <span className="text-muted-foreground">Total Tagihan</span>
                  <span className="font-semibold">Rp {fmtRp(r.totalTagihan)}</span>

                  <span className="text-muted-foreground">Dibayar</span>
                  <span>Rp {fmtRp(r.sudahBayar)}</span>

                  <span className="text-muted-foreground">Sisa/Kurang</span>
                  <span
                    className={
                      r.sisaKurang < 0 ? "text-green-600" : r.sisaKurang > 0 ? "text-red-600" : ""
                    }
                  >
                    {renderSisaKurang(r.sisaKurang)}
                    {(() => {
                      if (r.sisaKurang <= 0) return null;
                      const paidAt = parsePaidAt(r.info) || (r.tglBayar ? new Date(r.tglBayar) : null);
                      if (!paidAt) return null;
                      return (
                        <div className="mt-1 text-[11px] text-green-500">
                          Dibayar tanggal {formatTanggalID(paidAt)}
                        </div>
                      );
                    })()}
                  </span>
                </div>
              </GlassCard>
            ))}

            {!!filteredRows.length && (
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

        {/* Modal Detail */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-2xl overflow-y-auto backdrop-blur-xl bg-background/70">
            <DialogHeader>
              <DialogTitle className="text-emerald-700">Detail Tagihan</DialogTitle>
              <DialogDescription>
                {formatPeriode(selectedPeriod)} • Jatuh tempo:{" "}
                {detail?.tglJatuhTempo
                  ? new Date(detail?.tglJatuhTempo).toLocaleDateString("id-ID")
                  : "-"}
              </DialogDescription>
            </DialogHeader>

            {!detail || loadingDetail ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Memuat rincian…</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-base font-semibold">{detail.nama}</div>
                    {detail.alamat && (
                      <div className="text-xs text-muted-foreground">{detail.alamat}</div>
                    )}
                    {(() => {
                      const paidAt = parsePaidAt(detail?.info) || (detail?.tglBayar ? new Date(detail.tglBayar) : null);
                      if (!paidAt) return null;
                      return (
                        <div className="mt-1 text-[11px] text-green-500 bg-green-100 py-0.5 px-1 rounded-full">
                          Dibayar tanggal {formatTanggalID(paidAt)}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="text-right text-sm">
                    <div>Total Ditagih</div>
                    <div className="text-lg font-semibold">Rp {fmtRp(detail.totalTagihanDue)}</div>
                  </div>
                </div>

                <Separator />

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
                    <div className="font-medium">Rp {fmtRp(detail.tarifPerM3)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40">
                    <div className="text-muted-foreground">Abonemen</div>
                    <div className="font-medium">Rp {fmtRp(detail.abonemen)}</div>
                  </div>
                  {/* <div className="p-3 rounded-lg bg-muted/40">
                    <div className="text-muted-foreground">Denda</div>
                    <div className="font-medium">Rp {fmtRp(detail.denda)}</div>
                  </div> */}
                  <div className="p-3 rounded-lg bg-muted/40">
                    <div className="text-muted-foreground">Tagihan Lalu (+/−)</div>
                    <div className="font-medium">{renderSisaKurang(detail.tagihanLalu)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40">
                    <div className="text-muted-foreground">Tagihan Bulan Ini</div>
                    <div className="font-medium">Rp {fmtRp(detail.totalBulanIni)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40">
                    <div className="text-muted-foreground">Sisa/Kurang (+/−)</div>
                    <div>{renderSisaKurang(detail.sisaKurang)}</div>
                  </div>
                </div>

                <div className="rounded-lg border">
                  <div className="px-4 py-2 text-sm font-medium bg-muted/40">Pembayaran</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 px-3">Tanggal</th>
                          <th className="text-left py-2 px-3">Metode</th>
                          <th className="text-right py-2 px-3">Jumlah</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.pembayaran.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-3 px-3 text-center text-muted-foreground">
                              Belum ada pembayaran
                            </td>
                          </tr>
                        ) : (
                          detail.pembayaran.map((p: any) => (
                            <tr key={p.id} className="border-b">
                              <td className="py-2 px-3">
                                {p.tanggalBayar
                                  ? new Date(p.tanggalBayar).toLocaleDateString("id-ID")
                                  : "-"}
                              </td>
                              <td className="py-2 px-3">{p.metode}</td>
                              <td className="py-2 px-3 text-right">Rp {fmtRp(p.jumlahBayar)}</td>
                            </tr>
                          ))
                        )}
                        <tr className="font-semibold">
                          <td className="py-2 px-3" colSpan={2}>Total Dibayar</td>
                          <td className="py-2 px-3 text-right">Rp {fmtRp(detail.dibayar)}</td>
                        </tr>
                      </tbody>
                    </table>
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

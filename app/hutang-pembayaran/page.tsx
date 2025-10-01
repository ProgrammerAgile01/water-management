"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { AppShell } from "@/components/app-shell";
import { AppHeader } from "@/components/app-header";
import { AuthGuard } from "@/components/auth-guard";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Eye, Loader2, Check, History, Wand2 } from "lucide-react";

/* ===== utils ===== */
const fetcher = (u: string) => fetch(u).then((r) => r.json());
const toIDR = (n = 0) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(n || 0));

const onlyDate = (v?: string) => {
  if (!v) return "-";
  if (v.length >= 10 && v[4] === "-" && v[7] === "-") return v.slice(0, 10);
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v).slice(0, 10);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// format angka: "10000000" -> "10.000.000"
const fmtPlainID = (n: number | string) =>
  Number(n || 0).toLocaleString("id-ID");
// ambil hanya digit dari input
const onlyDigits = (s: string) => (s.match(/\d/g) || []).join("");

/* ===== types ===== */
type HutangDetailView = {
  id: string;
  no: number;
  keterangan: string;
  nominal: number;
  sudahBayar: number;
  sisa: number;
};
type HutangHeaderView = {
  id: string;
  noBukti: string;
  tanggalHutang: string;
  keterangan: string;
  status: "Draft" | "Close";
  total: number;
  sudahBayar: number;
  sisa: number;
  details: HutangDetailView[];
};

export default function HutangPembayaranPage() {
  const { toast } = useToast();

  /* ===== dropdown pemberi ===== */
  const { data: giverData } = useSWR<{
    ok: boolean;
    items: { name: string }[];
  }>("/api/hutang-pembayaran?mode=givers", fetcher, {
    revalidateOnFocus: false,
  });
  const givers = giverData?.items ?? [];

  /* ===== filter atas ===== */
  const [giver, setGiver] = useState("");
  const [note, setNote] = useState("");
  const [refNo, setRefNo] = useState("");
  const [payDate, setPayDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });

  /* ===== data hutang per pemberi ===== */
  const { data, isLoading, mutate } = useSWR<{
    ok: boolean;
    items: HutangHeaderView[];
  }>(
    giver ? `/api/hutang-pembayaran?giver=${encodeURIComponent(giver)}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );
  const items = data?.items ?? [];

  /* ===== modal bayar ===== */
  const [open, setOpen] = useState(false);
  const [activeHeader, setActiveHeader] = useState<HutangHeaderView | null>(
    null
  );

  // simpan nilai numerik per detail
  const [lineNums, setLineNums] = useState<Record<string, number>>({});
  // string tampilan (10.000.000)
  const [lineStrs, setLineStrs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const genRef = () => {
    const d = new Date();
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    setRefNo(`BYR-${yy}${mm}${dd}-${hh}${mi}`);
  };

  const openPay = (h: HutangHeaderView) => {
    setActiveHeader(h);
    const nums: Record<string, number> = {};
    const strs: Record<string, string> = {};
    h.details.forEach((d) => {
      nums[d.id] = 0;
      strs[d.id] = "";
    });
    setLineNums(nums);
    setLineStrs(strs);
    setOpen(true);
  };

  const onChangeAmount = (detailId: string, raw: string, sisa: number) => {
    const digits = onlyDigits(raw);
    const val = Math.min(Number(digits || 0), Math.max(0, sisa));
    setLineNums((p) => ({ ...p, [detailId]: val }));
    setLineStrs((p) => ({ ...p, [detailId]: val ? fmtPlainID(val) : "" }));
  };

  const totalBayar = useMemo(
    () => Object.values(lineNums).reduce((a, b) => a + (Number(b) || 0), 0),
    [lineNums]
  );

  const savePayment = async () => {
    if (!activeHeader || !giver) return;

    const payload = {
      giver,
      date: payDate,
      refNo: refNo.trim(),
      note: note ? `[NO:${refNo.trim() || "-"}] ${note}`.trim() : "",
      lines: activeHeader.details
        .map((d) => ({ detailId: d.id, amount: Number(lineNums[d.id] || 0) }))
        .filter((l) => Number.isFinite(l.amount) && l.amount > 0),
    };

    if (!payload.lines.length) {
      toast({
        title: "Belum ada nominal",
        description: "Isi nominal bayar minimal di satu detail.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/hutang-pembayaran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Gagal menyimpan");

      if (Array.isArray(j.items)) {
        await mutate({ ok: true, items: j.items }, { revalidate: false });
      } else {
        await mutate();
      }

      setOpen(false);
      setLineNums({});
      setLineStrs({});
      toast({
        title: "Tersimpan",
        description: `Total bayar ${toIDR(j?.payment?.total || totalBayar)}`,
      });
    } catch (e: any) {
      toast({
        title: "Gagal",
        description:
          typeof e?.message === "string" ? e.message : "Gagal simpan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto p-4 space-y-6">
        <AuthGuard>
          <AppShell>
            <AppHeader title="Pembayaran Hutang" />

            {/* Filter & link riwayat */}
            <GlassCard className="p-6 mb-6">
              {/* Grid agar tetap rapi di semua breakpoint */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Kolom 1: pilih pemberi + tombol load */}
                <div className="flex-1">
                  <Label>Pemberi Hutang</Label>
                  <div className="mt-1 flex gap-2 flex-wrap sm:flex-nowrap items-stretch">
                    <Select value={giver} onValueChange={setGiver}>
                      <SelectTrigger
                        className="
                          min-w-0 w-full sm:w-64 flex-1
                        "
                        aria-label="Pilih pemberi hutang"
                      >
                        <SelectValue placeholder="Pilih pemberi…" />
                      </SelectTrigger>
                      <SelectContent>
                        {givers.map((g) => (
                          <SelectItem key={g.name} value={g.name}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      onClick={() => giver && mutate()}
                      disabled={!giver}
                      className="shrink-0 w-full sm:w-auto"
                      title="Muat detail hutang dari pemberi ini"
                    >
                      Load detail
                    </Button>
                  </div>
                </div>

                {/* Kolom 2: tombol riwayat */}
                <div className="flex flex-col sm:items-end">
                  <Label className="sm:invisible sm:h-5">&nbsp;</Label>
                  <div className="mt-1 w-full sm:w-auto">
                    <Link href="/hutang-pembayaran/riwayat">
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto shrink-0"
                      >
                        <History className="w-4 h-4 mr-2" />
                        Riwayat Pembayaran
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Data header hutang */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Data Hutang ke Pemberi
                </h3>
                <div className="text-sm text-muted-foreground">
                  {giver || "—"}
                </div>
              </div>

              {!giver ? (
                <div className="p-4 text-sm text-muted-foreground bg-muted/20 rounded">
                  Pilih pemberi hutang lalu klik <b>Load detail</b>.
                </div>
              ) : isLoading ? (
                <div className="p-4 text-sm text-muted-foreground">
                  Memuat data…
                </div>
              ) : items.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  Tidak ada data hutang.
                </div>
              ) : (
                <>
                  {/* desktop table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/20">
                          <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                            No Bukti
                          </th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                            Tgl Hutang
                          </th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                            Keterangan
                          </th>
                          <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                            Total Hutang
                          </th>
                          <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                            Sudah Bayar
                          </th>
                          <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                            Sisa
                          </th>
                          <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((h) => (
                          <tr
                            key={h.id}
                            className="border-b border-border/10 hover:bg-muted/20"
                          >
                            <td className="py-3 px-2 text-sm font-semibold">
                              {h.noBukti}
                            </td>
                            <td className="py-3 px-2 text-sm">
                              {onlyDate(h.tanggalHutang)}
                            </td>
                            <td className="py-3 px-2 text-sm">
                              {h.keterangan}
                            </td>
                            <td className="py-3 px-2 text-sm text-right">
                              {toIDR(h.total)}
                            </td>
                            <td className="py-3 px-2 text-sm text-right">
                              {toIDR(h.sudahBayar)}
                            </td>
                            <td className="py-3 px-2 text-sm text-right font-bold">
                              {toIDR(h.sisa)}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 rounded-lg"
                                onClick={() => openPay(h)}
                                title="Bayar / Lihat detail"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* mobile cards */}
                  <div className="lg:hidden space-y-4">
                    {items.map((h) => (
                      <div
                        key={h.id}
                        className="p-4 bg-muted/20 rounded-lg space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-foreground">
                              {h.noBukti}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Tgl: {onlyDate(h.tanggalHutang)}
                            </p>
                            <p className="mt-1 text-sm">{h.keterangan}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              Sisa
                            </p>
                            <p className="font-bold text-primary">
                              {toIDR(h.sisa)}
                            </p>
                          </div>
                        </div>

                        <div className="bg-card/50 p-3 rounded-lg grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Total</p>
                            <p className="font-medium">{toIDR(h.total)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Sudah Bayar</p>
                            <p className="font-medium">{toIDR(h.sudahBayar)}</p>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openPay(h)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Bayar / Detail
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </GlassCard>

            {/* Modal Bayar – full cards */}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle>
                    Bayar Hutang — {activeHeader?.noBukti}
                  </DialogTitle>
                </DialogHeader>

                {activeHeader && (
                  <div className="space-y-4">
                    {/* header cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-muted/20">
                        <Label className="text-xs">No Bukti (opsional)</Label>
                        <div className="mt-1 flex gap-2">
                          <Input
                            className="h-9"
                            placeholder="BYR-…"
                            value={refNo}
                            onChange={(e) => setRefNo(e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={genRef}
                            title="Generate otomatis"
                            className="shrink-0"
                          >
                            <Wand2 className="w-4 h-4 mr-1" />
                            Generate
                          </Button>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-muted/20">
                        <Label className="text-xs">Tanggal Bayar</Label>
                        <Input
                          type="date"
                          className="h-9 mt-1"
                          value={payDate}
                          onChange={(e) => setPayDate(e.target.value)}
                        />
                      </div>

                      <div className="p-3 rounded-lg bg-muted/20">
                        <Label className="text-xs">Catatan</Label>
                        <Input
                          className="h-9 mt-1"
                          placeholder="Catatan pembayaran…"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* detail cards */}
                    <div className="space-y-3">
                      {activeHeader.details.map((d) => (
                        <div
                          key={d.id}
                          className="p-3 bg-muted/10 rounded-lg border border-border/40"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-xs text-muted-foreground">
                                No {d.no}
                              </div>
                              <div className="font-medium">{d.keterangan}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">
                                Sisa
                              </div>
                              <div className="font-semibold text-primary">
                                {toIDR(d.sisa)}
                              </div>
                            </div>
                          </div>

                          <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
                            <div>
                              <div className="text-muted-foreground">
                                Nominal
                              </div>
                              <div className="font-medium">
                                {toIDR(d.nominal)}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">
                                Sudah Bayar
                              </div>
                              <div className="font-medium">
                                {toIDR(d.sudahBayar)}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">Bayar</Label>
                              <Input
                                inputMode="numeric"
                                className="h-9 text-right mt-1"
                                placeholder="0"
                                value={lineStrs[d.id] ?? ""}
                                onChange={(e) =>
                                  onChangeAmount(d.id, e.target.value, d.sisa)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between border-t border-border/20 pt-3">
                      <span className="text-sm text-muted-foreground">
                        Total Bayar:
                      </span>
                      <span className="font-bold">{toIDR(totalBayar)}</span>
                    </div>
                  </div>
                )}

                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={saving}
                  >
                    Batal
                  </Button>
                  <Button onClick={savePayment} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Menyimpan…
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Simpan Pembayaran
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </AppShell>
        </AuthGuard>
      </div>
    </div>
  );
}

// app/hutang-pembayaran/page.tsx
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
import { Eye, Loader2, Check, History } from "lucide-react";

const fetcher = (u: string) => fetch(u).then((r) => r.json());
const toIDR = (n = 0) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(n || 0));

// tampilkan tanggal saja (cepat & aman)
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

  // dropdown pemberi
  const { data: giverData } = useSWR<{
    ok: boolean;
    items: { name: string }[];
  }>("/api/hutang-pembayaran?mode=givers", fetcher, {
    revalidateOnFocus: false,
  });
  const givers = giverData?.items ?? [];

  // filter form atas
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

  // data hutang per pemberi
  const { data, isLoading, mutate } = useSWR<{
    ok: boolean;
    items: HutangHeaderView[];
  }>(
    giver ? `/api/hutang-pembayaran?giver=${encodeURIComponent(giver)}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );
  const items = data?.items ?? [];

  // modal bayar
  const [open, setOpen] = useState(false);
  const [activeHeader, setActiveHeader] = useState<HutangHeaderView | null>(
    null
  );
  const [lines, setLines] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const openPay = (h: HutangHeaderView) => {
    setActiveHeader(h);
    const init: Record<string, string> = {};
    h.details.forEach((d) => (init[d.id] = ""));
    setLines(init);
    setOpen(true);
  };

  const totalBayar = useMemo(
    () =>
      Object.values(lines).reduce((a, s) => {
        const n = Number(s || 0);
        return Number.isFinite(n) ? a + n : a;
      }, 0),
    [lines]
  );

  const savePayment = async () => {
    if (!activeHeader || !giver) return;
    const payload = {
      giver,
      date: payDate, // jam real dirangkai di server
      refNo: refNo.trim(),
      note: note ? `[NO:${refNo.trim() || "-"}] ${note}`.trim() : "",
      lines: activeHeader.details
        .map((d) => ({ detailId: d.id, amount: Number(lines[d.id] || 0) }))
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

      // segarkan daftar agar sisa langsung berubah
      if (Array.isArray(j.items)) {
        await mutate({ ok: true, items: j.items }, { revalidate: false });
      } else {
        await mutate();
      }

      setOpen(false);
      setLines({});
      toast({
        title: "Tersimpan",
        description: `Total bayar ${toIDR(j?.payment?.total || totalBayar)}`,
      });
    } catch (e: any) {
      toast({
        title: "Gagal",
        description:
          typeof e?.message === "string"
            ? e.message
            : "Pembayaran gagal disimpan",
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
              <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
                <div className="flex-1">
                  <Label>Pemberi Hutang</Label>
                  <div className="flex gap-2">
                    <Select value={giver} onValueChange={setGiver}>
                      <SelectTrigger className="w-64">
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
                    >
                      Load detail
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Tanggal Bayar</Label>
                  <Input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-48"
                  />
                </div>

                <div>
                  <Label>No Bukti (opsional)</Label>
                  <Input
                    placeholder="Otomatis jika dikosongkan"
                    value={refNo}
                    onChange={(e) => setRefNo(e.target.value)}
                    className="w-64"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between">
                <div className="flex-1">
                  <Label>Catatan (opsional)</Label>
                  <Input
                    placeholder="Catatan pembayaran…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>

                {/* LINK RIWAYAT */}
                <Link href="/hutang-pembayaran/riwayat" className="sm:ml-4">
                  <Button variant="outline" className="w-full sm:w-auto">
                    <History className="w-4 h-4 mr-2" />
                    Riwayat Pembayaran
                  </Button>
                </Link>
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
                  {/* Desktop table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/20">
                          <th className="text-left  py-3 px-2 text-sm font-medium text-muted-foreground">
                            No Bukti
                          </th>
                          <th className="text-left  py-3 px-2 text-sm font-medium text-muted-foreground">
                            Tgl Hutang
                          </th>
                          <th className="text-left  py-3 px-2 text-sm font-medium text-muted-foreground">
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
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2 rounded-lg"
                                  onClick={() => openPay(h)}
                                  title="Bayar / Lihat detail"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
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
                            <p className="text-muted-foreground">
                              Total Hutang
                            </p>
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

            {/* Modal Bayar — cards di mobile, tabel di desktop */}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    Bayar Hutang — {activeHeader?.noBukti}
                  </DialogTitle>
                </DialogHeader>

                {activeHeader && (
                  <>
                    {/* Mobile cards */}
                    <div className="sm:hidden space-y-3">
                      {activeHeader.details.map((d) => (
                        <div
                          key={d.id}
                          className="p-3 bg-muted/20 rounded-lg space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                No
                              </p>
                              <p className="font-medium">{d.no}</p>
                              <p className="mt-1 text-sm">{d.keterangan}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">
                                Sisa
                              </p>
                              <p className="font-bold text-primary">
                                {toIDR(d.sisa)}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-muted-foreground">Nominal</p>
                              <p className="font-medium">{toIDR(d.nominal)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Sudah</p>
                              <p className="font-medium">
                                {toIDR(d.sudahBayar)}
                              </p>
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs">Bayar</Label>
                            <Input
                              type="number"
                              className="h-9 text-right mt-1"
                              placeholder="0"
                              value={lines[d.id] ?? ""}
                              onChange={(e) =>
                                setLines((p) => ({
                                  ...p,
                                  [d.id]: e.target.value,
                                }))
                              }
                              min={0}
                              max={d.sisa}
                            />
                          </div>
                        </div>
                      ))}

                      <div className="flex items-center justify-between border-t border-border/20 pt-3">
                        <span className="text-sm text-muted-foreground">
                          Total Bayar:
                        </span>
                        <span className="font-bold">{toIDR(totalBayar)}</span>
                      </div>
                    </div>

                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border/20">
                            <th className="text-left py-2 px-2 text-sm">No</th>
                            <th className="text-left py-2 px-2 text-sm">
                              Keterangan
                            </th>
                            <th className="text-right py-2 px-2 text-sm">
                              Nominal
                            </th>
                            <th className="text-right py-2 px-2 text-sm">
                              Sudah
                            </th>
                            <th className="text-right py-2 px-2 text-sm">
                              Sisa
                            </th>
                            <th className="text-right py-2 px-2 text-sm">
                              Bayar
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeHeader.details.map((d) => (
                            <tr
                              key={d.id}
                              className="border-b border-border/10 hover:bg-muted/20"
                            >
                              <td className="py-2 px-2 text-sm">{d.no}</td>
                              <td className="py-2 px-2 text-sm">
                                {d.keterangan}
                              </td>
                              <td className="py-2 px-2 text-sm text-right">
                                {toIDR(d.nominal)}
                              </td>
                              <td className="py-2 px-2 text-sm text-right">
                                {toIDR(d.sudahBayar)}
                              </td>
                              <td className="py-2 px-2 text-sm text-right">
                                {toIDR(d.sisa)}
                              </td>
                              <td className="py-2 px-2 text-sm text-right">
                                <Input
                                  type="number"
                                  className="h-8 w-40 ml-auto text-right"
                                  placeholder="0"
                                  value={lines[d.id] ?? ""}
                                  onChange={(e) =>
                                    setLines((p) => ({
                                      ...p,
                                      [d.id]: e.target.value,
                                    }))
                                  }
                                  min={0}
                                  max={d.sisa}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-border/20">
                            <td colSpan={5} className="py-2 px-2 text-right">
                              Total Bayar:
                            </td>
                            <td className="py-2 px-2 text-right font-bold">
                              {toIDR(totalBayar)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </>
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
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                        Menyimpan…
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" /> Simpan Pembayaran
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

// app/hutang-pembayaran/riwayat/page.tsx
"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Calendar,
  ChevronDown,
  Download,
  History,
  Search,
  Pencil,
  Trash2,
  Check,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const fetcher = (u: string) => fetch(u).then((r) => r.json());
const toIDR = (n = 0) => "Rp " + Number(n || 0).toLocaleString("id-ID");
const ALL_GIVER = "__ALL__";

const fmtPlainID = (n: number | string) =>
  Number(n || 0).toLocaleString("id-ID");
const onlyDigits = (s: string) => (s.match(/\d/g) || []).join("");

type Giver = { name: string };
type PaymentDetail = {
  id: string;
  hutangDetailId?: string | null;
  hutangId?: string | null;
  hutangNoBukti?: string | null;
  hutangTanggal?: string | null;
  keterangan?: string | null;
  amount: number;
};
type PaymentRow = {
  id: string;
  refNo?: string | null;
  pemberi: string;
  tanggalBayar: string;
  createdAt?: string;
  total: number;
  note?: string | null;
  status?: "DRAFT" | "CLOSE";
  postedAt?: string | null;
  details?: PaymentDetail[];
};
type HistoryResp = {
  ok: boolean;
  items: PaymentRow[];
  summary?: { count: number; total: number };
};

const onlyDate = (iso?: string | null) => {
  if (!iso) return "-";
  if (iso.length >= 10 && iso[4] === "-" && iso[7] === "-")
    return iso.slice(0, 10);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function RiwayatPembayaranHutangPage() {
  const { toast } = useToast();

  // Filter
  const [giver, setGiver] = useState<string>("");
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // UI state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [postingBusy, setPostingBusy] = useState(false);
  const [postTarget, setPostTarget] = useState<PaymentRow | null>(null);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  // ===== Modal Edit =====
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<PaymentRow | null>(null);
  const [efDate, setEfDate] = useState("");
  const [efGiver, setEfGiver] = useState("");
  const [efNote, setEfNote] = useState("");
  const [efNums, setEfNums] = useState<Record<string, number>>({});
  const [efStrs, setEfStrs] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // givers
  const { data: giverData } = useSWR<{ ok: boolean; items: Giver[] }>(
    "/api/hutang-pembayaran?mode=givers",
    fetcher,
    { revalidateOnFocus: false }
  );
  const givers = giverData?.items ?? [];

  // list key
  const listKey = useMemo(() => {
    const qs = new URLSearchParams();
    if (giver) qs.set("giver", giver);
    if (q.trim()) qs.set("q", q.trim());
    if (dateFrom) qs.set("dateFrom", dateFrom);
    if (dateTo) qs.set("dateTo", dateTo);
    return `/api/hutang-pembayaran/riwayat?${qs.toString()}`;
  }, [giver, q, dateFrom, dateTo]);

  const { data, isLoading, error, mutate } = useSWR<HistoryResp>(
    listKey,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );
  const items = data?.items ?? [];

  // export CSV
  function exportCSV() {
    if (!items.length) return;
    const header = [
      "Status",
      "Ref",
      "Tanggal Bayar",
      "Pemberi",
      "Total",
      "Catatan",
    ].join(",");
    const rows = items.map((p) =>
      [
        p.status || (p.postedAt ? "CLOSE" : "DRAFT"),
        `"${(p.refNo ?? "").replaceAll('"', '""')}"`,
        onlyDate(p.tanggalBayar),
        `"${(p.pemberi ?? "").replaceAll('"', '""')}"`,
        `"${toIDR(p.total)}"`,
        `"${(p.note ?? "").replaceAll('"', '""')}"`,
      ].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `riwayat-pembayaran-hutang-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Posting
  async function confirmPosting() {
    if (!postTarget) return;
    setPostingBusy(true);
    try {
      const r = await fetch("/api/hutang-pembayaran/riwayat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: postTarget.id }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Gagal memposting");
      toast({ title: "Berhasil", description: "Pembayaran diposting." });
      setPostTarget(null);
      await mutate();
    } catch (e: any) {
      toast({
        title: "Gagal memposting",
        description:
          typeof e?.message === "string" ? e.message : "Terjadi kesalahan.",
        variant: "destructive",
      });
    } finally {
      setPostingBusy(false);
    }
  }

  // Delete
  async function doDelete(id: string) {
    if (!confirm("Hapus pembayaran ini?")) return;
    setDeleting((p) => ({ ...p, [id]: true }));
    try {
      const r = await fetch(
        `/api/hutang-pembayaran/riwayat?id=${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        }
      );
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Gagal menghapus");
      toast({ title: "Terhapus", description: "Pembayaran dihapus." });
      await mutate();
    } catch (e: any) {
      toast({
        title: "Gagal menghapus",
        description:
          typeof e?.message === "string" ? e.message : "Terjadi kesalahan.",
        variant: "destructive",
      });
    } finally {
      setDeleting((p) => ({ ...p, [id]: false }));
    }
  }

  // Edit
  function openEdit(p: PaymentRow) {
    setEditRow(p);
    const d = onlyDate(p.tanggalBayar);
    const ymd = /^\d{2}\/\d{2}\/\d{4}$/.test(d)
      ? d.split("/").reverse().join("-")
      : d;
    setEfDate(ymd);
    setEfGiver(p.pemberi || "");
    setEfNote(p.note || "");

    const nums: Record<string, number> = {};
    const strs: Record<string, string> = {};
    (p.details || []).forEach((dt) => {
      nums[dt.id] = Number(dt.amount || 0);
      strs[dt.id] = dt.amount ? fmtPlainID(dt.amount) : "";
    });
    setEfNums(nums);
    setEfStrs(strs);
    setEditOpen(true);
  }

  function onEfAmountChange(detailId: string, raw: string) {
    const val = Number(onlyDigits(raw) || 0);
    setEfNums((prev) => ({ ...prev, [detailId]: val }));
    setEfStrs((prev) => ({ ...prev, [detailId]: val ? fmtPlainID(val) : "" }));
  }

  const efTotalBaru = useMemo(
    () => Object.values(efNums).reduce((a, b) => a + (Number(b) || 0), 0),
    [efNums]
  );

  const saveEdit = async () => {
    if (!editRow) return;
    setSavingEdit(true);
    try {
      const payload = {
        id: editRow.id,
        pemberi: efGiver,
        tanggalBayar: efDate,
        note: efNote,
        details: (editRow.details || []).map((d) => ({
          id: d.id,
          amount: Number(efNums[d.id] || 0),
        })),
      };
      const r = await fetch("/api/hutang-pembayaran/riwayat", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok)
        throw new Error(j?.error || "Gagal menyimpan perubahan");

      toast({
        title: "Tersimpan",
        description: "Perubahan pembayaran berhasil disimpan.",
      });
      setEditOpen(false);
      await mutate();
    } catch (e: any) {
      toast({
        title: "Gagal menyimpan",
        description:
          typeof e?.message === "string" ? e.message : "Terjadi kesalahan.",
        variant: "destructive",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const StatusBadge = ({ s, postedAt }: { s?: string; postedAt?: string }) =>
    (s || (postedAt ? "CLOSE" : "DRAFT")) === "CLOSE" ? (
      <Badge className="bg-emerald-600 hover:bg-emerald-700">CLOSE</Badge>
    ) : (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
        DRAFT
      </Badge>
    );

  return (
    <AuthGuard>
      <AppShell>
        <div className="max-w-6xl mx-auto space-y-6">
          <AppHeader title="Riwayat Pembayaran Hutang" />

          {/* ACTION BAR — diperbaiki agar tidak “keluar jalur” di mobile */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <p className="text-muted-foreground md:flex-1">
              Daftar pembayaran hutang yang sudah dicatat.
            </p>
            {/* ⬇️ stack di mobile, row mulai sm */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="/hutang-pembayaran">
                  <History className="w-4 h-4 mr-2" />
                  Ke Pembayaran
                </Link>
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
                onClick={exportCSV}
                disabled={!items.length}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Filter */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Filter
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-y-3 gap-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-10 bg-card/50"
                  placeholder="Cari ref/pemberi/catatan…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <div className="w-full lg:w-[220px]">
                <Label className="sr-only">Pemberi</Label>
                <Select
                  value={giver || ALL_GIVER}
                  onValueChange={(v) => setGiver(v === ALL_GIVER ? "" : v)}
                >
                  <SelectTrigger className="bg-card/50 w-full">
                    <SelectValue placeholder="Semua Pemberi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_GIVER}>Semua Pemberi</SelectItem>
                    {givers.map((g) => (
                      <SelectItem key={g.name} value={g.name}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative w-full lg:w-[170px]">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  className="pl-10 bg-card/50 w-full"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="relative w-full lg:w-[170px]">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  className="pl-10 bg-card/50 w-full"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </GlassCard>

          {/* Data */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-foreground">
                Daftar Pembayaran
              </h3>
              <p className="text-sm text-muted-foreground">
                {data?.summary?.count ?? items.length} entri
                {data?.summary?.total
                  ? ` • Total ${toIDR(data.summary.total)}`
                  : ""}
              </p>
            </div>

            {error && (
              <div className="p-4 text-sm text-destructive">
                Gagal memuat data.
              </div>
            )}
            {!error && isLoading && (
              <div className="p-4 text-sm text-muted-foreground">
                Memuat data…
              </div>
            )}

            {!isLoading && items.length > 0 && (
              <>
                {/* Desktop */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/20">
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                          Ref
                        </th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                          Tanggal Bayar
                        </th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                          Pemberi
                        </th>
                        <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                          Total Bayar
                        </th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                          Catatan
                        </th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                          Detail
                        </th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((p) => {
                        const isClose =
                          (p.status || (p.postedAt ? "CLOSE" : "DRAFT")) ===
                          "CLOSE";
                        return (
                          <Fragment key={p.id}>
                            <tr className="border-b border-border/10 hover:bg-muted/20">
                              <td className="py-3 px-2 text-sm font-semibold">
                                {p.refNo || "-"}
                              </td>
                              <td className="py-3 px-2 text-sm">
                                {onlyDate(p.tanggalBayar)}
                              </td>
                              <td className="py-3 px-2 text-sm">{p.pemberi}</td>
                              <td className="py-3 px-2 text-sm text-right font-bold">
                                {toIDR(p.total)}
                              </td>
                              <td className="py-3 px-2 text-sm break-words">
                                {p.note || (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-2 text-sm">
                                <StatusBadge
                                  s={p.status}
                                  postedAt={p.postedAt}
                                />
                              </td>
                              <td className="py-3 px-2 text-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2"
                                  onClick={() =>
                                    setExpanded((s) => ({
                                      ...s,
                                      [p.id]: !s[p.id],
                                    }))
                                  }
                                >
                                  <ChevronDown
                                    className={`w-4 h-4 transition-transform ${
                                      expanded[p.id] ? "rotate-180" : ""
                                    }`}
                                  />
                                </Button>
                              </td>
                              <td className="py-3 px-2 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2"
                                    disabled={isClose}
                                    onClick={() => openEdit(p)}
                                    title="Edit"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2 text-red-600"
                                    disabled={isClose || deleting[p.id]}
                                    onClick={() => doDelete(p.id)}
                                    title="Hapus"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="h-8 px-3"
                                    disabled={isClose}
                                    onClick={() => setPostTarget(p)}
                                  >
                                    Posting
                                  </Button>
                                </div>
                              </td>
                            </tr>

                            {expanded[p.id] && (
                              <tr className="bg-primary/5">
                                <td colSpan={8} className="p-4">
                                  <div className="overflow-x-auto">
                                    <table className="w-full">
                                      <thead>
                                        <tr className="border-b border-border/20">
                                          <th className="text-left py-2 px-2 text-sm">
                                            No Bukti Hutang
                                          </th>
                                          <th className="text-left py-2 px-2 text-sm">
                                            Tgl Hutang
                                          </th>
                                          <th className="text-left py-2 px-2 text-sm">
                                            Keterangan Detail
                                          </th>
                                          <th className="text-right py-2 px-2 text-sm">
                                            Nominal Bayar
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(p.details ?? []).map((d) => (
                                          <tr
                                            key={d.id}
                                            className="border-b border-border/10"
                                          >
                                            <td className="py-2 px-2 text-sm">
                                              {d.hutangNoBukti || "-"}
                                            </td>
                                            <td className="py-2 px-2 text-sm">
                                              {onlyDate(d.hutangTanggal)}
                                            </td>
                                            <td className="py-2 px-2 text-sm">
                                              {d.keterangan || "-"}
                                            </td>
                                            <td className="py-2 px-2 text-sm text-right font-medium">
                                              {toIDR(d.amount)}
                                            </td>
                                          </tr>
                                        ))}
                                        {(p.details ?? []).length === 0 && (
                                          <tr>
                                            <td
                                              className="py-3 px-2 text-sm text-muted-foreground"
                                              colSpan={4}
                                            >
                                              Tidak ada detail.
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="lg:hidden space-y-4">
                  {items.map((p) => {
                    const isClose =
                      (p.status || (p.postedAt ? "CLOSE" : "DRAFT")) ===
                      "CLOSE";
                    const isOpen = !!expanded[p.id];
                    return (
                      <div
                        key={p.id}
                        className="p-4 bg-muted/20 rounded-lg space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold truncate">
                                {p.refNo || "-"}
                              </p>
                              <StatusBadge s={p.status} postedAt={p.postedAt} />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {onlyDate(p.tanggalBayar)} • {p.pemberi}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-muted-foreground">
                              Total
                            </p>
                            <p className="font-bold">{toIDR(p.total)}</p>
                          </div>
                        </div>

                        {p.note ? (
                          <p className="text-xs text-muted-foreground break-words">
                            {p.note}
                          </p>
                        ) : null}

                        <div className="flex items-center justify-between">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setExpanded((s) => ({ ...s, [p.id]: !s[p.id] }))
                            }
                            className="bg-transparent"
                          >
                            <ChevronDown
                              className={`w-4 h-4 mr-2 transition-transform ${
                                isOpen ? "rotate-180" : ""
                              }`}
                            />
                            {isOpen ? "Sembunyikan Detail" : "Lihat Detail"}
                          </Button>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isClose}
                              onClick={() => openEdit(p)}
                              className="rounded-lg"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 rounded-lg"
                              disabled={isClose || deleting[p.id]}
                              onClick={() => doDelete(p.id)}
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              disabled={isClose}
                              onClick={() => setPostTarget(p)}
                              className="rounded-lg"
                            >
                              Posting
                            </Button>
                          </div>
                        </div>

                        {isOpen && (
                          <div className="bg-card/50 p-3 rounded-lg">
                            {(p.details ?? []).length ? (
                              <div className="space-y-2">
                                {(p.details ?? []).map((d) => (
                                  <div
                                    key={d.id}
                                    className="flex items-start justify-between gap-3 border-b border-border/20 last:border-0 pb-2 last:pb-0"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium break-words">
                                        {d.keterangan || "-"}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {d.hutangNoBukti || "-"} •{" "}
                                        {onlyDate(d.hutangTanggal)}
                                      </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className="text-sm font-semibold">
                                        {toIDR(d.amount)}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                Tidak ada detail.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {!isLoading && items.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">
                Tidak ada data.
              </div>
            )}
          </GlassCard>
        </div>

        {/* Modal Edit */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Pembayaran</DialogTitle>
            </DialogHeader>

            {editRow && (
              <div className="space-y-4">
                {/* header cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-muted/20">
                    <Label className="text-xs">No Bukti (Ref)</Label>
                    <Input
                      className="h-9 mt-1"
                      value={editRow.refNo || "-"}
                      readOnly
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-muted/20">
                    <Label className="text-xs">Tanggal Bayar</Label>
                    <Input
                      type="date"
                      className="h-9 mt-1"
                      value={efDate}
                      onChange={(e) => setEfDate(e.target.value)}
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-muted/20">
                    <Label className="text-xs">Pemberi</Label>
                    <Select value={efGiver} onValueChange={setEfGiver}>
                      <SelectTrigger className="h-9 mt-1">
                        <SelectValue placeholder="Pilih pemberi" />
                      </SelectTrigger>
                      <SelectContent>
                        {givers.map((g) => (
                          <SelectItem key={g.name} value={g.name}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted/20">
                  <Label className="text-xs">Catatan</Label>
                  <Input
                    className="h-9 mt-1"
                    placeholder="Catatan…"
                    value={efNote}
                    onChange={(e) => setEfNote(e.target.value)}
                  />
                </div>

                {/* detail cards */}
                <div className="space-y-3">
                  {(editRow.details || []).map((d) => (
                    <div
                      key={d.id}
                      className="p-3 bg-muted/10 rounded-lg border border-border/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs text-muted-foreground">
                            {d.hutangNoBukti || "-"}
                          </div>
                          <div className="font-medium">
                            {d.keterangan || "-"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">
                            Tgl Hutang
                          </div>
                          <div className="font-medium">
                            {(d.hutangTanggal || "").slice(0, 10) || "-"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-[1fr_220px] gap-3">
                        <div className="text-sm text-muted-foreground">
                          Nominal Bayar
                        </div>
                        <Input
                          inputMode="numeric"
                          className="h-9 text-right"
                          value={efStrs[d.id] ?? ""}
                          onChange={(e) =>
                            onEfAmountChange(d.id, e.target.value)
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-border/20 pt-3">
                  <span className="text-sm text-muted-foreground">
                    Total Baru:
                  </span>
                  <span className="font-bold">{toIDR(efTotalBaru)}</span>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Batal
              </Button>
              <Button onClick={saveEdit} disabled={savingEdit}>
                {savingEdit ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan…
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Simpan
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog konfirmasi POSTING */}
        <Dialog open={!!postTarget} onOpenChange={() => setPostTarget(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Konfirmasi Posting
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <p>
                Pembayaran dengan ref <b>{postTarget?.refNo || "-"}</b> akan di-
                <b>POSTING</b>.
              </p>
              <p className="text-muted-foreground">
                Setelah posting, data akan <b>terkunci</b> dan tidak bisa
                diedit/dihapus.
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setPostTarget(null)}>
                Batal
              </Button>
              <Button onClick={confirmPosting} disabled={postingBusy}>
                {postingBusy ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Memposting…
                  </>
                ) : (
                  "Posting"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AppShell>
    </AuthGuard>
  );
}

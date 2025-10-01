// app/hutang/page.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";

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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Loader2, Eye, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const fetcher = (u: string) => fetch(u).then((r) => r.json());
const toIDR = (n = 0) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(n || 0));

type DetailRow = {
  id: string;
  no: number;
  keterangan: string;
  nominal: number;
};
type HutangRow = {
  id: string;
  noBukti: string;
  tanggalInput: string;
  tanggalHutang: string;
  keterangan: string;
  pemberi: string;
  nominal: number;
  status: "Draft" | "Close";
  details?: DetailRow[];
};
type ListResp = {
  ok: boolean;
  items: HutangRow[];
  summary: { total: number; count: number };
};

const StatusBadge = ({ v }: { v: "Draft" | "Close" }) =>
  v === "Close" ? (
    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
      Close
    </Badge>
  ) : (
    <Badge variant="secondary">Draft</Badge>
  );

// helpers rupiah
const onlyDigits = (s: string) => (s.match(/\d/g) || []).join("");
const fmtID = (n: number) => (n ? n.toLocaleString("id-ID") : "");
const todayYMD = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function HutangListPage() {
  const router = useRouter();
  const { toast } = useToast();

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const query = useMemo(() => {
    const s = new URLSearchParams();
    if (q.trim()) s.set("q", q.trim());
    if (status && status !== "ALL") s.set("status", status);
    if (dateFrom) s.set("dateFrom", dateFrom);
    if (dateTo) s.set("dateTo", dateTo);
    return s.toString();
  }, [q, status, dateFrom, dateTo]);

  const { data, isLoading, mutate } = useSWR<ListResp>(
    `/api/hutang${query ? `?${query}` : ""}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Modal create
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    noBukti: "",
    tanggalHutang: "",
    keterangan: "",
    pemberi: "",
    nominal: "", // angka murni sebagai string
  });
  const [nominalDisp, setNominalDisp] = useState("");

  // Dialog konfirmasi hapus
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const onChangeNominalDisp = (s: string) => {
    const num = Number(onlyDigits(s) || 0);
    setNominalDisp(num ? fmtID(num) : "");
    setForm((p) => ({ ...p, nominal: String(num) }));
  };

  useEffect(() => {
    if (!open) {
      setForm({
        noBukti: "",
        tanggalHutang: "",
        keterangan: "",
        pemberi: "",
        nominal: "",
      });
      setNominalDisp("");
    }
  }, [open]);

  const onChange = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const formComplete =
    form.noBukti.trim() &&
    form.tanggalHutang &&
    form.keterangan.trim() &&
    form.pemberi.trim();

  // generate no bukti
  const generateNoBukti = async () => {
    try {
      const tgl = form.tanggalHutang || todayYMD();
      const res = await fetch(`/api/hutang/next-ref?tanggal=${tgl}`);
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Gagal generate");
      setForm((p) => ({ ...p, noBukti: j.refNo }));
    } catch (e: any) {
      toast({
        title: "Gagal generate",
        description:
          typeof e?.message === "string"
            ? e.message
            : "Tidak bisa membuat nomor bukti",
        variant: "destructive",
      });
    }
  };

  const submitCreate = async () => {
    if (!formComplete) {
      toast({
        title: "Lengkapi data",
        description:
          "No Bukti, Tgl Hutang, Keterangan, dan Pemberi wajib diisi.",
        variant: "destructive",
      });
      return;
    }

    const nNom = Number(form.nominal || 0);
    const safeNominal = Number.isFinite(nNom) && nNom > 0 ? nNom : 0;

    setSaving(true);
    try {
      const res = await fetch("/api/hutang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noBukti: form.noBukti.trim(),
          tanggalHutang: form.tanggalHutang,
          keterangan: form.keterangan.trim(),
          pemberi: form.pemberi.trim(),
          nominal: safeNominal,
        }),
      });
      const j = await res.json();

      if (!res.ok || !j?.ok) {
        const err = j?.error || "Gagal membuat hutang";
        if (String(err).toUpperCase().includes("NOBUKTI_DUPLICATE")) {
          throw new Error("No Bukti sudah dipakai. Gunakan nomor lain.");
        }
        throw new Error(err);
      }

      setOpen(false);
      toast({
        title: "Berhasil",
        description: "Hutang berhasil dibuat (Draft)",
      });
      await mutate();
      // arahkan ke halaman detail
      location.assign(`/hutang/${j.item.id}`);
    } catch (e: any) {
      toast({
        title: "Gagal",
        description:
          typeof e?.message === "string" ? e.message : "Gagal membuat hutang",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Hapus (dengan dialog + parser defensif)
  const actuallyDelete = async () => {
    const id = confirmDeleteId;
    if (!id) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/hutang?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      // RESPON DEFENSIF: bisa 204 atau JSON
      let j: any = {};
      const text = await res.text(); // tidak error untuk 204/empty
      if (text) {
        try {
          j = JSON.parse(text);
        } catch {
          j = {};
        }
      }

      if (!res.ok || j?.ok === false) {
        throw new Error(j?.error || "Gagal menghapus");
      }

      toast({ title: "Terhapus", description: "Data hutang dihapus" });
      setConfirmDeleteId(null);
      await mutate();
    } catch (e: any) {
      toast({
        title: "Gagal",
        description:
          typeof e?.message === "string" ? e.message : "Gagal menghapus data",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const items = data?.items ?? [];
  const total = data?.summary?.total ?? 0;
  const count = data?.summary?.count ?? 0;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto p-4 space-y-6">
        <AuthGuard>
          <AppShell>
            <AppHeader title="Hutang" />

            {/* Filter & Actions */}
            <GlassCard className="p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="md:col-span-2">
                  <Label>Cari</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Cari no bukti / keterangan / pemberi"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && mutate()}
                    />
                    <Button
                      variant="outline"
                      onClick={() => mutate()}
                      title="Cari"
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Semua" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Semua</SelectItem>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="CLOSE">Close</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Dari Tanggal (Hutang)</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Sampai Tanggal (Hutang)</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  {isLoading
                    ? "Memuat…"
                    : `${count} data • Total ${toIDR(total)}`}
                </div>

                {/* Modal Tambah */}
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-teal-600 hover:bg-teal-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Tambah Hutang
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Tambah Hutang</DialogTitle>
                    </DialogHeader>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!saving) submitCreate();
                      }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                          <Label>No Bukti</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="HUT-20250930-0001"
                              value={form.noBukti}
                              onChange={(e) =>
                                onChange("noBukti", e.target.value)
                              }
                              required
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={generateNoBukti}
                            >
                              Generate
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Tgl Hutang</Label>
                          <Input
                            type="date"
                            value={form.tanggalHutang}
                            onChange={(e) =>
                              onChange("tanggalHutang", e.target.value)
                            }
                            required
                          />
                        </div>

                        {/* <div className="space-y-2">
                          <Label>Nominal</Label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={nominalDisp}
                            onChange={(e) =>
                              onChangeNominalDisp(e.target.value)
                            }
                          />
                        </div> */}

                        <div className="space-y-2 md:col-span-2">
                          <Label>Keterangan</Label>
                          <Input
                            placeholder="Pinjam ke Koperasi 10juta"
                            value={form.keterangan}
                            onChange={(e) =>
                              onChange("keterangan", e.target.value)
                            }
                            required
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label>Pemberi Hutang</Label>
                          <Input
                            placeholder="Koperasi / Pihak lain"
                            value={form.pemberi}
                            onChange={(e) =>
                              onChange("pemberi", e.target.value)
                            }
                            required
                          />
                        </div>
                      </div>

                      <DialogFooter className="gap-2 mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setOpen(false)}
                          disabled={saving}
                        >
                          Batal
                        </Button>
                        <Button
                          type="submit"
                          disabled={saving || !formComplete}
                        >
                          {saving && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          )}
                          Simpan
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </GlassCard>

            {/* ====== Tabel Desktop ====== */}
            <GlassCard className="hidden md:block p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/20">
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                        #
                      </th>
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
                        Nominal per Hutang
                      </th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                        Pemberi
                      </th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                        Total
                      </th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="py-6 text-center text-sm text-muted-foreground"
                        >
                          Memuat data…
                        </td>
                      </tr>
                    ) : items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="py-6 text-center text-sm text-muted-foreground"
                        >
                          Tidak ada data
                        </td>
                      </tr>
                    ) : (
                      items.map((it, idx) => (
                        <tr
                          key={it.id}
                          className="border-b border-border/10 hover:bg-muted/20"
                        >
                          <td className="py-3 px-2 text-sm">{idx + 1}</td>
                          <td className="py-3 px-2 text-sm font-semibold text-foreground">
                            {it.noBukti}
                          </td>
                          <td className="py-3 px-2 text-sm">
                            {it.tanggalHutang}
                          </td>
                          <td className="py-3 px-2 text-sm">
                            {it.details?.length ? (
                              <div className="space-y-1">
                                {it.details.map((d) => (
                                  <div key={d.id}>
                                    {d.no}. {d.keterangan}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              it.keterangan
                            )}
                          </td>
                          <td className="py-3 px-2 text-sm text-right tabular-nums">
                            {it.details?.length ? (
                              <div className="space-y-1">
                                {it.details.map((d) => (
                                  <div key={d.id}>{toIDR(d.nominal)}</div>
                                ))}
                              </div>
                            ) : (
                              toIDR(it.nominal)
                            )}
                          </td>
                          <td className="py-3 px-2 text-sm">{it.pemberi}</td>
                          <td className="py-3 px-2 text-sm text-right tabular-nums font-bold">
                            {toIDR(it.nominal)}
                          </td>
                          <td className="py-3 px-2 text-sm text-center">
                            <StatusBadge v={it.status} />
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2 justify-center">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 rounded-lg"
                                onClick={() => router.push(`/hutang/${it.id}`)}
                                title="Lihat"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 rounded-lg text-red-600 hover:text-red-700"
                                onClick={() => setConfirmDeleteId(it.id)}
                                title="Hapus"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {!isLoading && items.length > 0 && (
                    <tfoot>
                      <tr className="border-t border-border/20 bg-transparent">
                        <td
                          colSpan={7}
                          className="py-3 px-2 text-right text-sm font-medium text-muted-foreground"
                        >
                          Total:
                        </td>
                        <td className="py-3 px-2 text-right text-sm font-bold">
                          {toIDR(total)}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </GlassCard>

            {/* ====== Mobile Cards ====== */}
            <div className="md:hidden space-y-3">
              {isLoading ? (
                <GlassCard className="p-4">
                  <p className="text-sm text-muted-foreground">Memuat data…</p>
                </GlassCard>
              ) : items.length === 0 ? (
                <GlassCard className="p-4">
                  <p className="text-sm text-muted-foreground">
                    Tidak ada data
                  </p>
                </GlassCard>
              ) : (
                items.map((it) => (
                  <GlassCard key={it.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          No Bukti
                        </p>
                        <p className="font-semibold">{it.noBukti}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Tgl Hutang:{" "}
                          <span className="font-medium">
                            {it.tanggalHutang}
                          </span>
                        </p>
                      </div>
                      <StatusBadge v={it.status} />
                    </div>

                    <div className="mt-3 space-y-1">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Pemberi:</span>{" "}
                        <span className="font-medium">{it.pemberi}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">
                          Keterangan:
                        </span>{" "}
                        {it.details?.length ? (
                          <span>
                            {it.details
                              .map((d) => `${d.no}. ${d.keterangan}`)
                              .join(" · ")}
                          </span>
                        ) : (
                          it.keterangan
                        )}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total
                      </span>
                      <span className="font-bold tabular-nums">
                        {toIDR(it.nominal)}
                      </span>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => router.push(`/hutang/${it.id}`)}
                        title="Lihat"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Lihat
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-red-600 hover:text-red-700"
                        onClick={() => setConfirmDeleteId(it.id)}
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Hapus
                      </Button>
                    </div>
                  </GlassCard>
                ))
              )}

              {/* Ringkasan total di bawah list (mobile) */}
              {!isLoading && items.length > 0 && (
                <GlassCard className="p-4 bg-teal-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="font-bold tabular-nums">
                      {toIDR(total)}
                    </span>
                  </div>
                </GlassCard>
              )}
            </div>

            {/* Dialog konfirmasi hapus */}
            <Dialog
              open={!!confirmDeleteId}
              onOpenChange={(o) => !o && setConfirmDeleteId(null)}
            >
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Hapus hutang ini?</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Tindakan ini tidak bisa dibatalkan.
                </p>
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={actuallyDelete}
                    disabled={deleting}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {deleting && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Hapus
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

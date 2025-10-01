// app/hutang/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";

import { AppShell } from "@/components/app-shell";
import { AppHeader } from "@/components/app-header";
import { AuthGuard } from "@/components/auth-guard";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ---------------- Helpers ---------------- */
const fetcher = (u: string) => fetch(u).then((r) => r.json());

const fmtIDR = (n = 0) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
  }).format(Number(n || 0));

const onlyDigits = (s: string) => String(s ?? "").replace(/\D/g, "");
const fmtRupiahInline = (v: string | number) => {
  const d = onlyDigits(v as any);
  if (!d) return "";
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};
const parseRupiahInline = (s: string) => Number(onlyDigits(s) || "0");

const todayYMD = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/* ---------------- Types ---------------- */
type DetailRow = {
  id: string;
  no: number;
  keterangan: string;
  nominal: number;
  tanggal?: string | null;
};

type HeaderResp = {
  ok: boolean;
  item?: {
    id: string;
    noBukti: string;
    tanggalInput: string;
    tanggalHutang: string;
    keterangan: string;
    pemberi: string;
    nominal: number;
    status: "Draft" | "Close";
    details: DetailRow[];
  };
  error?: string;
};

/* ---------------- Page ---------------- */
export default function HutangDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const hutangId = useMemo(() => {
    const pid = (params as any)?.id;
    return Array.isArray(pid) ? pid[0] : (pid as string);
  }, [params]);

  const { data, isLoading, mutate } = useSWR<HeaderResp>(
    hutangId ? `/api/hutang/${hutangId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const header = data?.item;
  const isClose = header?.status === "Close";

  // local copy header (untuk tampil saja)
  const [noBukti, setNoBukti] = useState("");
  const [tglInput, setTglInput] = useState("");
  const [tglHutang, setTglHutang] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [pemberi, setPemberi] = useState("");
  const [nominal, setNominal] = useState<number>(0);

  useEffect(() => {
    if (header) {
      setNoBukti(header.noBukti || "");
      setTglInput(header.tanggalInput || "");
      setTglHutang(header.tanggalHutang || "");
      setKeterangan(header.keterangan || "");
      setPemberi(header.pemberi || "");
      setNominal(header.nominal ?? 0);
    }
  }, [header]);

  /* ---------- Modal Detail ---------- */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDetailId, setEditingDetailId] = useState<string | null>(null);
  const [detailKet, setDetailKet] = useState("");
  const [detailNomDisp, setDetailNomDisp] = useState<string>(""); // masked text
  const [detailDate, setDetailDate] = useState<string>(todayYMD());
  const [savingDetail, setSavingDetail] = useState(false);

  const openAddDetail = () => {
    setEditingDetailId(null);
    setDetailKet("");
    setDetailNomDisp("");
    setDetailDate(header?.tanggalHutang || todayYMD());
    setIsModalOpen(true);
  };

  const openEditDetail = (d: DetailRow) => {
    setEditingDetailId(d.id);
    setDetailKet(d.keterangan);
    setDetailNomDisp(fmtRupiahInline(d.nominal));
    setDetailDate(
      (d.tanggal && d.tanggal.slice(0, 10)) ||
        header?.tanggalHutang ||
        todayYMD()
    );
    setIsModalOpen(true);
  };

  const saveDetail = async () => {
    if (!header) return;
    if (!detailKet || !detailNomDisp) {
      toast({
        title: "Lengkapi data",
        description: "Keterangan dan nominal wajib diisi.",
        variant: "destructive",
      });
      return;
    }
    const amount = parseRupiahInline(detailNomDisp);
    if (amount <= 0) {
      toast({
        title: "Nominal tidak valid",
        description: "Isi nominal lebih dari 0.",
        variant: "destructive",
      });
      return;
    }

    setSavingDetail(true);
    try {
      if (editingDetailId) {
        const r = await fetch(
          `/api/hutang/${header.id}/detail/${editingDetailId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              keterangan: detailKet,
              nominal: amount,
              tanggal: detailDate, // opsional jika API sudah dukung
            }),
          }
        );
        const j = await r.json();
        if (!r.ok || !j?.ok) throw new Error(j?.error || "Gagal update detail");
      } else {
        const r = await fetch(`/api/hutang/${header.id}/detail`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keterangan: detailKet,
            nominal: amount,
            tanggal: detailDate, // opsional jika API sudah dukung
          }),
        });
        const j = await r.json();
        if (!r.ok || !j?.ok)
          throw new Error(j?.error || "Gagal menambah detail");
      }
      setIsModalOpen(false);
      setEditingDetailId(null);
      setDetailKet("");
      setDetailNomDisp("");
      await mutate();
      toast({ title: "Tersimpan", description: "Detail berhasil disimpan." });
    } catch (e: any) {
      toast({
        title: "Gagal",
        description:
          typeof e?.message === "string" ? e.message : "Gagal menyimpan detail",
        variant: "destructive",
      });
    } finally {
      setSavingDetail(false);
    }
  };

  const deleteDetail = async (detailId: string) => {
    if (!header) return;
    const ok = window.confirm("Hapus detail ini?");
    if (!ok) return;
    try {
      const r = await fetch(`/api/hutang/${header.id}/detail/${detailId}`, {
        method: "DELETE",
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Gagal hapus detail");
      await mutate();
      toast({ title: "Terhapus", description: "Detail dihapus." });
    } catch (e: any) {
      toast({
        title: "Gagal",
        description:
          typeof e?.message === "string" ? e.message : "Gagal menghapus detail",
        variant: "destructive",
      });
    }
  };

  /* ---------- Posting ---------- */
  const [posting, setPosting] = useState(false);
  const doPosting = async () => {
    if (!header) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/hutang/${header.id}/post`, {
        method: "POST",
      });
      const j = await res.json();
      if (!res.ok || !j?.ok)
        throw new Error(j?.error || "Gagal posting hutang");
      await mutate();
      toast({
        title: "Sukses",
        description: "Hutang berhasil diposting (Close).",
      });
    } catch (e: any) {
      toast({
        title: "Gagal",
        description:
          typeof e?.message === "string"
            ? e.message
            : "Gagal melakukan posting",
        variant: "destructive",
      });
    } finally {
      setPosting(false);
    }
  };

  /* ---------- Loading / Not found ---------- */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!header) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto p-4">
          <AppHeader title="Detail Hutang" />
          <GlassCard className="p-6 text-center">
            <p>Hutang tidak ditemukan.</p>
            <Button onClick={() => router.back()} className="mt-4">
              Kembali
            </Button>
          </GlassCard>
        </div>
      </div>
    );
  }

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen">
      <div className="container mx-auto p-4 space-y-6">
        <AuthGuard>
          <AppShell>
            <AppHeader title="Detail Hutang" />

            {/* Header (READONLY) */}
            <GlassCard className="p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  Detail Hutang {pemberi?.trim() || header?.pemberi || "-"}
                </h2>
                {!isClose && (
                  <Button
                    onClick={openAddDetail}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Detail
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>No Bukti</Label>
                  <Input value={noBukti} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Input</Label>
                  <Input value={tglInput} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Tgl Hutang</Label>
                  <Input type="date" value={tglHutang} disabled />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Keterangan</Label>
                  <Input value={keterangan} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Pemberi Hutang</Label>
                  <Input value={pemberi} disabled />
                </div>
              </div>
            </GlassCard>

            {/* ====== Detail: Tabel Desktop ====== */}
            <GlassCard className="mb-6 p-4 hidden md:block">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Detail Hutang</h3>
                {header.status === "Draft" && (
                  <Button
                    onClick={doPosting}
                    disabled={posting || isClose}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {posting ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5 mr-2" />
                    )}
                    {posting ? "Memposting…" : "Posting"}
                  </Button>
                )}
              </div>

              <div className="overflow-x-auto">
                <Table className="w-full border-collapse">
                  <TableHeader>
                    <TableRow className="border-b border-gray-300">
                      <TableHead className="w-12 text-[13px] font-semibold py-2">
                        No
                      </TableHead>
                      <TableHead className="text-[13px] font-semibold py-2">
                        Keterangan
                      </TableHead>
                      <TableHead className="text-[13px] font-semibold py-2 text-right">
                        Nominal
                      </TableHead>
                      <TableHead className="w-32 text-[13px] font-semibold py-2 text-right">
                        Aksi
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(header.details || []).map((d) => (
                      <TableRow key={d.id} className="border-b border-gray-300">
                        <TableCell className="py-2">{d.no}</TableCell>
                        <TableCell className="py-2">{d.keterangan}</TableCell>
                        <TableCell className="py-2 text-right tabular-nums">
                          Rp {fmtIDR(d.nominal)}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDetail(d)}
                              disabled={isClose}
                              className="rounded-lg"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteDetail(d.id)}
                              disabled={isClose}
                              className="text-red-600 hover:text-red-700 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="border-t border-gray-200 bg-transparent">
                      <TableCell
                        colSpan={2}
                        className="py-2 text-right font-semibold bg-transparent"
                      >
                        Total:
                      </TableCell>
                      <TableCell className="py-2 font-bold text-right tabular-nums bg-transparent">
                        Rp {fmtIDR(header.nominal)}
                      </TableCell>
                      <TableCell className="bg-transparent" />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </GlassCard>

            {/* ====== Detail: Mobile Cards ====== */}
            <div className="md:hidden space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Detail Hutang</h3>
                {header.status === "Draft" && (
                  <Button
                    onClick={doPosting}
                    disabled={posting || isClose}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {posting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {posting ? "Memposting…" : "Posting"}
                  </Button>
                )}
              </div>

              {(header.details || []).map((d) => (
                <GlassCard key={d.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">No</p>
                      <p className="font-semibold">{d.no}</p>
                    </div>
                    <p className="text-sm font-bold tabular-nums">
                      Rp {fmtIDR(d.nominal)}
                    </p>
                  </div>

                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground">Keterangan</p>
                    <p className="text-sm">{d.keterangan}</p>
                  </div>

                  {d.tanggal ? (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">Tanggal</p>
                      <p className="text-sm">{d.tanggal?.slice(0, 10)}</p>
                    </div>
                  ) : null}

                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDetail(d)}
                      disabled={isClose}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteDetail(d.id)}
                      disabled={isClose}
                      className="flex-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Hapus
                    </Button>
                  </div>
                </GlassCard>
              ))}

              {/* Recap total */}
              <GlassCard className="p-4 bg-teal-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-lg font-bold">
                    Rp {fmtIDR(header.nominal)}
                  </span>
                </div>
              </GlassCard>
            </div>

            {/* Modal Tambah/Edit Detail */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingDetailId ? "Edit Detail" : "Tambah Detail"}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tanggal</Label>
                    <Input
                      type="date"
                      value={detailDate}
                      onChange={(e) => setDetailDate(e.target.value)}
                      disabled={isClose}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Keterangan</Label>
                    <Input
                      value={detailKet}
                      onChange={(e) => setDetailKet(e.target.value)}
                      placeholder="Keterangan hutang"
                      disabled={isClose}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Nominal</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={detailNomDisp}
                      onChange={(e) =>
                        setDetailNomDisp(fmtRupiahInline(e.target.value))
                      }
                      disabled={isClose}
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    disabled={savingDetail}
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={saveDetail}
                    disabled={isClose || savingDetail}
                  >
                    {savingDetail && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Simpan
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

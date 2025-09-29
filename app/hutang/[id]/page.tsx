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

/* Helpers */
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

  // local header states
  const [noBukti, setNoBukti] = useState("");
  const [tglHutang, setTglHutang] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [pemberi, setPemberi] = useState("");
  const [nominal, setNominal] = useState<number | string>(0);

  useEffect(() => {
    if (header) {
      setNoBukti(header.noBukti || "");
      setTglHutang(header.tanggalHutang || "");
      setKeterangan(header.keterangan || "");
      setPemberi(header.pemberi || "");
      setNominal(header.nominal ?? 0);
    }
  }, [header]);

  const safePatch = async (payload: Record<string, any>) => {
    if (!header) return;
    try {
      const res = await fetch(`/api/hutang/${header.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Gagal menyimpan");
      await mutate();
      toast({ title: "Tersimpan", description: "Perubahan berhasil disimpan" });
    } catch (e: any) {
      toast({
        title: "Gagal",
        description:
          typeof e?.message === "string" ? e.message : "Gagal menyimpan",
        variant: "destructive",
      });
    }
  };

  const onBlurNoBukti = async () => {
    if (isClose) return;
    const nb = String(noBukti || "").trim();
    if (!nb) {
      toast({ title: "No Bukti wajib diisi", variant: "destructive" });
      return;
    }
    await safePatch({ noBukti: nb });
  };
  const onBlurTglHutang = async () => {
    if (isClose || !tglHutang) return;
    await safePatch({ tanggalHutang: tglHutang });
  };
  const onBlurKeterangan = async () => {
    if (isClose) return;
    await safePatch({ keterangan });
  };
  const onBlurPemberi = async () => {
    if (isClose) return;
    await safePatch({ pemberi });
  };
  const onBlurNominal = async () => {
    if (isClose) return;
    if (header?.details?.length) {
      setNominal(header.nominal); // terkunci jika sudah ada detail
      return;
    }
    const n = Number(nominal || 0);
    await safePatch({ nominal: n });
  };

  // detail modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDetailId, setEditingDetailId] = useState<string | null>(null);
  const [detailKet, setDetailKet] = useState("");
  const [detailNom, setDetailNom] = useState<string>("");

  const openAddDetail = () => {
    setEditingDetailId(null);
    setDetailKet("");
    setDetailNom("");
    setIsModalOpen(true);
  };
  const openEditDetail = (d: DetailRow) => {
    setEditingDetailId(d.id);
    setDetailKet(d.keterangan);
    setDetailNom(String(d.nominal));
    setIsModalOpen(true);
  };

  const saveDetail = async () => {
    if (!header) return;
    if (!detailKet || !detailNom) {
      toast({
        title: "Lengkapi data",
        description: "Keterangan dan nominal wajib diisi",
        variant: "destructive",
      });
      return;
    }
    try {
      if (editingDetailId) {
        const res = await fetch(
          `/api/hutang/${header.id}/detail/${editingDetailId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              keterangan: detailKet,
              nominal: Number(detailNom),
            }),
          }
        );
        const j = await res.json();
        if (!res.ok || !j?.ok) throw new Error(j?.error || "Gagal update");
      } else {
        const res = await fetch(`/api/hutang/${header.id}/detail`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keterangan: detailKet,
            nominal: Number(detailNom),
          }),
        });
        const j = await res.json();
        if (!res.ok || !j?.ok) throw new Error(j?.error || "Gagal menambah");
      }
      setIsModalOpen(false);
      setEditingDetailId(null);
      setDetailKet("");
      setDetailNom("");
      await mutate();
      toast({ title: "Berhasil", description: "Detail tersimpan" });
    } catch (e: any) {
      toast({
        title: "Gagal",
        description:
          typeof e?.message === "string" ? e.message : "Gagal menyimpan detail",
        variant: "destructive",
      });
    }
  };

  const deleteDetail = async (detailId: string) => {
    if (!header) return;
    try {
      const res = await fetch(`/api/hutang/${header.id}/detail/${detailId}`, {
        method: "DELETE",
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Gagal hapus");
      await mutate();
      toast({ title: "Berhasil", description: "Detail dihapus" });
    } catch (e: any) {
      toast({
        title: "Gagal",
        description:
          typeof e?.message === "string" ? e.message : "Gagal menghapus detail",
        variant: "destructive",
      });
    }
  };

  const doPosting = async () => {
    if (!header) return;
    try {
      const res = await fetch(`/api/hutang/${header.id}/post`, {
        method: "POST",
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Gagal posting");
      await mutate();
      toast({
        title: "Sukses",
        description: "Hutang berhasil diposting (Close)",
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
    }
  };

  // loading / not found
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
            <p>Hutang tidak ditemukan</p>
            <Button onClick={() => router.back()} className="mt-4">
              Kembali
            </Button>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto p-4 space-y-6">
        <AuthGuard>
          <AppShell>
            <AppHeader title="Detail Hutang" />

            {/* Header Form */}
            <GlassCard className="p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Header Hutang</h2>
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
                  <Input
                    value={noBukti}
                    onChange={(e) => setNoBukti(e.target.value)}
                    onBlur={onBlurNoBukti}
                    placeholder="Isi manual (unik)"
                    disabled={isClose}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Input</Label>
                  <Input value={header.tanggalInput} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Tgl Hutang</Label>
                  <Input
                    type="date"
                    value={tglHutang}
                    onChange={(e) => setTglHutang(e.target.value)}
                    onBlur={onBlurTglHutang}
                    disabled={isClose}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Keterangan</Label>
                  <Input
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    onBlur={onBlurKeterangan}
                    placeholder="Pinjam ke Koperasi 10juta"
                    disabled={isClose}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pemberi Hutang</Label>
                  <Input
                    value={pemberi}
                    onChange={(e) => setPemberi(e.target.value)}
                    onBlur={onBlurPemberi}
                    placeholder="Koperasi / Pihak lain"
                    disabled={isClose}
                  />
                </div>

                <div className="space-y-2 md:col-span-3">
                  <Label>Nominal</Label>
                  <Input
                    type="number"
                    value={nominal}
                    onChange={(e) => setNominal(e.target.value)}
                    onBlur={onBlurNominal}
                    disabled={isClose || (header.details?.length ?? 0) > 0}
                  />
                  {(header.details?.length ?? 0) > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Nominal mengikuti jumlah total detail (otomatis).
                    </p>
                  )}
                </div>
              </div>
            </GlassCard>

            {/* Desktop Table */}
            <GlassCard className="hidden md:block mb-6 p-4">
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
                          {toIDR(d.nominal)}
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
                        {toIDR(header.nominal)}
                      </TableCell>
                      <TableCell className="bg-transparent" />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </GlassCard>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {(header.details || []).map((d) => (
                <GlassCard key={d.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <p className="font-semibold">{d.keterangan}</p>
                      <p className="font-semibold">{toIDR(d.nominal)}</p>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDetail(d)}
                        disabled={isClose}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteDetail(d.id)}
                        disabled={isClose}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Hapus
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              ))}

              <GlassCard className="p-4 bg-teal-50/50">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-xl font-bold text-teal-700">
                    {toIDR(header.nominal)}
                  </p>
                </div>
              </GlassCard>
            </div>

            {header.status === "Draft" && (
              <div className="flex justify-center mt-2">
                <Button
                  onClick={doPosting}
                  className="bg-green-600 hover:bg-green-700 px-8 py-3 text-lg"
                  size="lg"
                >
                  <Send className="h-5 w-5 mr-2" />
                  Posting
                </Button>
              </div>
            )}

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
                      type="number"
                      value={detailNom}
                      onChange={(e) => setDetailNom(e.target.value)}
                      placeholder="0"
                      disabled={isClose}
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button onClick={saveDetail} disabled={isClose}>
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

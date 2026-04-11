"use client";

import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Plus, Trash2, CheckCircle, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Pemasukan = {
  id: string;
  tanggal: string;
  nama: string;
  nominal: number;
  keterangan?: string;
  status: "DRAFT" | "POSTED";
};

const formatMonthLabel = (month: string) => {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1);

  return date.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
};

const formatDateLong = (dateString: string) => {
  const date = new Date(dateString);

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const toLocalDateInputValue = (value?: string | Date) => {
  const date = value ? new Date(value) : new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const todayYMD = () => toLocalDateInputValue();

const getMonthKey = (value: string) => toLocalDateInputValue(value).slice(0, 7);

export default function PemasukanPage() {
  const { toast } = useToast();

  const [data, setData] = useState<Pemasukan[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("ALL");
  const [months, setMonths] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    tanggal: todayYMD(),
    nama: "",
    nominal: "",
    keterangan: "",
  });
  const resetForm = () => {
    setEditingId(null);
    setForm({
      tanggal: todayYMD(),
      nama: "",
      nominal: "",
      keterangan: "",
    });
  };

  const loadData = async () => {
    const res = await fetch("/api/pemasukan");
    const json = await res.json();
    setData(json);
  };

  const loadMonths = async () => {
    const res = await fetch("/api/pemasukan/months");
    const json = await res.json();
    setMonths(json.months ?? []);
  };

  useEffect(() => {
    loadData();
    loadMonths();
  }, []);

  const filtered = useMemo(() => {
    if (selectedMonth === "ALL") return data;
    return data.filter((d) => getMonthKey(d.tanggal) === selectedMonth);
  }, [data, selectedMonth]);

  const total = useMemo(
    () => filtered.reduce((sum, d) => sum + d.nominal, 0),
    [filtered],
  );

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n);

  // Format input Rp
  const handleNominalChange = (value: string) => {
    const raw = value.replace(/\D/g, "");
    const formatted = new Intl.NumberFormat("id-ID").format(Number(raw || 0));
    setForm({ ...form, nominal: raw ? `Rp ${formatted}` : "" });
  };

  const getRawNominal = () => Number(form.nominal.replace(/\D/g, ""));
  const formatNominalInput = (n: number) =>
    n > 0 ? `Rp ${new Intl.NumberFormat("id-ID").format(n)}` : "";

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (item: Pemasukan) => {
    setEditingId(item.id);
    setForm({
      tanggal: toLocalDateInputValue(item.tanggal),
      nama: item.nama,
      nominal: formatNominalInput(item.nominal),
      keterangan: item.keterangan ?? "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.tanggal || !form.nama || !form.nominal) {
      toast({
        title: "Error",
        description: "Tanggal, nama, dan nominal wajib diisi",
        variant: "destructive",
      });
      return;
    }

    const isEditing = Boolean(editingId);
    const endpoint = isEditing
      ? `/api/pemasukan/${editingId}`
      : "/api/pemasukan";
    const method = isEditing ? "PUT" : "POST";

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tanggal: form.tanggal,
        nama: form.nama,
        nominal: getRawNominal(),
        keterangan: form.keterangan,
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => null);
      toast({
        title: "Error",
        description: error?.message ?? "Pemasukan gagal ditambahkan",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Berhasil",
      description: isEditing
        ? "Pemasukan berhasil diperbarui"
        : "Pemasukan berhasil ditambahkan",
    });

    resetForm();
    setIsModalOpen(false);
    loadData();
    loadMonths();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/pemasukan/${id}`, {
      method: "DELETE",
    });
    toast({ title: "Berhasil", description: "Pemasukan dihapus" });
    loadData();
    loadMonths();
  };

  const handlePosting = async (id: string) => {
    await fetch(`/api/pemasukan/${id}/post`, {
      method: "PATCH",
    });
    toast({ title: "Diposting", description: "Data berhasil dikunci" });
    loadData();
    loadMonths();
  };

  return (
    <AuthGuard>
      <AppShell>
        <div className="container mx-auto p-4 space-y-6">
          <AppHeader title="Input Pemasukan" />

          {/* Header */}
          <GlassCard className="p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Pilih bulan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Bulan</SelectItem>
                  {months.map((m) => (
                    <SelectItem key={m} value={m}>
                      {formatMonthLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center justify-between rounded-xl border border-border/40 bg-white/40 px-4 py-3 sm:hidden">
                <div>
                  <p className="text-xs text-muted-foreground">Total Pemasukan</p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatCurrency(total)}
                  </p>
                </div>
                <Badge variant="secondary">{filtered.length} data</Badge>
              </div>

            <Dialog
              open={isModalOpen}
              onOpenChange={(open) => {
                setIsModalOpen(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button
                  className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700"
                  onClick={openCreateModal}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Pemasukan
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? "Edit Pemasukan" : "Tambah Pemasukan"}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tanggal-pemasukan">Tanggal</Label>
                    <Input
                      id="tanggal-pemasukan"
                      type="date"
                      value={form.tanggal}
                      onChange={(e) =>
                        setForm({ ...form, tanggal: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nama-pemasukan">Nama Pemasukan</Label>
                    <Input
                      id="nama-pemasukan"
                      placeholder="Contoh: Pemasangan meteran"
                      value={form.nama}
                      onChange={(e) =>
                        setForm({ ...form, nama: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nominal-pemasukan">Nominal</Label>
                    <Input
                      id="nominal-pemasukan"
                      placeholder="Rp 0"
                      value={form.nominal}
                      onChange={(e) => handleNominalChange(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="keterangan-pemasukan">Keterangan</Label>
                    <Input
                      id="keterangan-pemasukan"
                      placeholder="Opsional"
                      value={form.keterangan}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          keterangan: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetForm();
                      setIsModalOpen(false);
                    }}
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    {editingId ? "Simpan Perubahan" : "Simpan"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </div>
          </GlassCard>

          {/* Table */}
          <GlassCard className="p-4 hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{formatDateLong(d.tanggal)}</TableCell>
                    <TableCell>{d.nama}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(d.nominal)}
                    </TableCell>
                    <TableCell>{d.keterangan ?? "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          d.status === "POSTED" ? "default" : "secondary"
                        }
                      >
                        {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {d.status === "DRAFT" && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handlePosting(d.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Posting
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditModal(d)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Edit
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(d.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>

              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="text-right font-semibold">
                    Total:
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(total)}
                  </TableCell>
                  <TableCell colSpan={3}></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </GlassCard>

          <div className="space-y-3 md:hidden">
            {filtered.length > 0 ? (
              filtered.map((item) => (
                <GlassCard key={item.id} className="overflow-hidden">
                  <div className="bg-gradient-to-r from-teal-500/10 via-white/60 to-emerald-500/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal-700/80">
                          {formatDateLong(item.tanggal)}
                        </p>
                        <h3 className="mt-1 truncate text-base font-semibold text-foreground">
                          {item.nama}
                        </h3>
                      </div>
                      <Badge
                        variant={item.status === "POSTED" ? "default" : "secondary"}
                        className={
                          item.status === "POSTED"
                            ? "bg-emerald-600 text-white hover:bg-emerald-600"
                            : ""
                        }
                      >
                        {item.status}
                      </Badge>
                    </div>

                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Nominal</p>
                        <p className="text-2xl font-bold tracking-tight text-teal-700">
                          {formatCurrency(item.nominal)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-4">
                    <div className="rounded-2xl border border-border/40 bg-white/50 p-3">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        Keterangan
                      </p>
                      <p className="mt-1 text-sm leading-6 text-foreground">
                        {item.keterangan?.trim() ? item.keterangan : "-"}
                      </p>
                    </div>

                    {item.status === "DRAFT" ? (
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          size="sm"
                          className="bg-teal-600 hover:bg-teal-700"
                          onClick={() => handlePosting(item.id)}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Posting
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(item)}
                        >
                          <Pencil className="mr-1 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(item.id)}
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-sm text-emerald-700">
                        Pemasukan ini sudah diposting dan terkunci.
                      </div>
                    )}
                  </div>
                </GlassCard>
              ))
            ) : (
              <GlassCard className="p-8 text-center">
                <p className="text-sm font-medium text-foreground">
                  Belum ada data pemasukan
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tambahkan pemasukan baru atau ubah filter bulan untuk melihat data.
                </p>
              </GlassCard>
            )}
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}

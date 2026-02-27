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
import { Plus, Trash2, CheckCircle } from "lucide-react";
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

export default function PemasukanPage() {
  const { toast } = useToast();

  const [data, setData] = useState<Pemasukan[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("ALL");
  const [months, setMonths] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    nama: "",
    nominal: "",
    keterangan: "",
  });

  const loadData = async () => {
    const res = await fetch("/api/pemasukan");
    const json = await res.json();
    setData(json);
  };

  useEffect(() => {
    loadData();
    fetch("/api/pemasukan/months")
      .then((res) => res.json())
      .then((res) => setMonths(res.months ?? []));
  }, []);

  const filtered = useMemo(() => {
    if (selectedMonth === "ALL") return data;
    return data.filter((d) => d.tanggal.startsWith(selectedMonth));
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

  const handleSubmit = async () => {
    if (!form.nama || !form.nominal) {
      toast({
        title: "Error",
        description: "Nama dan nominal wajib diisi",
        variant: "destructive",
      });
      return;
    }

    await fetch("/api/pemasukan", {
      method: "POST",
      body: JSON.stringify({
        nama: form.nama,
        nominal: getRawNominal(),
        keterangan: form.keterangan,
      }),
    });

    toast({
      title: "Berhasil",
      description: "Pemasukan berhasil ditambahkan",
    });

    setForm({ nama: "", nominal: "", keterangan: "" });
    setIsModalOpen(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/pemasukan/${id}`, {
      method: "DELETE",
    });
    toast({ title: "Berhasil", description: "Pemasukan dihapus" });
    loadData();
  };

  const handlePosting = async (id: string) => {
    await fetch(`/api/pemasukan/${id}/post`, {
      method: "PATCH",
    });
    toast({ title: "Diposting", description: "Data berhasil dikunci" });
    loadData();
  };

  return (
    <AuthGuard>
      <AppShell>
        <div className="container mx-auto p-4 space-y-6">
          <AppHeader title="Input Pemasukan" />

          {/* Header */}
          <GlassCard className="p-6 flex justify-between items-center">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-48">
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

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Pemasukan
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Pemasukan</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nama Pemasukan</Label>
                    <Input
                      placeholder="Contoh: Denda Telat Pak Budi"
                      value={form.nama}
                      onChange={(e) =>
                        setForm({ ...form, nama: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Nominal</Label>
                    <Input
                      placeholder="Rp 0"
                      value={form.nominal}
                      onChange={(e) => handleNominalChange(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Keterangan</Label>
                    <Input
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
                    onClick={() => setIsModalOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    Simpan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </GlassCard>

          {/* Table */}
          <GlassCard className="p-4 hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
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
                            variant="outline"
                            onClick={() => handlePosting(d.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Posting
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
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </GlassCard>
        </div>
      </AppShell>
    </AuthGuard>
  );
}

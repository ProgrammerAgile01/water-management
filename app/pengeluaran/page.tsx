"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  DialogDescription,
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
import { Plus, Eye, Trash2 } from "lucide-react";
import { usePengeluaranStore, biayaOptions } from "@/lib/pengeluaran-store";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

export default function PengeluaranPage() {
  const router = useRouter();
  const { toast } = useToast();

  const {
    expenses,
    selectedMonth,
    setSelectedMonth,
    deleteExpense,
    init,
    reload,
  } = usePengeluaranStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    keterangan: "",
    biaya: "",
    nominal: "",
  });

  // new states for delete confirmation
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [months, setMonths] = useState<string[]>([]);

  useEffect(() => {
    const fetchMonths = async () => {
      const res = await fetch("/api/pengeluaran/months");
      const data = await res.json();
      setMonths(data.months ?? []);
    };

    fetchMonths();
  }, []);

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((expense) =>
        expense.tanggalPengeluaran.startsWith(selectedMonth),
      ),
    [expenses, selectedMonth],
  );

  const totalPengeluaran = useMemo(
    () => filteredExpenses.reduce((sum, expense) => sum + expense.total, 0),
    [filteredExpenses],
  );

  const handleAddExpense = async () => {
    if (!formData.keterangan || !formData.biaya || !formData.nominal) {
      toast({
        title: "Error",
        description: "Semua field harus diisi",
        variant: "destructive",
      });
      return;
    }

    try {
      const tanggalPengeluaran = `${selectedMonth}-15`;
      const noBulan = `PG-${selectedMonth}`;

      const created = await usePengeluaranStore.getState().addExpense({
        id: "",
        noBulan,
        tanggalInput: new Date().toISOString().slice(0, 10),
        tanggalPengeluaran,
        details: [],
        total: 0,
        status: "Draft",
      });

      await usePengeluaranStore.getState().addExpenseDetail(created.id, {
        keterangan: formData.keterangan,
        biaya: formData.biaya,
        nominal: Number.parseInt(formData.nominal),
      });

      toast({
        title: "Berhasil",
        description: "Pengeluaran berhasil ditambahkan",
      });

      setFormData({ keterangan: "", biaya: "", nominal: "" });
      setIsModalOpen(false);
      router.push(`/pengeluaran/${created.id}`);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Gagal",
        description:
          typeof err?.message === "string"
            ? err.message
            : "Gagal menambah pengeluaran",
        variant: "destructive",
      });
    }
  };

  // open delete dialog for specific id — now checks status first and shows toast jika Close
  const openDeleteDialog = (id: string) => {
    const target = expenses.find((e) => e.id === id);
    if (!target) {
      toast({
        title: "Gagal",
        description: "Data tidak ditemukan",
        variant: "destructive",
      });
      return;
    }
    if (target.status === "Close") {
      toast({
        title: "Tidak dapat dihapus",
        description:
          "Pengeluaran yang sudah berstatus Close tidak boleh dihapus.",
        variant: "destructive",
      });
      return;
    }
    setDeleteTargetId(id);
    setIsDeleteOpen(true);
  };

  // confirm delete action
  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      setIsDeleting(true);
      await deleteExpense(deleteTargetId);
      setIsDeleteOpen(false);
      setDeleteTargetId(null);
      toast({ title: "Berhasil", description: "Pengeluaran berhasil dihapus" });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Gagal",
        description:
          typeof err?.message === "string"
            ? err.message
            : "Gagal menghapus pengeluaran",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

  // find selected expense to show details inside dialog
  const deleteTarget = deleteTargetId
    ? expenses.find((e) => e.id === deleteTargetId) || null
    : null;

  return (
    <AuthGuard>
      <AppShell>
        <div className="min-h-screen">
          <div className="container mx-auto p-4 space-y-6">
            <AppHeader title="Input Pengeluaran" />

            {/* Header Controls */}
            <GlassCard className="p-6 mb-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="space-y-2">
                    <Label htmlFor="month">Bulan</Label>
                    <Select
                      value={selectedMonth}
                      onValueChange={setSelectedMonth}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Pilih bulan" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => {
                          const [year, m] = month.split("-");
                          const date = new Date(Number(year), Number(m) - 1);

                          const label = date.toLocaleDateString("id-ID", {
                            month: "long",
                            year: "numeric",
                          });

                          return (
                            <SelectItem key={month} value={month}>
                              {label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-teal-600 hover:bg-teal-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Pengeluaran
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Tambah Pengeluaran</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="keterangan">Keterangan</Label>
                        <Input
                          id="keterangan"
                          value={formData.keterangan}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              keterangan: e.target.value,
                            }))
                          }
                          placeholder="Masukkan keterangan"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="biaya"> Kategori Biaya</Label>
                        <Select
                          value={formData.biaya}
                          onValueChange={(value) =>
                            setFormData((prev) => ({ ...prev, biaya: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih kategori biaya" />
                          </SelectTrigger>
                          <SelectContent>
                            {biayaOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nominal">Nominal</Label>
                        <Input
                          id="nominal"
                          type="number"
                          value={formData.nominal}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              nominal: e.target.value,
                            }))
                          }
                          placeholder="0"
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
                      <Button
                        onClick={handleAddExpense}
                        className="bg-teal-600 hover:bg-teal-700"
                      >
                        Simpan
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </GlassCard>

            {/* Desktop Table — gaya laporan (garis horizontal, rapat, tanpa bg) */}
            <GlassCard className="hidden md:block mb-6 p-4">
              <div className="overflow-x-auto">
                <Table className="w-full border-collapse">
                  <TableHeader>
                    <TableRow className="border-b border-gray-300">
                      <TableHead className="w-12 text-[13px] font-semibold py-2">
                        No
                      </TableHead>
                      <TableHead className="text-[13px] font-semibold py-2">
                        Tanggal
                      </TableHead>
                      <TableHead className="text-[13px] font-semibold py-2">
                        Keterangan
                      </TableHead>
                      <TableHead className="text-[13px] font-semibold py-2 text-right">
                        Nominal per Biaya
                      </TableHead>
                      <TableHead className="text-[13px] font-semibold py-2 text-right">
                        Total
                      </TableHead>
                      <TableHead className="text-[13px] font-semibold py-2">
                        Status
                      </TableHead>
                      <TableHead className="w-32 text-[13px] font-semibold py-2 text-right">
                        Aksi
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredExpenses.map((expense, index) => (
                      <TableRow
                        key={expense.id}
                        className="border-b border-gray-300"
                      >
                        <TableCell className="py-2">{index + 1}</TableCell>

                        <TableCell className="py-2 whitespace-nowrap">
                          {new Date(
                            expense.tanggalPengeluaran,
                          ).toLocaleDateString("id-ID")}
                        </TableCell>

                        <TableCell className="py-2">
                          <div className="space-y-0.5">
                            {expense.details.map((detail) => (
                              <div key={detail.id} className="text-[13px]">
                                {detail.keterangan}
                              </div>
                            ))}
                          </div>
                        </TableCell>

                        <TableCell className="py-2 text-right tabular-nums">
                          <div className="space-y-0.5">
                            {expense.details.map((detail) => (
                              <div key={detail.id} className="text-[13px]">
                                {formatCurrency(detail.nominal)}
                              </div>
                            ))}
                          </div>
                        </TableCell>

                        <TableCell className="py-2 text-right font-semibold tabular-nums">
                          {formatCurrency(expense.total)}
                        </TableCell>

                        <TableCell className="py-2">
                          <Badge
                            variant={
                              expense.status === "Close"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {expense.status}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-2">
                          <div className="flex justify-end gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/pengeluaran/${expense.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>

                            {/* Hapus: disabled jika status Close */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDeleteDialog(expense.id)}
                              className={`text-red-600 hover:text-red-700 ${expense.status === "Close" ? "opacity-50 cursor-not-allowed" : ""}`}
                              disabled={expense.status === "Close"}
                              aria-disabled={expense.status === "Close"}
                              title={
                                expense.status === "Close"
                                  ? "Tidak bisa dihapus: status Close"
                                  : "Hapus"
                              }
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
                        colSpan={4}
                        className="py-2 text-right font-semibold bg-transparent"
                      >
                        Total Pengeluaran:
                      </TableCell>
                      <TableCell className="py-2 font-bold text-right bg-transparent">
                        {formatCurrency(totalPengeluaran)}
                      </TableCell>
                      <TableCell
                        colSpan={2}
                        className="bg-transparent"
                      ></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </GlassCard>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {filteredExpenses.map((expense) => (
                <GlassCard key={expense.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">
                          {new Date(
                            expense.tanggalPengeluaran,
                          ).toLocaleDateString("id-ID")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {expense.noBulan}
                        </p>
                      </div>
                      <Badge
                        variant={
                          expense.status === "Close" ? "default" : "secondary"
                        }
                      >
                        {expense.status}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {expense.details.map((detail) => (
                        <div
                          key={detail.id}
                          className="flex justify-between text-sm"
                        >
                          <span>{detail.keterangan}</span>
                          <span className="font-medium">
                            {formatCurrency(detail.nominal)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-2 flex justify-between items-center">
                      <span className="font-semibold">
                        Total: {formatCurrency(expense.total)}
                      </span>
                      <div className="flex gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/pengeluaran/${expense.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            Detail
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDeleteDialog(expense.id)}
                          className={`text-red-600 hover:text-red-700 ${expense.status === "Close" ? "opacity-50 cursor-not-allowed" : ""}`}
                          disabled={expense.status === "Close"}
                          aria-disabled={expense.status === "Close"}
                          title={
                            expense.status === "Close"
                              ? "Tidak bisa dihapus: status Close"
                              : "Hapus"
                          }
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Hapus
                        </Button>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              ))}

              <GlassCard className="p-4 bg-teal-50/50">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Total Pengeluaran
                  </p>
                  <p className="text-xl font-bold text-teal-700">
                    {formatCurrency(totalPengeluaran)}
                  </p>
                </div>
              </GlassCard>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Konfirmasi Hapus Pengeluaran</DialogTitle>
                  <DialogDescription>
                    Tindakan ini akan menghapus data pengeluaran secara
                    permanen. Pastikan data yang akan dihapus sudah benar.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                  {deleteTarget ? (
                    <>
                      <div className="text-sm text-muted-foreground">
                        Berikut ringkasan pengeluaran:
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-muted-foreground">Tanggal</div>
                        <div className="font-medium">
                          {new Date(
                            deleteTarget.tanggalPengeluaran,
                          ).toLocaleDateString("id-ID")}
                        </div>

                        <div className="text-muted-foreground">No. Bulan</div>
                        <div className="font-medium">
                          {deleteTarget.noBulan}
                        </div>

                        <div className="text-muted-foreground">Keterangan</div>
                        <div className="font-medium">
                          {deleteTarget.details
                            .map((d) => d.keterangan)
                            .join(", ")}
                        </div>

                        <div className="text-muted-foreground">Total</div>
                        <div className="font-medium">
                          {formatCurrency(deleteTarget.total)}
                        </div>
                      </div>

                      <div className="pt-3 text-sm text-rose-600">
                        <strong>Perhatian:</strong> Data yang dihapus tidak bisa
                        dikembalikan.
                      </div>
                    </>
                  ) : (
                    <div>Memuat data...</div>
                  )}
                </div>

                <DialogFooter className="gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDeleteOpen(false);
                      setDeleteTargetId(null);
                    }}
                    disabled={isDeleting}
                  >
                    Batal
                  </Button>
                  <Button
                    className="bg-rose-600 hover:bg-rose-700"
                    onClick={confirmDelete}
                    disabled={isDeleting || deleteTarget?.status === "Close"}
                  >
                    {isDeleting ? "Menghapus..." : "Hapus Sekarang"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}

// app/biaya/page.tsx
"use client";

import { useEffect, useMemo } from "react"; // ⬅️ tambah useEffect/useMemo
import { useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppHeader } from "@/components/app-header";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  FolderOpen,
} from "lucide-react";
import {
  useMasterBiayaStore,
  type MasterBiaya,
} from "@/lib/master-biaya-store";
import { useToast } from "@/hooks/use-toast";
import { useMobile } from "@/hooks/use-mobile";

interface BiayaFormData {
  nama: string;
  kode: string;
  deskripsi: string;
  status: "Aktif" | "Nonaktif";
}

export default function MasterBiayaPage() {
  const {
    biayaList,
    searchTerm,
    selectedYear,
    setSearchTerm,
    setSelectedYear,
    addBiaya,
    updateBiaya,
    deleteBiaya,
    toggleStatus,
    getFilteredBiaya,
    getBiayaByCode,
    init,
    reload,
    isLoading,
  } = useMasterBiayaStore();

  const { toast } = useToast();
  const isMobile = useMobile();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingBiaya, setEditingBiaya] = useState<MasterBiaya | null>(null);
  const [deletingBiaya, setDeletingBiaya] = useState<MasterBiaya | null>(null);
  const [formData, setFormData] = useState<BiayaFormData>({
    nama: "",
    kode: "",
    deskripsi: "",
    status: "Aktif",
  });
  const [formErrors, setFormErrors] = useState<Partial<BiayaFormData>>({});

  // ⬇️ load awal
  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ⬇️ ketika filter (tahun/keyword) berubah, refresh dari server
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedYear]);

  const filteredBiaya = useMemo(
    () => getFilteredBiaya(),
    [biayaList, searchTerm, selectedYear]
  );
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) =>
    (currentYear - i).toString()
  );

  const validateForm = (): boolean => {
    const errors: Partial<BiayaFormData> = {};
    if (!formData.nama.trim()) {
      errors.nama = "Nama biaya wajib diisi";
    } else if (formData.nama.trim().length < 3) {
      errors.nama = "Nama biaya minimal 3 karakter";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const generateCode = (nama: string): string => {
    const words = nama.trim().toUpperCase().split(" ");
    let code = "";
    for (const word of words) {
      if (code.length >= 6) break;
      const cleanWord = word.replace(/[^A-Z]/g, "");
      if (cleanWord.length > 0) {
        code += cleanWord.substring(0, 3);
      }
    }
    if (code.length < 3) {
      code = code.padEnd(3, "X");
    }
    const randomNum = Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, "0");
    return (code.substring(0, 6) + randomNum).substring(0, 8);
  };

  const handleOpenForm = (biaya?: MasterBiaya) => {
    if (biaya) {
      setEditingBiaya(biaya);
      setFormData({
        nama: biaya.nama,
        kode: biaya.kode || "",
        deskripsi: biaya.deskripsi || "",
        status: biaya.status,
      });
    } else {
      setEditingBiaya(null);
      setFormData({
        nama: "",
        kode: "",
        deskripsi: "",
        status: "Aktif",
      });
    }
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleNamaChange = (nama: string) => {
    const newFormData = { ...formData, nama };
    if (!editingBiaya && nama.trim().length >= 3) {
      newFormData.kode = generateCode(nama);
    }
    setFormData(newFormData);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingBiaya(null);
    setFormData({
      nama: "",
      kode: "",
      deskripsi: "",
      status: "Aktif",
    });
    setFormErrors({});
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    let finalKode = formData.kode;
    if (!editingBiaya && !finalKode.trim()) {
      finalKode = generateCode(formData.nama);
    }
    const biayaData = {
      nama: formData.nama.trim(),
      kode: finalKode.trim().toUpperCase() || undefined,
      deskripsi: formData.deskripsi.trim() || undefined,
      status: formData.status,
    };
    if (editingBiaya) {
      await updateBiaya(editingBiaya.id, biayaData);
      toast({ title: "Berhasil", description: "Biaya berhasil diperbarui." });
    } else {
      await addBiaya(biayaData as any);
      toast({ title: "Berhasil", description: "Biaya berhasil disimpan." });
    }
    handleCloseForm();
  };

  const handleToggleStatus = async (biaya: MasterBiaya) => {
    await toggleStatus(biaya.id);
    toast({ title: "Berhasil", description: "Status biaya diperbarui." });
  };

  const handleDeleteClick = (biaya: MasterBiaya) => {
    setDeletingBiaya(biaya);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (deletingBiaya) {
      await deleteBiaya(deletingBiaya.id);
      toast({ title: "Berhasil", description: "Biaya dihapus." });
      setIsDeleteDialogOpen(false);
      setDeletingBiaya(null);
    }
  };

  const renderDesktopTable = () => (
    <GlassCard className="hidden md:block p-6">
      <div className="overflow-x-auto">
        <Table className="w-full border-collapse">
          {/* Header: garis bawah tipis, tanpa background */}
          <TableHeader>
            <TableRow className="border-b border-gray-300">
              <TableHead className="w-12 text-[13px] font-semibold py-2">
                No
              </TableHead>
              <TableHead className="text-[13px] font-semibold py-2">
                Nama/Jenis Biaya
              </TableHead>
              <TableHead className="text-[13px] font-semibold py-2">
                Kode
              </TableHead>
              <TableHead className="text-[13px] font-semibold py-2">
                Deskripsi
              </TableHead>
              <TableHead className="text-[13px] font-semibold py-2">
                Status
              </TableHead>
              <TableHead className="w-40 text-[13px] font-semibold py-2 text-right">
                Aksi
              </TableHead>
            </TableRow>
          </TableHeader>

          {/* Body: tiap baris garis bawah tipis; tanpa hover bg */}
          <TableBody>
            {filteredBiaya.map((biaya, idx) => (
              <TableRow key={biaya.id} className="border-b border-gray-300">
                <TableCell className="py-2">{idx + 1}</TableCell>

                <TableCell className="py-2 text-slate-800">
                  {biaya.nama}
                </TableCell>

                <TableCell className="py-2">
                  {biaya.kode ? (
                    <Badge variant="outline" className="font-mono text-xs">
                      {biaya.kode}
                    </Badge>
                  ) : (
                    "-"
                  )}
                </TableCell>

                <TableCell className="py-2 max-w-xs truncate text-slate-700">
                  {biaya.deskripsi || "-"}
                </TableCell>

                <TableCell className="py-2">
                  <Badge
                    variant="outline"
                    className={
                      biaya.status === "Aktif"
                        ? "border-emerald-300 text-emerald-700 bg-white/60"
                        : "border-gray-300 text-slate-600 bg-white/60"
                    }
                  >
                    {biaya.status}
                  </Badge>
                </TableCell>

                <TableCell className="py-2">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenForm(biaya)}
                      className="rounded-lg border-gray-300 text-slate-700 hover:bg-slate-50"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(biaya)}
                      className="rounded-lg border-gray-300 text-slate-700 hover:bg-slate-50"
                    >
                      {biaya.status === "Aktif" ? (
                        <ToggleRight className="h-4 w-4" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(biaya)}
                      className="rounded-lg border-gray-300 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredBiaya.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            {isLoading
              ? "Memuat data..."
              : "Tidak ada data biaya yang ditemukan"}
          </div>
        )}
      </div>
    </GlassCard>
  );

  const renderMobileCards = () => (
    <div className="space-y-4">
      <Button onClick={() => handleOpenForm()} className="w-full" size="lg">
        <Plus className="h-4 w-4 mr-2" />
        Tambah Biaya
      </Button>

      {filteredBiaya.map((biaya) => (
        <GlassCard key={biaya.id} className="p-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{biaya.nama}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {biaya.kode && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {biaya.kode}
                    </Badge>
                  )}
                  <Badge
                    variant={biaya.status === "Aktif" ? "default" : "secondary"}
                    className={
                      biaya.status === "Aktif"
                        ? "bg-green-500 hover:bg-green-600"
                        : ""
                    }
                  >
                    {biaya.status}
                  </Badge>
                </div>
              </div>
            </div>

            {biaya.deskripsi && (
              <p className="text-sm text-muted-foreground">{biaya.deskripsi}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenForm(biaya)}
                className="h-8 px-3"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleStatus(biaya)}
                className="h-8 px-3"
              >
                {biaya.status === "Aktif" ? (
                  <>
                    <ToggleRight className="h-4 w-4 mr-1 text-green-500" />
                    Nonaktifkan
                  </>
                ) : (
                  <>
                    <ToggleLeft className="h-4 w-4 mr-1 text-gray-400" />
                    Aktifkan
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteClick(biaya)}
                className="h-8 px-3 text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Hapus
              </Button>
            </div>
          </div>
        </GlassCard>
      ))}

      {filteredBiaya.length === 0 && (
        <GlassCard className="p-8 text-center text-muted-foreground">
          {isLoading ? "Memuat data..." : "Tidak ada data biaya yang ditemukan"}
        </GlassCard>
      )}
    </div>
  );

  return (
    <AuthGuard>
      <AppShell>
        <div className="min-h-screen pb-20">
          <AppHeader title="Data Biaya" />

          <div className="container mx-auto px-4 space-y-6">
            {/* Add Button for Desktop */}
            {!isMobile && (
              <div className="flex justify-end">
                <Button onClick={() => handleOpenForm()} size="lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Biaya
                </Button>
              </div>
            )}
            {/* Header Section */}
            <GlassCard className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <FolderOpen className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Data Biaya
                  </h2>
                  <p className="text-muted-foreground">
                    Kelola entri master biaya menggunakan menu ini.
                  </p>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mt-6">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Pilih Tahun" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama, kode, atau deskripsi..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </GlassCard>

            {/* Content */}
            {isMobile ? renderMobileCards() : renderDesktopTable()}

            {/* Form Dialog */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingBiaya ? "Edit Biaya" : "Tambah Biaya"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingBiaya
                      ? "Perbarui informasi biaya yang dipilih."
                      : "Tambahkan biaya baru ke dalam sistem."}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nama">Nama/Jenis Biaya *</Label>
                    <Input
                      id="nama"
                      value={formData.nama}
                      onChange={(e) => handleNamaChange(e.target.value)}
                      placeholder="Masukkan nama biaya"
                      className={formErrors.nama ? "border-red-500" : ""}
                    />
                    {formErrors.nama && (
                      <p className="text-sm text-red-500">{formErrors.nama}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="kode">Kode (Otomatis)</Label>
                    <Input
                      id="kode"
                      value={formData.kode}
                      placeholder="Kode akan dibuat otomatis"
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Kode dibuat otomatis berdasarkan nama biaya
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deskripsi">Deskripsi</Label>
                    <Textarea
                      id="deskripsi"
                      value={formData.deskripsi}
                      onChange={(e) =>
                        setFormData({ ...formData, deskripsi: e.target.value })
                      }
                      placeholder="Masukkan deskripsi biaya"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="status"
                      checked={formData.status === "Aktif"}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          status: checked ? "Aktif" : "Nonaktif",
                        })
                      }
                    />
                    <Label htmlFor="status">Status Aktif</Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseForm}>
                    Batal
                  </Button>
                  <Button onClick={handleSubmit}>Simpan</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog
              open={isDeleteDialogOpen}
              onOpenChange={setIsDeleteDialogOpen}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus Biaya</AlertDialogTitle>
                  <AlertDialogDescription>
                    Apakah Anda yakin ingin menghapus biaya "
                    {deletingBiaya?.nama}
                    "? Tindakan ini tidak dapat dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteConfirm}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    Hapus
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}

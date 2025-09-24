// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import { AppHeader } from "@/components/app-header";
// import { AuthGuard } from "@/components/auth-guard";
// import { AppShell } from "@/components/app-shell";
// import { GlassCard } from "@/components/glass-card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
//   DialogFooter,
// } from "@/components/ui/dialog";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
//   TableFooter,
// } from "@/components/ui/table";
// import { Plus, Edit, Trash2, Send } from "lucide-react";
// import { usePengeluaranStore, biayaOptions } from "@/lib/pengeluaran-store";
// import { useToast } from "@/hooks/use-toast";

// export default function DetailPengeluaranPage() {
//   const params = useParams();
//   const router = useRouter();
//   const { toast } = useToast();

//   const {
//     expenses,
//     addExpenseDetail,
//     updateExpenseDetail,
//     deleteExpenseDetail,
//     postExpense,
//     updateExpense, // <-- untuk PATCH tanggal
//     init,
//   } = usePengeluaranStore();

//   // pastikan data siap saat akses langsung
//   useEffect(() => {
//     init();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   const expenseId = useMemo(() => {
//     const pid = (params as any)?.id;
//     return Array.isArray(pid) ? pid[0] : (pid as string);
//   }, [params]);

//   const expense = useMemo(
//     () => expenses.find((e) => e.id === expenseId),
//     [expenses, expenseId]
//   );

//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [editingDetail, setEditingDetail] = useState<string | null>(null);
//   const [formData, setFormData] = useState({
//     keterangan: "",
//     biaya: "",
//     nominal: "",
//   });

//   // state lokal untuk input date
//   const [tglLocal, setTglLocal] = useState("");

//   useEffect(() => {
//     if (expense) setTglLocal(expense.tanggalPengeluaran);
//   }, [expense]);

//   if (!expense) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-indigo-100">
//         <div className="container mx-auto p-4">
//           <AppHeader title="Detail Pengeluaran" />
//           <GlassCard className="p-6 text-center">
//             <p>Pengeluaran tidak ditemukan</p>
//             <Button onClick={() => router.back()} className="mt-4">
//               Kembali
//             </Button>
//           </GlassCard>
//         </div>
//       </div>
//     );
//   }

//   const handleSaveTanggal = async () => {
//     if (!tglLocal || expense.status === "Close") return;
//     try {
//       await updateExpense(expense.id, { tanggalPengeluaran: tglLocal });
//       toast({
//         title: "Tersimpan",
//         description: "Tanggal pengeluaran diperbarui",
//       });
//     } catch (e: any) {
//       toast({
//         title: "Gagal",
//         description:
//           typeof e?.message === "string"
//             ? e.message
//             : "Gagal menyimpan tanggal",
//         variant: "destructive",
//       });
//     }
//   };

//   const handleAddDetail = async () => {
//     if (!formData.keterangan || !formData.biaya || !formData.nominal) {
//       toast({
//         title: "Error",
//         description: "Semua field harus diisi",
//         variant: "destructive",
//       });
//       return;
//     }

//     if (editingDetail) {
//       await updateExpenseDetail(expense.id, editingDetail, {
//         keterangan: formData.keterangan,
//         biaya: formData.biaya,
//         nominal: Number.parseInt(formData.nominal),
//       });
//       toast({
//         title: "Berhasil",
//         description: "Detail pengeluaran berhasil diupdate",
//       });
//     } else {
//       await addExpenseDetail(expense.id, {
//         keterangan: formData.keterangan,
//         biaya: formData.biaya,
//         nominal: Number.parseInt(formData.nominal),
//       });
//       toast({
//         title: "Berhasil",
//         description: "Detail pengeluaran berhasil ditambahkan",
//       });
//     }

//     setFormData({ keterangan: "", biaya: "", nominal: "" });
//     setEditingDetail(null);
//     setIsModalOpen(false);
//   };

//   const handleEdit = (detail: any) => {
//     setEditingDetail(detail.id);
//     setFormData({
//       keterangan: detail.keterangan,
//       biaya: detail.biaya,
//       nominal: detail.nominal.toString(),
//     });
//     setIsModalOpen(true);
//   };

//   const handleDelete = async (detailId: string) => {
//     await deleteExpenseDetail(expense.id, detailId);
//     toast({
//       title: "Berhasil",
//       description: "Detail pengeluaran berhasil dihapus",
//     });
//   };

//   const handlePost = async () => {
//     await postExpense(expense.id);
//     toast({ title: "Berhasil", description: "Pengeluaran berhasil diposting" });
//   };

//   const formatCurrency = (amount: number) =>
//     new Intl.NumberFormat("id-ID", {
//       style: "currency",
//       currency: "IDR",
//       minimumFractionDigits: 0,
//     }).format(amount);

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-indigo-100">
//       <div className="container mx-auto p-4 space-y-6">
//         <AuthGuard>
//           <AppShell>
//             <AppHeader title="Detail Pengeluaran" />

//             {/* Header Form */}
//             <GlassCard className="p-6">
//               <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between mb-6">
//                 <h2 className="text-xl font-semibold">Detail Pengeluaran</h2>
//                 <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
//                   <DialogTrigger asChild>
//                     <Button
//                       className="bg-teal-600 hover:bg-teal-700"
//                       disabled={expense.status === "Close"}
//                     >
//                       <Plus className="h-4 w-4 mr-2" />
//                       Tambah Detail
//                     </Button>
//                   </DialogTrigger>
//                   <DialogContent className="sm:max-w-md">
//                     <DialogHeader>
//                       <DialogTitle>
//                         {editingDetail ? "Edit Detail" : "Tambah Detail"}
//                       </DialogTitle>
//                     </DialogHeader>
//                     <div className="space-y-4">
//                       <div className="space-y-2">
//                         <Label htmlFor="keterangan">Keterangan</Label>
//                         <Input
//                           id="keterangan"
//                           value={formData.keterangan}
//                           onChange={(e) =>
//                             setFormData((prev) => ({
//                               ...prev,
//                               keterangan: e.target.value,
//                             }))
//                           }
//                           placeholder="Masukkan keterangan"
//                           disabled={expense.status === "Close"}
//                         />
//                       </div>
//                       <div className="space-y-2">
//                         <Label htmlFor="biaya">Biaya</Label>
//                         <Select
//                           value={formData.biaya}
//                           onValueChange={(value) =>
//                             setFormData((prev) => ({ ...prev, biaya: value }))
//                           }
//                           disabled={expense.status === "Close"}
//                         >
//                           <SelectTrigger>
//                             <SelectValue placeholder="Pilih jenis biaya" />
//                           </SelectTrigger>
//                           <SelectContent>
//                             {biayaOptions.map((option) => (
//                               <SelectItem key={option} value={option}>
//                                 {option}
//                               </SelectItem>
//                             ))}
//                           </SelectContent>
//                         </Select>
//                       </div>
//                       <div className="space-y-2">
//                         <Label htmlFor="nominal">Nominal</Label>
//                         <Input
//                           id="nominal"
//                           type="number"
//                           value={formData.nominal}
//                           onChange={(e) =>
//                             setFormData((prev) => ({
//                               ...prev,
//                               nominal: e.target.value,
//                             }))
//                           }
//                           placeholder="0"
//                           disabled={expense.status === "Close"}
//                         />
//                       </div>
//                     </div>
//                     <DialogFooter className="gap-2">
//                       <Button
//                         variant="outline"
//                         onClick={() => {
//                           setIsModalOpen(false);
//                           setEditingDetail(null);
//                           setFormData({
//                             keterangan: "",
//                             biaya: "",
//                             nominal: "",
//                           });
//                         }}
//                       >
//                         Batal
//                       </Button>
//                       <Button
//                         onClick={handleAddDetail}
//                         className="bg-teal-600 hover:bg-teal-700"
//                         disabled={expense.status === "Close"}
//                       >
//                         {editingDetail ? "Update" : "Simpan"}
//                       </Button>
//                     </DialogFooter>
//                   </DialogContent>
//                 </Dialog>
//               </div>

//               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
//                 <div className="space-y-2">
//                   <Label>No Bulan</Label>
//                   <Input value={expense.noBulan} disabled />
//                 </div>
//                 <div className="space-y-2">
//                   <Label>Tanggal Input</Label>
//                   <Input
//                     value={new Date(expense.tanggalInput).toLocaleDateString(
//                       "id-ID"
//                     )}
//                     disabled
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <Label>Tanggal Pengeluaran</Label>
//                   <Input
//                     type="date"
//                     value={tglLocal}
//                     onChange={(e) => setTglLocal(e.target.value)}
//                     onBlur={handleSaveTanggal} // simpan saat blur
//                     disabled={expense.status === "Close"} // kunci saat Close
//                   />
//                 </div>
//               </div>
//             </GlassCard>

//             {/* Desktop Table */}
//             <GlassCard className="hidden md:block">
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead className="w-16">No</TableHead>
//                     <TableHead>Keterangan</TableHead>
//                     <TableHead>Biaya</TableHead>
//                     <TableHead>Nominal</TableHead>
//                     <TableHead className="w-32">Aksi</TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {expense.details.map((detail, index) => (
//                     <TableRow key={detail.id}>
//                       <TableCell>{index + 1}</TableCell>
//                       <TableCell>{detail.keterangan}</TableCell>
//                       <TableCell>{detail.biaya}</TableCell>
//                       <TableCell>{formatCurrency(detail.nominal)}</TableCell>
//                       <TableCell>
//                         <div className="flex gap-2">
//                           <Button
//                             size="sm"
//                             variant="outline"
//                             onClick={() => handleEdit(detail)}
//                             disabled={expense.status === "Close"}
//                           >
//                             <Edit className="h-4 w-4" />
//                           </Button>
//                           <Button
//                             size="sm"
//                             variant="outline"
//                             onClick={() => handleDelete(detail.id)}
//                             className="text-red-600 hover:text-red-700"
//                             disabled={expense.status === "Close"}
//                           >
//                             <Trash2 className="h-4 w-4" />
//                           </Button>
//                         </div>
//                       </TableCell>
//                     </TableRow>
//                   ))}
//                 </TableBody>
//                 <TableFooter>
//                   <TableRow>
//                     <TableCell colSpan={3} className="text-right font-semibold">
//                       Total:
//                     </TableCell>
//                     <TableCell className="font-bold text-lg">
//                       {formatCurrency(expense.total)}
//                     </TableCell>
//                     <TableCell></TableCell>
//                   </TableRow>
//                 </TableFooter>
//               </Table>
//             </GlassCard>

//             {/* Mobile Cards */}
//             <div className="md:hidden space-y-4">
//               {expense.details.map((detail) => (
//                 <GlassCard key={detail.id} className="p-4">
//                   <div className="space-y-3">
//                     <div className="flex justify-between items-start">
//                       <div>
//                         <p className="font-semibold">{detail.keterangan}</p>
//                         <p className="text-sm text-muted-foreground">
//                           {detail.biaya}
//                         </p>
//                       </div>
//                       <p className="font-semibold">
//                         {formatCurrency(detail.nominal)}
//                       </p>
//                     </div>

//                     <div className="flex gap-2 justify-end">
//                       <Button
//                         size="sm"
//                         variant="outline"
//                         onClick={() => handleEdit(detail)}
//                         disabled={expense.status === "Close"}
//                       >
//                         <Edit className="h-4 w-4 mr-1" />
//                         Edit
//                       </Button>
//                       <Button
//                         size="sm"
//                         variant="outline"
//                         onClick={() => handleDelete(detail.id)}
//                         className="text-red-600 hover:text-red-700"
//                         disabled={expense.status === "Close"}
//                       >
//                         <Trash2 className="h-4 w-4 mr-1" />
//                         Hapus
//                       </Button>
//                     </div>
//                   </div>
//                 </GlassCard>
//               ))}

//               {/* Mobile Total */}
//               <GlassCard className="p-4 bg-teal-50/50">
//                 <div className="text-center">
//                   <p className="text-sm text-muted-foreground">Total</p>
//                   <p className="text-xl font-bold text-teal-700">
//                     {formatCurrency(expense.total)}
//                   </p>
//                 </div>
//               </GlassCard>
//             </div>

//             {/* Posting Button */}
//             {expense.status === "Draft" && (
//               <div className="flex justify-center mt-4">
//                 <Button
//                   onClick={handlePost}
//                   className="bg-green-600 hover:bg-green-700 px-8 py-3 text-lg"
//                   size="lg"
//                 >
//                   <Send className="h-5 w-5 mr-2" />
//                   Posting
//                 </Button>
//               </div>
//             )}
//           </AppShell>
//         </AuthGuard>
//       </div>
//     </div>
//   );
// }

// app/pengeluaran/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Send } from "lucide-react";
import { usePengeluaranStore, biayaOptions } from "@/lib/pengeluaran-store";
import { useToast } from "@/hooks/use-toast";

export default function DetailPengeluaranPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const {
    expenses,
    addExpenseDetail,
    updateExpenseDetail,
    deleteExpenseDetail,
    postExpense,
    updateExpense,
    init,
  } = usePengeluaranStore();

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const expenseId = useMemo(() => {
    const pid = (params as any)?.id;
    return Array.isArray(pid) ? pid[0] : (pid as string);
  }, [params]);

  const expense = useMemo(
    () => expenses.find((e) => e.id === expenseId),
    [expenses, expenseId]
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDetail, setEditingDetail] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    keterangan: "",
    biaya: "",
    nominal: "",
  });

  const [tglLocal, setTglLocal] = useState("");

  useEffect(() => {
    if (expense) setTglLocal(expense.tanggalPengeluaran);
  }, [expense]);

  if (!expense) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-indigo-100">
        <div className="container mx-auto p-4">
          <AppHeader title="Detail Pengeluaran" />
          <GlassCard className="p-6 text-center">
            <p>Pengeluaran tidak ditemukan</p>
            <Button onClick={() => router.back()} className="mt-4">
              Kembali
            </Button>
          </GlassCard>
        </div>
      </div>
    );
  }

  const handleSaveTanggal = async () => {
    if (!tglLocal || expense.status === "Close") return;
    try {
      await updateExpense(expense.id, { tanggalPengeluaran: tglLocal });
      toast({
        title: "Tersimpan",
        description: "Tanggal pengeluaran diperbarui",
      });
    } catch (e: any) {
      toast({
        title: "Gagal",
        description:
          typeof e?.message === "string"
            ? e.message
            : "Gagal menyimpan tanggal",
        variant: "destructive",
      });
    }
  };

  const handleAddDetail = async () => {
    if (!formData.keterangan || !formData.biaya || !formData.nominal) {
      toast({
        title: "Error",
        description: "Semua field harus diisi",
        variant: "destructive",
      });
      return;
    }

    if (editingDetail) {
      await updateExpenseDetail(expense.id, editingDetail, {
        keterangan: formData.keterangan,
        biaya: formData.biaya,
        nominal: Number.parseInt(formData.nominal),
      });
      toast({
        title: "Berhasil",
        description: "Detail pengeluaran berhasil diupdate",
      });
    } else {
      await addExpenseDetail(expense.id, {
        keterangan: formData.keterangan,
        biaya: formData.biaya,
        nominal: Number.parseInt(formData.nominal),
      });
      toast({
        title: "Berhasil",
        description: "Detail pengeluaran berhasil ditambahkan",
      });
    }

    setFormData({ keterangan: "", biaya: "", nominal: "" });
    setEditingDetail(null);
    setIsModalOpen(false);
  };

  const handleEdit = (detail: any) => {
    setEditingDetail(detail.id);
    setFormData({
      keterangan: detail.keterangan,
      biaya: detail.biaya,
      nominal: detail.nominal.toString(),
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (detailId: string) => {
    await deleteExpenseDetail(expense.id, detailId);
    toast({
      title: "Berhasil",
      description: "Detail pengeluaran berhasil dihapus",
    });
  };

  const handlePost = async () => {
    await postExpense(expense.id);
    toast({ title: "Berhasil", description: "Pengeluaran berhasil diposting" });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto p-4 space-y-6">
        <AuthGuard>
          <AppShell>
            <AppHeader title="Detail Pengeluaran" />

            {/* Header Form */}
            <GlassCard className="p-6 mb-6">
              {/* ⟵ tambah mb-6 */}
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between mb-6">
                <h2 className="text-xl font-semibold">Detail Pengeluaran</h2>
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="bg-teal-600 hover:bg-teal-700"
                      disabled={expense.status === "Close"}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Detail
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingDetail ? "Edit Detail" : "Tambah Detail"}
                      </DialogTitle>
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
                          disabled={expense.status === "Close"}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="biaya">Biaya</Label>
                        <Select
                          value={formData.biaya}
                          onValueChange={(value) =>
                            setFormData((prev) => ({ ...prev, biaya: value }))
                          }
                          disabled={expense.status === "Close"}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih jenis biaya" />
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
                          disabled={expense.status === "Close"}
                        />
                      </div>
                    </div>
                    <DialogFooter className="gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsModalOpen(false);
                          setEditingDetail(null);
                          setFormData({
                            keterangan: "",
                            biaya: "",
                            nominal: "",
                          });
                        }}
                      >
                        Batal
                      </Button>
                      <Button
                        onClick={handleAddDetail}
                        className="bg-teal-600 hover:bg-teal-700"
                        disabled={expense.status === "Close"}
                      >
                        {editingDetail ? "Update" : "Simpan"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                <div className="space-y-2">
                  <Label>No Bulan</Label>
                  <Input value={expense.noBulan} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Input</Label>
                  <Input
                    value={new Date(expense.tanggalInput).toLocaleDateString(
                      "id-ID"
                    )}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Pengeluaran</Label>
                  <Input
                    type="date"
                    value={tglLocal}
                    onChange={(e) => setTglLocal(e.target.value)}
                    onBlur={handleSaveTanggal}
                    disabled={expense.status === "Close"}
                  />
                </div>
              </div>
            </GlassCard>

            {/* Desktop Table — tema sama dengan list pengeluaran */}
            <GlassCard className="hidden md:block mb-6 p-4">
              <div className="overflow-x-auto">
                <Table className="w-full border-collapse">
                  {/* Header: garis bawah tipis, tanpa bg */}
                  <TableHeader>
                    <TableRow className="border-b border-gray-300">
                      <TableHead className="w-12 text-[13px] font-semibold py-2">
                        No
                      </TableHead>
                      <TableHead className="text-[13px] font-semibold py-2">
                        Keterangan
                      </TableHead>
                      <TableHead className="text-[13px] font-semibold py-2">
                        Biaya
                      </TableHead>
                      <TableHead className="text-[13px] font-semibold py-2 text-right">
                        Nominal
                      </TableHead>
                      <TableHead className="w-32 text-[13px] font-semibold py-2 text-right">
                        Aksi
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  {/* Body: tiap baris ada garis bawah tipis; tanpa hover bg */}
                  <TableBody>
                    {expense.details.map((detail, index) => (
                      <TableRow
                        key={detail.id}
                        className="border-b border-gray-300"
                      >
                        <TableCell className="py-2">{index + 1}</TableCell>
                        <TableCell className="py-2">
                          {detail.keterangan}
                        </TableCell>
                        <TableCell className="py-2">{detail.biaya}</TableCell>
                        <TableCell className="py-2 text-right tabular-nums">
                          {formatCurrency(detail.nominal)}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(detail)}
                              disabled={expense.status === "Close"}
                              className="rounded-lg"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(detail.id)}
                              disabled={expense.status === "Close"}
                              className="text-red-600 hover:text-red-700 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>

                  {/* Footer: garis atas tipis, tanpa background */}
                  <TableFooter>
                    <TableRow className="border-t border-gray-200 bg-transparent">
                      <TableCell
                        colSpan={3}
                        className="py-2 text-right font-semibold bg-transparent"
                      >
                        Total:
                      </TableCell>
                      <TableCell className="py-2 font-bold text-right tabular-nums bg-transparent">
                        {formatCurrency(expense.total)}
                      </TableCell>
                      <TableCell className="bg-transparent"></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </GlassCard>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {expense.details.map((detail) => (
                <GlassCard key={detail.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{detail.keterangan}</p>
                        <p className="text-sm text-muted-foreground">
                          {detail.biaya}
                        </p>
                      </div>
                      <p className="font-semibold">
                        {formatCurrency(detail.nominal)}
                      </p>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(detail)}
                        disabled={expense.status === "Close"}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(detail.id)}
                        className="text-red-600 hover:text-red-700"
                        disabled={expense.status === "Close"}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Hapus
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              ))}

              {/* Mobile Total */}
              <GlassCard className="p-4 bg-teal-50/50">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-xl font-bold text-teal-700">
                    {formatCurrency(expense.total)}
                  </p>
                </div>
              </GlassCard>
            </div>

            {expense.status === "Draft" && (
              <div className="flex justify-center mt-4">
                <Button
                  onClick={handlePost}
                  className="bg-green-600 hover:bg-green-700 px-8 py-3 text-lg"
                  size="lg"
                >
                  <Send className="h-5 w-5 mr-2" />
                  Posting
                </Button>
              </div>
            )}
          </AppShell>
        </AuthGuard>
      </div>
    </div>
  );
}

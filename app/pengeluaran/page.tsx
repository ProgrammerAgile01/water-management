// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { useRouter } from "next/navigation";
// import { AppHeader } from "@/components/app-header";
// import { AuthGuard } from "@/components/auth-guard";
// import { AppShell } from "@/components/app-shell";
// import { GlassCard } from "@/components/glass-card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Badge } from "@/components/ui/badge";
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
// import { Plus, Eye, Trash2 } from "lucide-react";
// import { usePengeluaranStore, biayaOptions } from "@/lib/pengeluaran-store";
// import { useToast } from "@/hooks/use-toast";
// import Link from "next/link";

// export default function PengeluaranPage() {
//   const router = useRouter();
//   const { toast } = useToast();

//   const {
//     expenses,
//     selectedMonth,
//     setSelectedMonth,
//     deleteExpense,
//     init,
//     reload,
//   } = usePengeluaranStore();

//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [formData, setFormData] = useState({
//     keterangan: "",
//     biaya: "",
//     nominal: "",
//   });

//   useEffect(() => {
//     init();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   useEffect(() => {
//     reload();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [selectedMonth]);

//   const filteredExpenses = useMemo(
//     () =>
//       expenses.filter((expense) =>
//         expense.tanggalPengeluaran.startsWith(selectedMonth)
//       ),
//     [expenses, selectedMonth]
//   );

//   const totalPengeluaran = useMemo(
//     () => filteredExpenses.reduce((sum, expense) => sum + expense.total, 0),
//     [filteredExpenses]
//   );

//   const handleAddExpense = async () => {
//     if (!formData.keterangan || !formData.biaya || !formData.nominal) {
//       toast({
//         title: "Error",
//         description: "Semua field harus diisi",
//         variant: "destructive",
//       });
//       return;
//     }

//     try {
//       // Buat header untuk bulan terpilih
//       const tanggalPengeluaran = `${selectedMonth}-15`;
//       const noBulan = `PG-${selectedMonth}`;

//       const created = await usePengeluaranStore.getState().addExpense({
//         id: "",
//         noBulan,
//         tanggalInput: new Date().toISOString().slice(0, 10),
//         tanggalPengeluaran,
//         details: [],
//         total: 0,
//         status: "Draft",
//       });

//       // Tambahkan detail pertama dari form
//       await usePengeluaranStore.getState().addExpenseDetail(created.id, {
//         keterangan: formData.keterangan,
//         biaya: formData.biaya,
//         nominal: Number.parseInt(formData.nominal),
//       });

//       toast({
//         title: "Berhasil",
//         description: "Pengeluaran berhasil ditambahkan",
//       });

//       setFormData({ keterangan: "", biaya: "", nominal: "" });
//       setIsModalOpen(false);

//       // Arahkan ke halaman detail
//       router.push(`/pengeluaran/${created.id}`);
//     } catch (err: any) {
//       console.error(err);
//       toast({
//         title: "Gagal",
//         description:
//           typeof err?.message === "string"
//             ? err.message
//             : "Gagal menambah pengeluaran",
//         variant: "destructive",
//       });
//     }
//   };

//   const handleDelete = async (id: string) => {
//     await deleteExpense(id);
//     toast({
//       title: "Berhasil",
//       description: "Pengeluaran berhasil dihapus",
//     });
//   };

//   const formatCurrency = (amount: number) => {
//     return new Intl.NumberFormat("id-ID", {
//       style: "currency",
//       currency: "IDR",
//       minimumFractionDigits: 0,
//     }).format(amount);
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-indigo-100">
//       <div className="container mx-auto p-4 space-y-6">
//         <AuthGuard>
//           <AppShell>
//             <AppHeader title="Data Pengeluaran" />

//             {/* Header Controls */}
//             <GlassCard className="p-6">
//               <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
//                 <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
//                   <div className="space-y-2">
//                     <Label htmlFor="month">Bulan</Label>
//                     <Select
//                       value={selectedMonth}
//                       onValueChange={setSelectedMonth}
//                     >
//                       <SelectTrigger className="w-48">
//                         <SelectValue placeholder="Pilih bulan" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="2025-01">Januari 2025</SelectItem>
//                         <SelectItem value="2025-02">Februari 2025</SelectItem>
//                         <SelectItem value="2025-03">Maret 2025</SelectItem>
//                         <SelectItem value="2025-04">April 2025</SelectItem>
//                         <SelectItem value="2025-05">Mei 2025</SelectItem>
//                         <SelectItem value="2025-06">Juni 2025</SelectItem>
//                         <SelectItem value="2025-07">Juli 2025</SelectItem>
//                         <SelectItem value="2025-08">Agustus 2025</SelectItem>
//                         <SelectItem value="2025-09">September 2025</SelectItem>
//                         <SelectItem value="2025-10">Oktober 2025</SelectItem>
//                         <SelectItem value="2025-11">November 2025</SelectItem>
//                         <SelectItem value="2025-12">Desember 2025</SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>
//                 </div>

//                 <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
//                   <DialogTrigger asChild>
//                     <Button className="bg-teal-600 hover:bg-teal-700">
//                       <Plus className="h-4 w-4 mr-2" />
//                       Tambah Pengeluaran
//                     </Button>
//                   </DialogTrigger>
//                   <DialogContent className="sm:max-w-md">
//                     <DialogHeader>
//                       <DialogTitle>Tambah Pengeluaran</DialogTitle>
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
//                         />
//                       </div>
//                       <div className="space-y-2">
//                         <Label htmlFor="biaya">Biaya</Label>
//                         <Select
//                           value={formData.biaya}
//                           onValueChange={(value) =>
//                             setFormData((prev) => ({ ...prev, biaya: value }))
//                           }
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
//                         />
//                       </div>
//                     </div>
//                     <DialogFooter className="gap-2">
//                       <Button
//                         variant="outline"
//                         onClick={() => setIsModalOpen(false)}
//                       >
//                         Batal
//                       </Button>
//                       <Button
//                         onClick={handleAddExpense}
//                         className="bg-teal-600 hover:bg-teal-700"
//                       >
//                         Simpan
//                       </Button>
//                     </DialogFooter>
//                   </DialogContent>
//                 </Dialog>
//               </div>
//             </GlassCard>

//             {/* Desktop Table */}
//             <GlassCard className="hidden md:block">
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead className="w-16">No</TableHead>
//                     <TableHead>Tanggal</TableHead>
//                     <TableHead>Keterangan</TableHead>
//                     <TableHead>Nominal per Biaya</TableHead>
//                     <TableHead>Total</TableHead>
//                     <TableHead>Status</TableHead>
//                     <TableHead className="w-32">Aksi</TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {filteredExpenses.map((expense, index) => (
//                     <TableRow key={expense.id}>
//                       <TableCell>{index + 1}</TableCell>
//                       <TableCell>
//                         {new Date(
//                           expense.tanggalPengeluaran
//                         ).toLocaleDateString("id-ID")}
//                       </TableCell>
//                       <TableCell>
//                         <div className="space-y-1">
//                           {expense.details.map((detail) => (
//                             <div key={detail.id} className="text-sm">
//                               {detail.keterangan}
//                             </div>
//                           ))}
//                         </div>
//                       </TableCell>
//                       <TableCell>
//                         <div className="space-y-1">
//                           {expense.details.map((detail) => (
//                             <div key={detail.id} className="text-sm">
//                               {formatCurrency(detail.nominal)}
//                             </div>
//                           ))}
//                         </div>
//                       </TableCell>
//                       <TableCell className="font-semibold">
//                         {formatCurrency(expense.total)}
//                       </TableCell>
//                       <TableCell>
//                         <Badge
//                           variant={
//                             expense.status === "Close" ? "default" : "secondary"
//                           }
//                         >
//                           {expense.status}
//                         </Badge>
//                       </TableCell>
//                       <TableCell>
//                         <div className="flex gap-2">
//                           <Button asChild size="sm" variant="outline">
//                             <Link href={`/pengeluaran/${expense.id}`}>
//                               <Eye className="h-4 w-4" />
//                             </Link>
//                           </Button>
//                           <Button
//                             size="sm"
//                             variant="outline"
//                             onClick={() => handleDelete(expense.id)}
//                             className="text-red-600 hover:text-red-700"
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
//                     <TableCell colSpan={4} className="text-right font-semibold">
//                       Total Pengeluaran:
//                     </TableCell>
//                     <TableCell className="font-bold text-lg">
//                       {formatCurrency(totalPengeluaran)}
//                     </TableCell>
//                     <TableCell colSpan={2}></TableCell>
//                   </TableRow>
//                 </TableFooter>
//               </Table>
//             </GlassCard>

//             {/* Mobile Cards */}
//             <div className="md:hidden space-y-4">
//               {filteredExpenses.map((expense) => (
//                 <GlassCard key={expense.id} className="p-4">
//                   <div className="space-y-3">
//                     <div className="flex justify-between items-start">
//                       <div>
//                         <p className="font-semibold">
//                           {new Date(
//                             expense.tanggalPengeluaran
//                           ).toLocaleDateString("id-ID")}
//                         </p>
//                         <p className="text-sm text-muted-foreground">
//                           {expense.noBulan}
//                         </p>
//                       </div>
//                       <Badge
//                         variant={
//                           expense.status === "Close" ? "default" : "secondary"
//                         }
//                       >
//                         {expense.status}
//                       </Badge>
//                     </div>

//                     <div className="space-y-2">
//                       {expense.details.map((detail) => (
//                         <div
//                           key={detail.id}
//                           className="flex justify-between text-sm"
//                         >
//                           <span>{detail.keterangan}</span>
//                           <span className="font-medium">
//                             {formatCurrency(detail.nominal)}
//                           </span>
//                         </div>
//                       ))}
//                     </div>

//                     <div className="border-t pt-2 flex justify-between items-center">
//                       <span className="font-semibold">
//                         Total: {formatCurrency(expense.total)}
//                       </span>
//                       <div className="flex gap-2">
//                         <Button asChild size="sm" variant="outline">
//                           <Link href={`/pengeluaran/${expense.id}`}>
//                             <Eye className="h-4 w-4 mr-1" />
//                             Detail
//                           </Link>
//                         </Button>
//                         <Button
//                           size="sm"
//                           variant="outline"
//                           onClick={() => handleDelete(expense.id)}
//                           className="text-red-600 hover:text-red-700"
//                         >
//                           <Trash2 className="h-4 w-4 mr-1" />
//                           Hapus
//                         </Button>
//                       </div>
//                     </div>
//                   </div>
//                 </GlassCard>
//               ))}

//               <GlassCard className="p-4 bg-teal-50/50">
//                 <div className="text-center">
//                   <p className="text-sm text-muted-foreground">
//                     Total Pengeluaran
//                   </p>
//                   <p className="text-xl font-bold text-teal-700">
//                     {formatCurrency(totalPengeluaran)}
//                   </p>
//                 </div>
//               </GlassCard>
//             </div>
//           </AppShell>
//         </AuthGuard>
//       </div>
//     </div>
//   );
// }

// app/pengeluaran/page.tsx
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
        expense.tanggalPengeluaran.startsWith(selectedMonth)
      ),
    [expenses, selectedMonth]
  );

  const totalPengeluaran = useMemo(
    () => filteredExpenses.reduce((sum, expense) => sum + expense.total, 0),
    [filteredExpenses]
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

  const handleDelete = async (id: string) => {
    await deleteExpense(id);
    toast({ title: "Berhasil", description: "Pengeluaran berhasil dihapus" });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

  return (
    <AuthGuard>
      <AppShell>
        <div className="min-h-screen">
          <div className="container mx-auto p-4 space-y-6">
            <AppHeader title="Data Pengeluaran" />

            {/* Header Controls */}
            <GlassCard className="p-6 mb-6">
              {/* âŸµ tambah mb-6 */}
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
                        <SelectItem value="2025-01">Januari 2025</SelectItem>
                        <SelectItem value="2025-02">Februari 2025</SelectItem>
                        <SelectItem value="2025-03">Maret 2025</SelectItem>
                        <SelectItem value="2025-04">April 2025</SelectItem>
                        <SelectItem value="2025-05">Mei 2025</SelectItem>
                        <SelectItem value="2025-06">Juni 2025</SelectItem>
                        <SelectItem value="2025-07">Juli 2025</SelectItem>
                        <SelectItem value="2025-08">Agustus 2025</SelectItem>
                        <SelectItem value="2025-09">September 2025</SelectItem>
                        <SelectItem value="2025-10">Oktober 2025</SelectItem>
                        <SelectItem value="2025-11">November 2025</SelectItem>
                        <SelectItem value="2025-12">Desember 2025</SelectItem>
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
                        <Label htmlFor="biaya">Biaya</Label>
                        <Select
                          value={formData.biaya}
                          onValueChange={(value) =>
                            setFormData((prev) => ({ ...prev, biaya: value }))
                          }
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

            {/* Desktop Table â€” gaya laporan (garis horizontal, rapat, tanpa bg) */}
            <GlassCard className="hidden md:block mb-6 p-4">
              <div className="overflow-x-auto">
                <Table className="w-full border-collapse">
                  {/* Header: garis bawah tipis */}
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

                  {/* Body: setiap baris ada garis bawah tipis; tanpa hover bg */}
                  <TableBody>
                    {filteredExpenses.map((expense, index) => (
                      <TableRow
                        key={expense.id}
                        className="border-b border-gray-300"
                      >
                        <TableCell className="py-2">{index + 1}</TableCell>

                        <TableCell className="py-2 whitespace-nowrap">
                          {new Date(
                            expense.tanggalPengeluaran
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(expense.id)}
                              className="text-red-600 hover:text-red-700"
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
                            expense.tanggalPengeluaran
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
                          onClick={() => handleDelete(expense.id)}
                          className="text-red-600 hover:text-red-700"
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
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}

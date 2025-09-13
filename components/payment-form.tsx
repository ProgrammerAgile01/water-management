// "use client"

// import type React from "react"

// import { useState } from "react"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Textarea } from "@/components/ui/textarea"
// import { useToast } from "@/hooks/use-toast"
// import { useConfigStore } from "@/lib/config-store"
// import { WAButton } from "./wa-button"
// import { Upload, X, AlertTriangle } from "lucide-react"

// interface PaymentData {
//   // penting untuk API
//   tagihanId: string;

//   customerId: string;
//   customerName: string;
//   periode: string;
//   totalTagihan: number;
//   denda: number;
//   totalDenganDenda: number;

//   nominalBayar: string;   // input number sebagai string
//   metodeBayar: string;    // harus UPPERCASE: TUNAI/TRANSFER/EWALLET/QRIS
//   tanggalBayar: string;   // yyyy-mm-dd
//   keterangan: string;
//   buktiFile: File | null;
// }

// export function PaymentForm() {
//   const [isLoading, setIsLoading] = useState(false)
//   const [formData, setFormData] = useState<PaymentData>({
//     tagihanId: "",
//     customerId: "",
//     customerName: "",
//     periode: "",
//     totalTagihan: 0,
//     denda: 0,
//     totalDenganDenda: 0,
//     nominalBayar: "",
//     metodeBayar: "", // biarkan kosong (wajib dipilih)
//     tanggalBayar: new Date().toISOString().split("T")[0],
//     keterangan: "",
//     buktiFile: null,
//   })
//   const { toast } = useToast()
//   const { tarif } = useConfigStore()

//   const calculateLateFee = (jatuhTempo: string, tanggalBayar: string) => {
//     const dueDate = new Date(jatuhTempo)
//     const paymentDate = new Date(tanggalBayar)

//     if (paymentDate <= dueDate) {
//       return 0 // No late fee if paid on time
//     }

//     const diffTime = paymentDate.getTime() - dueDate.getTime()
//     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
//     const diffMonths = Math.floor(diffDays / 30)

//     if (diffMonths === 0) {
//       // First month late (1-30 days)
//       return tarif.dendaBulanPertama
//     } else if (diffMonths >= 1) {
//       // Second month or more late (31+ days)
//       return tarif.dendaBulanKedua
//     }

//     return 0
//   }

//   const handleCustomerSelect = (billId: string) => {
//     const selectedBill = mockUnpaidBills.find((bill) => bill.id === billId)
//     if (selectedBill) {
//       const denda = calculateLateFee(selectedBill.jatuhTempo, formData.tanggalBayar)
//       const totalDenganDenda = selectedBill.totalTagihan + denda

//       setFormData((prev) => ({
//         ...prev,
//         customerId: selectedBill.customerId,
//         customerName: selectedBill.customerName,
//         periode: selectedBill.periode,
//         totalTagihan: selectedBill.totalTagihan,
//         denda,
//         totalDenganDenda,
//         nominalBayar: totalDenganDenda.toString(),
//       }))
//     }
//   }

//   const handlePaymentDateChange = (tanggalBayar: string) => {
//     setFormData((prev) => {
//       if (prev.customerId) {
//         const selectedBill = mockUnpaidBills.find(
//           (bill) => bill.customerId === prev.customerId && bill.periode === prev.periode,
//         )
//         if (selectedBill) {
//           const denda = calculateLateFee(selectedBill.jatuhTempo, tanggalBayar)
//           const totalDenganDenda = prev.totalTagihan + denda
//           return {
//             ...prev,
//             tanggalBayar,
//             denda,
//             totalDenganDenda,
//             nominalBayar: totalDenganDenda.toString(),
//           }
//         }
//       }
//       return { ...prev, tanggalBayar }
//     })
//   }

//   const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0]
//     if (file) {
//       // Validate file type and size
//       const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"]
//       const maxSize = 5 * 1024 * 1024 // 5MB

//       if (!allowedTypes.includes(file.type)) {
//         toast({
//           title: "Format File Tidak Didukung",
//           description: "Hanya file JPG, PNG, atau PDF yang diizinkan",
//           variant: "destructive",
//         })
//         return
//       }

//       if (file.size > maxSize) {
//         toast({
//           title: "File Terlalu Besar",
//           description: "Ukuran file maksimal 5MB",
//           variant: "destructive",
//         })
//         return
//       }

//       setFormData((prev) => ({ ...prev, buktiFile: file }))
//     }
//   }

//   const handleRemoveFile = () => {
//     setFormData((prev) => ({ ...prev, buktiFile: null }))
//   }

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
//     setIsLoading(true)

//     try {
//       // Validate form
//       if (!formData.customerId || !formData.nominalBayar || !formData.metodeBayar) {
//         throw new Error("Mohon lengkapi semua field yang wajib diisi")
//       }

//       const nominalBayar = Number.parseFloat(formData.nominalBayar)
//       if (nominalBayar <= 0) {
//         throw new Error("Nominal pembayaran harus lebih dari 0")
//       }

//       // Simulate API call
//       await new Promise((resolve) => setTimeout(resolve, 1500))

//       // In real app, save payment data to database
//       console.log("Payment data:", {
//         ...formData,
//         nominalBayar,
//         buktiFile: formData.buktiFile?.name,
//       })

//       toast({
//         title: "Pelunasan Berhasil Dicatat",
//         description: `Pembayaran ${formData.customerName} sebesar Rp ${nominalBayar.toLocaleString("id-ID")} telah disimpan`,
//       })

//       // Reset form
//       setFormData({
//         customerId: "",
//         customerName: "",
//         periode: "",
//         totalTagihan: 0,
//         denda: 0,
//         totalDenganDenda: 0,
//         nominalBayar: "",
//         metodeBayar: "",
//         tanggalBayar: new Date().toISOString().split("T")[0],
//         keterangan: "",
//         buktiFile: null,
//       })
//     } catch (error) {
//       toast({
//         title: "Gagal Menyimpan Pelunasan",
//         description: error instanceof Error ? error.message : "Terjadi kesalahan",
//         variant: "destructive",
//       })
//     } finally {
//       setIsLoading(false)
//     }
//   }

//   const handleInputChange = (field: keyof PaymentData, value: string | number) => {
//     setFormData((prev) => ({ ...prev, [field]: value }))
//   }

//   return (
//     <form onSubmit={handleSubmit} className="space-y-6">
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         {/* Customer Selection */}
//         <div className="space-y-2">
//           <Label htmlFor="customer" className="text-base font-medium">
//             Pilih Tagihan *
//           </Label>
//           <Select onValueChange={handleCustomerSelect}>
//             <SelectTrigger className="h-12 bg-card/50">
//               <SelectValue placeholder="Pilih pelanggan dan periode..." />
//             </SelectTrigger>
//             <SelectContent>
//               {mockUnpaidBills.map((bill) => (
//                 <SelectItem key={bill.id} value={bill.id}>
//                   {bill.customerName} - {bill.periode} (Rp {bill.totalTagihan.toLocaleString("id-ID")})
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>

//         {/* Payment Method */}
//         <div className="space-y-2">
//           <Label htmlFor="metodeBayar" className="text-base font-medium">
//             Metode Pembayaran *
//           </Label>
//           <Select value={formData.metodeBayar} onValueChange={(value) => handleInputChange("metodeBayar", value)}>
//             <SelectTrigger className="h-12 bg-card/50">
//               <SelectValue placeholder="Pilih metode pembayaran..." />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="TUNAI">Tunai</SelectItem>
//               <SelectItem value="TRANSFER">Transfer Bank</SelectItem>
//               <SelectItem value="EWALLET">E-Wallet</SelectItem>
//               <SelectItem value="QRIS">QRIS</SelectItem>
//             </SelectContent>
//           </Select>
//         </div>

//         {/* Customer Info (Read-only) */}
//         <div className="space-y-2">
//           <Label className="text-base font-medium">Kode Customer</Label>
//           <Input
//             value={formData.customerId}
//             className="h-12 text-base bg-muted/50"
//             readOnly
//             placeholder="Akan terisi otomatis"
//           />
//         </div>

//         <div className="space-y-2">
//           <Label className="text-base font-medium">Periode</Label>
//           <Input
//             value={formData.periode}
//             className="h-12 text-base bg-muted/50"
//             readOnly
//             placeholder="Akan terisi otomatis"
//           />
//         </div>

//         {/* Payment Date - moved up to recalculate late fees */}
//         <div className="space-y-2">
//           <Label htmlFor="tanggalBayar" className="text-base font-medium">
//             Tanggal Bayar *
//           </Label>
//           <Input
//             id="tanggalBayar"
//             type="date"
//             value={formData.tanggalBayar}
//             onChange={(e) => handlePaymentDateChange(e.target.value)}
//             className="h-12 text-base"
//             required
//           />
//         </div>

//         {/* Payment Amount */}
//         <div className="space-y-2">
//           <Label htmlFor="totalTagihan" className="text-base font-medium">
//             Total Tagihan
//           </Label>
//           <Input
//             value={formData.totalTagihan ? `Rp ${formData.totalTagihan.toLocaleString("id-ID")}` : ""}
//             className="h-12 text-base bg-muted/50"
//             readOnly
//             placeholder="Akan terisi otomatis"
//           />
//         </div>
//       </div>

//       {formData.customerId && (
//         <div className="p-4 bg-yellow-50/50 border border-yellow-200/50 rounded-lg">
//           <div className="flex items-start gap-3">
//             <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
//             <div className="flex-1">
//               <h4 className="font-medium text-yellow-800 mb-2">Informasi Denda</h4>
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
//                 <div>
//                   <p className="text-yellow-700">Denda Keterlambatan:</p>
//                   <p className="font-bold text-yellow-800">
//                     {formData.denda > 0 ? `Rp ${formData.denda.toLocaleString("id-ID")}` : "Tidak ada denda"}
//                   </p>
//                 </div>
//                 <div>
//                   <p className="text-yellow-700">Total + Denda:</p>
//                   <p className="font-bold text-yellow-800">Rp {formData.totalDenganDenda.toLocaleString("id-ID")}</p>
//                 </div>
//                 <div>
//                   <p className="text-yellow-700">Aturan Denda:</p>
//                   <p className="text-xs text-yellow-600">
//                     Bulan ke-1: Rp {tarif.dendaBulanPertama.toLocaleString("id-ID")}
//                     <br />
//                     Bulan ke-2+: Rp {tarif.dendaBulanKedua.toLocaleString("id-ID")}
//                   </p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         <div className="space-y-2">
//           <Label htmlFor="nominalBayar" className="text-base font-medium">
//             Nominal Bayar *
//           </Label>
//           <Input
//             id="nominalBayar"
//             type="number"
//             placeholder="Masukkan nominal pembayaran"
//             value={formData.nominalBayar}
//             onChange={(e) => handleInputChange("nominalBayar", e.target.value)}
//             className="h-12 text-base"
//             required
//             min="0"
//           />
//         </div>
//       </div>

//       {/* File Upload */}
//       <div className="space-y-2">
//         <Label className="text-base font-medium">Bukti Pembayaran</Label>
//         <div className="border-2 border-dashed border-border/50 rounded-lg p-6">
//           {formData.buktiFile ? (
//             <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
//               <div className="flex items-center gap-3">
//                 <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
//                   <Upload className="w-5 h-5 text-primary" />
//                 </div>
//                 <div>
//                   <p className="font-medium text-foreground text-sm">{formData.buktiFile.name}</p>
//                   <p className="text-xs text-muted-foreground">
//                     {(formData.buktiFile.size / 1024 / 1024).toFixed(2)} MB
//                   </p>
//                 </div>
//               </div>
//               <Button type="button" variant="outline" size="sm" onClick={handleRemoveFile} className="bg-transparent">
//                 <X className="w-4 h-4" />
//               </Button>
//             </div>
//           ) : (
//             <div className="text-center">
//               <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
//               <p className="text-muted-foreground mb-2">Upload bukti pembayaran</p>
//               <p className="text-sm text-muted-foreground mb-4">JPG, PNG, atau PDF (Maks. 5MB)</p>
//               <input
//                 type="file"
//                 accept="image/*,.pdf"
//                 onChange={handleFileUpload}
//                 className="hidden"
//                 id="file-upload"
//               />
//               <Button type="button" variant="outline" asChild className="bg-transparent">
//                 <label htmlFor="file-upload" className="cursor-pointer">
//                   Pilih File
//                 </label>
//               </Button>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Notes */}
//       <div className="space-y-2">
//         <Label htmlFor="keterangan" className="text-base font-medium">
//           Keterangan
//         </Label>
//         <Textarea
//           id="keterangan"
//           placeholder="Catatan tambahan (opsional)"
//           value={formData.keterangan}
//           onChange={(e) => handleInputChange("keterangan", e.target.value)}
//           className="min-h-[80px] text-base resize-none"
//         />
//       </div>

//       {/* Submit Buttons */}
//       <div className="flex flex-col sm:flex-row gap-3 justify-end">
//         <Button type="submit" className="px-8 h-12 text-base" disabled={isLoading}>
//           {isLoading ? (
//             <div className="flex items-center gap-2">
//               <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
//               Menyimpan...
//             </div>
//           ) : (
//             "Simpan Pelunasan"
//           )}
//         </Button>

//         {formData.customerId && (
//           <WAButton
//             message={`Pembayaran tagihan air ${formData.periode} sebesar Rp ${formData.nominalBayar ? Number.parseFloat(formData.nominalBayar).toLocaleString("id-ID") : "0"} telah diterima. ${formData.denda > 0 ? `Termasuk denda keterlambatan Rp ${formData.denda.toLocaleString("id-ID")}.` : ""} Terima kasih atas pembayaran Anda.`}
//             phone="081234567890" // In real app, get from customer data
//             variant="outline"
//             className="px-8 h-12 text-base bg-transparent"
//           >
//             Kirim Konfirmasi WA
//           </WAButton>
//         )}
//       </div>
//     </form>
//   )
// }

"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useConfigStore } from "@/lib/config-store";
import { WAButton } from "./wa-button";
import { Upload, X, AlertTriangle } from "lucide-react";

type AppRole = "ADMIN" | "PETUGAS" | "WARGA";

type APITagihan = {
  id: string;
  pelangganId: string;
  pelangganKode?: string | null;
  pelangganNama: string;
  periode: string;           // "YYYY-MM"
  totalTagihan: number;
  tglJatuhTempo?: string | null; // ISO
  phone?: string | null;
};

interface PaymentData {
  tagihanId: string;

  customerId: string;
  customerName: string;
  periode: string;
  totalTagihan: number;
  denda: number;
  totalDenganDenda: number;

  nominalBayar: string;
  metodeBayar: string;      // TUNAI | TRANSFER | EWALLET | QRIS
  tanggalBayar: string;     // yyyy-mm-dd
  keterangan: string;
  buktiFile: File | null;

  phone?: string | null;    // opsional utk WAButton
}

function formatPeriode(yyyyMM: string) {
  try {
    const d = new Date(`${yyyyMM}-01T00:00:00`);
    return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  } catch {
    return yyyyMM;
  }
}

export function PaymentForm() {
  const { toast } = useToast();
  const { tarif } = useConfigStore();

  const [meRole, setMeRole] = useState<AppRole | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [tagihanList, setTagihanList] = useState<APITagihan[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<PaymentData>({
    tagihanId: "",
    customerId: "",
    customerName: "",
    periode: "",
    totalTagihan: 0,
    denda: 0,
    totalDenganDenda: 0,
    nominalBayar: "",
    metodeBayar: "",
    tanggalBayar: new Date().toISOString().split("T")[0],
    keterangan: "",
    buktiFile: null,
    phone: null,
  });

  // ====== fetch current user (role) ======
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        if (r.ok) {
          const data = await r.json();
          if (alive) setMeRole(data?.user?.role ?? null);
        }
      } catch {
        // biarkan null
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ====== fetch unpaid bills from API ======
  useEffect(() => {
    let alive = true;
    setListLoading(true);
    (async () => {
      try {
        // kalau perlu query: warga otomatis di server disaring berdasar sesi;
        // admin/petugas: ya tetap endpoint yang sama.
        const r = await fetch("/api/tagihan/unpaid", { cache: "no-store" });
        const data = await r.json();
        if (!r.ok || !Array.isArray(data?.items)) throw new Error(data?.message || "Gagal memuat tagihan");
        if (!alive) return;

        // normalisasi minimal field yang dipakai form
        const rows: APITagihan[] = data.items.map((t: any) => ({
          id: t.id,
          pelangganId: t.pelangganId,
          pelangganKode: t.pelanggan?.kode ?? t.pelangganKode ?? null,
          pelangganNama: t.pelanggan?.nama ?? t.pelangganNama ?? "-",
          periode: t.periode,
          totalTagihan: Number(t.totalTagihan ?? t.total ?? 0),
          tglJatuhTempo: t.tglJatuhTempo ?? t.due ?? null,
          phone: t.pelanggan?.wa ?? t.phone ?? null,
        }));
        setTagihanList(rows);
        console.log(rows)
      } catch (e: any) {
        toast({
          title: "Gagal memuat data",
          description: e?.message || "Tidak dapat mengambil daftar tagihan",
          variant: "destructive",
        });
      } finally {
        if (alive) setListLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [toast]);

  const calculateLateFee = (jatuhTempo: string | null | undefined, tanggalBayar: string) => {
    if (!jatuhTempo) return 0;
    const dueDate = new Date(jatuhTempo);
    const payDate = new Date(tanggalBayar);
    if (Number.isNaN(dueDate.getTime()) || Number.isNaN(payDate.getTime())) return 0;
    if (payDate <= dueDate) return 0;

    const diffDays = Math.ceil((payDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 0) return tarif.dendaBulanPertama;
    if (diffMonths >= 1) return tarif.dendaBulanKedua;
    return 0;
  };

  const handleSelectTagihan = (tagihanId: string) => {
    const t = tagihanList.find((x) => x.id === tagihanId);
    if (!t) return;

    const denda = calculateLateFee(t.tglJatuhTempo, formData.tanggalBayar);
    const totalDenganDenda = (t.totalTagihan || 0) + denda;

    setFormData((prev) => ({
      ...prev,
      tagihanId: t.id,
      customerId: t.pelangganKode || t.pelangganId,
      customerName: t.pelangganNama,
      periode: formatPeriode(t.periode),
      totalTagihan: t.totalTagihan,
      denda,
      totalDenganDenda,
      nominalBayar: String(totalDenganDenda),
      phone: t.phone ?? null,
    }));
  };

  const handlePaymentDateChange = (tanggalBayar: string) => {
    setFormData((prev) => {
      if (prev.tagihanId) {
        const t = tagihanList.find((x) => x.id === prev.tagihanId);
        if (t) {
          const denda = calculateLateFee(t.tglJatuhTempo, tanggalBayar);
          const totalDenganDenda = (t.totalTagihan || 0) + denda;
          return {
            ...prev,
            tanggalBayar,
            denda,
            totalDenganDenda,
            nominalBayar: String(totalDenganDenda),
          };
        }
      }
      return { ...prev, tanggalBayar };
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    const max = 5 * 1024 * 1024;
    if (!allowed.includes(file.type)) {
      return toast({ title: "Format tidak didukung", description: "Hanya JPG, PNG, atau PDF", variant: "destructive" });
    }
    if (file.size > max) {
      return toast({ title: "File terlalu besar", description: "Maksimal 5MB", variant: "destructive" });
    }
    setFormData((p) => ({ ...p, buktiFile: file }));
  };

  const handleInput = (field: keyof PaymentData, value: string | number) =>
    setFormData((p) => ({ ...p, [field]: value as any }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (!formData.tagihanId) throw new Error("Tagihan belum dipilih");
      if (!formData.metodeBayar) throw new Error("Metode pembayaran wajib dipilih");
      if (!formData.buktiFile) throw new Error("Wajib upload bukti pembayaran");

      const nominal = Number.parseFloat(formData.nominalBayar || "0");
      if (!Number.isFinite(nominal) || nominal <= 0) throw new Error("Nominal pembayaran tidak valid");

      const fd = new FormData();
      fd.set("tagihanId", formData.tagihanId);
      fd.set("nominalBayar", String(Math.round(nominal)));
      fd.set("tanggalBayar", formData.tanggalBayar);
      fd.set("metodeBayar", (formData.metodeBayar || "TUNAI").toUpperCase());
      fd.set("keterangan", formData.keterangan || "");
      if (formData.buktiFile) fd.set("buktiFile", formData.buktiFile);

      const r = await fetch("/api/pelunasan", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok || !data?.ok) throw new Error(data?.message || "Gagal menyimpan");

      toast({
        title: "Pelunasan tersimpan",
        description: `Rp ${nominal.toLocaleString("id-ID")} — ${formData.customerName}`,
      });

      // reset
      setFormData({
        tagihanId: "",
        customerId: "",
        customerName: "",
        periode: "",
        totalTagihan: 0,
        denda: 0,
        totalDenganDenda: 0,
        nominalBayar: "",
        metodeBayar: "",
        tanggalBayar: new Date().toISOString().split("T")[0],
        keterangan: "",
        buktiFile: null,
        phone: null,
      });

      // refresh list tagihan setelah bayar
      setTagihanList((prev) => prev.filter((t) => t.id !== formData.tagihanId));
    } catch (e: any) {
      toast({ title: "Gagal menyimpan", description: e?.message || "Terjadi kesalahan", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const waPhone = useMemo(() => formData.phone?.replace(/\D/g, "") || "", [formData.phone]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tagihan (Real API) */}
        <div className="space-y-2">
          <Label className="text-base font-medium">Pilih Tagihan *</Label>
          <Select
            value={formData.tagihanId || undefined}
            onValueChange={handleSelectTagihan}
            disabled={listLoading || tagihanList.length === 0}
          >
            <SelectTrigger className="h-12 bg-card/50">
              <SelectValue placeholder={listLoading ? "Memuat..." : "Pilih pelanggan & periode..."} />
            </SelectTrigger>
            <SelectContent>
              {tagihanList.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.pelangganNama} — {formatPeriode(t.periode)} (Rp {t.totalTagihan.toLocaleString("id-ID")})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {meRole === "WARGA" && (
            <p className="text-xs text-muted-foreground">Daftar di atas otomatis hanya menampilkan tagihan Anda.</p>
          )}
        </div>

        {/* Metode */}
        <div className="space-y-2">
          <Label className="text-base font-medium">Metode Pembayaran *</Label>
          <Select value={formData.metodeBayar} onValueChange={(v) => handleInput("metodeBayar", v)}>
            <SelectTrigger className="h-12 bg-card/50">
              <SelectValue placeholder="Pilih metode pembayaran..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TUNAI">Tunai</SelectItem>
              <SelectItem value="TRANSFER">Transfer Bank</SelectItem>
              <SelectItem value="EWALLET">E-Wallet</SelectItem>
              <SelectItem value="QRIS">QRIS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Info pelanggan */}
        <div className="space-y-2">
          <Label className="text-base font-medium">Kode Customer</Label>
          <Input value={formData.customerId} className="h-12 text-base bg-muted/50" readOnly placeholder="-" />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium">Periode</Label>
          <Input value={formData.periode} className="h-12 text-base bg-muted/50" readOnly placeholder="-" />
        </div>

        {/* Tanggal bayar */}
        <div className="space-y-2">
          <Label htmlFor="tanggalBayar" className="text-base font-medium">
            Tanggal Bayar *
          </Label>
          <Input
            id="tanggalBayar"
            type="date"
            value={formData.tanggalBayar}
            onChange={(e) => handlePaymentDateChange(e.target.value)}
            className="h-12 text-base"
            required
          />
        </div>

        {/* Total tagihan */}
        <div className="space-y-2">
          <Label className="text-base font-medium">Total Tagihan</Label>
          <Input
            value={formData.totalTagihan ? `Rp ${formData.totalTagihan.toLocaleString("id-ID")}` : ""}
            className="h-12 text-base bg-muted/50"
            readOnly
            placeholder="-"
          />
        </div>
      </div>

      {formData.tagihanId && (
        <div className="p-4 bg-yellow-50/50 border border-yellow-200/50 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-yellow-800 mb-2">Informasi Denda</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-yellow-700">Denda Keterlambatan:</p>
                  <p className="font-bold text-yellow-800">
                    {formData.denda > 0 ? `Rp ${formData.denda.toLocaleString("id-ID")}` : "Tidak ada denda"}
                  </p>
                </div>
                <div>
                  <p className="text-yellow-700">Total + Denda (jika ada):</p>
                  <p className="font-bold text-yellow-800">Rp {formData.totalDenganDenda.toLocaleString("id-ID")}</p>
                </div>
                <div>
                  <p className="text-yellow-700">Aturan Denda:</p>
                  <p className="text-xs text-yellow-600">
                    Bulan ke-1: Rp {tarif.dendaBulanPertama.toLocaleString("id-ID")}
                    <br />
                    Bulan ke-2+: Rp {tarif.dendaBulanKedua.toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="nominalBayar" className="text-base font-medium">
            Nominal Bayar *
          </Label>
          <Input
            id="nominalBayar"
            type="number"
            placeholder="Masukkan nominal pembayaran"
            value={formData.nominalBayar}
            onChange={(e) => handleInput("nominalBayar", e.target.value)}
            className="h-12 text-base"
            required
            min="0"
          />
        </div>
      </div>

      {/* Upload bukti */}
      <div className="space-y-2">
        <Label className="text-base font-medium">Bukti Pembayaran</Label>
        <div className="border-2 border-dashed border-border/50 rounded-lg p-6">
          {formData.buktiFile ? (
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">{formData.buktiFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(formData.buktiFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setFormData((p) => ({ ...p, buktiFile: null }))} className="bg-transparent">
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">Upload bukti pembayaran</p>
              <p className="text-sm text-muted-foreground mb-4">JPG, PNG, atau PDF (Maks. 5MB)</p>
              <input id="file-upload" type="file" accept="image/jpeg,image/png,application/pdf" onChange={handleFileUpload} className="hidden" />
              <Button type="button" variant="outline" asChild className="bg-transparent">
                <label htmlFor="file-upload" className="cursor-pointer">
                  Pilih File
                </label>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Catatan */}
      <div className="space-y-2">
        <Label htmlFor="keterangan" className="text-base font-medium">
          Keterangan
        </Label>
        <Textarea
          id="keterangan"
          placeholder="Catatan tambahan (opsional)"
          value={formData.keterangan}
          onChange={(e) => handleInput("keterangan", e.target.value)}
          className="min-h-[80px] text-base resize-none"
        />
      </div>

      {/* Aksi */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <Button type="submit" className="px-8 h-12 text-base" disabled={isSaving}>
          {isSaving ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Menyimpan...
            </div>
          ) : (
            "Simpan Pelunasan"
          )}
        </Button>

        {/* {!!waPhone && (
          <WAButton
            message={`Pembayaran tagihan air ${formData.periode} sebesar Rp ${
              formData.nominalBayar ? Number.parseFloat(formData.nominalBayar).toLocaleString("id-ID") : "0"
            } telah diterima. ${
              formData.denda > 0 ? `Termasuk denda keterlambatan Rp ${formData.denda.toLocaleString("id-ID")}. ` : ""
            }Terima kasih.`}
            phone={waPhone}
            variant="outline"
            className="px-8 h-12 text-base bg-transparent"
          >
            Kirim Konfirmasi WA
          </WAButton>
        )} */}
      </div>
    </form>
  );
}

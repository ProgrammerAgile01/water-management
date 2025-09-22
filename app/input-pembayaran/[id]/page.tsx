"use client";

import type React from "react";
import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  Plus,
  X,
  QrCode,
  Banknote,
  Landmark,
  Wallet,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ApprovePaymentModal } from "@/components/approve-payment-modal";
// NEW: import modal konfirmasi upload
import { ConfirmUploadModal } from "@/components/confirm-upload-modal";

type AppRole = "ADMIN" | "PETUGAS" | "WARGA";
type Metode = "TUNAI" | "TRANSFER" | "EWALLET" | "QRIS";

type TagihanDetail = {
  id: string;
  pelangganId: string;
  pelangganKode: string | null;
  pelangganNama: string;
  phone: string | null;
  periode: string; // "YYYY-MM"
  tarifPerM3: number;
  abonemen: number;
  denda: number;
  totalTagihan: number;
  tagihanLalu: number;
  totalDue: number;
  dibayar: number;
  sisaKurang: number;

  statusBayar: "PAID" | "UNPAID";
  statusVerif: "VERIFIED" | "UNVERIFIED";
  tglJatuhTempo: string | null;
  meterAwal: number | null;
  meterAkhir: number | null;
  pemakaianM3: number | null;
};

type PembayaranLite = {
  id: string;
  tanggalBayar: string;
  jumlahBayar: number;
  buktiUrl: string | null;
  metode: Metode;
  adminBayar: string | null;
  keterangan: string | null;
};

export default function InputPembayaranPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [t, setT] = useState<TagihanDetail | null>(null);

  // pembayaran dari DB (kalau sudah pernah upload)
  const [payDB, setPayDB] = useState<PembayaranLite | null>(null);
  const [loadingPay, setLoadingPay] = useState(true);

  // form
  const [tanggalBayar, setTanggalBayar] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [metode, setMetode] = useState<Metode>("TUNAI");
  const [keterangan, setKeterangan] = useState("");

  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  // modal approve
  const [openApprove, setOpenApprove] = useState(false);
  const [loadingApprove, setLoadingApprove] = useState(false);

  // nominal bayar
  const [nominalBayar, setNominalBayar] = useState<string>("");

  // NEW: modal konfirmasi upload
  const [openConfirmUpload, setOpenConfirmUpload] = useState(false);
  const [loadingUpload, setLoadingUpload] = useState(false);

  // Prefill nominal (sekali)
  useEffect(() => {
    if (!t) return;
    if (nominalBayar !== "") return;

    if (payDB?.jumlahBayar && payDB.jumlahBayar > 0) {
      setNominalBayar(String(payDB.jumlahBayar));
      if (payDB?.tanggalBayar) {
        const iso = toISODate(payDB.tanggalBayar);
        if (iso) setTanggalBayar(iso);
      }
      if (payDB.metode) setMetode(payDB.metode);
      return;
    }
  }, [t, payDB, nominalBayar]);

  // role
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        if (r.ok) {
          const data = await r.json();
          setRole(data?.user?.role ?? null);
        }
      } catch {}
    })();
  }, []);

  // load tagihan
  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const r = await fetch(`/api/tagihan/${id}`, { cache: "no-store" });
        const data = await r.json();
        if (!r.ok || !data?.ok)
          throw new Error(data?.message || "Gagal mengambil tagihan");
        if (!alive) return;
        setT(data.tagihan);
      } catch (e: any) {
        toast({
          title: "Error",
          description: e?.message || "Tagihan tidak ditemukan",
          variant: "destructive",
        });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, toast]);

  // load pembayaran terbaru utk tagihan ini
  const refetchPembayaran = async (tagihanId: string) => {
    setLoadingPay(true);
    try {
      const r = await fetch(
        `/api/pembayaran/by-tagihan?tagihanId=${encodeURIComponent(tagihanId)}`,
        { cache: "no-store" }
      );
      const d = await r.json();
      if (r.ok && d?.ok) {
        setPayDB(d.pembayaran);
        if (d.pembayaran?.metode) setMetode(d.pembayaran.metode as Metode);
      }
    } finally {
      setLoadingPay(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    refetchPembayaran(String(id));
  }, [id]);

  // --- helpers tanggal ---
  function toISODate(s: string): string {
    if (!s) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (m) {
      const dd = Number(m[1]);
      const mm = Number(m[2]);
      const yyyy = Number(m[3]);
      const d = new Date(yyyy, mm - 1, dd);
      if (!isNaN(+d))
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          "0"
        )}-${String(d.getDate()).padStart(2, "0")}`;
    }
    const d = new Date(s);
    if (!isNaN(+d)) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}`;
    }
    return "";
  }

  // preview gambar / bukti
  const onPickProof = () => {
    document.getElementById("bukti")?.click();
  };

  const onChangeProof = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = "";
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    const max = 5 * 1024 * 1024; // 5MB

    if (!allowed.includes(file.type)) {
      toast({
        title: "Format tidak didukung",
        description: "Hanya JPG, PNG, atau PDF yang diizinkan.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > max) {
      toast({
        title: "File terlalu besar",
        description: "Ukuran maksimum 5MB.",
        variant: "destructive",
      });
      return;
    }

    if (proofPreview) URL.revokeObjectURL(proofPreview);
    const url = URL.createObjectURL(file);
    setPaymentProof(file);
    setProofPreview(url);
  };

  const removeProof = () => {
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setPaymentProof(null);
    setProofPreview(null);
  };

  useEffect(
    () => () => {
      if (proofPreview) URL.revokeObjectURL(proofPreview);
    },
    [proofPreview]
  );

  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n);

  function renderSisaKurang(n: number) {
    if (n > 0) {
      return <span className="text-red-600">Kurang {fmt(n)}</span>;
    }
    if (n < 0) {
      return <span className="text-green-600">Sisa {fmt(-n)}</span>;
    }
    return <span className="text-green-600">Rp 0</span>;
  }

  const totalBayar = t?.totalTagihan ?? 0;

  // lock form kalau sudah PAID dan misal ditambah or Verified
  const lockForm = t?.statusBayar === "PAID";

  // === SUBMIT HANDLERS ===

  // NEW: validasi ringan sebelum buka modal
  const handleClickSimpan = () => {
    try {
      if (!t) throw new Error("Tagihan tidak ditemukan");
      const nominal = Number(nominalBayar || 0);
      if (!paymentProof) throw new Error("Wajib upload bukti pembayaran");
      if (!nominal || nominal <= 0)
        throw new Error("Nominal bayar harus diisi dan lebih dari 0");
      if (!metode) throw new Error("Pilih metode pembayaran");
      setOpenConfirmUpload(true);
    } catch (e: any) {
      toast({
        title: "Gagal",
        description: e?.message || "Lengkapi data pembayaran terlebih dahulu",
        variant: "destructive",
      });
    }
  };

  // NEW: proses upload (dipanggil setelah konfirmasi)
  const performUpload = async () => {
    try {
      const nominal = Number(nominalBayar || 0);
      if (!t) throw new Error("Tagihan tidak ditemukan");
      if (!paymentProof) throw new Error("Bukti pembayaran belum dipilih");

      const fd = new FormData();
      fd.set("tagihanId", t.id);
      fd.set("nominalBayar", String(nominal));
      fd.set("tanggalBayar", tanggalBayar);
      fd.set("metodeBayar", metode);
      fd.set("keterangan", keterangan);
      fd.set("buktiFile", paymentProof);

      const r = await fetch("/api/pelunasan", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok || !data?.ok)
        throw new Error(data?.message || "Gagal menyimpan");

      toast({
        title: "Berhasil",
        description: "Bukti tersimpan & status tagihan ter-update.",
      });

      await refetchPembayaran(t.id);
      setT((prev) =>
        prev ? ({ ...prev, statusBayar: "PAID" } as TagihanDetail) : prev
      );
      removeProof();

      router.replace("/tagihan-pembayaran");
    } catch (e: any) {
      toast({
        title: "Gagal",
        description: e?.message || "Terjadi kesalahan",
        variant: "destructive",
      });
      throw e;
    }
  };

  // NEW: konfirmasi dari modal → jalankan performUpload
  async function handleConfirmUpload() {
    try {
      setLoadingUpload(true);
      await performUpload();
    } finally {
      setLoadingUpload(false);
      setOpenConfirmUpload(false);
    }
  }

  // approve (modal yang sudah ada)
  const summary = t && {
    tagihanId: t.id,
    pelangganNama: t.pelangganNama,
    pelangganKode: t.pelangganKode,
    periode: t.periode,
    totalTagihan: t.totalTagihan,
    tanggalBayar,
    metodeBayar: metode,
    keterangan,
  };

  async function handleConfirmApprove() {
    try {
      setLoadingApprove(true);
      if (!t) return;
      const r = await fetch(`/api/tagihan/${t.id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE", sendWa: true }),
      });
      const data = await r.json();
      if (!r.ok || !data?.ok) throw new Error(data?.message || "Gagal approve");
      toast({
        title: "Approved",
        description: "Status verifikasi diset ke VERIFIED.",
      });
      setT((prev) =>
        prev ? ({ ...prev, statusVerif: "VERIFIED" } as TagihanDetail) : prev
      );
      router.replace("/tagihan-pembayaran");
    } catch (e: any) {
      toast({
        title: "Gagal",
        description: e?.message || "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setLoadingApprove(false);
      setOpenApprove(false);
    }
  }

  // NEW: data ringkasan untuk modal konfirmasi upload
  const confirmData =
    t && paymentProof
      ? {
          pelangganNama: t.pelangganNama,
          pelangganKode: t.pelangganKode,
          periode: t.periode,
          nominal: Number(nominalBayar || 0),
          metodeBayar: metode as Metode,
          tanggalBayar,
          fileName: paymentProof?.name || null,
          note: keterangan || null,
        }
      : null;

  return (
    <div className="space-y-6">
      <AuthGuard requiredRole={["ADMIN", "WARGA"]}>
        <AppShell>
          <AppHeader title="Input Pembayaran" />

          {loading && (
            <GlassCard className="p-6 text-center">Memuat…</GlassCard>
          )}
          {!loading && !t && (
            <GlassCard className="p-6 text-center">
              Tagihan tidak ditemukan
            </GlassCard>
          )}

          {!loading && t && (
            <>
              {/* Tagihan Info */}
              <GlassCard className="p-6 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary rounded flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="font-semibold text-foreground text-lg">
                      Tagihan Air Periode{" "}
                      {new Date(`${t.periode}-01`).toLocaleDateString("id-ID", {
                        month: "long",
                        year: "numeric",
                      })}
                    </h2>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Nama:</span>{" "}
                        <span className="font-medium">{t.pelangganNama}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">
                          Kode Pelanggan:
                        </span>{" "}
                        <span className="font-medium">{t.pelangganKode}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* MAIN GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* KIRI */}
                <div className="space-y-4">
                  <GlassCard className="p-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-foreground text-lg mb-2">
                          Total Tagihan
                        </h3>
                        <p className="text-2xl font-bold text-foreground">
                          {fmt(t.totalDue)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Jatuh Tempo{" "}
                          {t.tglJatuhTempo
                            ? new Date(t.tglJatuhTempo).toLocaleDateString(
                                "id-ID",
                                {
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric",
                                }
                              )
                            : "-"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Status:{" "}
                          <span
                            className={
                              t.statusBayar === "PAID"
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {t.statusBayar === "PAID"
                              ? "Dibayar"
                              : "Belum Dibayar"}
                          </span>
                          {" | "}
                          <span
                            className={
                              t.statusVerif === "VERIFIED"
                                ? "text-green-600"
                                : "text-orange-600"
                            }
                          >
                            {t.statusVerif === "VERIFIED"
                              ? "Diverifikasi"
                              : "Menunggu verifikasi admin"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-6">
                    <h3 className="font-semibold text-foreground mb-4">
                      Rincian
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Meter Awal / Akhir:
                        </span>
                        <span className="font-medium">
                          {t.meterAwal} / {t.meterAkhir}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Pemakaian:
                        </span>
                        <span className="font-medium">{t.pemakaianM3} m³</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tarif/m³:</span>
                        <span className="font-medium">{fmt(t.tarifPerM3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Abonemen:</span>
                        <span className="font-medium">{fmt(t.abonemen)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Tagihan Lalu (+/−):
                        </span>
                        <span>{renderSisaKurang(t.tagihanLalu)}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Tagihan Bulan Ini:
                        </span>
                        <span className="font-medium">
                          {fmt(t.totalTagihan)}
                        </span>
                      </div>

                      <div className="border-t border-border/20 pt-2 flex justify-between">
                        <span className="font-semibold">Total Bayar:</span>
                        <span className="font-bold text-lg">
                          {fmt(t.totalDue)}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Sudah Dibayar:
                        </span>
                        <span className="font-medium">{fmt(t.dibayar)}</span>
                      </div>

                      <div className="border-t border-border/20 pt-2 flex justify-between">
                        <span className="font-semibold">
                          Sisa/Kurang (+/−):
                        </span>
                        <span
                          className={`font-bold text-lg ${
                            t.sisaKurang > 0
                              ? "text-red-600"
                              : t.sisaKurang < 0
                              ? "text-green-600"
                              : ""
                          }`}
                        >
                          {renderSisaKurang(t.sisaKurang)}
                        </span>
                      </div>
                    </div>
                  </GlassCard>
                </div>

                {/* KANAN */}
                <div className="space-y-4">
                  <GlassCard className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-foreground">
                          Unggah Bukti Pembayaran
                        </h3>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label
                            htmlFor="payment-date"
                            className="text-sm font-medium"
                          >
                            Tanggal Pembayaran
                          </Label>
                          <Input
                            id="payment-date"
                            type="date"
                            value={tanggalBayar}
                            onChange={(e) => setTanggalBayar(e.target.value)}
                            className="mt-1"
                            readOnly
                          />
                        </div>

                        <div>
                          <Label
                            htmlFor="nominal"
                            className="text-sm font-medium"
                          >
                            Nominal Bayar
                            <span className="text-red-600">*</span>
                          </Label>
                          <Input
                            id="nominal"
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={nominalBayar}
                            onChange={(e) => setNominalBayar(e.target.value)}
                            className="mt-1"
                            disabled={lockForm}
                            placeholder="Masukkan jumlah yang dibayar"
                            required
                          />
                          <p className="mt-1 text-xs text-muted-foreground">
                            *format tanpa titik, contoh: 20000
                          </p>
                        </div>

                        {/* Metode Pembayaran */}
                        <div className="space-y-2">
                          <Label className="text-base font-medium">
                            Metode Pembayaran
                            <span className="text-red-600">*</span>
                          </Label>

                          <RadioGroup
                            value={metode}
                            onValueChange={(val) => setMetode(val as Metode)}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                            disabled={lockForm}
                          >
                            <label className="flex items-start gap-3 rounded-xl border bg-card/50 p-3 cursor-pointer hover:bg-muted/40 transition data-[state=checked]:border-primary data-[state=checked]:bg-primary/5 data-[state=checked]:ring-1 data-[state=checked]:ring-primary/60">
                              <RadioGroupItem
                                value="TUNAI"
                                id="metode-tunai"
                                className="mt-1"
                              />
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5">
                                  <Banknote className="w-5 h-5 text-foreground/80" />
                                </div>
                                <div>
                                  <div className="font-medium text-foreground">
                                    Tunai
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Bayar langsung
                                  </div>
                                </div>
                              </div>
                            </label>

                            <label className="flex items-start gap-3 rounded-xl border bg-card/50 p-3 cursor-pointer hover:bg-muted/40 transition data-[state=checked]:border-primary data-[state=checked]:bg-primary/5 data-[state=checked]:ring-1 data-[state=checked]:ring-primary/60">
                              <RadioGroupItem
                                value="TRANSFER"
                                id="metode-transfer"
                                className="mt-1"
                              />
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5">
                                  <Landmark className="w-5 h-5 text-foreground/80" />
                                </div>
                                <div>
                                  <div className="font-medium text-foreground">
                                    Transfer Bank
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    BCA/BRI/mandiri, dll.
                                  </div>
                                </div>
                              </div>
                            </label>

                            <label className="flex items-start gap-3 rounded-xl border bg-card/50 p-3 cursor-pointer hover:bg-muted/40 transition data-[state=checked]:border-primary data-[state=checked]:bg-primary/5 data-[state=checked]:ring-1 data-[state=checked]:ring-primary/60">
                              <RadioGroupItem
                                value="EWALLET"
                                id="metode-ewallet"
                                className="mt-1"
                              />
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5">
                                  <Wallet className="w-5 h-5 text-foreground/80" />
                                </div>
                                <div>
                                  <div className="font-medium text-foreground">
                                    E-Wallet
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    OVO/DANA/GoPay, dll.
                                  </div>
                                </div>
                              </div>
                            </label>

                            <label className="flex items-start gap-3 rounded-xl border bg-card/50 p-3 cursor-pointer hover:bg-muted/40 transition data-[state=checked]:border-primary data-[state=checked]:bg-primary/5 data-[state=checked]:ring-1 data-[state=checked]:ring-primary/60">
                              <RadioGroupItem
                                value="QRIS"
                                id="metode-qris"
                                className="mt-1"
                              />
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5">
                                  <QrCode className="w-5 h-5 text-foreground/80" />
                                </div>
                                <div>
                                  <div className="font-medium text-foreground">
                                    QRIS
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Scan semua e-wallet
                                  </div>
                                </div>
                              </div>
                            </label>
                          </RadioGroup>
                        </div>

                        <div>
                          <Label htmlFor="bukti" className="text-sm font-medium">
                            Bukti Pembayaran
                            <span className="text-red-600">*</span>
                          </Label>
                          <div className="mt-1">
                            <input
                              id="bukti"
                              type="file"
                              accept="image/jpeg,image/png,application/pdf"
                              onChange={onChangeProof}
                              className="hidden"
                              disabled={lockForm}
                            />

                            {payDB?.buktiUrl ? (
                              <div className="p-3 border rounded-lg bg-muted/20">
                                {payDB.buktiUrl.toLowerCase().endsWith(".pdf") ? (
                                  <object
                                    data={payDB.buktiUrl}
                                    type="application/pdf"
                                    className="w-full h-60 rounded-md border"
                                  />
                                ) : (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={payDB.buktiUrl}
                                    alt="Bukti pembayaran"
                                    className="w-full h-60 object-contain rounded-md bg-background"
                                  />
                                )}
                              </div>
                            ) : proofPreview ? (
                              <div className="p-3 border rounded-lg bg-muted/20">
                                {paymentProof?.type.startsWith("image/") ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={proofPreview}
                                    alt="Bukti pembayaran"
                                    className="w-full h-60 object-contain rounded-md bg-background"
                                  />
                                ) : (
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm">
                                      <p className="font-medium">File PDF terunggah</p>
                                      <p className="text-muted-foreground">
                                        {paymentProof?.name}
                                      </p>
                                    </div>
                                    <a
                                      href={proofPreview}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="underline text-primary text-sm"
                                    >
                                      Buka PDF
                                    </a>
                                  </div>
                                )}
                                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                                  <span>
                                    {paymentProof?.name} •{" "}
                                    {(Number(paymentProof?.size || 0) / 1024 / 1024).toFixed(2)} MB
                                  </span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={removeProof}
                                    className="bg-transparent"
                                  >
                                    <X className="w-4 h-4 mr-1" /> Hapus
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                onClick={onPickProof}
                                className="w-full h-32 border-2 border-dashed border-border/50 hover:border-border bg-transparent"
                                type="button"
                                disabled={lockForm}
                              >
                                <div className="text-center">
                                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                  <p className="text-sm text-muted-foreground text-wrap">
                                    Klik untuk upload bukti pembayaran (JPG/PNG/PDF)
                                  </p>
                                </div>
                              </Button>
                            )}
                          </div>

                          <div className="mt-4">
                            <Label className="text-sm font-medium">
                              Keterangan (opsional)
                            </Label>
                            <Input
                              value={keterangan}
                              onChange={(e) => setKeterangan(e.target.value)}
                              className="mt-1"
                              disabled={lockForm}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Tombol Simpan */}
                  <div className="pb-6 md:pb-0">
                    <Button
                      onClick={handleClickSimpan} // NEW: buka modal konfirmasi
                      className="w-full h-12 text-base font-semibold"
                      disabled={
                        lockForm || !paymentProof || !metode || !nominalBayar
                      }
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {lockForm ? "Sudah Diupload" : "Upload & Simpan"}
                    </Button>

                    {role === "ADMIN" && (
                      <Button
                        variant="outline"
                        onClick={() => setOpenApprove(true)}
                        className="w-full h-12 text-base border-accent hover:bg-primary bg-transparent text-black hover:text-white mt-3.5"
                        disabled={t.statusVerif === "VERIFIED"}
                      >
                        {t.statusVerif === "VERIFIED"
                          ? "APPROVED"
                          : "Approve Pembayaran"}
                      </Button>
                    )}

                    {/* Modal approve (yang sudah ada) */}
                    <ApprovePaymentModal
                      open={openApprove}
                      onClose={() => setOpenApprove(false)}
                      onConfirm={handleConfirmApprove}
                      isLoading={loadingApprove}
                      data={summary}
                    />

                    {/* NEW: Modal konfirmasi upload */}
                    <ConfirmUploadModal
                      open={openConfirmUpload}
                      onClose={() => setOpenConfirmUpload(false)}
                      onConfirm={handleConfirmUpload}
                      isLoading={loadingUpload}
                      data={confirmData}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </AppShell>
      </AuthGuard>
    </div>
  );
}

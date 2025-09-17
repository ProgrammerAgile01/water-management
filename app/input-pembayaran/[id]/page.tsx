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
  totalTagihan: number; // = tagihan bulan ini
  tagihanLalu: number; // (+/-) baru
  totalDue: number; // baru = tagihanLalu + totalTagihan
  dibayar: number; // baru (akumulasi pembayaran)
  sisaKurang: number; // baru (totalDue - dibayar)

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
  // const [denda1, setDenda1] = useState(0);
  // const [denda2, setDenda2] = useState(0);

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

  // Set default nominal setelah data tagihan terbaca / pembayaran diambil
  useEffect(() => {
    if (!t) return;
    // default: kalau masih ada kekurangan → isi sisaKurang; kalau tidak → isi totalDue
    const def =
      Math.max(t.sisaKurang ?? 0, 0) || (t.totalDue ?? t.totalTagihan);
    setNominalBayar(String(def || 0));
  }, [t]);

  // role dari /api/auth/me (AuthGuard juga akan set localStorage)
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
        // setDenda1(data.dendaFirstMonth || 0);
        // setDenda2(data.dendaNextMonths || 0);
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

  // ===== load pembayaran terbaru utk tagihan ini =====
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

  // helper tanggalan
  // parse "dd/mm/yyyy" -> Date
  function parseTanggalDMY(s: string): Date | null {
    const [dd, mm, yyyy] = s.split(/[/-]/).map(Number);
    if (!dd || !mm || !yyyy) return null;
    const d = new Date(yyyy, mm - 1, dd);
    // validasi sederhana
    return d.getMonth() === mm - 1 ? d : null;
  }

  // format ke "15 Juli 2025" atau "Selasa, 15 Juli 2025"
  function formatTanggalID(input: string | Date, withWeekday = false): string {
    const d = typeof input === "string" ? parseTanggalDMY(input) : input;
    if (!d) return "";
    const opts: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "long",
      year: "numeric",
      ...(withWeekday ? { weekday: "long" } : {}),
    };
    return d.toLocaleDateString("id-ID", opts);
  }

  // hitung denda dinamis (client) berdasar tanggal input
  // const dendaHitung = useMemo(() => {
  //   if (!t?.tglJatuhTempo) return 0;
  //   const due = new Date(t.tglJatuhTempo);
  //   const pay = new Date(tanggalBayar);
  //   if (!(due instanceof Date) || !(pay instanceof Date)) return 0;
  //   if (pay <= due) return 0;
  //   const diffDays = Math.ceil((+pay - +due) / (1000 * 60 * 60 * 24));
  //   const diffMonths = Math.floor(diffDays / 30);
  //   if (diffMonths === 0) return denda1;
  //   return denda2;
  // }, [t?.tglJatuhTempo, tanggalBayar, denda1, denda2]);

  // const totalPlusDenda = (t?.totalTagihan ?? 0) + dendaHitung;

  const totalBayar = t?.totalTagihan ?? 0;

  // ===== lock form kalau sudah APPROVE / VERIVIED =====
  const lockForm = t?.statusVerif === "VERIFIED";

  const onSubmit = async () => {
    try {
      const nominal = Number(nominalBayar || 0);

      if (!t) throw new Error("Tagihan tidak ditemukan");
      if (!metode) throw new Error("Pilih metode pembayaran");
      if (!paymentProof) throw new Error("Wajib upload bukti pembayaran");
      if (!nominal || nominal <= 0)
        throw new Error("Nominal bayar harus diisi dan lebih dari 0");

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

      // refetch pembayaran → kunci form + tampilkan preview dari server
      await refetchPembayaran(t.id);
      // opsional: update statusBayar lokal jika sudah lunas
      setT((prev) =>
        prev ? ({ ...prev, statusBayar: "PAID" } as TagihanDetail) : prev
      );

      // bersihka preview lokal
      removeProof();

      // redirect kemana
      if (role === "ADMIN") {
        router.replace("/tagihan-pembayaran");
      } else {
        router.replace("/warga-dashboard");
      }
    } catch (e: any) {
      toast({
        title: "Gagal",
        description: e?.message || "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  };

  // approve
  const summary = t && {
    tagihanId: t.id,
    pelangganNama: t.pelangganNama,
    pelangganKode: t.pelangganKode,
    periode: t.periode,
    totalTagihan: t.totalTagihan, // tanpa denda
    tanggalBayar, // state dari formmu
    metodeBayar: metode, // state dari formmu
    keterangan, // state dari formmu
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
      // reload status verif
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

  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n);

  // format sisa kurang
  // helper format sisa kurang
  function renderSisaKurang(n: number) {
    if (n > 0) {
      return <span className="text-red-600">Kurang {fmt(n)}</span>;
    }
    if (n < 0) {
      return <span className="text-green-600">Lebih {fmt(-n)}</span>;
    }
    return <span className="text-green-600">Lunas</span>;
  }

  // preview gambar / bukti
  const onPickProof = () => {
    document.getElementById("bukti")?.click();
  };

  const onChangeProof = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // supaya bisa pilih file yang sama lagi setelah dihapus
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

    // bersihkan preview lama
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

  // cleanup saat unmount
  useEffect(
    () => () => {
      if (proofPreview) URL.revokeObjectURL(proofPreview);
    },
    [proofPreview]
  );

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

              {/* MAIN GRID: md => 2 kolom */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* KIRI: Total Tagihan + Rincian (rincian di bawah total untuk desktop) */}
                <div className="space-y-4">
                  {/* Total Tagihan */}
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
                          {formatTanggalID(
                            t.tglJatuhTempo
                              ? new Date(t.tglJatuhTempo).toLocaleDateString(
                                  "id-ID"
                                )
                              : "-"
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Status:{" "}
                          <span
                            className={`${
                              t.statusBayar === "PAID"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {t.statusBayar === "PAID"
                              ? "Dibayar"
                              : "Belum Dibayar"}
                          </span>
                          {" | "}
                          <span
                            className={`${
                              t.statusVerif === "VERIFIED"
                                ? "text-green-600"
                                : "text-orange-600"
                            }`}
                          >
                            {t.statusVerif === "VERIFIED"
                              ? "Diverifikasi"
                              : "Menunggu verifikasi admin"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Rincian */}
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
                      {/* <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span className="font-medium">
                          {fmt(t.totalTagihan)}
                        </span>
                      </div> */}
                      {/* <div className="flex justify-between">
                        <span className="text-muted-foreground">Denda:</span>
                        <span className="font-medium">{fmt(dendaHitung)}</span>
                      </div> */}
                      {/* Info Denda */}
                      {/* <div className="mt-3 rounded-lg border border-yellow-200/60 bg-yellow-50/60 p-3">
                        <div className="flex items-start gap-2">
                          <svg
                            viewBox="0 0 24 24"
                            className="w-4 h-4 text-yellow-700 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            <path d="M12 9v4" />
                            <path d="M12 17h.01" />
                          </svg>

                          <div className="text-sm leading-relaxed text-yellow-800">
                            <p className="font-medium">Informasi Denda</p>
                            <ul className="mt-1 list-disc pl-5 space-y-1">
                              <li>
                                Telat ≤ 30 hari: denda bulan ke-1 sebesar{" "}
                                <span className="font-semibold">
                                  {fmt(denda1)}
                                </span>
                                .
                              </li>
                              <li>
                                Telat &gt; 30 hari: denda bulan ke-2+ sebesar{" "}
                                <span className="font-semibold">
                                  {fmt(denda2)}
                                </span>
                                .
                              </li>
                              <li>
                                Denda dihitung otomatis dan menambah total
                                tagihan.
                              </li>
                            </ul>

                            * badge “terlambat X hari” (opsional kalau punya due date & tanggal bayar)
                            {(() => {
                              // kalau punya variabel jatuh tempo & tanggal bayar, ini akan tampil.
                              // Ganti `tglJatuhTempo` & `tanggalBayar` dgn variabelmu.
                              try {
                                const due = t.tglJatuhTempo
                                  ? new Date(t.tglJatuhTempo)
                                  : null;
                                const pay = tanggalBayar
                                  ? new Date(tanggalBayar)
                                  : null;
                                const terlambatHari =
                                  due && pay
                                    ? Math.max(
                                        0,
                                        Math.ceil((+pay - +due) / 86400000)
                                      )
                                    : 0;

                                if (terlambatHari > 0) {
                                  return (
                                    <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-800">
                                      Terlambat {terlambatHari} hari
                                    </div>
                                  );
                                }
                              } catch {}
                              return null;
                            })()}
                          </div>
                        </div>
                      </div> */}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Tagihan Lalu (+/−):
                        </span>
                        <span
                          className={`font-medium ${
                            t.tagihanLalu < 0
                              ? "text-red-600"
                              : t.tagihanLalu > 0
                              ? "text-green-600"
                              : ""
                          }`}
                        >
                          {fmt(t.tagihanLalu)}
                        </span>
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

                {/* KANAN: Upload Bukti + Tombol Simpan di bawahnya */}
                <div className="space-y-4">
                  <GlassCard className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-foreground">
                          Unggah Bukti Pembayaran
                        </h3>
                        {/* <Plus className="h-5 w-5 text-muted-foreground" /> */}
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

                        {/* input nominal */}
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
                            placeholder="Masukkan nominal sesuai yang anda bayarkan (Rp)"
                            required
                          />
                          {/* <p className="mt-1 text-xs text-muted-foreground">
                            Sisa/Kurang saat ini: <b>{fmt(t.sisaKurang)}</b>
                          </p> */}
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
                            {/* TUNAI */}
                            <label
                              className={`
        flex items-start gap-3 rounded-xl border bg-card/50 p-3 cursor-pointer
        hover:bg-muted/40 transition
        data-[state=checked]:border-primary data-[state=checked]:bg-primary/5 data-[state=checked]:ring-1 data-[state=checked]:ring-primary/60
      `}
                            >
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

                            {/* TRANSFER */}
                            <label
                              className={`
        flex items-start gap-3 rounded-xl border bg-card/50 p-3 cursor-pointer
        hover:bg-muted/40 transition
        data-[state=checked]:border-primary data-[state=checked]:bg-primary/5 data-[state=checked]:ring-1 data-[state=checked]:ring-primary/60
      `}
                            >
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

                            {/* EWALLET */}
                            <label
                              className={`
        flex items-start gap-3 rounded-xl border bg-card/50 p-3 cursor-pointer
        hover:bg-muted/40 transition
        data-[state=checked]:border-primary data-[state=checked]:bg-primary/5 data-[state=checked]:ring-1 data-[state=checked]:ring-primary/60
      `}
                            >
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

                            {/* QRIS */}
                            <label
                              className={`
        flex items-start gap-3 rounded-xl border bg-card/50 p-3 cursor-pointer
        hover:bg-muted/40 transition
        data-[state=checked]:border-primary data-[state=checked]:bg-primary/5 data-[state=checked]:ring-1 data-[state=checked]:ring-primary/60
      `}
                            >
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
                          <Label
                            htmlFor="bukti"
                            className="text-sm font-medium"
                          >
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

                            {/* Jika sudah ada di DB → tampilkan server preview, sembunyikan uploader */}
                            {payDB?.buktiUrl ? (
                              <div className="p-3 border rounded-lg bg-muted/20">
                                {payDB.buktiUrl
                                  .toLowerCase()
                                  .endsWith(".pdf") ? (
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
                              // Preview lokal (sebelum submit)
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
                                      <p className="font-medium">
                                        File PDF terunggah
                                      </p>
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
                                    {(
                                      (paymentProof?.size || 0) /
                                      1024 /
                                      1024
                                    ).toFixed(2)}{" "}
                                    MB
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
                                    Klik untuk upload bukti pembayaran
                                    (JPG/PNG/PDF)
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

                  {/* Tombol Simpan (berada di bawah upload card untuk desktop & mobile) */}
                  <div className="pb-6 md:pb-0">
                    <Button
                      onClick={onSubmit}
                      className="w-full h-12 text-base font-semibold"
                      disabled={
                        lockForm || !paymentProof || !metode || !nominalBayar
                      }
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {lockForm ? "Sudah Diupload" : "Simpan"}
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
                    <ApprovePaymentModal
                      open={openApprove}
                      onClose={() => setOpenApprove(false)}
                      onConfirm={handleConfirmApprove}
                      isLoading={loadingApprove}
                      data={summary}
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

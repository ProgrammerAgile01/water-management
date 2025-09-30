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
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ApprovePaymentModal } from "@/components/approve-payment-modal";
// NEW: import modal konfirmasi upload
import { ConfirmUploadModal } from "@/components/confirm-upload-modal";
import { ConfirmSaveRevisionModal } from "@/components/confirm-save-revision-modal";
import { RevisiPaymentModal } from "@/components/revisi-payment-modal";

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

  info?: string | null;
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

  // Modal konfirmasi upload
  const [openConfirmUpload, setOpenConfirmUpload] = useState(false);
  const [loadingUpload, setLoadingUpload] = useState(false);

  // State Revisi oleh admin only
  const [revisiMode, setRevisiMode] = useState(false);
  const [openRevisi, setOpenRevisi] = useState(false);
  const [loadingRevisi, setLoadingRevisi] = useState(false);

  const [openConfirmSaveRevise, setOpenConfirmSaveRevise] = useState(false);
  const [loadingSaveRevise, setLoadingSaveRevise] = useState(false);

  // refetch tagihan setelah revisi
  async function refetchTagihan(tagihanId: string) {
    try {
      const r = await fetch(`/api/tagihan/${tagihanId}`, { cache: "no-store" });
      const d = await r.json();
      if (r.ok && d?.ok) setT(d.tagihan);
    } catch {}
  }

  // Prefill nominal (sekali)
  useEffect(() => {
    if (!t) return;
    if (nominalBayar !== "") return;

    if (payDB?.jumlahBayar && payDB.jumlahBayar > 0) {
      setNominalBayar(formatThousandsID(String(payDB.jumlahBayar)));
      if (payDB?.tanggalBayar) {
        const iso = toISODate(payDB.tanggalBayar);
        if (iso) setTanggalBayar(iso);
      }
      if (payDB.metode) setMetode(payDB.metode);
      if (typeof payDB.keterangan === "string") {
        setKeterangan(payDB.keterangan);
      }
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
        if (!revisiMode && typeof d.pembayaran?.keterangan === "string") {
          setKeterangan(d.pembayaran.keterangan);
        }
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

  // helper parse info
  function parsePrevCleared(info?: string | null): string[] {
    if (!info) return [];
    const m = info.match(/\[PREV_CLEARED:([0-9,\-\s]+)\]/);
    if (!m) return [];
    return m[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  function parseCredit(info?: string | null): number {
    if (!info) return 0;
    const m = info.match(/\[CREDIT:(\d+)\]/);
    return m ? Number(m[1]) : 0;
  }
  function formatPeriodeID(p: string) {
    return new Date(`${p}-01`).toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
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

  // kalau selesai revisi, bersihin pilihan file baru biar kembali ke preview lama (payDB)
  useEffect(() => {
    if (!revisiMode && (paymentProof || proofPreview)) {
      if (proofPreview) URL.revokeObjectURL(proofPreview);
      setPaymentProof(null);
      setProofPreview(null);
    }
  }, [revisiMode]);

  // batal ganti bukti
  function cancelReplaceProof() {
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setPaymentProof(null);
    setProofPreview(null);
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n);

  // ===== Helpers untuk format nominal =====
  function onlyDigits(s: string) {
    return s.replace(/\D/g, "");
  }
  function formatThousandsID(digits: string) {
    // input: "5000" -> output: "5.000"
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  function parseNominalToInt(nominalStr: string) {
    // "5.000" -> 5000; "" -> 0
    const d = onlyDigits(nominalStr || "");
    return d ? parseInt(d, 10) : 0;
  }
  /**
   * Hitung posisi kursor baru agar "terasa natural":
   * jaga jumlah digit di kiri kursor tetap sama sebelum & sesudah format.
   */
  function setCaretByDigitCount(
    input: HTMLInputElement,
    formatted: string,
    digitsBeforeCursor: number
  ) {
    let seen = 0;
    let pos = 0;
    for (; pos < formatted.length; pos++) {
      if (/\d/.test(formatted[pos])) {
        seen++;
        if (seen === digitsBeforeCursor) {
          pos++; // kursor berada setelah digit ini
          break;
        }
      }
    }
    // jika digit lebih sedikit (mis. hapus semua), kursor di akhir
    const finalPos = Math.min(pos, formatted.length);
    requestAnimationFrame(() => {
      input.setSelectionRange(finalPos, finalPos);
    });
  }

  function renderSisaKurang(n: number) {
    if (n > 0) {
      return <span className="text-red-600">Kurang {fmt(n)}</span>;
    }
    if (n < 0) {
      return <span className="text-green-600">Sisa {fmt(-n)}</span>;
    }
    return <span className="text-green-600">Rp 0</span>;
  }

  const tagihanFinal = (t?.totalTagihan ?? 0) + (t?.tagihanLalu ?? 0);

  // lock form kalau sudah PAID dan bisa di unlock admin
  const adminUnlock = role === "ADMIN" && revisiMode;
  const lockForm = t?.statusBayar === "PAID" && !adminUnlock;

  // TUNAI tanpa bukti untuk ADMIN/PETUGAS (saat input / revisi)
  const cashNoProof = role !== "WARGA" && metode === "TUNAI";

  // Sembunyikan area bukti untuk warga kalau pembayaran dari admin adalah TUNAI
  const hideProofForViewer =
    (role === "WARGA" && payDB?.metode === "TUNAI") || cashNoProof; // admin input tunai → sembunyikan area bukti juga

  // Bersihkan file sementara kalau mode TUNAI supaya tidak ada sisa preview saat pindah ke TUNAI.
  useEffect(() => {
    if (cashNoProof && (paymentProof || proofPreview)) {
      if (proofPreview) URL.revokeObjectURL(proofPreview);
      setPaymentProof(null);
      setProofPreview(null);
    }
  }, [cashNoProof]); // jalan tiap kali metode berubah ke TUNAI oleh admin

  // === SUBMIT HANDLERS ===

  // Tombol simpan: enable/disable
  const canSave = revisiMode
    ? parseNominalToInt(nominalBayar) > 0 &&
      !!metode &&
      (cashNoProof || !!paymentProof || !!payDB?.buktiUrl)
    : parseNominalToInt(nominalBayar) > 0 &&
      !!metode &&
      (cashNoProof || !!paymentProof);

  // NEW: validasi ringan sebelum buka modal
  const handleClickSimpan = () => {
    try {
      if (!t) throw new Error("Tagihan tidak ditemukan");
      const nominal = parseNominalToInt(nominalBayar);
      if (!metode) throw new Error("Pilih metode pembayaran");
      if (nominal <= 0) throw new Error("Nominal bayar harus lebih dari 0");

      if (!revisiMode) {
        if (!cashNoProof && !paymentProof) {
          throw new Error(
            "Wajib upload bukti pembayaran (kecuali Tunai oleh admin)"
          );
        }
        setOpenConfirmUpload(true);
      } else {
        if (!cashNoProof && !paymentProof && !payDB?.buktiUrl) {
          throw new Error("Bukti pembayaran belum ada");
        }
        setOpenConfirmSaveRevise(true);
      }
    } catch (e: any) {
      toast({
        title: "Gagal",
        description: e?.message || "Lengkapi data pembayaran",
        variant: "destructive",
      });
    }
  };

  // NEW: proses upload (dipanggil setelah konfirmasi)
  const performUpload = async () => {
    try {
      const nominal = parseNominalToInt(nominalBayar);
      if (!t) throw new Error("Tagihan tidak ditemukan");

      const fd = new FormData();
      fd.set("tagihanId", t.id);
      fd.set("nominalBayar", String(nominal));
      fd.set("tanggalBayar", tanggalBayar);
      fd.set("metodeBayar", metode);
      fd.set("keterangan", keterangan);
      // HANYA kirim file kalau BUKAN TUNAI-admin
      if (!cashNoProof && paymentProof) {
        fd.set("buktiFile", paymentProof);
      }

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
      setRevisiMode(false);
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

  // sinkronisasi status verifikasi
  useEffect(() => {
    if (t?.statusVerif === "VERIFIED" && revisiMode) setRevisiMode(false);
  }, [t?.statusVerif, revisiMode]);

  // NEW: data ringkasan untuk modal konfirmasi upload
  const confirmData = t
    ? {
        pelangganNama: t.pelangganNama,
        pelangganKode: t.pelangganKode,
        periode: t.periode,
        nominal: Number(nominalBayar || 0),
        metodeBayar: metode as Metode,
        tanggalBayar,
        fileName: paymentProof?.name ?? null,
        note: keterangan || null,
      }
    : null;

  // Handler masuk mode revisi & simpan revisi
  async function handleStartRevisi() {
    if (!t) return;
    if (!payDB) {
      toast({
        title: "Tidak ada pembayaran",
        description: "Belum ada data untuk direvisi.",
        variant: "destructive",
      });
      return;
    }
    try {
      setLoadingRevisi(true);
      // Set UNVERIFIED agar jelas statusnya & sesuai alur
      const r = await fetch(`/api/tagihan/${t.id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UNVERIFY" }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok)
        throw new Error(j?.message || "Gagal mengubah status verifikasi");
      setT((prev) =>
        prev ? ({ ...prev, statusVerif: "UNVERIFIED" } as TagihanDetail) : prev
      );
      setRevisiMode(true);
      toast({
        title: "Mode Revisi Aktif",
        description: "Silakan perbaiki data pembayaran lalu simpan & approve.",
      });
    } catch (e: any) {
      toast({
        title: "Gagal",
        description: e?.message || "Tidak bisa masuk mode revisi.",
        variant: "destructive",
      });
    } finally {
      setLoadingRevisi(false);
      setOpenRevisi(false);
    }
  }

  async function performRevise() {
    if (!t || !payDB) throw new Error("Data belum siap untuk revisi");
    const nominal = parseNominalToInt(nominalBayar);
    if (!nominal || nominal <= 0) throw new Error("Nominal bayar tidak valid");

    const fd = new FormData();
    fd.set("nominalBayar", String(nominal));
    fd.set("tanggalBayar", tanggalBayar);
    fd.set("metodeBayar", metode);
    fd.set("keterangan", keterangan);
    // HANYA kirim file kalau BUKAN TUNAI-admin
    if (!cashNoProof && paymentProof) {
      fd.set("buktiFile", paymentProof);
    }

    const r = await fetch(`/api/pembayaran/${payDB.id}`, {
      method: "PATCH",
      body: fd,
    });
    const data = await r.json();
    if (!r.ok || !data?.ok)
      throw new Error(data?.message || "Gagal menyimpan revisi");

    toast({
      title: "Perubahan Tersimpan",
      description: "Silakan lanjut Approve jika sudah sesuai.",
    });

    await refetchPembayaran(t.id);
    await refetchTagihan(t.id);
  }

  async function handleConfirmSaveRevise() {
    try {
      setLoadingSaveRevise(true);
      await performRevise();
    } catch (e: any) {
      toast({
        title: "Gagal",
        description: e?.message || "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setLoadingSaveRevise(false);
      setOpenConfirmSaveRevise(false);
    }
  }

  async function handleCancelRevisiAndApprove() {
    if (!t) return;
    try {
      // Optional: pastikan ada pembayaran yang valid sebelum approve
      if (!payDB) {
        toast({
          title: "Tidak bisa approve",
          description: "Belum ada pembayaran untuk diverifikasi.",
          variant: "destructive",
        });
        return;
      }

      // (Opsional) konfirmasi kecil biar tidak ke-klik tanpa sengaja
      // if (!confirm("Akan menutup mode revisi dan APPROVE pembayaran. Lanjut?")) return;

      // APPROVE (VERIFIED). Ubah sendWa ke true/false sesuai kebijakanmu:
      const r = await fetch(`/api/tagihan/${t.id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE", sendWa: false }), // set false kalau tak mau kirim WA
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.message || "Gagal approve");

      // Tutup mode revisi & perbarui UI
      setRevisiMode(false);
      setT((prev) =>
        prev ? ({ ...prev, statusVerif: "VERIFIED" } as any) : prev
      );

      toast({
        title: "Keluar Mode Revisi",
        description: "Status verifikasi diset ke VERIFIED.",
      });

      // (Opsional) kembali ke daftar
      // router.replace("/tagihan-pembayaran");
    } catch (e: any) {
      toast({
        title: "Gagal",
        description: e?.message || "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  }

  // 1. Tampilkan kartu Tunai hanya jika:
  //    - user bukan WARGA, ATAU
  //    - user WARGA tapi pembayaran dari DB memang TUNAI (hasil input admin)
  const showTunaiCard =
    role !== "WARGA" || (role === "WARGA" && payDB?.metode === "TUNAI");

  // 2. Auto-switch untuk WARGA HANYA jika bukan hasil input admin.
  //    Artinya: kalau payDB.metode === "TUNAI", biarkan tetap TUNAI (jangan switch).
  useEffect(() => {
    if (role === "WARGA" && metode === "TUNAI" && payDB?.metode !== "TUNAI") {
      setMetode("TRANSFER"); // fallback untuk warga yang mencoba pilih Tunai saat upload sendiri
    }
  }, [role, metode, payDB?.metode]);

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
                              t.statusBayar === "PAID" && t.sisaKurang <= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {t.statusBayar === "PAID" && t.sisaKurang <= 0
                              ? "Dibayar Lunas"
                              : t.sisaKurang > 0 && t.statusBayar === "PAID"
                              ? "Belum Lunas"
                              : "Belum Bayar"}
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
                      {/* Badge: tagihan bulan lalu lunas */}
                      {/* {(() => {
                        const prev = parsePrevCleared(t?.info);
                        const show =
                          prev.length > 0 && (t?.tagihanLalu ?? 0) > 0;
                        if (!show) return null;
                        return (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs rounded px-2 py-0.5 bg-green-100 text-green-700">
                              (tagihan bulan lalu lunas)
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Menutup: {prev.map(formatPeriodeID).join(", ")}
                            </span>
                          </div>
                        );
                      })()} */}

                      {/* Info lebih bayar */}
                      {/* {(() => {
                        const credit = parseCredit(t?.info);
                        if (!credit) return null;
                        return (
                          <div className="mt-1 text-xs text-blue-700">
                            Lebih bayar {fmt(credit)} (mengurangi tagihan
                            berikutnya)
                          </div>
                        );
                      })()} */}

                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Tagihan Bulan Ini:
                        </span>
                        <span className="font-medium">
                          {fmt(t.totalTagihan)}
                        </span>
                      </div>

                      <div className="border-t border-border/20 pt-2 flex justify-between">
                        <span className="font-semibold">Total Tagihan:</span>
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
                  {/* Banner mode revisi */}
                  {revisiMode && role === "ADMIN" && (
                    <GlassCard className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-md font-semibold flex items-center justify-center text-red-500">
                          <Info className="h-5 w-5 mr-1" />
                          Mode Revisi Pembayaran Aktif
                        </div>
                        {/* <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelRevisiAndApprove}
                          className="bg-transparent"
                          disabled={
                            t?.statusVerif === "VERIFIED" || role !== "ADMIN"
                          }
                        >
                          Batal Revisi
                        </Button> */}
                      </div>
                    </GlassCard>
                  )}

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
                            disabled={lockForm}
                          />
                        </div>

                        <div>
                          <Label
                            htmlFor="nominal"
                            className="text-sm font-medium"
                          >
                            Nominal Bayar{" "}
                            <span className="text-red-600">*</span>
                          </Label>

                          <Input
                            id="nominal"
                            type="text" // penting: gunakan text agar bisa ada titik (.)
                            inputMode="numeric"
                            autoComplete="off"
                            value={nominalBayar}
                            onChange={(e) => {
                              const input = e.currentTarget;
                              const raw = input.value;

                              // hitung digit di kiri kursor sebelum diformat
                              const caret = input.selectionStart ?? raw.length;
                              const digitsLeft = onlyDigits(
                                raw.slice(0, caret)
                              ).length;

                              // bersihkan ke digit & format ulang
                              const digits = onlyDigits(raw);
                              const formatted = digits
                                ? formatThousandsID(digits)
                                : "";

                              setNominalBayar(formatted);

                              // atur kursor berdasarkan jumlah digit di kiri kursor
                              setCaretByDigitCount(
                                input,
                                formatted,
                                digitsLeft
                              );
                            }}
                            onBlur={(e) => {
                              // rapikan saat blur (kalau user kosongin, biarkan kosong)
                              const digits = onlyDigits(e.currentTarget.value);
                              setNominalBayar(
                                digits ? formatThousandsID(digits) : ""
                              );
                            }}
                            className="mt-1"
                            disabled={lockForm}
                            placeholder="Masukkan nominal bayar"
                            required
                          />

                          {/* <p className="mt-1 text-xs text-muted-foreground">
                            *otomatis diformat titik ribuan (tanpa “Rp”). Data
                            yang tersimpan tetap angka murni.
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
                            {/* TUNAI: hanya selain WARGA yang input, warga hanya melihat ketika sudah diinputkan admin */}
                            {showTunaiCard && (
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
                            )}

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

                        {/* Bukti Pembayaran */}
                        {!hideProofForViewer ? (
                          <div>
                            <Label
                              htmlFor="bukti"
                              className="text-sm font-medium"
                            >
                              Bukti Pembayaran
                              {!cashNoProof && (
                                <span className="text-red-600">*</span>
                              )}
                            </Label>
                            {cashNoProof && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Metode <b>TUNAI</b> oleh admin: bukti{" "}
                                <b>tidak diperlukan</b>.
                              </p>
                            )}

                            <div className="mt-1">
                              <input
                                id="bukti"
                                type="file"
                                accept="image/jpeg,image/png,application/pdf"
                                onChange={onChangeProof}
                                className="hidden"
                                disabled={lockForm}
                              />

                              {/* 1) PRIORITAS: preview file BARU */}
                              {proofPreview && paymentProof ? (
                                <div className="p-3 border rounded-lg bg-muted/20">
                                  {paymentProof.type.startsWith("image/") ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={proofPreview}
                                      alt="Bukti pembayaran (baru)"
                                      className="w-full h-60 object-contain rounded-md bg-background"
                                    />
                                  ) : (
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="text-sm">
                                        <p className="font-medium">
                                          File PDF terunggah (baru)
                                        </p>
                                        <p className="text-muted-foreground">
                                          {paymentProof.name}
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
                                      {paymentProof.name} •{" "}
                                      {(
                                        Number(paymentProof.size) /
                                        1024 /
                                        1024
                                      ).toFixed(2)}{" "}
                                      MB
                                    </span>
                                    <div className="flex gap-2">
                                      {payDB?.buktiUrl && (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={cancelReplaceProof}
                                          className="bg-transparent"
                                        >
                                          <X className="w-4 h-4 mr-1" /> Batal
                                          Ganti
                                        </Button>
                                      )}
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
                                </div>
                              ) : /* 2) KEDUA: preview bukti LAMA dari DB */ payDB?.buktiUrl ? (
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
                                  {(revisiMode || role !== "WARGA") && (
                                    <div className="mt-3 flex items-center justify-end">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={onPickProof}
                                        className="bg-transparent"
                                        disabled={lockForm}
                                        hidden={lockForm}
                                      >
                                        <Upload className="w-4 h-4 mr-1" />{" "}
                                        Ganti Bukti
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                /* 3) TERAKHIR: tombol pilih file (saat belum ada apa-apa) */
                                <Button
                                  variant="outline"
                                  onClick={onPickProof}
                                  className="w-full h-32 border-2 border-dashed border-border/50 hover:border-border bg-transparent"
                                  type="button"
                                  disabled={lockForm || cashNoProof}
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
                          </div>
                        ) : (
                          <div className="rounded-md p-3 bg-muted/30 text-xs text-muted-foreground">
                            Pembayaran <b>TUNAI</b> — bukti pembayaran tidak
                            ditampilkan.
                          </div>
                        )}
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
                  </GlassCard>

                  {/* Tombol Simpan */}
                  <div className="pb-6 md:pb-0">
                    <Button
                      onClick={handleClickSimpan}
                      className="w-full h-12 text-base font-semibold"
                      disabled={lockForm || !canSave}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {revisiMode
                        ? "Simpan Perubahan"
                        : lockForm
                        ? "Sudah Diupload"
                        : "Upload & Simpan"}
                    </Button>

                    {role === "ADMIN" && (
                      <>
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

                        {!revisiMode && (
                          <Button
                            variant="outline"
                            onClick={() => setOpenRevisi(true)}
                            className="w-full border-accent h-12 text-base mt-3 text-amber-700"
                            disabled={!payDB} // hanya jika sudah ada pembayaran yang bisa direvisi
                          >
                            Revisi Pembayaran
                          </Button>
                        )}
                      </>
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

                    {/* Modal masuk mode revisi */}
                    <RevisiPaymentModal
                      open={openRevisi}
                      onClose={() => setOpenRevisi(false)}
                      onConfirm={handleStartRevisi}
                      isLoading={loadingRevisi}
                      data={{
                        pelangganNama: t.pelangganNama,
                        pelangganKode: t.pelangganKode,
                        periode: t.periode,
                        jumlahSekarang: payDB?.jumlahBayar ?? 0,
                        metodeSekarang: payDB?.metode ?? "-",
                        tanggalSekarang: payDB?.tanggalBayar ?? "",
                      }}
                    />

                    {/* Modal konfirmasi simpan revisi */}
                    <ConfirmSaveRevisionModal
                      open={openConfirmSaveRevise}
                      onClose={() => setOpenConfirmSaveRevise(false)}
                      onConfirm={handleConfirmSaveRevise}
                      isLoading={loadingSaveRevise}
                      data={{
                        pelangganNama: t.pelangganNama,
                        pelangganKode: t.pelangganKode,
                        periode: t.periode,
                        nominal: parseNominalToInt(nominalBayar),
                        metodeBayar: metode,
                        tanggalBayar,
                        willReplaceFile: !!paymentProof,
                        note: keterangan,
                      }}
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

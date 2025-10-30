"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { AppHeader } from "@/components/app-header";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type PeriodItem = {
  id: string;
  kode?: string | null; // "YYYY-MM"
  bulan?: number;
  tahun?: number;
};

type PajakItem = {
  id: string;
  periodeId: string;
  keterangan: string;
  pemakaianM3: number;
  tarifPajakPerM3: number;
  nominalBayarPajak: number;
  status?: "DRAFT" | "CLOSE" | string | null;
};

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatPeriodeFromKode(kode: string) {
  const parts = kode.split("-");
  if (parts.length < 2) return kode;
  const tahun = parts[0];
  const bulan = parts[1];
  const bulanNama = MONTH_NAMES[parseInt(bulan, 10) - 1] ?? bulan;
  return `${bulanNama} ${tahun}`;
}

function safeFormatPeriode(item: PeriodItem) {
  if (item.kode) {
    return formatPeriodeFromKode(item.kode);
  }
  if (typeof item.bulan === "number" && typeof item.tahun === "number") {
    const kode = `${item.tahun}-${String(item.bulan).padStart(2, "0")}`;
    return formatPeriodeFromKode(kode);
  }
  return `Periode ${item.id.slice(0, 8)}`;
}

function parseMonthYearFromPeriod(item: PeriodItem): {
  monthName?: string;
  year?: number;
} {
  if (item.kode) {
    const parts = item.kode.split("-");
    if (parts.length >= 2) {
      const year = Number(parts[0]);
      const monthIndex = Number(parts[1]) - 1;
      const monthName = MONTH_NAMES[monthIndex] ?? undefined;
      return { monthName, year };
    }
  }
  if (typeof item.bulan === "number" && typeof item.tahun === "number") {
    return { monthName: MONTH_NAMES[item.bulan - 1], year: item.tahun };
  }
  return {};
}

function fmtRp(n?: number | null) {
  if (n == null) return "";
  return n.toLocaleString("id-ID");
}

/** ===== Helpers untuk sanitasi data periode ===== */
function normalizeId(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (v == null) return "";
  return String(v).trim();
}
function normalizePeriods(raw: any[]): PeriodItem[] {
  const mapped = raw.map((p) => {
    const id = normalizeId(p.id ?? p.periodeId ?? p.periode_id);
    const tahun =
      typeof p.tahun === "number" ? p.tahun : Number(p.tahun ?? NaN);
    const bulan =
      typeof p.bulan === "number" ? p.bulan : Number(p.bulan ?? NaN);

    const kodeFromFields =
      Number.isFinite(tahun) && Number.isFinite(bulan)
        ? `${tahun}-${String(bulan).padStart(2, "0")}`
        : null;

    const kode: string | null =
      p.kode ?? p.kodePeriode ?? p.kode_periode ?? kodeFromFields;

    return {
      id,
      kode,
      bulan: Number.isFinite(bulan) ? (bulan as number) : undefined,
      tahun: Number.isFinite(tahun) ? (tahun as number) : undefined,
    } as PeriodItem;
  });

  return mapped.filter((m) => m.id.length > 0);
}

export default function PajakPage() {
  const [months, setMonths] = useState<PeriodItem[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [pemakaianM3, setPemakaianM3] = useState<number | null>(null);
  const [tarifPajakPerM3, setTarifPajakPerM3] = useState<number | null>(null);
  const [nominalBayarPajak, setNominalBayarPajak] = useState<number | null>(
    null
  );
  const [loadingCalc, setLoadingCalc] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [existing, setExisting] = useState<any | null>(null);
  const [history, setHistory] = useState<PajakItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [postingId, setPostingId] = useState<string | null>(null);

  // modal confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<PajakItem | null>(null);

  // pagination (client-side)
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // load months and history on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/pajak/months");
        const j = await res.json();
        if (j?.ok && Array.isArray(j.periods) && j.periods.length) {
          const normalized = normalizePeriods(j.periods);
          setMonths(normalized);

          // default selected = item pertama valid, atau pertahankan prev jika masih ada
          setSelectedPeriod((prev) =>
            prev && normalized.some((m) => m.id === prev)
              ? prev
              : normalized[0]?.id ?? ""
          );
        } else {
          setMonths([]);
          setSelectedPeriod("");
        }
      } catch (e) {
        console.error("fetch months", e);
        setMonths([]);
        setSelectedPeriod("");
      }
    })();

    fetchHistory();
  }, []);

  // when selectedPeriod changes -> fetch pemakaian + existing pajak
  useEffect(() => {
    if (!selectedPeriod) {
      setPemakaianM3(null);
      setExisting(null);
      setTarifPajakPerM3(null);
      return;
    }
    fetchPemakaian(selectedPeriod);
    fetchExistingPajak(selectedPeriod);
  }, [selectedPeriod]);

  // recalc nominal
  useEffect(() => {
    const pm = pemakaianM3 ?? 0;
    const t = tarifPajakPerM3 ?? 0;
    const tot = pm * t;
    setNominalBayarPajak(tot > 0 ? tot : null);
  }, [pemakaianM3, tarifPajakPerM3]);

  const autoKeterangan = useMemo(() => {
    if (!selectedPeriod) return "";
    const it = months.find((m) => m.id === selectedPeriod);
    if (!it) return "";
    const { monthName, year } = parseMonthYearFromPeriod(it);
    if (monthName && year)
      return `Pembayaran pajak untuk Bulan ${monthName} Tahun ${year}`;
    return `Pembayaran pajak untuk Periode ${it.kode ?? selectedPeriod}`;
  }, [selectedPeriod, months]);

  async function fetchPemakaian(periodeId: string) {
    setLoadingCalc(true);
    try {
      const res = await fetch(
        `/api/pajak?periodeId=${encodeURIComponent(periodeId)}&calc=1`
      );
      const j = await res.json();
      if (j?.ok) {
        const val = typeof j.pemakaianM3 === "number" ? j.pemakaianM3 : 0;
        setPemakaianM3(val || null);
      } else {
        setPemakaianM3(null);
        toast.error(j?.message || "Gagal menghitung pemakaian");
      }
    } catch (e) {
      console.error("fetchPemakaian", e);
      setPemakaianM3(null);
      toast.error("Gagal menghitung pemakaian");
    } finally {
      setLoadingCalc(false);
    }
  }

  async function fetchExistingPajak(periodeId: string) {
    try {
      const res = await fetch(
        `/api/pajak?periodeId=${encodeURIComponent(periodeId)}`
      );
      const j = await res.json();
      if (j?.ok) {
        setExisting(j.pajak ?? null);
        if (j.pajak) {
          setTarifPajakPerM3(
            typeof j.pajak.tarifPajakPerM3 === "number"
              ? j.pajak.tarifPajakPerM3
              : null
          );
          setNominalBayarPajak(
            typeof j.pajak.nominalBayarPajak === "number" &&
              j.pajak.nominalBayarPajak > 0
              ? j.pajak.nominalBayarPajak
              : null
          );
        } else {
          setTarifPajakPerM3(null);
        }
      } else {
        setExisting(null);
      }
    } catch (e) {
      console.error("fetchExistingPajak", e);
      setExisting(null);
    }
  }

  async function fetchHistory() {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/pajak");
      const j = await res.json();
      if (j?.ok && Array.isArray(j.data)) {
        const mapped: PajakItem[] = j.data.map((p: any) => ({
          id: normalizeId(p.id),
          periodeId: normalizeId(p.periodeId ?? p.periode_id),
          keterangan: p.keterangan,
          pemakaianM3: p.pemakaianM3 ?? 0,
          tarifPajakPerM3: p.tarifPajakPerM3 ?? 0,
          nominalBayarPajak: p.nominalBayarPajak ?? 0,
          status: p.status ?? "DRAFT",
        }));
        mapped.sort((a, b) => (a.periodeId < b.periodeId ? 1 : -1));
        setHistory(mapped);
        setPage(1);
      } else {
        setHistory([]);
      }
    } catch (e) {
      console.error("fetchHistory", e);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleSave() {
    if (!selectedPeriod) return toast.error("Pilih periode terlebih dahulu");
    if (
      tarifPajakPerM3 == null ||
      Number.isNaN(tarifPajakPerM3) ||
      tarifPajakPerM3 < 0
    )
      return toast.error("Tarif pajak harus diisi (>= 0)");

    if (existing && existing.status === "CLOSE") {
      return toast.error(
        "Entri untuk periode ini sudah ditutup (CLOSE). Tidak dapat diubah."
      );
    }

    setLoadingSave(true);
    try {
      const body = {
        periodeId: selectedPeriod,
        tarifPajakPerM3,
      };
      const res = await fetch("/api/pajak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (j?.ok) {
        setExisting(j.pajak);
        toast.success("Pajak disimpan");
        fetchPemakaian(selectedPeriod);
        fetchExistingPajak(selectedPeriod);
        fetchHistory();
      } else {
        toast.error(j?.message || "Gagal simpan pajak");
      }
    } catch (e) {
      console.error("save pajak", e);
      toast.error("Gagal menyimpan pajak");
    } finally {
      setLoadingSave(false);
    }
  }

  async function handlePostingCurrent() {
    if (!existing || !existing.id)
      return toast.error("Tidak ada entri untuk diposting");
    if (existing.status === "CLOSE") return toast.error("Entri sudah ditutup");

    setPostingId(existing.id);
    try {
      // FIX: hilangkan kutip nyasar pada template string
      const res = await fetch(
        `/api/pajak?action=close&id=${encodeURIComponent(existing.id)}`,
        {
          method: "PUT",
        }
      );
      const j = await res.json();
      if (j?.ok) {
        setExisting(j.pajak);
        toast.success("Entri berhasil diposting (CLOSE)");
        fetchHistory();
      } else {
        toast.error(j?.message || "Gagal memposting entri");
      }
    } catch (e) {
      console.error("posting pajak", e);
      toast.error("Gagal memposting entri");
    } finally {
      setPostingId(null);
    }
  }

  async function handleDeleteConfirmed(id: string) {
    setDeletingId(id);
    try {
      const item = history.find((h) => h.id === id);
      if (item && item.status === "CLOSE") {
        toast.error("Entri ini sudah ditutup. Tidak dapat dihapus.");
        setDeletingId(null);
        setConfirmOpen(false);
        setConfirmTarget(null);
        return;
      }

      const res = await fetch(`/api/pajak?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const j = await res.json();
      if (j?.ok) {
        toast.success("Entri pajak dihapus");
        fetchHistory();
        if (existing?.id === id) setExisting(null);
      } else {
        toast.error(j?.message || "Gagal menghapus");
      }
    } catch (e) {
      console.error("delete pajak", e);
      toast.error("Gagal menghapus pajak");
    } finally {
      setDeletingId(null);
      setConfirmOpen(false);
      setConfirmTarget(null);
    }
  }

  function openConfirmModal(item: PajakItem) {
    setConfirmTarget(item);
    setConfirmOpen(true);
  }

  const totalPages = Math.max(1, Math.ceil(history.length / perPage));
  const paginated = history.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [perPage, history.length, totalPages, page]);

  const previewPemakaian = pemakaianM3 != null ? pemakaianM3 : "";
  const previewTarif = tarifPajakPerM3 != null ? String(tarifPajakPerM3) : "";
  const previewNominal =
    nominalBayarPajak != null ? fmtRp(nominalBayarPajak) : "";

  const selectedPeriodLabel = useMemo(() => {
    const it = months.find((m) => m.id === selectedPeriod);
    return it ? safeFormatPeriode(it) : "";
  }, [months, selectedPeriod]);

  return (
    <AuthGuard requiredRole={"ADMIN"}>
      <AppShell>
        <div className="mx-auto space-y-6">
          <AppHeader title="Pengelolaan Pajak" />

          <GlassCard className="p-4">
            <div className="text-lg font-semibold mb-4">Input Pajak</div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-sm font-medium">Periode</label>
                <div className="mt-2">
                  <Select
                    value={selectedPeriod}
                    onValueChange={(v) => setSelectedPeriod(v)}
                  >
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Pilih periode">
                        {selectedPeriodLabel || "Pilih periode"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {safeFormatPeriode(m)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium">
                  Pemakaian Total (m³)
                </label>
                <div className="mt-2">
                  <Input
                    value={loadingCalc ? "Memuat..." : String(previewPemakaian)}
                    readOnly
                  />
                </div>
              </div>

              <div className="sm:col-span-1">
                <label className="text-sm font-medium">
                  Tarif Pajak / m³ (Rp)
                </label>
                <div className="mt-2">
                  <Input
                    type="number"
                    value={previewTarif}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") setTarifPajakPerM3(null);
                      else setTarifPajakPerM3(Number(v));
                    }}
                    placeholder="Masukkan Tarif Pajak / m³"
                  />
                </div>
              </div>

              <div className="sm:col-span-1">
                <label className="text-sm font-medium">
                  Nominal Bayar Pajak (Rp)
                </label>
                <div className="mt-2">
                  <Input
                    value={previewNominal}
                    readOnly
                    placeholder="(Otomatis terisi setelah input tarif)"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Keterangan</label>
                <div className="mt-2">
                  <Input value={autoKeterangan} readOnly />
                </div>
              </div>
            </div>

            <div className="sm:col-span-4 flex justify-end mt-2 gap-2">
              <Button
                onClick={handleSave}
                disabled={
                  loadingSave || loadingCalc || existing?.status === "CLOSE"
                }
              >
                {loadingSave ? "Menyimpan..." : "Simpan / Perbarui"}
              </Button>

              <Button
                onClick={handlePostingCurrent}
                disabled={
                  !existing ||
                  !existing.id ||
                  existing.status === "CLOSE" ||
                  Boolean(postingId)
                }
                variant="outline"
                size="sm"
              >
                {postingId ? "Memposting..." : "Posting"}
              </Button>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">
              {existing ? (
                <>
                  Data pajak untuk periode ini sudah ada —{" "}
                  <b>nominal: Rp {fmtRp(existing.nominalBayarPajak)}</b>{" "}
                  <span className="ml-2">
                    {existing.status === "CLOSE" ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-red-600 text-white">
                        CLOSE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-600 text-white">
                        DRAFT
                      </span>
                    )}
                  </span>
                </>
              ) : pemakaianM3 !== null ? (
                <>Belum ada entri pajak untuk periode ini.</>
              ) : (
                <>Pilih periode untuk menghitung pemakaian.</>
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Riwayat Pajak</div>
              <div className="text-sm text-muted-foreground">
                {loadingHistory ? "Memuat..." : `${history.length} entri`}
              </div>
            </div>

            {history.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Belum ada entri pajak.
              </div>
            ) : (
              <>
                {/* TABLE VIEW */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-b">
                        <th className="text-left py-2 px-2">Periode</th>
                        <th className="text-left py-2 px-2">Pemakaian (m³)</th>
                        <th className="text-left py-2 px-2">Tarif / m³</th>
                        <th className="text-left py-2 px-2">Nominal</th>
                        <th className="text-left py-2 px-2">Keterangan</th>
                        <th className="text-left py-2 px-2">Status</th>
                        <th className="text-right py-2 px-2">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history
                        .slice((page - 1) * perPage, page * perPage)
                        .map((h) => {
                          const periodItem = months.find(
                            (m) => m.id === h.periodeId
                          );
                          const label = periodItem
                            ? safeFormatPeriode(periodItem)
                            : h.periodeId.slice(0, 8);
                          const isClosed = h.status === "CLOSE";
                          return (
                            <tr key={h.id} className="border-b">
                              <td className="py-2 px-2">{label}</td>
                              <td className="py-2 px-2">{h.pemakaianM3}</td>
                              <td className="py-2 px-2">
                                Rp {fmtRp(h.tarifPajakPerM3)}
                              </td>
                              <td className="py-2 px-2 font-semibold">
                                Rp {fmtRp(h.nominalBayarPajak)}
                              </td>
                              <td className="py-2 px-2">{h.keterangan}</td>
                              <td className="py-2 px-2">
                                {isClosed ? (
                                  <span className="px-2 py-0.5 rounded-full text-xs bg-red-600 text-white">
                                    CLOSE
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-xs bg-green-600 text-white">
                                    DRAFT
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-2 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      if (isClosed) {
                                        toast.error(
                                          "Entri ini sudah ditutup dan tidak bisa diedit."
                                        );
                                        return;
                                      }
                                      setSelectedPeriod(h.periodeId);
                                      window.scrollTo({
                                        top: 0,
                                        behavior: "smooth",
                                      });
                                    }}
                                    disabled={isClosed}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openConfirmModal(h)}
                                    disabled={deletingId === h.id || isClosed}
                                    className={
                                      isClosed
                                        ? "opacity-60 cursor-not-allowed"
                                        : "bg-red-500 text-white"
                                    }
                                  >
                                    {deletingId === h.id
                                      ? "Menghapus..."
                                      : isClosed
                                      ? "Terkunci"
                                      : "Hapus"}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* CARD VIEW (mobile) */}
                <div className="block sm:hidden space-y-3">
                  {history
                    .slice((page - 1) * perPage, page * perPage)
                    .map((h) => {
                      const periodItem = months.find(
                        (m) => m.id === h.periodeId
                      );
                      const label = periodItem
                        ? safeFormatPeriode(periodItem)
                        : h.periodeId.slice(0, 8);
                      const isClosed = h.status === "CLOSE";
                      return (
                        <div
                          key={h.id}
                          className="border rounded-lg p-3 bg-white/5 shadow-sm"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-sm font-medium">{label}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {h.keterangan}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold">
                                Rp {fmtRp(h.nominalBayarPajak)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {h.pemakaianM3} m³ · Rp{" "}
                                {fmtRp(h.tarifPajakPerM3)}
                                /m³
                              </div>
                              <div className="mt-1">
                                {isClosed ? (
                                  <span className="px-2 py-0.5 rounded-full text-xs bg-red-600 text-white">
                                    CLOSE
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-xs bg-green-600 text-white">
                                    DRAFT
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => {
                                if (isClosed) {
                                  toast.error(
                                    "Entri ini sudah ditutup dan tidak bisa diedit."
                                  );
                                  return;
                                }
                                setSelectedPeriod(h.periodeId);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              disabled={isClosed}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="flex-1 bg-red-500 text-white"
                              onClick={() => {
                                if (isClosed) {
                                  toast.error(
                                    "Entri ini sudah ditutup dan tidak bisa dihapus."
                                  );
                                  return;
                                }
                                openConfirmModal(h);
                              }}
                              disabled={deletingId === h.id || isClosed}
                            >
                              {deletingId === h.id
                                ? "Menghapus..."
                                : isClosed
                                ? "Terkunci"
                                : "Hapus"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* pagination */}
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Sebelumnya
                    </Button>
                    <div>
                      Halaman <b>{page}</b> dari <b>{totalPages}</b>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                    >
                      Selanjutnya
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span>Per halaman</span>
                    <select
                      value={perPage}
                      onChange={(e) => setPerPage(Number(e.target.value))}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </GlassCard>
        </div>

        {/* Confirm delete dialog */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Hapus Entri Pajak</DialogTitle>
              <DialogDescription>
                Anda akan menghapus entri pajak ini. Tindakan ini tidak bisa
                dikembalikan.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4">
              <div className="text-sm">
                <div className="mb-2">
                  <b>{confirmTarget?.keterangan}</b>
                </div>
                <div className="mb-4 text-muted-foreground">
                  Nominal: Rp{" "}
                  {confirmTarget ? fmtRp(confirmTarget.nominalBayarPajak) : "-"}
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setConfirmOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={() =>
                      confirmTarget && handleDeleteConfirmed(confirmTarget.id)
                    }
                    className="bg-red-600 text-white"
                    disabled={
                      deletingId !== null || confirmTarget?.status === "CLOSE"
                    }
                  >
                    {deletingId ? "Menghapus..." : "Hapus"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </AppShell>
    </AuthGuard>
  );
}

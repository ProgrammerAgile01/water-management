"use client";

import React from "react";
import { createPortal } from "react-dom";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, X } from "lucide-react";

// === Utils ===
function formatRp(n: number) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}
function formatPeriod(ym: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ym)) return ym;
  const d = new Date(ym + "-01T00:00:00");
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}
function formatTanggalID(input: string | Date) {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// === Types ===
// Ringkasan data yang ditampilkan di modal (tanpa denda & tanpa bukti)
type ApproveSummary = {
  tagihanId: string;
  pelangganNama: string;
  pelangganKode?: string | null;
  periode: string;          // "YYYY-MM"
  totalTagihan: number;     // tanpa denda
  tanggalBayar?: string | null; // ISO "yyyy-mm-dd" atau null
  metodeBayar?: "TUNAI" | "TRANSFER" | "EWALLET" | "QRIS" | null;
  keterangan?: string | null;
};

type ApprovePaymentModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void; // panggil API approve di luar
  isLoading?: boolean;
  data: ApproveSummary | null;
};

// === Portal helper ===
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

// === Modal ===
export function ApprovePaymentModal({
  open,
  onClose,
  onConfirm,
  isLoading,
  data,
}: ApprovePaymentModalProps) {
  if (!open || !data) return null;

  const {
    pelangganNama,
    pelangganKode,
    periode,
    totalTagihan,
    tanggalBayar,
    metodeBayar,
    keterangan,
  } = data;

  return (
    <Portal>
      <div className="fixed inset-0 z-[10000]">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          onClick={onClose}
        />
        {/* Modal card */}
        <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
          <GlassCard className="w-full max-w-md p-6 space-y-6 pointer-events-auto">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">
                  Konfirmasi Approve Pembayaran
                </h3>
                <p className="text-sm text-muted-foreground">
                  Mohon periksa ringkasan berikut sebelum menyetujui.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 -m-2 rounded-md hover:bg-muted/40 transition"
                aria-label="Tutup"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Ringkasan */}
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 border border-border/60 rounded-lg">
                <p className="text-sm">
                  Pelanggan:{" "}
                  <span className="font-medium text-foreground">
                    {pelangganNama}
                  </span>{" "}
                  {pelangganKode ? (
                    <span className="text-muted-foreground">
                      ({pelangganKode})
                    </span>
                  ) : null}
                </p>
                <p className="text-sm">
                  Periode Tagihan:{" "}
                  <span className="font-medium">{formatPeriod(periode)}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {/* <div className="rounded-md border border-border/60 p-3">
                  <div className="text-muted-foreground">Total Tagihan</div>
                  <div className="font-bold text-foreground">
                    {formatRp(totalTagihan)}
                  </div>
                </div> */}

                <div className="rounded-md border border-border/60 p-3">
                  <div className="text-muted-foreground">Metode</div>
                  <div className="font-semibold">
                    {metodeBayar ? metodeBayar : "-"}
                  </div>
                </div>

                <div className="rounded-md border border-border/60 p-3">
                  <div className="text-muted-foreground">Tanggal Bayar</div>
                  <div className="font-semibold">
                    {tanggalBayar ? formatTanggalID(tanggalBayar) : "-"}
                  </div>
                </div>

                <div className="col-span-2 rounded-md border border-border/60 p-3">
                  <div className="text-muted-foreground">Keterangan</div>
                  <div className="font-semibold">
                    {keterangan && keterangan.trim() !== "" ? keterangan : "-"}
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-border/60 p-3 text-xs text-muted-foreground">
                Dengan menekan <b>Approve</b>, status verifikasi pembayaran akan
                diubah menjadi <span className="font-medium">VERIFIED</span>.
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={!!isLoading}
                className="flex-1 bg-transparent"
              >
                Batal
              </Button>
              <Button onClick={onConfirm} disabled={!!isLoading} className="flex-1">
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Memproses...
                  </div>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Approve
                  </>
                )}
              </Button>
            </div>
          </GlassCard>
        </div>
      </div>
    </Portal>
  );
}

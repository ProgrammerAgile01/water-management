"use client";

import React from "react";
import { createPortal } from "react-dom";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Edit3, X, AlertTriangle, Unlock } from "lucide-react";

type RevisiPaymentModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
  data?: {
    pelangganNama?: string | null;
    pelangganKode?: string | null;
    periode?: string;        // "YYYY-MM"
    jumlahSekarang?: number; // nominal existing
    metodeSekarang?: string; // TUNAI/TRANSFER/...
    tanggalSekarang?: string;// "yyyy-mm-dd"
  } | null;
};

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

function formatRp(n: number) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}
function formatPeriod(ym?: string | null) {
  if (!ym) return "-";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ym)) return ym;
  const d = new Date(ym + "-01T00:00:00");
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}
function formatTanggalID(iso?: string | null) {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

export function RevisiPaymentModal({
  open,
  onClose,
  onConfirm,
  isLoading,
  data,
}: RevisiPaymentModalProps) {
  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[10000]">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
        {/* Modal */}
        <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
          <GlassCard className="w-full max-w-md p-6 space-y-6 pointer-events-auto">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Edit3 className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">Masuk Mode Revisi?</h3>
                <p className="text-sm text-muted-foreground">
                  Mode revisi akan <b>membuka form</b> dan mengubah status verifikasi menjadi{" "}
                  <b>UNVERIFIED</b>.
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
              <div className="p-4 bg-muted/30 border border-border/60 rounded-lg text-sm">
                <p>
                  Pelanggan:{" "}
                  <span className="font-medium text-foreground">
                    {data?.pelangganNama || "-"}
                  </span>{" "}
                  {data?.pelangganKode ? (
                    <span className="text-muted-foreground">({data.pelangganKode})</span>
                  ) : null}
                </p>
                <p>
                  Periode: <span className="font-medium">{formatPeriod(data?.periode)}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border border-border/60 p-3">
                  <div className="text-muted-foreground">Nominal Saat Ini</div>
                  <div className="font-bold text-foreground">
                    {formatRp(Number(data?.jumlahSekarang || 0))}
                  </div>
                </div>
                <div className="rounded-md border border-border/60 p-3">
                  <div className="text-muted-foreground">Metode</div>
                  <div className="font-semibold">{data?.metodeSekarang || "-"}</div>
                </div>
                {/* <div className="rounded-md border border-border/60 p-3">
                  <div className="text-muted-foreground">Tanggal Bayar</div>
                  <div className="font-semibold">
                    {formatTanggalID(data?.tanggalSekarang || null)}
                  </div>
                </div> */}
              </div>

              <div className="flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50/80 p-3 text-xs text-amber-900">
                <Unlock className="w-4 h-4 mt-0.5" />
                <div>
                  <b>Catatan:</b> Setelah masuk mode revisi, form akan <b>terbuka</b> untuk
                  perbaikan. Selesai koreksi, lakukan <b>Approve</b> untuk finalisasi.
                </div>
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
                    <Edit3 className="w-4 h-4 mr-2" />
                    Ya, Masuk Mode Revisi
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

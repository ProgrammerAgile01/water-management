"use client";

import React from "react";
import { createPortal } from "react-dom";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Upload, X, Lock } from "lucide-react";

type Metode = "TUNAI" | "TRANSFER" | "EWALLET" | "QRIS";

function formatRp(n: number) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}
function formatPeriod(ym: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ym)) return ym;
  const d = new Date(ym + "-01T00:00:00");
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}
function formatTanggalID(iso: string | null | undefined) {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

type ConfirmUploadData = {
  pelangganNama: string;
  pelangganKode?: string | null;
  periode: string; // YYYY-MM
  nominal: number;
  metodeBayar: Metode;
  tanggalBayar: string; // yyyy-mm-dd
  fileName?: string | null;
  note?: string | null;
};

type ConfirmUploadModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  data: ConfirmUploadData | null;
};

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

export function ConfirmUploadModal({
  open,
  onClose,
  onConfirm,
  isLoading,
  data,
}: ConfirmUploadModalProps) {
  if (!open || !data) return null;

  const {
    pelangganNama,
    pelangganKode,
    periode,
    nominal,
    metodeBayar,
    tanggalBayar,
    // fileName,
    note,
  } = data;

  return (
    <Portal>
      <div className="fixed inset-0 z-[10000]">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          onClick={onClose}
        />
        {/* Modal */}
        <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
          <GlassCard className="w-full max-w-md p-6 space-y-6 pointer-events-auto">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">
                  Konfirmasi Upload Pembayaran
                </h3>
                <p className="text-sm text-muted-foreground">
                  Pastikan data berikut sudah benar. Setelah diupload, data{" "}
                  <span className="font-medium">tidak bisa diubah</span>.
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
                    {pelangganNama}
                  </span>{" "}
                  {pelangganKode ? (
                    <span className="text-muted-foreground">
                      ({pelangganKode})
                    </span>
                  ) : null}
                </p>
                <p>
                  Periode:{" "}
                  <span className="font-medium">{formatPeriod(periode)}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border border-border/60 p-3">
                  <div className="text-muted-foreground">Nominal</div>
                  <div className="font-bold text-foreground">
                    {formatRp(nominal)}
                  </div>
                </div>
                <div className="rounded-md border border-border/60 p-3">
                  <div className="text-muted-foreground">Metode</div>
                  <div className="font-semibold">{metodeBayar}</div>
                </div>
                <div className="rounded-md border border-border/60 p-3">
                  <div className="text-muted-foreground">Tanggal Bayar</div>
                  <div className="font-semibold">
                    {formatTanggalID(tanggalBayar)}
                  </div>
                </div>
                <div className="rounded-md border border-border/60 p-3">
                  <div className="text-muted-foreground">Keterangan</div>
                  <div className="font-normal">
                    {note && note.trim() !== "" ? note : "-"}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-md border border-yellow-300/60 bg-yellow-50/80 p-3 text-xs text-yellow-900">
                <Lock className="w-4 h-4 mt-0.5" />
                <div>
                  <b>Catatan:</b> Setelah menekan{" "}
                  <span className="font-medium">Upload & Simpan</span>, bukti
                  dan nominal pembayaran akan terkunci dan tidak bisa diubah.{" "}
                  <span className="font-medium">Pastikan data sudah benar.</span>
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
              <Button
                onClick={onConfirm}
                disabled={!!isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Memproses...
                  </div>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload & Simpan
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

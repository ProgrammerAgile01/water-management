"use client";

import { GlassCard } from "./glass-card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Lock } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";

type ApiRow = {
  id: string;
  kodeCustomer: string;
  nama: string;
  alamat: string;
  phone: string;
  meterAwal: number;
  meterAkhir: number | null;
  pemakaian: number;
  status: "pending" | "completed";
  tarifPerM3?: number | null;
  abonemen?: number | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;

  // konteks untuk hitung tampilan
  row: ApiRow | null;
  period: string;
  headerTarif: number | null | undefined;
  headerAbon: number | null | undefined;
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
function formatPeriod(ym: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ym)) return ym;
  const d = new Date(ym + "-01");
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

export function LockRowModal({
  open,
  onClose,
  onConfirm,
  isLoading,
  row,
  period,
  headerTarif,
  headerAbon,
}: Props) {
  if (!open || !row) return null;

  const tarif = (row.tarifPerM3 ?? headerTarif ?? 0) as number;
  const abon = (row.abonemen ?? headerAbon ?? 0) as number;
  const akhir = row.meterAkhir ?? row.meterAwal;
  const pem = Math.max(0, akhir - row.meterAwal);
  const total = pem * tarif + abon;

  return (
    <Portal>
      <div className="fixed inset-0 z-[10000]">
        {/* backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          onClick={onClose}
        />
        {/* modal */}
        <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
          <GlassCard className="w-full max-w-md p-6 space-y-6 pointer-events-auto">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Kunci & Finalisasi
                </h3>
                <p className="text-sm text-muted-foreground">
                  Konfirmasi finalisasi untuk pelanggan ini
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* ringkasan periode & pelanggan */}
              <div className="p-4 bg-yellow-50/60 border border-yellow-200/60 rounded-lg">
                <p className="text-sm text-yellow-800 font-medium mb-1">
                  Periode Tagihan: {formatPeriod(period)}
                </p>
                <p className="text-sm text-yellow-700">
                  Pelanggan: <b>{row.nama}</b> ({row.kodeCustomer})
                </p>
                <p className="text-xs text-yellow-700 mt-2">
                  Setelah dikunci, data pelanggan ini tidak dapat diubah lagi.
                  Pastikan nilai meter & total sudah benar.
                </p>
              </div>

              {/* angka kunci */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border border-border/60 p-3">
                  <div className="text-muted-foreground">Meter Awal</div>
                  <div className="font-semibold">{row.meterAwal}</div>
                </div>
                <div className="rounded-md border border-border/60 p-3">
                  <div className="text-muted-foreground">Meter Akhir</div>
                  <div className="font-semibold">{akhir}</div>
                </div>
                <div className="rounded-md border border-border/60 p-3">
                  <div className="text-muted-foreground">Pemakaian</div>
                  <div className="font-semibold">{pem} m³</div>
                </div>
                <div className="rounded-md border border-border/60 p-3">
                  <div className="text-muted-foreground">Total</div>
                  <div className="font-bold text-foreground">
                    {formatRp(total)}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Aksi yang akan dilakukan:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• Baris pelanggan dikunci (read-only)</li>
                  <li>
                    • Tagihan periode {formatPeriod(period)} dibuat/diupdate
                  </li>
                  <li>• Notifikasi WhatsApp + invoice dikirim</li>
                </ul>
              </div>
            </div>

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
                className="flex-1 bg-yellow-600 hover:bg-yellow-700"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Memproses...
                  </div>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Kunci & Finalisasi
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

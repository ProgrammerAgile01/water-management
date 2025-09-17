"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function MassResetBar() {
  const { toast } = useToast();

  const doMassReset = async () => {
    if (
      !confirm(
        "Reset password untuk SEMUA pelanggan aktif yang memiliki user?\n\n" +
          "Tindakan ini akan:\n• Menghapus sesi login lama\n• Mengganti password ke yang baru\n\nLanjutkan?"
      )
    )
      return;

    try {
      const res = await fetch("/api/pelanggan/reset-password?all=true", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.message || "Gagal reset massal");

      const count = json?.count ?? 0;
      toast({
        title: "Reset Massal Berhasil",
        description: `Password ${count} pelanggan telah direset.`,
      });

      alert(
        `Reset massal berhasil.\nTotal: ${count} pelanggan.\n\n` +
          `Perlu daftar username+password baru?\n` +
          `Lihat hasil di console atau extend ke export CSV.`
      );
      console.log("Hasil reset massal:", json);
    } catch (e: any) {
      toast({
        title: "Gagal",
        description: e?.message || "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <p className="text-muted-foreground">
        Manajemen data pelanggan Tirta Bening
      </p>
      <div className="flex items-center gap-2">
        {/* Tombol tambah pelanggan (tetap ada, UI tidak diubah) */}
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Tambah Pelanggan
        </Button>

        {/* Reset Password Massal */}
        <Button variant="outline" onClick={doMassReset}>
          Reset Password Massal
        </Button>
      </div>
    </div>
  );
}

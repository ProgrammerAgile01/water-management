// components/reset-password-button.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function ResetPasswordButton({ pelangganId }: { pelangganId: string }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const run = async () => {
    if (loading) return;
    if (!confirm("Reset password untuk pelanggan ini?")) return;

    setLoading(true);
    try {
      const res = await fetch("/api/pelanggan/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pelangganId }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.message || "Gagal reset password");

      const pass = json?.data?.newPassword as string;
      // salin ke clipboard
      try {
        await navigator.clipboard.writeText(pass);
      } catch {}

      toast({
        title: "Password di-reset",
        description: "Password baru disalin ke clipboard.",
      });

      alert(`Password baru:\n\n${pass}\n\n(Sudah dicopy ke clipboard)`);
    } catch (e: any) {
      toast({
        title: "Gagal",
        description: e?.message || "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="bg-transparent"
      onClick={run}
      disabled={loading}
    >
      {loading ? "Memproses..." : "Reset"}
    </Button>
  );
}

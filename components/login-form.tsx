"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ username: "", password: "" });
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "Login gagal");

      // simpan info ringan untuk UI (cookie JWT sudah diset httpOnly oleh server)
      localStorage.setItem("tb_user", JSON.stringify(data.user));

      toast({
        title: "Login Berhasil",
        description: `Selamat datang, ${data.user.name}`,
      });

      if (data.user.role === "WARGA") router.push("/warga-dashboard");
      else router.push("/dashboard");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Username / password salah";
      toast({
        title: "Login Gagal",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username" className="text-base font-medium">
          Username
        </Label>
        <Input
          id="username"
          type="text"
          placeholder="Masukkan username"
          value={formData.username}
          onChange={(e) =>
            setFormData((p) => ({ ...p, username: e.target.value }))
          }
          className="h-12 text-base"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-base font-medium">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="Masukkan password"
          value={formData.password}
          onChange={(e) =>
            setFormData((p) => ({ ...p, password: e.target.value }))
          }
          className="h-12 text-base"
          required
        />
      </div>

      <Button
        type="submit"
        className="w-full h-12 text-lg font-medium"
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Memproses...
          </div>
        ) : (
          "Masuk"
        )}
      </Button>
    </form>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

type AppRole = "ADMIN" | "PETUGAS" | "WARGA";

interface AuthGuardProps {
  children: ReactNode;
  /** Halaman ini hanya boleh diakses role tertentu */
  requiredRole?: AppRole | AppRole[];
}

interface User {
  id: string;
  username: string;
  role: AppRole;
  name: string;
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const needs = useMemo<AppRole[]>(
    () => (Array.isArray(requiredRole) ? requiredRole : requiredRole ? [requiredRole] : []),
    [requiredRole]
  );

  useEffect(() => {
    let alive = true;

    const authorize = async () => {
      try {
        // 1) Sumber kebenaran: server baca cookie httpOnly
        const res = await fetch("/api/auth/me", { cache: "no-store" });

        if (res.ok) {
          const data = await res.json();
          const u: User = data.user;

          if (!alive) return;

          // isi localStorage utk komponen lama yang masih membacanya
          try {
            localStorage.setItem(
              "tb_user",
              JSON.stringify({ id: u.id, username: u.username, role: u.role, name: u.name })
            );
          } catch {}

          // cek role
          if (needs.length && !(u.role === "ADMIN" || needs.includes(u.role))) {
            router.replace("/unauthorized");
            return;
          }

          setUser(u);
          setLoading(false);
          return;
        }
      } catch {
        // fallthrough ke fallback localStorage
      }

      // 2) Fallback: coba dari localStorage biar tidak blank saat offline
      try {
        const raw = localStorage.getItem("tb_user");
        if (raw) {
          const u = JSON.parse(raw) as User;

          if (needs.length && !(u.role === "ADMIN" || needs.includes(u.role))) {
            router.replace("/unauthorized");
            return;
          }

          setUser(u);
          setLoading(false);
          return;
        }
      } catch {}

      // 3) Tidak punya sesi → login, dengan next= untuk kembali
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      router.replace(`/login?next=${next}`);
    };

    authorize();
    return () => {
      alive = false;
    };
  }, [router, needs]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-primary">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-lg">Memuat…</span>
        </div>
      </div>
    );
  }

  if (!user) return null; // sedang redirect

  return <>{children}</>;
}
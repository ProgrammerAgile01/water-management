"use client";

import {
  Home,
  Users,
  FileText,
  CalendarDays,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { GlassCard } from "./glass-card";

// ====== Roles & tipe item ======
type Role = "ADMIN" | "OPERATOR" | "PETUGAS" | "WARGA";

type BottomItem = {
  href: string;
  label: string;
  icon: React.ComponentType<any>;
  roles?: Role[]; // siapa yang boleh melihat
};

// ====== Daftar menu bottom (beri roles di sini) ======
const NAV_ITEMS: BottomItem[] = [
  {
    href: "/dashboard",
    label: "Home",
    icon: Home,
    roles: ["ADMIN", "OPERATOR"],
  },
  { href: "/warga-dashboard", label: "Home", icon: Home, roles: ["WARGA"] },
  {
    href: "/pelanggan",
    label: "Pelanggan",
    icon: Users,
    roles: ["ADMIN", "OPERATOR"],
  },
  {
    href: "/tagihan-pembayaran",
    label: "Tagihan",
    icon: FileText,
    roles: ["ADMIN", "OPERATOR", "WARGA"],
  },
  {
    href: "/warga-profil",
    label: "Profil Warga",
    icon: Users,
    roles: ["WARGA"],
  },
  {
    href: "/jadwal-pencatatan",
    label: "Jadwal Pencatatan",
    icon: CalendarDays,
    roles: ["PETUGAS"],
  },
  {
    href: "/catat-meter",
    label: "Catat Meter",
    icon: ClipboardList,
    roles: ["PETUGAS"],
  },
  {
    href: "/laporan-catat-meter",
    label: "Laporan Catat Meter",
    icon: FileText,
    roles: ["PETUGAS"],
  },
];

export function BottomNav() {
  const pathname = usePathname();

  // sembunyikan di login/landing
  if (pathname === "/" || pathname === "/login") return null;

  const [role, setRole] = useState<Role | null>(null);

  // ambil role user dari localStorage (hasil login)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tb_user");
      if (raw) {
        const u = JSON.parse(raw) as { role?: Role };
        if (u?.role) setRole(u.role);
      }
    } catch {}
  }, []);

  // filter item sesuai role
  const items = useMemo(() => {
    return NAV_ITEMS.filter((m) => {
      if (!m.roles || m.roles.length === 0) return true; // default: terlihat semua
      if (!role) return false;
      return m.roles.includes(role);
    });
  }, [role]);

  // Jika belum tahu role (sebentar saat mount), jangan render agar tidak flicker
  if (!role) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <GlassCard className="mx-auto max-w-md">
        <nav className="flex items-center justify-around py-2">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-0",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="text-xs font-medium truncate">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Divider tipis */}
        <div className="mx-3 h-px bg-black/50" />

        {/* FOOTER dalam BottomNav */}
        <div className="py-2 text-center text-[11px] leading-none text-muted-foreground">
          <span className="mr-1">Supported by</span>
          <Link
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-foreground hover:text-primary transition-colors"
          >
            agile.com
          </Link>
          <span className="mx-2 opacity-50">•</span>
          <span className="select-none">© 2025</span>
        </div>
      </GlassCard>
    </div>
  );
}

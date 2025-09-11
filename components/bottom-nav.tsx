"use client";

import {
  Home,
  Users,
  ClipboardList,
  CreditCard,
  Settings,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { GlassCard } from "./glass-card";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/pelanggan", label: "Pelanggan", icon: Users },
  { href: "/catat-meter", label: "Catat", icon: ClipboardList },
  { href: "/jadwal-pencatatan", label: "Jadwal", icon: CalendarDays },
  { href: "/pelunasan", label: "Bayar", icon: CreditCard },
  { href: "/pengaturan", label: "Setting", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  // Don't show bottom nav on login page
  if (pathname === "/" || pathname === "/login") {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <GlassCard className="mx-auto max-w-md">
        <nav className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

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
      </GlassCard>
    </div>
  );
}

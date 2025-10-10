// "use client";

// import {
//   Home,
//   Users,
//   FileText,
//   CalendarDays,
//   ClipboardList,
// } from "lucide-react";
// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import { useEffect, useMemo, useState } from "react";
// import { cn } from "@/lib/utils";
// import { GlassCard } from "./glass-card";

// // ====== Roles & tipe item ======
// type Role = "ADMIN" | "OPERATOR" | "PETUGAS" | "WARGA";

// type BottomItem = {
//   href: string;
//   label: string;
//   icon: React.ComponentType<any>;
//   roles?: Role[]; // siapa yang boleh melihat
// };

// // ====== Daftar menu bottom (beri roles di sini) ======
// const NAV_ITEMS: BottomItem[] = [
//   {
//     href: "/dashboard",
//     label: "Home",
//     icon: Home,
//     roles: ["ADMIN", "OPERATOR"],
//   },
//   { href: "/warga-dashboard", label: "Home", icon: Home, roles: ["WARGA"] },
//   {
//     href: "/pelanggan",
//     label: "Pelanggan",
//     icon: Users,
//     roles: ["ADMIN", "OPERATOR"],
//   },
//   {
//     href: "/tagihan-pembayaran",
//     label: "Tagihan",
//     icon: FileText,
//     roles: ["ADMIN", "OPERATOR", "WARGA"],
//   },
//   {
//     href: "/warga-profil",
//     label: "Profil Warga",
//     icon: Users,
//     roles: ["WARGA"],
//   },
//   {
//     href: "/jadwal-pencatatan",
//     label: "Jadwal Pencatatan",
//     icon: CalendarDays,
//     roles: ["PETUGAS"],
//   },
//   {
//     href: "/catat-meter",
//     label: "Catat Meter",
//     icon: ClipboardList,
//     roles: ["PETUGAS"],
//   },
//   {
//     href: "/laporan-catat-meter",
//     label: "Laporan Catat Meter",
//     icon: FileText,
//     roles: ["PETUGAS"],
//   },
// ];

// export function BottomNav() {
//   const pathname = usePathname();

//   // sembunyikan di login/landing
//   if (pathname === "/" || pathname === "/login") return null;

//   const [role, setRole] = useState<Role | null>(null);

//   // ambil role user dari localStorage (hasil login)
//   useEffect(() => {
//     try {
//       const raw = localStorage.getItem("tb_user");
//       if (raw) {
//         const u = JSON.parse(raw) as { role?: Role };
//         if (u?.role) setRole(u.role);
//       }
//     } catch {}
//   }, []);

//   // filter item sesuai role
//   const items = useMemo(() => {
//     return NAV_ITEMS.filter((m) => {
//       if (!m.roles || m.roles.length === 0) return true; // default: terlihat semua
//       if (!role) return false;
//       return m.roles.includes(role);
//     });
//   }, [role]);

//   // Jika belum tahu role (sebentar saat mount), jangan render agar tidak flicker
//   if (!role) return null;

//   return (
//     <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
//       <GlassCard className="mx-auto max-w-md">
//         <nav className="flex items-center justify-around py-2">
//           {items.map((item) => {
//             const Icon = item.icon;
//             const isActive =
//               pathname === item.href || pathname.startsWith(item.href + "/");

//             return (
//               <Link
//                 key={item.href}
//                 href={item.href}
//                 className={cn(
//                   "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-0",
//                   isActive
//                     ? "text-primary bg-primary/10"
//                     : "text-muted-foreground hover:text-foreground hover:bg-white/10"
//                 )}
//               >
//                 <Icon className="h-5 w-5 shrink-0" />
//                 <span className="text-xs font-medium truncate">
//                   {item.label}
//                 </span>
//               </Link>
//             );
//           })}
//         </nav>

//         {/* Divider tipis */}
//         <div className="mx-3 h-px bg-black/50" />

//         {/* FOOTER dalam BottomNav */}
//         <div className="py-2 text-center text-[11px] leading-none text-muted-foreground">
//           <span className="mr-1">Supported by</span>
//           <Link
//             href="#"
//             target="_blank"
//             rel="noopener noreferrer"
//             className="font-semibold text-foreground hover:text-primary transition-colors"
//           >
//             agile.com
//           </Link>
//           <span className="mx-2 opacity-50">•</span>
//           <span className="select-none">© 2025</span>
//         </div>
//       </GlassCard>
//     </div>
//   );
// }

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
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { GlassCard } from "./glass-card";

type Role = "ADMIN" | "OPERATOR" | "PETUGAS" | "WARGA";
type BottomItem = {
  href: string;
  label: string;
  icon: React.ComponentType<any>;
  roles?: Role[];
};

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
    label: "Jadwal",
    icon: CalendarDays,
    roles: ["PETUGAS"],
  },
  {
    href: "/catat-meter",
    label: "Catat",
    icon: ClipboardList,
    roles: ["PETUGAS"],
  },
  {
    href: "/laporan-catat-meter",
    label: "Laporan",
    icon: FileText,
    roles: ["PETUGAS"],
  },
];

function findScrollableAncestor(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement;
  while (node) {
    const s = getComputedStyle(node);
    if (
      (s.overflowY === "auto" || s.overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight
    )
      return node;
    node = node.parentElement;
  }
  return null;
}

export function BottomNav() {
  const pathname = usePathname();

  // Hooks top-level
  const [role, setRole] = useState<Role | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [navH, setNavH] = useState<number>(56);
  const scrollTargetRef = useRef<HTMLElement | null>(null);
  const prevPaddingRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("tb_user");
      if (raw) {
        const u = JSON.parse(raw) as { role?: Role };
        if (u?.role) setRole(u.role);
      }
    } catch {}
  }, []);

  const items = useMemo(
    () =>
      NAV_ITEMS.filter((m) =>
        !m.roles?.length ? true : !!role && m.roles.includes(role)
      ),
    [role]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setNavH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current as HTMLElement | null;
    if (!el) return;

    let target =
      (document.querySelector("[data-scroll-root]") as HTMLElement) ||
      findScrollableAncestor(el) ||
      (document.querySelector("main") as HTMLElement | null) ||
      (document.body as unknown as HTMLElement);

    if (scrollTargetRef.current !== target) {
      if (scrollTargetRef.current && prevPaddingRef.current !== null) {
        scrollTargetRef.current.style.paddingBottom = prevPaddingRef.current;
        scrollTargetRef.current.style.setProperty("--bottom-nav-height", "");
      }
      scrollTargetRef.current = target;
      prevPaddingRef.current = target
        ? getComputedStyle(target).paddingBottom
        : null;
    }
    if (!target) return;

    target.style.setProperty("--bottom-nav-height", `${navH}px`);
    const existing =
      parseFloat(getComputedStyle(target).paddingBottom || "0") || 0;
    target.style.paddingBottom = `${Math.max(existing, navH)}px`;
    (target.style as any).scrollPaddingBottom = `${navH}px`;

    return () => {
      if (scrollTargetRef.current && prevPaddingRef.current !== null) {
        scrollTargetRef.current.style.paddingBottom = prevPaddingRef.current;
        scrollTargetRef.current.style.setProperty("--bottom-nav-height", "");
      }
    };
  }, [navH]);

  const hide =
    pathname === "/" || pathname === "/login" || pathname === "/company-login";
  if (!role || hide) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "px-4 sm:px-6 lg:px-8",
        "pt-1 pb-[calc(env(safe-area-inset-bottom,0px)+6px)]"
      )}
    >
      {/* Card diperkecil + padding horizontal lebih rapat */}
      <GlassCard
        className={cn("mx-auto w-full max-w-[400px]", "px-2 sm:px-3 py-1.5")}
      >
        {/* Jarak antar item diperkecil */}
        <nav
          className="flex items-center justify-around"
          style={{ minHeight: 38 }}
        >
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center rounded-md transition-colors min-w-0",
                  "gap-0.5 px-1.5 py-1",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-[10px] leading-none font-medium truncate">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mx-2 my-1 h-px bg-black/20 dark:bg-white/15" />

        <div className="pb-[2px] text-center text-[10px] leading-[12px] text-muted-foreground">
          <span className="mr-1">Supported by</span>
          <Link
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-foreground hover:text-primary"
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

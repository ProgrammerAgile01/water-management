// "use client";

// import {
//   ArrowLeft,
//   Menu,
//   Home,
//   Users,
//   ClipboardList,
//   CreditCard,
//   Settings,
//   LogOut,
//   MapPin,
//   FileSpreadsheet,
//   FileText,
//   CalendarDays,
//   RotateCcw,
//   FolderOpen,
//   BarChart3,
//   DollarSign,
//   IdCard,
//   HistoryIcon,
//   Phone,
//   LibraryIcon,
//   Droplet,
//   TrendingUp,
//   FileBarChart,
//   Grid3X3,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { useRouter, usePathname } from "next/navigation";
// import Link from "next/link";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import {
//   Breadcrumb,
//   BreadcrumbItem,
//   BreadcrumbLink,
//   BreadcrumbList,
//   BreadcrumbPage,
//   BreadcrumbSeparator,
// } from "@/components/ui/breadcrumb";
// import { GlassCard } from "./glass-card";
// import { useToast } from "@/hooks/use-toast";
// import { useEffect, useMemo, useState } from "react";

// // ===== Role & User-lite =====
// type Role = "ADMIN" | "OPERATOR" | "PETUGAS" | "WARGA";
// type LiteUser = { id: string; name: string; role: Role };

// // ===== Menu config (satu sumber kebenaran) =====
// type MenuItem = {
//   href: string;
//   label: string;
//   icon: React.ComponentType<any>;
//   roles?: Role[]; // siapa yang boleh lihat
// };

// // NOTE: rute mengikuti yang sudah kamu pakai saat ini (pengaturan)
// const MENU_ITEMS: MenuItem[] = [
//   {
//     href: "/dashboard",
//     label: "Dashboard",
//     icon: Home,
//     roles: ["ADMIN", "OPERATOR"],
//   },
//   {
//     href: "/warga-dashboard",
//     label: "Dashboard Warga",
//     icon: Home,
//     roles: ["WARGA"],
//   },
//   {
//     href: "/pelanggan",
//     label: "Pelanggan",
//     icon: Users,
//     roles: ["ADMIN", "OPERATOR"],
//   },
//   { href: "/zona", label: "Zona", icon: MapPin, roles: ["ADMIN", "OPERATOR"] },
//   {
//     href: "/jadwal-pencatatan",
//     label: "Jadwal Pencatatan",
//     icon: CalendarDays,
//     roles: ["ADMIN", "PETUGAS"],
//   },
//   {
//     href: "/catat-meter",
//     label: "Catat Meter",
//     icon: ClipboardList,
//     roles: ["ADMIN", "OPERATOR", "PETUGAS"],
//   },
//   {
//     href: "/laporan-catat-meter",
//     label: "Laporan Catat Meter",
//     icon: FileText,
//     roles: ["ADMIN", "PETUGAS"],
//   },
//   {
//     href: "catat-meter-blok",
//     label: "Catat Meter Blok",
//     icon: Grid3X3,
//     roles: ["ADMIN", "OPERATOR"],
//   },
//   // {
//   //   href: "/pelunasan",
//   //   label: "Pelunasan",
//   //   icon: CreditCard,
//   //   roles: ["ADMIN", "OPERATOR", "WARGA"],
//   // },
//   {
//     href: "/tagihan-pembayaran",
//     label: "Tagihan & Pembayaran",
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
//     href: "/petugas/riwayat",
//     label: "Riwayat Petugas",
//     icon: HistoryIcon,
//     roles: ["PETUGAS"],
//   },
//   {
//     href: "/petugas/profil",
//     label: "Profil Petugas",
//     icon: IdCard,
//     roles: ["PETUGAS"],
//   },
//   {
//     href: "/reset-meteran",
//     label: "Reset Meteran",
//     icon: RotateCcw,
//     roles: ["ADMIN", "OPERATOR"],
//   },
//   {
//     href: "/biaya",
//     label: "Biaya",
//     icon: FolderOpen,
//     roles: ["ADMIN", "OPERATOR"],
//   },
//   {
//     href: "/inventaris",
//     label: "Inventaris",
//     icon: LibraryIcon,
//     roles: ["ADMIN", "OPERATOR", "PETUGAS"],
//   },
//   {
//     href: "/pengeluaran",
//     label: "Pengeluaran",
//     icon: CreditCard,
//     roles: ["ADMIN", "OPERATOR"],
//   },
//   {
//     href: "/hutang",
//     label: "Hutang",
//     icon: CreditCard,
//     roles: ["ADMIN", "OPERATOR"],
//   },
//   {
//     href: "/laporan-summary",
//     label: "Laporan Summary",
//     icon: BarChart3,
//     roles: ["ADMIN", "OPERATOR"],
//   },
//   {
//     href: "/laporan/konsumsi-zona",
//     label: "Laporan Konsumsi Zona",
//     icon: Droplet,
//     roles: ["ADMIN", "OPERATOR"],
//   },
//   {
//     href: "/tools/import-export",
//     label: "Import/Export",
//     icon: FileSpreadsheet,
//     roles: ["ADMIN", "OPERATOR"],
//   },
//   {
//     href: "/laporan-status-pembayaran",
//     label: "Laporan Status Pembayaran",
//     icon: FileText,
//     roles: ["ADMIN"],
//   },
//   {
//     href: "/laporan/laba-rugi",
//     label: "Laporan Laba & Rugi",
//     icon: TrendingUp,
//     roles: ["ADMIN"],
//   },
//   {
//     href: "/laporan/hutang",
//     label: "Laporan Hutang",
//     icon: FileBarChart,
//     roles: ["ADMIN"],
//   },
//   {
//     href: "/laporan/keuangan",
//     label: "Laporan Keuangan",
//     icon: DollarSign,
//     roles: ["ADMIN"],
//   },
//   {
//     href: "/pengaturan",
//     label: "Pengaturan",
//     icon: Settings,
//     roles: ["ADMIN"],
//   },
//   {
//     href: "/whatsapp-setting",
//     label: "WhatsApp Setting",
//     icon: Phone,
//     roles: ["ADMIN"],
//   },
// ];

// // untuk breadcrumb
// const PATH_LABELS: Record<string, string> = {
//   "/dashboard": "Dashboard",
//   "/pelanggan": "Pelanggan",
//   "/zona": "Zona",
//   "/catat-meter": "Catat Meter",
//   "/catat-meter-blok": "Catat Meter Blok",
//   "/jadwal-pencatatan": "Jadwal Pencatatan",
//   // "/pelunasan": "Pelunasan",
//   "/tagihan-pembayaran": "Tagihan & Pembayaran",
//   "/profil-warga": "Profil Warga",
//   "/petugas/riwayat": "Riwayat Petugas",
//   "/petugas/profil": "Profil Petugas",
//   "/reset-meteran": "Reset Meteran",
//   "/biaya": "Biaya",
//   "/pengeluaran": "Pengeluaran",
//   "/hutang": "Hutang",
//   "/laporan-summary": "Laporan Summary",
//   "/laporan/konsumsi-zona": "Laporan Konsumsi Zona",
//   "/laporan-status-pembayaran": "Laporan Status Pembayaran",
//   "/laporan/laba-rugi": "Laporan Laba & Rugi",
//   "/laporan/hutang": "Laporan Hutang",
//   "/laporan/keuangan": "Laporan Keuangan",
//   "/pengaturan": "Pengaturan",
//   "/tools/import-export": "Import/Export",
//   "/login": "Login",
// };

// interface AppHeaderProps {
//   title: string;
//   showBackButton?: boolean;
//   showBreadcrumb?: boolean;
// }

// export function AppHeader({
//   title,
//   showBackButton = true,
//   showBreadcrumb = true,
// }: AppHeaderProps) {
//   const router = useRouter();
//   const pathname = usePathname();
//   const { toast } = useToast();

//   const [user, setUser] = useState<LiteUser | null>(null);

//   // ambil user dari localStorage (hasil login form kamu)
//   useEffect(() => {
//     try {
//       const raw = localStorage.getItem("tb_user");
//       if (raw) setUser(JSON.parse(raw));
//     } catch {}
//   }, []);

//   const role: Role | undefined = user?.role;

//   const visibleMenu = useMemo(() => {
//     return MENU_ITEMS.filter((m) => {
//       if (!m.roles || m.roles.length === 0) return true;
//       if (!role) return false;
//       return m.roles.includes(role);
//     });
//   }, [role]);

//   const handleBack = () => {
//     if (pathname === "/dashboard") {
//       router.push("/");
//     } else {
//       router.back();
//     }
//   };

//   const handleLogout = async () => {
//     try {
//       await fetch("/api/auth/logout", { method: "POST" });
//       toast({
//         title: "Logout berhasil",
//         description: "Anda telah keluar dari sistem.",
//       });
//     } catch {
//       toast({
//         title: "Logout gagal",
//         description: "Terjadi error, coba lagi.",
//         variant: "destructive",
//       });
//     } finally {
//       localStorage.removeItem("tb_user");
//       router.push("/login");
//     }
//   };

//   const getBreadcrumbItems = () => {
//     const items = [{ href: "/dashboard", label: "Dashboard" }];
//     if (pathname !== "/dashboard") {
//       const currentLabel = PATH_LABELS[pathname] || title;
//       items.push({ href: pathname, label: currentLabel });
//     }
//     return items;
//   };

//   return (
//     <GlassCard className="mb-6 p-4">
//       <div className="flex items-center justify-between">
//         <div className="flex items-center gap-4">
//           {showBackButton && (
//             <Button
//               variant="ghost"
//               size="icon"
//               onClick={handleBack}
//               className="shrink-0 hover:bg-white/20"
//             >
//               <ArrowLeft className="h-5 w-5" />
//             </Button>
//           )}

//           <div className="flex-1">
//             <h1 className="text-2xl font-bold text-foreground">{title}</h1>
//             {showBreadcrumb && pathname !== "/dashboard" && (
//               <Breadcrumb className="mt-1">
//                 <BreadcrumbList>
//                   {getBreadcrumbItems().map((item, index, arr) => (
//                     <div key={item.href} className="flex items-center">
//                       {index > 0 && <BreadcrumbSeparator />}
//                       <BreadcrumbItem>
//                         {index === arr.length - 1 ? (
//                           <BreadcrumbPage className="text-sm">
//                             {item.label}
//                           </BreadcrumbPage>
//                         ) : (
//                           <BreadcrumbLink asChild>
//                             <Link
//                               href={item.href}
//                               className="text-sm hover:text-primary"
//                             >
//                               {item.label}
//                             </Link>
//                           </BreadcrumbLink>
//                         )}
//                       </BreadcrumbItem>
//                     </div>
//                   ))}
//                 </BreadcrumbList>
//               </Breadcrumb>
//             )}
//           </div>
//         </div>

//         {/* Menu Dropdown */}
//         <DropdownMenu>
//           <DropdownMenuTrigger asChild>
//             <Button variant="ghost" size="icon" className="hover:bg-white/20">
//               <Menu className="h-5 w-5" />
//             </Button>
//           </DropdownMenuTrigger>
//           <DropdownMenuContent
//             align="end"
//             className="w-60 bg-white/95 backdrop-blur-md border-white/20"
//           >
//             {/* header mini user */}
//             <div className="px-3 py-2 text-xs text-muted-foreground">
//               {user ? (
//                 <>
//                   Masuk sebagai <b className="text-foreground">{user.name}</b> (
//                   {user.role})
//                 </>
//               ) : (
//                 "Belum login"
//               )}
//             </div>

//             {visibleMenu.map((item) => {
//               const Icon = item.icon;
//               return (
//                 <DropdownMenuItem key={item.href} asChild>
//                   <Link
//                     href={item.href}
//                     className="flex items-center gap-2 cursor-pointer"
//                   >
//                     <Icon className="h-4 w-4" />
//                     <span>{item.label}</span>
//                   </Link>
//                 </DropdownMenuItem>
//               );
//             })}
//             <DropdownMenuSeparator />
//             <DropdownMenuItem
//               onClick={handleLogout}
//               className="flex items-center gap-2 cursor-pointer text-red-600"
//             >
//               <LogOut className="h-4 w-4" />
//               <span>Logout</span>
//             </DropdownMenuItem>
//           </DropdownMenuContent>
//         </DropdownMenu>
//       </div>
//     </GlassCard>
//   );
// }

"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Menu,
  Home,
  Users,
  ClipboardList,
  CreditCard,
  Settings,
  LogOut,
  MapPin,
  FileSpreadsheet,
  FileText,
  CalendarDays,
  RotateCcw,
  FolderOpen,
  BarChart3,
  DollarSign,
  IdCard,
  HistoryIcon,
  Phone,
  LibraryIcon,
  Droplet,
  TrendingUp,
  FileBarChart,
  ChevronRight,
  Droplets,
  HandCoins,
  Network,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { GlassCard } from "./glass-card";
import { useToast } from "@/hooks/use-toast";

/* ============== Types ============== */
type Role = "ADMIN" | "OPERATOR" | "PETUGAS" | "WARGA";
type LiteUser = { id: string; name: string; role: Role };

type MenuItem = {
  href: string;
  label: string;
  icon: React.ComponentType<any>;
  roles?: Role[];
  group: "Admin" | "Petugas" | "Warga";
  section?: string; // kosong = standalone (contoh: Dashboard)
};

/* ============== Master Menu ============== */
const MENU_ITEMS: MenuItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: Home,
    roles: ["ADMIN", "OPERATOR"],
    group: "Admin",
  },

  // Admin > Master
  {
    href: "/pelanggan",
    label: "Pelanggan",
    icon: Users,
    roles: ["ADMIN", "OPERATOR"],
    group: "Admin",
    section: "Master",
  },
  {
    href: "/tandon",
    label: "Tandon",
    icon: Droplet,
    roles: ["ADMIN", "OPERATOR"],
    group: "Admin",
    section: "Master",
  },
  {
    href: "/zona",
    label: "Blok",
    icon: MapPin,
    roles: ["ADMIN", "OPERATOR"],
    group: "Admin",
    section: "Master",
  },
  {
    href: "/inventaris",
    label: "Inventaris",
    icon: LibraryIcon,
    roles: ["ADMIN", "OPERATOR", "PETUGAS"],
    group: "Admin",
    section: "Master",
  },

  // Admin > Operasional
  {
    href: "/jadwal-pencatatan",
    label: "Jadwal Pencatatan",
    icon: CalendarDays,
    roles: ["ADMIN", "PETUGAS"],
    group: "Admin",
    section: "Operasional",
  },
  {
    href: "/catat-meter",
    label: "Catat Meter",
    icon: ClipboardList,
    roles: ["ADMIN", "OPERATOR", "PETUGAS"],
    group: "Admin",
    section: "Operasional",
  },
  {
    href: "/catat-tandon",
    label: "Catat Meter Tandon",
    icon: ClipboardList,
    roles: ["ADMIN", "OPERATOR", "PETUGAS"],
    group: "Admin",
    section: "Meteran",
  },
  {
    href: "/catat-blok",
    label: "Catat Meter Blok",
    icon: ClipboardList,
    roles: ["ADMIN", "OPERATOR", "PETUGAS"],
    group: "Admin",
    section: "Meteran",
  },
  {
    href: "/reset-meteran",
    label: "Reset Meteran",
    icon: RotateCcw,
    roles: ["ADMIN", "OPERATOR"],
    group: "Admin",
    section: "Operasional",
  },

  // Admin > Keuangan
  {
    href: "/tagihan-pembayaran",
    label: "Tagihan & Pembayaran",
    icon: FileText,
    roles: ["ADMIN", "OPERATOR", "WARGA"],
    group: "Admin",
    section: "Keuangan",
  },
  {
    href: "/biaya",
    label: "Biaya",
    icon: FolderOpen,
    roles: ["ADMIN", "OPERATOR"],
    group: "Admin",
    section: "Keuangan",
  },
  {
    href: "/pengeluaran",
    label: "Pengeluaran",
    icon: CreditCard,
    roles: ["ADMIN", "OPERATOR"],
    group: "Admin",
    section: "Keuangan",
  },
  {
    href: "/hutang",
    label: "Hutang",
    icon: CreditCard,
    roles: ["ADMIN", "OPERATOR"],
    group: "Admin",
    section: "Keuangan",
  },
  {
    href: "/hutang-pembayaran",
    label: "Pembayaran Hutang",
    icon: HandCoins,
    roles: ["ADMIN", "OPERATOR"],
    group: "Admin",
    section: "Keuangan",
  },

  // Admin > Laporan
  {
    href: "/laporan-catat-meter",
    label: "Laporan Catat Meter",
    icon: FileText,
    roles: ["ADMIN", "PETUGAS"],
    group: "Admin",
    section: "Laporan",
  },
  {
    href: "/laporan-summary",
    label: "Laporan Summary",
    icon: BarChart3,
    roles: ["ADMIN", "OPERATOR"],
    group: "Admin",
    section: "Laporan",
  },
  {
    href: "/laporan/konsumsi-zona",
    label: "Laporan Konsumsi Blok",
    icon: Droplet,
    roles: ["ADMIN", "OPERATOR"],
    group: "Admin",
    section: "Laporan",
  },
  {
    href: "/laporan-status-pembayaran",
    label: "Laporan Status Pembayaran",
    icon: FileText,
    roles: ["ADMIN"],
    group: "Admin",
    section: "Laporan",
  },
  {
    href: "/laporan/laba-rugi",
    label: "Laporan Laba & Rugi",
    icon: TrendingUp,
    roles: ["ADMIN"],
    group: "Admin",
    section: "Laporan",
  },
  {
    href: "/laporan/hutang",
    label: "Laporan Hutang",
    icon: FileBarChart,
    roles: ["ADMIN"],
    group: "Admin",
    section: "Laporan",
  },
  {
    href: "/laporan/keuangan",
    label: "Laporan Keuangan",
    icon: DollarSign,
    roles: ["ADMIN"],
    group: "Admin",
    section: "Laporan",
  },
  {
    href: "/laporan/piutang",
    label: "Laporan Piutang",
    icon: FileText,
    roles: ["ADMIN", "OPERATOR"],
    group: "Admin",
    section: "Laporan",
  },

  // Admin > Distribusi
  {
    href: "/distribusi/hirarki",
    label: "Hirarki",
    icon: Network,
    roles: ["ADMIN"],
    group: "Admin",
    section: "Distribusi",
  },
  {
    href: "/distribusi/rekonsiliasi",
    label: "Rekonsiliasi",
    icon: BarChart3,
    roles: ["ADMIN"],
    group: "Admin",
    section: "Distribusi",
  },
  {
    href: "/distribusi/peta",
    label: "Peta Pemakaian Air",
    icon: Droplets,
    roles: ["ADMIN"],
    group: "Admin",
    section: "Distribusi",
  },

  // Admin > Pengaturan
  {
    href: "/pengaturan",
    label: "Pengaturan",
    icon: Settings,
    roles: ["ADMIN"],
    group: "Admin",
    section: "Pengaturan",
  },
  {
    href: "/whatsapp-setting",
    label: "WhatsApp Setting",
    icon: Phone,
    roles: ["ADMIN"],
    group: "Admin",
    section: "Pengaturan",
  },
  {
    href: "/tools/import-export",
    label: "Import/Export",
    icon: FileSpreadsheet,
    roles: ["ADMIN", "OPERATOR"],
    group: "Admin",
    section: "Pengaturan",
  },

  // Petugas
  {
    href: "/petugas/riwayat",
    label: "Riwayat Petugas",
    icon: HistoryIcon,
    roles: ["PETUGAS"],
    group: "Petugas",
    section: "Operasional",
  },
  {
    href: "/petugas/profil",
    label: "Profil Petugas",
    icon: IdCard,
    roles: ["PETUGAS"],
    group: "Petugas",
    section: "Akun",
  },

  // Warga
  {
    href: "/warga-dashboard",
    label: "Dashboard Warga",
    icon: Home,
    roles: ["WARGA"],
    group: "Warga",
    section: "Beranda",
  },
  {
    href: "/warga-profil",
    label: "Profil Warga",
    icon: Users,
    roles: ["WARGA"],
    group: "Warga",
    section: "Akun",
  },
];

/* ====== Urutan section & sub menu ====== */
const SECTION_ORDER = [
  "Master",
  "Operasional",
  "Meteran",
  "Keuangan",
  "Laporan",
  "Distribusi",
  "Pengaturan",
  "Petugas",
];
const getSectionOrder = (s: string) => {
  const i = SECTION_ORDER.indexOf(s);
  return i === -1 ? 1000 : i;
};

const SECTION_ITEM_ORDER: Record<string, string[]> = {
  Operasional: ["/jadwal-pencatatan", "/catat-meter", "/reset-meteran"],
  Master: ["/pelanggan", "/zona", "/inventaris"],
  Meteran: ["/catat-tandon", "/catat-blok", "/catat-meter-blok"],
  Keuangan: ["/tagihan-pembayaran", "/biaya", "/pengeluaran", "/hutang"],
  Laporan: [
    "/laporan-catat-meter",
    "/laporan-summary",
    "/laporan/konsumsi-zona",
    "/laporan-status-pembayaran",
    "/laporan/laba-rugi",
    "/laporan/hutang",
    "/laporan/keuangan",
    "/laporan/piutang",
  ],
  distribusi: [
    "/distribusi/hirarki",
    "/distribusi/rekonsiliasi",
    "/distribusi/peta",
  ],
  Pengaturan: ["/pengaturan", "/whatsapp-setting", "/tools/import-export"],
};
const getItemOrder = (section: string, href: string) => {
  const arr = SECTION_ITEM_ORDER[section];
  if (!arr) return 1000;
  const idx = arr.indexOf(href);
  return idx === -1 ? 900 : idx;
};

/* ============== Breadcrumb Labels ============== */
const PATH_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/pelanggan": "Pelanggan",
  "/zona": "Blok",
  "/jadwal-pencatatan": "Jadwal Pencatatan",
  "/catat-meter": "Catat Meter",
  "/catat-meter-blok": "Catat Meter Blok",
  "/tagihan-pembayaran": "Tagihan & Pembayaran",
  "/warga-profil": "Profil Warga",
  "/petugas/riwayat": "Riwayat Petugas",
  "/petugas/profil": "Profil Petugas",
  "/reset-meteran": "Reset Meteran",
  "/biaya": "Biaya",
  "/pengeluaran": "Pengeluaran",
  "/hutang": "Hutang",
  "/laporan-summary": "Laporan Summary",
  "/laporan/konsumsi-zona": "Laporan Konsumsi Blok",
  "/laporan-status-pembayaran": "Laporan Status Pembayaran",
  "/laporan/laba-rugi": "Laporan Laba & Rugi",
  "/laporan/hutang": "Laporan Hutang",
  "/laporan/keuangan": "Laporan Keuangan",
  "/laporan-catat-meter": "Laporan Catat Meter",
  "/laporan/piutang": "Laporan Piutang",
  "/distribusi/hirarki": "Hirarki",
  "/distribusi/rekonsiliasi": "Rekonsiliasi",
  "/distribusi/peta": "Peta Pemakaian Air",
  "/pengaturan": "Pengaturan",
  "/tools/import-export": "Import/Export",
  "/warga-dashboard": "Dashboard Warga",
  "/login": "Login",
};

interface AppHeaderProps {
  title: string;
  showBackButton?: boolean;
  showBreadcrumb?: boolean;
}

export function AppHeader({
  title,
  showBackButton = true,
  showBreadcrumb = true,
}: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [user, setUser] = useState<LiteUser | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("tb_user");
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  const role: Role | undefined = user?.role;

  const visibleMenu = useMemo(() => {
    return MENU_ITEMS.filter((m) => {
      if (!m.roles || m.roles.length === 0) return true;
      if (!role) return false;
      return m.roles.includes(role);
    });
  }, [role]);

  const standaloneAdmin = useMemo(
    () =>
      visibleMenu
        .filter((m) => m.group === "Admin" && !m.section)
        .sort((a, b) => a.label.localeCompare(b.label)),
    [visibleMenu]
  );

  const adminSections = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of visibleMenu) {
      if (item.group !== "Admin" || !item.section) continue;
      if (!map.has(item.section)) map.set(item.section, []);
      map.get(item.section)!.push(item);
    }

    return Array.from(map.entries())
      .map(([section, items]) => ({
        section,
        items: items.sort((a, b) => {
          const oa = getItemOrder(section, a.href);
          const ob = getItemOrder(section, b.href);
          if (oa !== ob) return oa - ob;
          return a.label.localeCompare(b.label);
        }),
      }))
      .sort((a, b) => {
        const oa = getSectionOrder(a.section);
        const ob = getSectionOrder(b.section);
        if (oa !== ob) return oa - ob;
        return a.section.localeCompare(b.section);
      });
  }, [visibleMenu]);

  const petugasItems = useMemo(
    () =>
      visibleMenu
        .filter((m) => m.group === "Petugas")
        .sort((a, b) => a.label.localeCompare(b.label)),
    [visibleMenu]
  );
  const wargaItems = useMemo(
    () =>
      visibleMenu
        .filter((m) => m.group === "Warga")
        .sort((a, b) => a.label.localeCompare(b.label)),
    [visibleMenu]
  );

  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const toggleSection = (sec: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(sec) ? next.delete(sec) : next.add(sec);
      return next;
    });
  };

  const handleBack = () => {
    if (pathname === "/dashboard") router.push("/");
    else router.back();
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast({
        title: "Logout berhasil",
        description: "Anda telah keluar dari sistem.",
      });
    } catch {
      toast({
        title: "Logout gagal",
        description: "Terjadi error, coba lagi.",
        variant: "destructive",
      });
    } finally {
      localStorage.removeItem("tb_user");
      router.push("/login");
    }
  };

  const getBreadcrumbItems = () => {
    const items = [{ href: "/dashboard", label: "Dashboard" }];
    if (pathname !== "/dashboard") {
      const currentLabel = PATH_LABELS[pathname] || title;
      items.push({ href: pathname, label: currentLabel });
    }
    return items;
  };

  return (
    <GlassCard className="mb-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="shrink-0 hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}

          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {showBreadcrumb && pathname !== "/dashboard" && (
              <Breadcrumb className="mt-1">
                <BreadcrumbList>
                  {getBreadcrumbItems().map((item, index, arr) => (
                    <div key={item.href} className="flex items-center">
                      {index > 0 && <BreadcrumbSeparator />}
                      <BreadcrumbItem>
                        {index === arr.length - 1 ? (
                          <BreadcrumbPage className="text-sm">
                            {item.label}
                          </BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild>
                            <Link
                              href={item.href}
                              className="text-sm hover:text-primary"
                            >
                              {item.label}
                            </Link>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </div>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            )}
          </div>
        </div>

        {/* Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-white/20">
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>

          {/* HILANGKAN GARIS: border-0 & tanpa Separator */}
          <DropdownMenuContent
            align="end"
            className="w-72 bg-white/95 backdrop-blur-md border-0 shadow-lg rounded-lg p-1"
          >
            {/* user header */}
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {user ? (
                <>
                  Masuk sebagai <b className="text-foreground">{user.name}</b> (
                  {user.role})
                </>
              ) : (
                "Belum login"
              )}
            </div>

            {/* ADMIN/OPERATOR */}
            {(role === "ADMIN" || role === "OPERATOR") && (
              <>
                {standaloneAdmin.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem
                      key={item.href}
                      asChild
                      className="cursor-pointer rounded-md"
                    >
                      <Link
                        href={item.href}
                        className="flex items-center gap-2"
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}

                {standaloneAdmin.length > 0 && adminSections.length > 0 && (
                  <div className="h-1" />
                )}

                {adminSections.map(({ section, items }, idx) => (
                  <div key={section}>
                    <DropdownMenuItem
                      className="justify-between font-medium rounded-md"
                      onSelect={(e) => e.preventDefault()}
                      onClick={() => toggleSection(section)}
                    >
                      <span>{section}</span>
                      <ChevronRight
                        className={`h-4 w-4 transition-transform ${
                          openSections.has(section) ? "rotate-90" : ""
                        }`}
                      />
                    </DropdownMenuItem>

                    {openSections.has(section) && (
                      <div className="py-1">
                        {items.map((item) => {
                          const Icon = item.icon;
                          return (
                            <DropdownMenuItem
                              key={item.href}
                              asChild
                              className="pl-6 pr-2 py-2 rounded-md"
                            >
                              <Link
                                href={item.href}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <Icon className="h-4 w-4" />
                                <span>{item.label}</span>
                              </Link>
                            </DropdownMenuItem>
                          );
                        })}
                      </div>
                    )}

                    {idx < adminSections.length - 1 && <div className="h-1" />}
                  </div>
                ))}
              </>
            )}

            {/* PETUGAS */}
            {role === "PETUGAS" &&
              petugasItems.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem
                    key={item.href}
                    asChild
                    className="cursor-pointer rounded-md"
                  >
                    <Link href={item.href} className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}

            {/* WARGA */}
            {role === "WARGA" &&
              wargaItems.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem
                    key={item.href}
                    asChild
                    className="cursor-pointer rounded-md"
                  >
                    <Link href={item.href} className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}

            <div className="h-1" />

            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2 cursor-pointer text-red-600 rounded-md"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </GlassCard>
  );
}

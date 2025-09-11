import type { Role } from "./roles";

export type MenuItem = {
  label: string;
  icon?: React.ComponentType<any>; // opsional, kalau pakai lucide
  href?: string;
  children?: MenuItem[];
  roles?: Role[]; // siapa saja yg boleh lihat menu ini
};

// contoh icon (opsional)
import {
  Home,
  Users,
  MapPin,
  ClipboardList,
  Settings,
  FileSpreadsheet,
  CalendarDays,
} from "lucide-react";

export const MENU: MenuItem[] = [
  {
    label: "Dashboard",
    icon: Home,
    href: "/dashboard",
    roles: ["ADMIN", "OPERATOR", "PETUGAS"],
  },

  // === Pelanggan
  {
    label: "Pelanggan",
    icon: Users,
    href: "/pelanggan",
    roles: ["ADMIN", "OPERATOR"],
  },

  // === Zona
  { label: "Zona", icon: MapPin, href: "/zona", roles: ["ADMIN", "OPERATOR"] }, // ⬅️ menu baru "Zona"

  // === Catat Meter
  {
    label: "Catat Meter",
    icon: ClipboardList,
    href: "/catat-meter",
    roles: ["ADMIN", "OPERATOR", "PETUGAS"],
  },

  // === Jadwal Pencatatan
  {
    label: "Jadwal Pencatatan",
    icon: CalendarDays,
    href: "jadwal-pencatatan",
    roles: ["ADMIN", "OPERATOR", "PETUGAS"],
  },

  // === Import/Export
  {
    label: "Import/Export",
    icon: FileSpreadsheet,
    href: "/tools/import-export",
    roles: ["ADMIN", "OPERATOR"],
  },

  // === Config
  { label: "Config", icon: Settings, href: "/config", roles: ["ADMIN"] },
];

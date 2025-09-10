
"use client"

import {
  ArrowLeft, Menu, Home, Users, ClipboardList, CreditCard,
  Settings, LogOut, MapPin, FileSpreadsheet
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { GlassCard } from "./glass-card"
import { useToast } from "@/hooks/use-toast"
import { useEffect, useMemo, useState } from "react"

// ===== Role & User-lite =====
type Role = "ADMIN" | "OPERATOR" | "PETUGAS" | "WARGA"
type LiteUser = { id: string; name: string; role: Role }

// ===== Menu config (satu sumber kebenaran) =====
type MenuItem = {
  href: string
  label: string
  icon: React.ComponentType<any>
  roles?: Role[] // siapa yang boleh lihat
}

// NOTE: rute mengikuti yang sudah kamu pakai saat ini (pengaturan)
const MENU_ITEMS: MenuItem[] = [
  { href: "/dashboard",    label: "Dashboard",    icon: Home,            roles: ["ADMIN","OPERATOR","PETUGAS"] },
  { href: "/pelanggan",    label: "Pelanggan",    icon: Users,           roles: ["ADMIN","OPERATOR"] },
  { href: "/zona",         label: "Zona",         icon: MapPin,          roles: ["ADMIN","OPERATOR"] },
  { href: "/catat-meter",  label: "Catat Meter",  icon: ClipboardList,   roles: ["ADMIN","OPERATOR","PETUGAS"] },
  { href: "/pelunasan",    label: "Pelunasan",    icon: CreditCard,      roles: ["ADMIN","OPERATOR"] },
  { href: "/tools/import-export", label: "Import/Export", icon: FileSpreadsheet, roles: ["ADMIN","OPERATOR"] },
  { href: "/pengaturan",   label: "Pengaturan",   icon: Settings,        roles: ["ADMIN"] },
]

// untuk breadcrumb
const PATH_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/pelanggan": "Pelanggan",
  "/zona": "Zona",
  "/catat-meter": "Catat Meter",
  "/pelunasan": "Pelunasan",
  "/pengaturan": "Pengaturan",
  "/tools/import-export": "Import/Export",
  "/login": "Login",
}

interface AppHeaderProps {
  title: string
  showBackButton?: boolean
  showBreadcrumb?: boolean
}

export function AppHeader({ title, showBackButton = true, showBreadcrumb = true }: AppHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()

  const [user, setUser] = useState<LiteUser | null>(null)

  // ambil user dari localStorage (hasil login form kamu)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tb_user")
      if (raw) setUser(JSON.parse(raw))
    } catch {}
  }, [])

  const role: Role | undefined = user?.role

  const visibleMenu = useMemo(() => {
    return MENU_ITEMS.filter((m) => {
      if (!m.roles || m.roles.length === 0) return true
      if (!role) return false
      return m.roles.includes(role)
    })
  }, [role])

  const handleBack = () => {
    if (pathname === "/dashboard") {
      router.push("/")
    } else {
      router.back()
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      toast({ title: "Logout berhasil", description: "Anda telah keluar dari sistem." })
    } catch {
      toast({ title: "Logout gagal", description: "Terjadi error, coba lagi.", variant: "destructive" })
    } finally {
      localStorage.removeItem("tb_user")
      router.push("/login")
    }
  }

  const getBreadcrumbItems = () => {
    const items = [{ href: "/dashboard", label: "Dashboard" }]
    if (pathname !== "/dashboard") {
      const currentLabel = PATH_LABELS[pathname] || title
      items.push({ href: pathname, label: currentLabel })
    }
    return items
  }

  return (
    <GlassCard className="mb-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBackButton && (
            <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0 hover:bg-white/20">
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
                          <BreadcrumbPage className="text-sm">{item.label}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild>
                            <Link href={item.href} className="text-sm hover:text-primary">
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

        {/* Menu Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-white/20">
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 bg-white/95 backdrop-blur-md border-white/20">
            {/* header mini user */}
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {user ? <>Masuk sebagai <b className="text-foreground">{user.name}</b> ({user.role})</> : "Belum login"}
            </div>

            {visibleMenu.map((item) => {
              const Icon = item.icon
              return (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href} className="flex items-center gap-2 cursor-pointer">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                </DropdownMenuItem>
              )
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer text-red-600">
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </GlassCard>
  )
}
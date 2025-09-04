"use client"

import { ArrowLeft, Menu, Home, Users, ClipboardList, CreditCard, Settings, LogOut } from "lucide-react"
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


interface AppHeaderProps {
  title: string
  showBackButton?: boolean
  showBreadcrumb?: boolean
}

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/pelanggan", label: "Pelanggan", icon: Users },
  { href: "/catat-meter", label: "Catat Meter", icon: ClipboardList },
  { href: "/pelunasan", label: "Pelunasan", icon: CreditCard },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings },
]

const pathLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/pelanggan": "Pelanggan",
  "/catat-meter": "Catat Meter",
  "/pelunasan": "Pelunasan",
  "/pengaturan": "Pengaturan",
  "/login": "Login",
}

export function AppHeader({ title, showBackButton = true, showBreadcrumb = true }: AppHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleBack = () => {
    if (pathname === "/dashboard") {
      router.push("/")
    } else {
      router.back()
    }
  }

  const { toast } = useToast()

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
    //const paths = pathname.split("/").filter(Boolean)
    const items = [{ href: "/dashboard", label: "Dashboard" }]

    if (pathname !== "/dashboard") {
      const currentLabel = pathLabels[pathname] || title
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
                  {getBreadcrumbItems().map((item, index) => (
                    <div key={item.href} className="flex items-center">
                      {index > 0 && <BreadcrumbSeparator />}
                      <BreadcrumbItem>
                        {index === getBreadcrumbItems().length - 1 ? (
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
          <DropdownMenuContent align="end" className="w-56 bg-white/95 backdrop-blur-md border-white/20">
            {menuItems.map((item) => {
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

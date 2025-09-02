"use client"

import type { ReactNode } from "react"
import { WaterBackground } from "./water-background"
import { BottomNav } from "./bottom-nav"
import { cn } from "@/lib/utils"

interface AppShellProps {
  children: ReactNode
  className?: string
}

export function AppShell({ children, className }: AppShellProps) {
  return (
    <div className="min-h-screen relative">
      <WaterBackground />
      <main className={cn("relative z-10 p-4 pb-24", className)}>{children}</main>
      <BottomNav />
    </div>
  )
}

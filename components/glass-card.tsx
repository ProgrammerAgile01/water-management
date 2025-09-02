import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface GlassCardProps {
  children: ReactNode
  className?: string
}

export function GlassCard({ children, className }: GlassCardProps) {
  return (
    <div
      className={cn(
        "backdrop-blur-md bg-card/70 border border-border/20 rounded-lg shadow-lg",
        "supports-[backdrop-filter]:bg-card/60",
        className,
      )}
    >
      {children}
    </div>
  )
}

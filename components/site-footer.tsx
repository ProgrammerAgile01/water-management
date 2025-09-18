"use client";

import Link from "next/link";
import { GlassCard } from "./glass-card";

export function SiteFooter() {
  return (
    <div className="fixed bottom-20 left-0 right-0 z-40 px-4">
      {/* bottom-20: beri jarak aman dari BottomNav (yang z-50) */}
      <GlassCard className="mx-auto max-w-md py-2">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>Supported by</span>
          <Link
            href="https://agile.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-foreground hover:text-primary transition-colors"
          >
            agile.com
          </Link>
          <span className="opacity-60">•</span>
          <span className="select-none">© 2025</span>
        </div>
      </GlassCard>
    </div>
  );
}

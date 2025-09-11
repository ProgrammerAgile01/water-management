"use client";

import * as React from "react";

type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  /** 0–100 (persentase) */
  value?: number;
  /** tampilkan label persen di kanan (opsional) */
  showLabel?: boolean;
};

export function Progress({
  value = 0,
  showLabel = false,
  className = "",
  ...rest
}: ProgressProps) {
  const pct = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;

  return (
    <div className={`w-full flex items-center gap-2 ${className}`} {...rest}>
      <div
        className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
      >
        <div
          className="h-full bg-primary transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-muted-foreground min-w-8 text-right">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}

export default Progress;

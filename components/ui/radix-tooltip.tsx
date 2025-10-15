// components/ui/radix-tooltip.tsx
"use client";
import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Info } from "lucide-react";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 8, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={
        "z-50 rounded-md border border-zinc-200/60 dark:border-zinc-800/60 " +
        "bg-white/90 dark:bg-zinc-900/90 backdrop-blur px-3 py-1.5 " +
        "text-sm text-zinc-800 dark:text-zinc-200 shadow-lg " +
        "data-[state=delayed-open]:data-[side=top]:animate-in data-[state=delayed-open]:data-[side=top]:fade-in-0 data-[state=delayed-open]:data-[side=top]:slide-in-from-bottom-1 " +
        "data-[state=delayed-open]:data-[side=bottom]:animate-in data-[state=delayed-open]:data-[side=bottom]:fade-in-0 data-[state=delayed-open]:data-[side=bottom]:slide-in-from-top-1 " +
        "data-[state=delayed-open]:data-[side=left]:animate-in data-[state=delayed-open]:data-[side=left]:fade-in-0 data-[state=delayed-open]:data-[side=left]:slide-in-from-right-1 " +
        "data-[state=delayed-open]:data-[side=right]:animate-in data-[state=delayed-open]:data-[side=right]:fade-in-0 data-[state=delayed-open]:data-[side=right]:slide-in-from-left-1 " +
        (className ?? "")
      }
      {...props}
    >
      {props.children}
      <TooltipPrimitive.Arrow className="fill-white/90 dark:fill-zinc-900/90" />
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = "TooltipContent";

/* ✅ forwardRef di InfoDot */
export const InfoDot = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button"> & { label?: string }
>(({ label = "Info", className, children, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    aria-label={label}
    className={
      "inline-flex h-6 w-6 items-center justify-center rounded-full " +
      "border border-zinc-200 dark:border-zinc-800 " +
      "bg-zinc-100/50 dark:bg-zinc-800/40 " +
      "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 " +
      "hover:bg-zinc-100 dark:hover:bg-zinc-800 " +
      "transition-colors cursor-help " +
      (className ?? "")
    }
    {...props}
  >
    {children ?? <Info className="h-3.5 w-3.5" />}
  </button>
));
InfoDot.displayName = "InfoDot";

"use client";

import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Info singkat lewat tap — bukan hover, supaya enak dipakai di HP juga. */
export function InfoTooltip({ children }: { children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        aria-label="Info ukuran ideal"
        className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
      >
        <Info className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2.5 text-xs leading-relaxed text-foreground">
        {children}
      </PopoverContent>
    </Popover>
  );
}

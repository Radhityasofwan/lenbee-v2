import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Panel paling atas halaman beranda — menyatu secara visual dengan TopBar (bleed ke tepi,
 * warna sama dengan header, melengkung di bagian bawah) supaya bentuknya konsisten di kedua role.
 */
export function TopPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "-mx-4 -mt-4 rounded-b-[2rem] bg-gradient-to-b from-primary/15 to-primary/10 px-4 pt-3 pb-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

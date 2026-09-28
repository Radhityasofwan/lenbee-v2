import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3 py-2 text-base text-foreground shadow-xs transition-colors",
        "placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60",
        "file:mr-3 file:h-7 file:rounded-md file:border-0 file:bg-secondary file:px-2 file:text-sm file:font-medium",
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

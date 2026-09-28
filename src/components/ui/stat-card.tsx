import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "primary" | "success" | "warning" | "destructive";
  className?: string;
}) {
  const toneClass = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary/12 text-primary",
    success: "bg-success/12 text-success",
    warning: "bg-warning/15 text-warning-foreground",
    destructive: "bg-destructive/12 text-destructive",
  }[tone];

  return (
    <div className={cn("rounded-xl border border-border bg-card p-3.5", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <span className={cn("flex size-7 items-center justify-center rounded-lg", toneClass)}>
            <Icon className="size-3.5" />
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 text-xl font-bold tracking-tight text-foreground tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

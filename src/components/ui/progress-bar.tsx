import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  max,
  toneClassName = "bg-primary",
  trackClassName,
  className,
}: {
  value: number;
  max: number;
  /** Kelas warna isi bar, mis. `accentOf(color).solid` atau `bg-success`. */
  toneClassName?: string;
  trackClassName?: string;
  className?: string;
}) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", trackClassName, className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", toneClassName)}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}

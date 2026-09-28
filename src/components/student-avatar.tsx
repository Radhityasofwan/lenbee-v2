import { accentOf } from "@/lib/domain/colors";
import { cn } from "@/lib/utils";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function StudentAvatar({
  name,
  color,
  src,
  size = "md",
  className,
}: {
  name: string;
  color?: string | null;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const accent = accentOf(color);
  const sizeClass = {
    xs: "size-7 text-[10px]",
    sm: "size-9 text-xs",
    md: "size-11 text-sm",
    lg: "size-16 text-lg",
  }[size];

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold select-none",
        accent.soft,
        accent.text,
        sizeClass,
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="size-full object-cover" loading="lazy" />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}

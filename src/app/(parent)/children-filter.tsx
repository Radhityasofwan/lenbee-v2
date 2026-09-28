import Link from "next/link";
import { cn } from "@/lib/utils";

export type ChildOption = { studentId: number; name: string; nickname: string | null };

export function ChildrenFilter({
  basePath,
  options,
  selected,
}: {
  basePath: string;
  options: ChildOption[];
  selected: number | null;
}) {
  if (options.length < 2) return null;

  const chip = (href: string, label: string, active: boolean) => (
    <Link
      key={href}
      href={href}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </Link>
  );

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {chip(basePath, "Semua", selected === null)}
      {options.map((option) =>
        chip(`${basePath}?student=${option.studentId}`, option.nickname ?? option.name, selected === option.studentId),
      )}
    </div>
  );
}

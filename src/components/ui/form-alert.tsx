import { CircleAlert, CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function FormAlert({ tone, children, className }: { tone: "error" | "success"; children: React.ReactNode; className?: string }) {
  const Icon = tone === "error" ? CircleAlert : CircleCheck;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm",
        tone === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-success/30 bg-success/10 text-success",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span className="leading-snug">{children}</span>
    </div>
  );
}

import type { ReactNode } from "react";
import { brandingUrl, getBrandingAsset } from "@/lib/services/settings";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const logoUrl = brandingUrl("logo", await getBrandingAsset("logo"));

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-4 py-10 safe-top safe-bottom">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_45%),radial-gradient(circle_at_88%_82%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_50%)]"
      />

      <div className="relative flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2.5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo diunggah tutor, dimensi tidak diketahui saat build.
            <img src={logoUrl} alt="Lenbee" className="size-14 rounded-2xl object-contain shadow-md shadow-primary/20" />
          ) : (
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-2xl font-black text-primary-foreground shadow-md shadow-primary/20">
              L
            </span>
          )}
          <div className="flex flex-col items-center gap-0.5 text-center">
            <span className="text-xl font-black tracking-tight">Lenbee</span>
            <span className="text-sm text-muted-foreground">Teman belajar yang hangat, setiap hari</span>
          </div>
        </div>

        <div className="w-full rounded-3xl border border-border bg-card p-6 shadow-sm">{children}</div>
      </div>
    </div>
  );
}

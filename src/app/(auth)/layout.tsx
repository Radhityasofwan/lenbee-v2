import type { ReactNode } from "react";
import { brandingUrl, getBrandingAsset } from "@/lib/services/settings";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const logoUrl = brandingUrl("logo", await getBrandingAsset("logo"));

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="flex flex-col items-center gap-3 bg-gradient-to-b from-primary/16 to-background px-4 pt-16 pb-14 safe-top">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo diunggah tutor, dimensi tidak diketahui saat build.
          <img src={logoUrl} alt="Lenbee" className="size-20 rounded-3xl object-contain shadow-lg shadow-primary/20" />
        ) : (
          <span className="flex size-20 items-center justify-center rounded-3xl bg-primary text-4xl font-black text-primary-foreground shadow-lg shadow-primary/20">
            L
          </span>
        )}
        <span className="text-2xl font-black tracking-tight">Lenbee</span>
      </div>

      <div className="-mt-8 flex flex-1 justify-center px-4 pb-10">
        <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-sm">{children}</div>
      </div>
    </div>
  );
}

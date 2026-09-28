import Link from "next/link";
import type { ReactNode } from "react";
import { brandingUrl, getBrandingAsset } from "@/lib/services/settings";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const logoUrl = brandingUrl("logo", await getBrandingAsset("logo"));

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 flex flex-col items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- logo diunggah tutor, dimensi tidak diketahui saat build.
              <img src={logoUrl} alt="Lenbee" className="size-14 rounded-2xl object-contain shadow-sm" />
            ) : (
              <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-2xl font-black text-primary-foreground shadow-sm">
                L
              </span>
            )}
            <span className="text-lg font-bold tracking-tight">Lenbee</span>
          </Link>
          {children}
        </div>
      </div>
      <p className="safe-bottom px-4 pb-6 text-center text-xs text-muted-foreground">
        Manajemen les privat — murid, jadwal, laporan, dan tagihan dalam satu tempat.
      </p>
    </div>
  );
}

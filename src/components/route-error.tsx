"use client";

import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/** Dipakai di error.tsx tiap grup route agar error tidak menjatuhkan seluruh app ke halaman error default Next.js. */
export function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      icon={RefreshCw}
      title="Gagal memuat halaman"
      description="Terjadi kesalahan. Coba lagi beberapa saat."
      action={<Button onClick={() => reset()}>Coba lagi</Button>}
      className="min-h-[50vh]"
    />
  );
}

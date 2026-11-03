"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PwaRegister() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // Dev: bersihkan SW + cache lama supaya tidak ada chunk JS basi yang terus dipakai
      // browser walau kode & server sudah berubah (penyebab hydration mismatch di dev).
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) reg.unregister();
      }).catch(() => {});
      if ("caches" in window) {
        caches.keys().then((keys) => {
          for (const key of keys) caches.delete(key);
        }).catch(() => {});
      }
      return;
    }

    let cancelled = false;
    let reloading = false;

    // Worker baru hanya masuk state "waiting" kalau sudah ada controller aktif sebelumnya —
    // artinya ini update, bukan instalasi pertama (yang langsung aktif tanpa menunggu).
    const trackWaiting = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting && navigator.serviceWorker.controller && !cancelled) {
        setWaitingWorker(registration.waiting);
      }
    };

    const register = async () => {
      if (cancelled) return;
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        trackWaiting(registration);

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed") trackWaiting(registration);
          });
        });
      } catch {
        // Registrasi offline opsional — aplikasi tetap berjalan tanpanya.
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });

    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", register);
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", register);
    };
  }, []);

  if (!waitingWorker || dismissed) return null;

  return (
    <div className="safe-top fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3">
      <div className="animate-rise flex w-full max-w-sm items-center gap-3 rounded-full border border-border/70 bg-card/95 px-3 py-2 shadow-lg shadow-black/[0.12] backdrop-blur-md supports-[backdrop-filter]:bg-card/85 dark:shadow-black/40">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
          <RefreshCw className="size-4" />
        </span>
        <p className="flex-1 text-xs font-medium text-foreground">Versi baru Lenbee siap dipakai.</p>
        <Button
          type="button"
          size="sm"
          className="h-8 px-3 text-xs"
          onClick={() => waitingWorker.postMessage({ type: "SKIP_WAITING" })}
        >
          Perbarui
        </Button>
        <button
          type="button"
          aria-label="Tutup"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

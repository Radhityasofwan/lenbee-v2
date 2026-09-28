"use client";

import { useEffect } from "react";

export function PwaRegister() {
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
    const register = () => {
      if (cancelled) return;
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registrasi offline opsional — aplikasi tetap berjalan tanpanya.
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}

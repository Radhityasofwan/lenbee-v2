"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_DAYS = 7;
const DISMISS_KEY = "pwa-install-dismissed-at";

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function recentlyDismissed(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const elapsedDays = (Date.now() - Number(raw)) / 86_400_000;
  return elapsedDays < DISMISS_DAYS;
}

export function PwaInstallPrompt() {
  const [platform, setPlatform] = useState<"android" | "ios" | null>(null);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    let dismissed = false;
    try {
      dismissed = recentlyDismissed();
    } catch {
      // localStorage mungkin diblok (mode privat) — anggap belum pernah ditutup.
    }
    if (dismissed) return;

    async function detectIos() {
      if (isIos()) setPlatform("ios");
    }

    void detectIos();
    if (isIos()) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      setPlatform("android");
    };
    const onInstalled = () => {
      setPlatform(null);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setPlatform(null);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Lewati bila storage tidak tersedia.
    }
  };

  const install = async () => {
    if (!promptEvent) return;
    setBusy(true);
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } finally {
      setBusy(false);
      setPlatform(null);
      setPromptEvent(null);
    }
  };

  if (platform === "ios") {
    return (
      <div className="safe-top fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3">
        <div className="animate-rise flex w-full max-w-sm items-start gap-3 rounded-2xl border border-border/70 bg-card/95 p-3 shadow-lg shadow-black/[0.12] backdrop-blur-md supports-[backdrop-filter]:bg-card/85 dark:shadow-black/40">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Share className="size-4" />
          </span>
          <p className="flex-1 text-xs leading-relaxed text-foreground">
            Pasang Lenbee di Layar Utama: ketuk <span className="font-semibold">Share</span> di Safari, lalu pilih{" "}
            <span className="font-semibold">Add to Home Screen</span>.
          </p>
          <button
            type="button"
            aria-label="Tutup"
            onClick={dismiss}
            className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  if (platform === "android") {
    return (
      <div className="safe-bottom-float fixed inset-x-0 z-50 flex justify-center px-4">
        <div className="animate-rise flex w-full max-w-sm items-center gap-3 rounded-full border border-border/70 bg-card/95 px-3 py-2 shadow-lg shadow-black/[0.12] backdrop-blur-md supports-[backdrop-filter]:bg-card/85 dark:shadow-black/40">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
            <Download className="size-4" />
          </span>
          <p className="flex-1 text-xs font-medium text-foreground">Pasang Lenbee di perangkat ini.</p>
          <Button type="button" size="sm" disabled={busy} className="h-8 px-3 text-xs" onClick={() => void install()}>
            Pasang
          </Button>
          <button
            type="button"
            aria-label="Tutup"
            onClick={dismiss}
            className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}

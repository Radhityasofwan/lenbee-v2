"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, Send } from "lucide-react";
import { FcCellPhone } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type Status = "checking" | "unsupported" | "ios-needs-install" | "on" | "off";

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** VAPID public key (base64url) → Uint8Array, format yang diminta PushManager.subscribe. */
function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function PushNotificationToggle({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      if (!vapidPublicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      if (isIos() && !isStandalone()) {
        if (!cancelled) setStatus("ios-needs-install");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!cancelled) setStatus(subscription ? "on" : "off");
      } catch {
        if (!cancelled) setStatus("off");
      }
    }

    void detect();
    return () => {
      cancelled = true;
    };
  }, [vapidPublicKey]);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Izin notifikasi ditolak. Aktifkan lewat pengaturan browser bila berubah pikiran.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const json = subscription.toJSON();
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!response.ok) throw new Error("Gagal menyimpan langganan.");

      setStatus("on");
      toast.success("Notifikasi push aktif di perangkat ini.");
    } catch {
      toast.error("Gagal mengaktifkan notifikasi push.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setStatus("off");
      toast.success("Notifikasi push dimatikan di perangkat ini.");
    } catch {
      toast.error("Gagal mematikan notifikasi push.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    try {
      const response = await fetch("/api/push/test", { method: "POST" });
      if (!response.ok) throw new Error("Gagal.");
      toast.success("Notifikasi uji coba dikirim. Cek notification tray HP Anda.");
    } catch {
      toast.error("Gagal mengirim notifikasi uji coba.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "checking") return null;

  if (status === "unsupported") {
    return (
      <p className="text-sm text-muted-foreground">Perangkat/browser ini belum mendukung notifikasi push.</p>
    );
  }

  if (status === "ios-needs-install") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-muted/40 p-3">
        <FcCellPhone className="mt-0.5 size-4 shrink-0" />
        <p className="text-sm text-muted-foreground">
          Di iPhone, notifikasi hanya bisa aktif kalau Lenbee sudah ditambahkan ke Layar Utama. Ketuk tombol{" "}
          <span className="font-medium text-foreground">Share</span> di Safari, lalu pilih{" "}
          <span className="font-medium text-foreground">Add to Home Screen</span>. Buka lagi dari ikon itu untuk mengaktifkan.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
            <Bell className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium">Notifikasi push</p>
            <p className="text-xs text-muted-foreground">Muncul di layar HP walau aplikasi tertutup.</p>
          </div>
        </div>
        <Switch
          checked={status === "on"}
          disabled={busy}
          onCheckedChange={(checked) => void (checked ? enable() : disable())}
        />
      </div>
      {status === "on" ? (
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void sendTest()} className="self-start">
          <Send />
          Kirim notifikasi uji coba
        </Button>
      ) : null}
    </div>
  );
}

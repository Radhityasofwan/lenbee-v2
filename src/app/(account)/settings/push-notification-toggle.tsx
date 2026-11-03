"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bell, CheckCircle2, Loader2, Send, TriangleAlert } from "lucide-react";
import { FcCellPhone } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type Status = "checking" | "unsupported" | "ios-needs-install" | "on" | "off";

type TestStatus = "idle" | "sending" | "waiting" | "confirmed" | "unconfirmed" | "failed";

const TEST_TIMEOUT_MS = 8000;

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
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const activeTestId = useRef<string | null>(null);

  // Service worker membalas lewat postMessage begitu showNotification() benar-benar
  // selesai diproses OS — ini yang membuat status tes "sinkron" dengan kondisi nyata di layar,
  // bukan cuma tebakan dari respons API kirim push.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "push-test-shown" && event.data.testId === activeTestId.current) {
        setTestStatus("confirmed");
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      // Di iOS, PushManager/Notification belum ada sama sekali sebelum app di-install
      // ke Home Screen — cek ini dulu, sebelum cek dukungan API, supaya instruksi
      // "Add to Home Screen" tetap muncul (bukan jatuh ke pesan "tidak didukung").
      if (isIos() && !isStandalone()) {
        if (!cancelled) setStatus("ios-needs-install");
        return;
      }
      if (!vapidPublicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setStatus("unsupported");
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
    setTestStatus("sending");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setTestStatus("failed");
        toast.error("Langganan push tidak ditemukan di perangkat ini. Matikan lalu aktifkan lagi.");
        return;
      }

      const testId = crypto.randomUUID();
      activeTestId.current = testId;

      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint, testId }),
      });
      const json = await response.json().catch(() => ({}) as { error?: string });
      if (!response.ok) {
        setTestStatus("failed");
        toast.error(json.error ?? "Gagal mengirim notifikasi uji coba.");
        return;
      }

      // Server sudah konfirmasi push terkirim ke layanan push — sekarang tunggu service
      // worker melaporkan balik bahwa notifikasi itu benar-benar tampil di layar perangkat ini.
      setTestStatus("waiting");
      await new Promise((resolve) => setTimeout(resolve, TEST_TIMEOUT_MS));
      setTestStatus((current) => (current === "waiting" ? "unconfirmed" : current));
    } catch {
      setTestStatus("failed");
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
        <div className="flex flex-col items-start gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void sendTest()} className="self-start">
            {testStatus === "sending" || testStatus === "waiting" ? <Loader2 className="animate-spin" /> : <Send />}
            Kirim notifikasi uji coba
          </Button>
          {testStatus === "sending" ? (
            <p className="text-xs text-muted-foreground">Mengirim ke layanan push…</p>
          ) : null}
          {testStatus === "waiting" ? (
            <p className="text-xs text-muted-foreground">Menunggu konfirmasi perangkat ini menampilkannya…</p>
          ) : null}
          {testStatus === "confirmed" ? (
            <p className="flex items-center gap-1.5 text-xs font-medium text-success">
              <CheckCircle2 className="size-3.5" />
              Terkonfirmasi tampil di layar perangkat ini.
            </p>
          ) : null}
          {testStatus === "unconfirmed" ? (
            <p className="flex items-start gap-1.5 text-xs font-medium text-warning">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              Terkirim, tapi tidak ada konfirmasi tampil. Cek izin notifikasi di pengaturan sistem atau mode Jangan Ganggu.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

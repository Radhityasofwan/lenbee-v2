import "server-only";
import webpush from "web-push";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { env, isPushConfigured } from "@/lib/env";

let vapidConfigured = false;

function ensureVapid(): boolean {
  if (!isPushConfigured()) return false;
  if (!vapidConfigured) {
    webpush.setVapidDetails(env.push.vapidSubject, env.push.vapidPublicKey, env.push.vapidPrivateKey);
    vapidConfigured = true;
  }
  return true;
}

export type PushPayload = { title: string; body?: string | null; url?: string | null };

/**
 * Kirim push ke semua perangkat milik user. Tidak pernah melempar error —
 * kegagalan kirim push tidak boleh menggagalkan aksi utama pemanggilnya.
 * Subscription yang sudah tidak valid (404/410) otomatis dibersihkan dari DB.
 */
export async function sendPushToUser(userId: number, payload: PushPayload): Promise<void> {
  if (!ensureVapid()) return;

  try {
    const subscriptions = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
    if (subscriptions.length === 0) return;

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body ?? "",
      url: payload.url ?? "/",
    });

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            body,
          );
        } catch (error) {
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
          } else {
            console.error(`[push] gagal kirim ke subscription #${sub.id} (status ${statusCode ?? "?"})`, error);
          }
        }
      }),
    );
  } catch {
    // Kegagalan infra push (DB/koneksi) tidak boleh mengganggu alur utama.
  }
}

export type PushTestResult =
  | { ok: true }
  | { ok: false; reason: "not-configured" | "no-subscription" | "send-failed" };

/**
 * Berbeda dari sendPushToUser: kirim ke SATU subscription spesifik (perangkat yang
 * sedang menekan tombol tes) dan hasil kirimnya dilaporkan apa adanya ke caller —
 * supaya tombol "tes notifikasi" bisa memastikan sinyal benar-benar terkirim,
 * bukan diam-diam gagal seperti alur notifikasi biasa.
 */
export async function sendTestPush(userId: number, endpoint: string, testId: string): Promise<PushTestResult> {
  if (!ensureVapid()) return { ok: false, reason: "not-configured" };

  const [sub] = await db
    .select()
    .from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)))
    .limit(1);
  if (!sub) return { ok: false, reason: "no-subscription" };

  const body = JSON.stringify({
    title: "Uji notifikasi Lenbee",
    body: "Kalau ini muncul di layar, push notification di perangkat ini berfungsi.",
    url: "/settings",
    testId,
  });

  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body);
    return { ok: true };
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
    }
    return { ok: false, reason: "send-failed" };
  }
}

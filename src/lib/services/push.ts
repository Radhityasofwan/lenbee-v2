import "server-only";
import webpush from "web-push";
import { eq } from "drizzle-orm";
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
          }
        }
      }),
    );
  } catch {
    // Kegagalan infra push (DB/koneksi) tidak boleh mengganggu alur utama.
  }
}

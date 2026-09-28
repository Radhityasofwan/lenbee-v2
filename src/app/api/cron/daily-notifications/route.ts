import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { env } from "@/lib/env";
import { syncParentNotifications, syncTutorNotifications } from "@/lib/services/notifications";

/**
 * Dipanggil scheduler eksternal (cron hosting) sekali sehari untuk memicu
 * reminder yang berbasis waktu ("jadwal hari ini", "besok ada sesi") sebagai
 * push asli walau tidak ada yang membuka aplikasi hari itu.
 * Lindungi dengan header: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: Request) {
  if (!env.cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET belum diset di server." }, { status: 500 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  const activeUsers = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.isActive, true));

  let tutors = 0;
  let parents = 0;

  for (const user of activeUsers) {
    try {
      if (user.role === "tutor") {
        await syncTutorNotifications(user.id);
        tutors += 1;
      } else {
        await syncParentNotifications(user.id);
        parents += 1;
      }
    } catch {
      // Satu user gagal tidak boleh menghentikan sisanya.
    }
  }

  return NextResponse.json({ ok: true, tutors, parents });
}

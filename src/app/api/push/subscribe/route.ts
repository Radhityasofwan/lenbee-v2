import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { errorMessage, parseJson } from "@/lib/form";

const subscribeSchema = z.object({
  endpoint: z.string().trim().min(1).max(500),
  keys: z.object({
    p256dh: z.string().trim().min(1),
    auth: z.string().trim().min(1),
  }),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });

    const body = await request.json();
    const parsed = parseJson(subscribeSchema, body);
    if (!parsed.success) return NextResponse.json({ error: parsed.state.message }, { status: 400 });

    const { endpoint, keys } = parsed.data;
    const userAgent = request.headers.get("user-agent")?.slice(0, 300) ?? null;

    await db
      .insert(pushSubscriptions)
      .values({ userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent })
      .onDuplicateKeyUpdate({ set: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth, userAgent } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "Gagal menyimpan langganan notifikasi.") }, { status: 500 });
  }
}

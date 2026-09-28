import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { errorMessage, parseJson } from "@/lib/form";

const unsubscribeSchema = z.object({ endpoint: z.string().trim().min(1).max(500) });

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });

    const body = await request.json();
    const parsed = parseJson(unsubscribeSchema, body);
    if (!parsed.success) return NextResponse.json({ error: parsed.state.message }, { status: 400 });

    await db
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, user.id), eq(pushSubscriptions.endpoint, parsed.data.endpoint)));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "Gagal menghapus langganan notifikasi.") }, { status: 500 });
  }
}

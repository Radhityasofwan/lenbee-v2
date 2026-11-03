import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { errorMessage, parseJson } from "@/lib/form";
import { sendTestPush } from "@/lib/services/push";

const testSchema = z.object({
  endpoint: z.string().trim().min(1).max(500),
  testId: z.string().trim().min(1).max(100),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });

    const body = await request.json();
    const parsed = parseJson(testSchema, body);
    if (!parsed.success) return NextResponse.json({ error: parsed.state.message }, { status: 400 });

    const result = await sendTestPush(user.id, parsed.data.endpoint, parsed.data.testId);
    if (!result.ok) {
      const message =
        result.reason === "no-subscription"
          ? "Langganan push perangkat ini tidak ditemukan di server. Matikan lalu aktifkan lagi."
          : result.reason === "not-configured"
            ? "Push notification belum dikonfigurasi di server."
            : "Gagal mengirim ke layanan push. Coba lagi.";
      return NextResponse.json({ error: message }, { status: 422 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "Gagal mengirim notifikasi uji coba.") }, { status: 500 });
  }
}

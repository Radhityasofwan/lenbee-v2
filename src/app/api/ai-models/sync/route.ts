import { NextResponse } from "next/server";
import { getSessionUserOrThrow } from "@/lib/auth";
import { errorMessage, parseJson } from "@/lib/form";
import { syncAllProviderModels, syncProviderModels } from "@/lib/services/ai-keys";
import { aiModelSyncSchema } from "@/lib/validation";

/** Returns only sync status — never any part of a stored key. */
export async function POST(request: Request) {
  try {
    const user = await getSessionUserOrThrow();
    if (user.role !== "tutor") {
      return NextResponse.json({ error: "Hanya pengajar yang bisa memakai fitur ini." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = parseJson(aiModelSyncSchema, body);
    if (!parsed.success) return NextResponse.json({ error: parsed.state.message }, { status: 400 });

    const reports = parsed.data.provider
      ? [await syncProviderModels(parsed.data.provider)]
      : await syncAllProviderModels();

    return NextResponse.json({ reports });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "Gagal menyinkronkan model.") }, { status: 500 });
  }
}
